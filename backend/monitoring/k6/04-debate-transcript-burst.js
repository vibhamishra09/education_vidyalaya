/**
 * Suite 4 — Debate Transcript Write Burst
 *
 * Targets the debate subsystem's DB write hotspots:
 *
 *   1. ws_flood (T+0:00 → T+3:00)
 *      200 Socket.IO WebSocket VUs connect to /debate namespace and fire
 *      debate:transcript events at 4 events/sec.
 *      DB write chain per event (speaker VU only):
 *        getDebateState  → Redis GET
 *        debateParticipant.findFirst → 1 DB read
 *        storeTranscriptChunk       → Redis RPUSH
 *      Tests: WS auth overhead (user.findUnique per connect), Redis RPUSH
 *      throughput, WebSocket server connection capacity.
 *
 *   2. generate_results_burst (T+3:30 → T+5:00, 10 VUs simultaneous)
 *      All 10 VUs fire POST /api/debate-rooms/:roomId/generate-results
 *      against pre-seeded ENDED rooms at the same instant.
 *      DB chain per call (sequential, no $transaction):
 *        user.findUnique + debateRoom.findUnique (complex JOIN)
 *        debateModeratorEvaluation.findMany
 *        debateReport.upsert  ×4   ← main burst: 4 sequential upserts
 *        debateTeam.update    ×2
 *        user.update (coins)  ×N_winners
 *        notificationsService ×N_winners
 *        debateRoom.update (status → PROCESSED)
 *        getResults (final read — another debateRoom.findUnique)
 *      10 rooms × ~14 sequential DB ops running concurrently = burst.
 *
 *   3. pool_starvation_browse (T+3:30 → T+5:00, parallel with #2)
 *      100 VUs hit GET /api/browse every 100 ms.
 *      Detects whether the generate_results DB operations starve the pool
 *      for unrelated queries (pool_starvation_browse_error_rate > 1% = issue).
 *
 * Known bug note:
 *   The gateway's handleTranscript speaker check compares
 *   state.currentSpeakerId (stored as Clerk ID in production) with
 *   client.data.userId (internal DB ID). This mismatch silently drops all
 *   transcripts in production. The seed script intentionally stores the
 *   internal DB ID in Redis state so that the transcript pipeline IS
 *   exercised during the test (exposing real Redis RPUSH pressure).
 *
 * Prerequisites:
 *   node backend/monitoring/k6/seed/04-seed.js
 *   # Copy the WS_ROOMS and RESULT_ROOMS values from its output.
 *
 * Run:
 *   k6 run \
 *     --env BASE_URL=http://localhost:3001 \
 *     --env WS_ROOMS='<from seed>' \
 *     --env RESULT_ROOMS='<from seed>' \
 *     backend/monitoring/k6/04-debate-transcript-burst.js
 *
 * Stream to Prometheus:
 *   k6 run --out experimental-prometheus-rw \
 *     --env K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
 *     --env BASE_URL=http://localhost:3001 \
 *     --env WS_ROOMS='...' --env RESULT_ROOMS='...' \
 *     backend/monitoring/k6/04-debate-transcript-burst.js
 */

import ws   from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// ─── Custom metrics ────────────────────────────────────────────────────────

const wsConnectLatency      = new Trend('latency_ws_connect_ms', true);
const wsJoinLatency         = new Trend('latency_ws_join_ms', true);
const transcriptEventsSent  = new Counter('transcript_events_sent_total');
const wsConnectErrors       = new Counter('ws_connect_error_total');
const wsConnectErrorRate    = new Rate('ws_connect_error_rate');

const generateResultsLatency   = new Trend('latency_generate_results_ms', true);
const generateResultsErrorRate = new Rate('generate_results_error_rate');

const browseLatency            = new Trend('latency_browse_starvation_ms', true);
const browseErrorRate          = new Rate('pool_starvation_browse_error_rate');

const activeWsConnections = new Gauge('active_ws_connections');

// ─── Environment ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
// WebSocket URL: replace http/https with ws/wss
const WS_BASE  = BASE_URL.replace(/^https?/, (p) => (p === 'https' ? 'wss' : 'ws'));

// Parsed from seed output
// WS_ROOMS: [{id, speakerToken, participantTokens:[...], speakerDbId}]
const WS_ROOMS = JSON.parse(__ENV.WS_ROOMS || '[]');
// RESULT_ROOMS: [{id, moderatorToken}]
const RESULT_ROOMS = JSON.parse(__ENV.RESULT_ROOMS || '[]');

// ─── Socket.IO / Engine.IO helpers ────────────────────────────────────────

const SIO_NS = '/debate'; // Socket.IO namespace

/**
 * Send a Socket.IO event on a given namespace.
 * Frame format: "42<ns>,["<event>",<data>]"
 */
function soSend(socket, event, data) {
  const frame = `42${SIO_NS},["${event}",${JSON.stringify(data)}]`;
  socket.send(frame);
}

/**
 * Handle raw Engine.IO / Socket.IO frames from server.
 * Returns: 'open' | 'ns_connected' | {event, data} | null
 */
function parseFrame(raw) {
  if (raw === '2') return 'ping';                       // EIO ping
  if (raw.startsWith('0'))  return 'open';              // EIO OPEN handshake
  if (raw.startsWith(`40${SIO_NS},`)) return 'ns_connected'; // SIO CONNECT ack
  if (raw.startsWith(`42${SIO_NS},`)) {
    try {
      const arr = JSON.parse(raw.slice(`42${SIO_NS},`.length));
      return { event: arr[0], data: arr[1] };
    } catch (_) { return null; }
  }
  return null;
}

// ─── Load profile ─────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // 200 WebSocket VUs — persistent connections, transcript event flood
    ws_flood: {
      executor:  'constant-vus',
      vus:       200,
      duration:  '3m',
      exec:      'wsFlood',
      startTime: '0s',
    },

    // 10 HTTP VUs — simultaneous generate-results calls (the DB write cascade)
    generate_results_burst: {
      executor:      'shared-iterations',
      vus:           __ENV.RESULT_ROOMS ? JSON.parse(__ENV.RESULT_ROOMS).length : 10,
      iterations:    __ENV.RESULT_ROOMS ? JSON.parse(__ENV.RESULT_ROOMS).length : 10,
      maxDuration:   '90s',
      exec:          'generateResultsBurst',
      startTime:     '3m30s',
    },

    // 100 HTTP VUs — browse endpoint concurrent with generate-results burst
    pool_starvation_browse: {
      executor:  'constant-vus',
      vus:       100,
      duration:  '90s',
      exec:      'browseStarvation',
      startTime: '3m30s',
    },
  },

  thresholds: {
    // WS connection must succeed and be fast
    ws_connect_error_rate:           [{ threshold: 'rate<0.05',   abortOnFail: false }],
    latency_ws_connect_ms:           [{ threshold: 'p(95)<2000',  abortOnFail: false }],
    latency_ws_join_ms:              [{ threshold: 'p(95)<1000',  abortOnFail: false }],

    // generate-results cascade: allow up to 3s p95 (14 sequential DB ops)
    latency_generate_results_ms:     [{ threshold: 'p(95)<3000',  abortOnFail: false }],
    generate_results_error_rate:     [{ threshold: 'rate<0.05',   abortOnFail: false }],

    // Browse must remain healthy while generate-results runs
    pool_starvation_browse_error_rate: [{ threshold: 'rate<0.01', abortOnFail: false }],
    latency_browse_starvation_ms:    [{ threshold: 'p(95)<500',   abortOnFail: false }],
  },
};

// ─── Scenario 1: ws_flood ──────────────────────────────────────────────────

export function wsFlood() {
  if (WS_ROOMS.length === 0) {
    console.warn('[ws_flood] WS_ROOMS not set — run seed/04-seed.js first');
    sleep(10);
    return;
  }

  // Distribute VUs across rooms round-robin
  const roomIdx     = (__VU - 1) % WS_ROOMS.length;
  const room        = WS_ROOMS[roomIdx];
  // First VU per room is the speaker (fires transcript events that actually hit Redis)
  const vuSlot      = Math.floor((__VU - 1) / WS_ROOMS.length);
  const isSpeaker   = vuSlot === 0;
  const token       = room.participantTokens[vuSlot % room.participantTokens.length];

  // Socket.IO over WebSocket — connect to base socket.io path
  const url = `${WS_BASE}/socket.io/?EIO=4&transport=websocket`;

  const connectStart = Date.now();
  let connected      = false;
  let joinedAt       = 0;

  activeWsConnections.add(1);

  const res = ws.connect(
    url,
    { headers: { Authorization: `Bearer ${token}` } },
    (socket) => {
      socket.on('open', () => {
        wsConnectLatency.add(Date.now() - connectStart);
      });

      socket.on('message', (raw) => {
        const frame = parseFrame(raw);

        if (frame === 'ping') {
          socket.send('3'); // Engine.IO PONG
          return;
        }

        if (frame === 'open') {
          // Connect to /debate namespace (auth via header — no payload needed)
          socket.send(`40${SIO_NS},`);
          return;
        }

        if (frame === 'ns_connected') {
          joinedAt  = Date.now();
          connected = true;
          // Join the room
          soSend(socket, 'debate:join_room', { roomId: room.id });
          return;
        }

        if (frame && typeof frame === 'object') {
          if (frame.event === 'debate:state_update' && joinedAt > 0) {
            wsJoinLatency.add(Date.now() - joinedAt);
          }
        }
      });

      socket.on('error', (e) => {
        wsConnectErrors.add(1);
        wsConnectErrorRate.add(true);
      });

      // Fire transcript events every 250 ms — speaker VU hits the full pipeline:
      //   Redis GET (getDebateState) → debateParticipant.findFirst → Redis RPUSH
      // Non-speaker VUs hit only: Redis GET (returns early — not current speaker)
      let iteration = 0;
      const transcriptInterval = socket.setInterval(() => {
        if (!connected) return;

        if (isSpeaker) {
          soSend(socket, 'debate:transcript', {
            roomId:    room.id,
            text:      `k6 burst chunk #${iteration++}`,
            timestamp: Date.now(),
          });
          transcriptEventsSent.add(1);
        } else {
          // Non-speaker VUs still send events to generate Redis GETs
          // (the gateway reads state to check speaker identity before dropping)
          soSend(socket, 'debate:transcript', {
            roomId:    room.id,
            text:      `k6 non-speaker #${iteration++}`,
            timestamp: Date.now(),
          });
        }
      }, 250);

      // Hold connection for ~2:50 min, then gracefully close
      socket.setTimeout(() => {
        clearInterval(transcriptInterval);
        socket.close();
      }, 170_000);
    },
  );

  activeWsConnections.add(-1);

  check(res, {
    'ws: HTTP 101 upgrade': (r) => r && r.status === 101,
  });
  wsConnectErrorRate.add(!(res && res.status === 101));
}

// ─── Scenario 2: generate_results_burst ───────────────────────────────────

export function generateResultsBurst() {
  if (RESULT_ROOMS.length === 0) {
    console.warn('[generate_results_burst] RESULT_ROOMS not set — run seed/04-seed.js first');
    sleep(5);
    return;
  }

  // Each VU gets a unique room via __VU modulo (VU numbers start at 1, are globally unique)
  const room  = RESULT_ROOMS[(__VU - 1) % RESULT_ROOMS.length];
  const token = room.moderatorToken;

  const start = Date.now();

  const res = http.post(
    `${BASE_URL}/api/debate-rooms/${room.id}/generate-results`,
    null,     // no request body
    {
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: '90s',
    },
  );

  generateResultsLatency.add(Date.now() - start);

  const ok = check(res, {
    'generate-results: 200 OK':            (r) => r.status === 200,
    'generate-results: body has results':  (r) => {
      try { return !!JSON.parse(r.body); } catch { return false; }
    },
  });

  generateResultsErrorRate.add(!ok);
}

// ─── Scenario 3: pool_starvation_browse ───────────────────────────────────

export function browseStarvation() {
  const start = Date.now();

  const res = http.get(`${BASE_URL}/api/browse`, { timeout: '10s' });

  browseLatency.add(Date.now() - start);

  const ok = check(res, {
    'browse (starvation check): 200 OK': (r) => r.status === 200,
  });

  browseErrorRate.add(!ok);

  sleep(0.1); // 10 req/sec per VU = 1,000 req/sec across 100 VUs
}

// ─── setup / teardown ─────────────────────────────────────────────────────

export function setup() {
  // Verify backend is up before kicking off the long WS scenario
  const res = http.get(`${BASE_URL}/api/browse`, { timeout: '10s' });
  if (res.status !== 200) {
    throw new Error(`Backend health check failed: ${res.status} ${res.body?.slice(0, 200)}`);
  }

  console.log(`[setup] Backend healthy at ${BASE_URL}`);
  console.log(`[setup] WS rooms:     ${WS_ROOMS.length}`);
  console.log(`[setup] Result rooms: ${RESULT_ROOMS.length}`);
  return {};
}

export function teardown() {
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('Suite 4 complete. Post-test DB audit queries:');
  console.log('────────────────────────────────────────────────────────────');

  console.log(`
-- Verify DebateTranscript rows written during ws_flood
SELECT dr.topic, COUNT(dt.id) AS transcripts
FROM "DebateTranscript" dt
JOIN "DebateRoom" dr ON dr.id = dt."debateRoomId"
WHERE dr.topic LIKE 'k6-suite4-%'
  AND dt."timestamp" > NOW() - INTERVAL '1 hour'
GROUP BY dr.topic
ORDER BY dr.topic;

-- Verify DebateReport rows written by generate_results_burst
SELECT dr.topic, COUNT(rep.id) AS reports, MAX(rep."createdAt") AS latest
FROM "DebateReport" rep
JOIN "DebateRoom" dr ON dr.id = rep."debateRoomId"
WHERE dr.topic LIKE 'k6-suite4-ended%'
  AND rep."createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY dr.topic
ORDER BY dr.topic;

-- Check for rooms stuck in ENDED (generate-results failed mid-way)
SELECT id, topic, status FROM "DebateRoom"
WHERE topic LIKE 'k6-suite4-ended%'
  AND status = 'ENDED'  -- should be PROCESSED after a successful run
  AND "updatedAt" > NOW() - INTERVAL '1 hour';

-- Check DebateTeam winner flags
SELECT dr.topic, dt.side, dt."isWinner", dt."totalScore"
FROM "DebateTeam" dt
JOIN "DebateRoom" dr ON dr.id = dt."debateRoomId"
WHERE dr.topic LIKE 'k6-suite4-ended%'
ORDER BY dr.topic, dt.side;

-- Cleanup when done
-- DELETE FROM "DebateRoom" WHERE topic LIKE 'k6-suite4-%';
-- (cascades to teams, participants, turn queue, transcripts, reports)
`);
}
