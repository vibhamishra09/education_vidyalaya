/**
 * Suite 2: Write Lock Contention — PeerSession Booking
 *
 * Goal: Expose three DB-level races inside requestPeerSession():
 *
 *   Race A — Coin TOCTOU
 *     The service reads User.coins in JS, checks it, then issues a
 *     separate UPDATE … SET coins = coins - cost. Under concurrent load
 *     the read-check-decrement is NOT atomic, so the same user can book
 *     multiple sessions and spend more coins than they own.
 *
 *   Race B — Booking Storm (same tutor)
 *     No DB-level uniqueness constraint prevents two users from booking
 *     the same tutor at the exact same time slot (availability check is
 *     currently commented out in the service). Many concurrent bookings
 *     for the same peer should expose pool pressure on Payment + Session
 *     create paths.
 *
 *   Race C — Partial-Write Storm
 *     The 8+ DB ops inside requestPeerSession are NOT wrapped in a
 *     Prisma $transaction:
 *       user.findUnique  ×2
 *       availabilityService.checkTimeSlotAvailability (2–3 queries)
 *       peerSession.create
 *       skill.findUnique + peerSessionSkill.create  (loop)
 *       payment.create
 *       user.update (coin decrement)
 *       notification create
 *       getPeerSessionDetails (another read)
 *     Under pool exhaustion, mid-request failures leave the DB in a
 *     partially-written state (session created, payment missing, etc.)
 *
 * ─── Prerequisites ────────────────────────────────────────────────────
 *
 *   1. Run the seed script first:
 *        node backend/monitoring/k6/seed/02-seed.js
 *      It creates test users in the DB and prints the tokens / IDs
 *      you need to pass as env vars.
 *
 *   2. Pass the output as env vars:
 *        k6 run \
 *          --env BASE_URL=http://localhost:3001 \
 *          --env REQUESTER_TOKENS='["tok_1","tok_2",...]' \
 *          --env PEER_USER_IDS='["id_abc","id_def",...]' \
 *          --env SINGLE_PEER_ID='id_abc' \
 *          --env SINGLE_REQUESTER_TOKEN='tok_1' \
 *          --env COIN_BUDGET=500 \
 *          backend/monitoring/k6/02-write-contention.js
 *
 * ─── What a pass looks like ───────────────────────────────────────────
 *   - No user's coin balance goes negative  (Race A)
 *   - coin_race_overdraft_total  = 0
 *   - booking_storm_error_rate   < 1%       (Race B)
 *   - partial_write_total        = 0        (Race C)
 *   - p95 latency                < 200ms across all three scenarios
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Config — all values injectable via --env
// ---------------------------------------------------------------------------

const BASE_URL             = __ENV.BASE_URL              || 'http://localhost:3001';
const COIN_BUDGET          = parseInt(__ENV.COIN_BUDGET  || '500', 10);
const SINGLE_PEER_ID       = __ENV.SINGLE_PEER_ID;       // for Race B
const SINGLE_TOKEN         = __ENV.SINGLE_REQUESTER_TOKEN;

// JSON arrays supplied by the seed script
const REQUESTER_TOKENS: string[] = JSON.parse(__ENV.REQUESTER_TOKENS || '[]');
const PEER_USER_IDS: string[]    = JSON.parse(__ENV.PEER_USER_IDS    || '[]');

// Minimum viable test: at least 2 requesters and 1 peer
const MIN_TOKENS = 2;

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

// Race A
const coinOverdrafts     = new Counter('coin_race_overdraft_total');
const coinRaceLatency    = new Trend('coin_race_booking_ms', true);

// Race B
const bookingStormErrors = new Rate('booking_storm_error_rate');
const bookingStormLatency = new Trend('booking_storm_ms', true);

// Race C
const partialWrites      = new Counter('partial_write_total');
const partialWriteLatency = new Trend('partial_write_booking_ms', true);

const overallErrorRate   = new Rate('error_rate');

// ---------------------------------------------------------------------------
// Load profiles — three separate scenarios in one run
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {

    // ── Race A: Coin TOCTOU ──────────────────────────────────────────
    // 20 VUs all share the SAME user token → concurrent bookings for
    // the same User row → exposes the read-check-decrement race.
    // Hold 2 minutes to collect multiple overdraft events.
    coin_race: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      exec: 'runCoinRace',
      startTime: '0s',
      tags: { scenario: 'coin_race' },
    },

    // ── Race B: Booking Storm ────────────────────────────────────────
    // 100 different users all book the same single tutor simultaneously.
    // Ramps up over 1 min, holds 3 min, then tapers.
    // Exposes Payment.create + PeerSession.create contention on a
    // single requestedToId.
    booking_storm: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0   },
      ],
      exec: 'runBookingStorm',
      startTime: '2m30s',   // starts after Race A finishes + 30s cool-down
      tags: { scenario: 'booking_storm' },
    },

    // ── Race C: Partial-Write Storm ──────────────────────────────────
    // 50 VUs, each using a unique token, all fire rapid concurrent
    // bookings. The goal is to hit the pool limit DURING a multi-step
    // (untransacted) write chain and observe partial DB state.
    // Run last so pool is already warm.
    partial_write: {
      executor: 'constant-vus',
      vus: 50,
      duration: '3m',
      exec: 'runPartialWriteStorm',
      startTime: '9m',
      tags: { scenario: 'partial_write' },
    },
  },

  thresholds: {
    http_req_duration:            ['p(95)<200'],
    error_rate:                   ['rate<0.01'],

    // Zero tolerance on the specific races we're hunting
    coin_race_overdraft_total:    ['count<1'],   // any overdraft = FAIL
    partial_write_total:          ['count<1'],   // any partial write = FAIL
    booking_storm_error_rate:     ['rate<0.05'], // 5% tolerance — some 4xx expected

    // Per-scenario latency budgets
    coin_race_booking_ms:         ['p(95)<200'],
    booking_storm_ms:             ['p(95)<200'],
    partial_write_booking_ms:     ['p(95)<200'],
  },
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function authHeaders(token: string) {
  return {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    timeout: '15s',
  };
}

// Build a booking payload. We book 1 week from now at 10:00 AM UTC so
// it always passes the "not in the past" guard.
function bookingPayload(peerId: string, offsetDays: number = 7, offsetHours: number = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(10 + offsetHours, 0, 0, 0);

  return JSON.stringify({
    peerId,
    date:     d.toISOString().split('T')[0],   // "YYYY-MM-DD"
    time:     '10:00',
    duration: 60,
    cost:     10,
    timezone: 'UTC',
    skills:   ['JavaScript'],
    message:  'k6 load test booking',
  });
}

// Classify response and record metrics
function recordResult(res, latencyTrend, errorRate, label: string) {
  const ok = res.status === 200 || res.status === 201;
  latencyTrend.add(res.timings.duration);
  errorRate.add(ok ? 0 : 1);
  overallErrorRate.add(ok ? 0 : 1);

  check(res, {
    [`${label}: 2xx`]:      (r) => r.status === 200 || r.status === 201,
    [`${label}: has id`]:   (r) => {
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
  });

  return ok;
}

// ---------------------------------------------------------------------------
// Race A — Coin TOCTOU
// All VUs share the SAME Clerk token → same User row → concurrent
// coin read-check-decrement.
// After each booking we immediately fetch the coin balance and flag
// any negative value as an overdraft.
// ---------------------------------------------------------------------------

export function runCoinRace() {
  if (!SINGLE_TOKEN) {
    console.warn('SINGLE_REQUESTER_TOKEN not set — skipping coin_race scenario');
    sleep(1);
    return;
  }

  if (!SINGLE_PEER_ID) {
    console.warn('SINGLE_PEER_ID not set — skipping coin_race scenario');
    sleep(1);
    return;
  }

  group('race_a_coin_toctou', () => {
    // Use a unique slot offset per VU per iteration so we don't hit
    // the "same slot" guard (if it were enabled). We want the race to
    // be purely about coin arithmetic, not slot uniqueness.
    const slotOffset = Math.floor(Math.random() * 60); // 0–59 days out
    const payload    = bookingPayload(SINGLE_PEER_ID, 7 + slotOffset);
    const params     = authHeaders(SINGLE_TOKEN);

    const bookRes = http.post(`${BASE_URL}/api/peer-sessions`, payload, params);
    recordResult(bookRes, coinRaceLatency, new Rate('_discard'), 'coin_race');

    // ── Overdraft check ──────────────────────────────────────────────
    // After booking, immediately read the user's current coin balance
    // via the dashboard/profile endpoint (whatever exposes coins).
    // If balance < 0, the TOCTOU race produced an overdraft.
    const profileRes = http.get(`${BASE_URL}/api/users/me`, params);
    if (profileRes.status === 200) {
      try {
        const body = JSON.parse(profileRes.body);
        const coins = parseFloat(body.coins ?? body.user?.coins ?? '0');
        if (coins < 0) {
          coinOverdrafts.add(1);
          console.error(
            `⚠ OVERDRAFT DETECTED — User coins = ${coins}. ` +
            `This means User.coins went negative due to the TOCTOU race. ` +
            `Fix: wrap coin check + decrement in a Prisma $transaction.`
          );
        }
      } catch { /* ignore parse errors */ }
    }
  });

  // Micro-sleep to give Postgres breathing room between reads.
  // Removing this sleep makes the race MORE aggressive — adjust as needed.
  sleep(0.1);
}

// ---------------------------------------------------------------------------
// Race B — Booking Storm (same tutor)
// Each VU uses a DIFFERENT requester token, all targeting the same
// SINGLE_PEER_ID. This floods the Payment + PeerSession tables with
// rows sharing requestedToId = SINGLE_PEER_ID.
// ---------------------------------------------------------------------------

export function runBookingStorm() {
  if (REQUESTER_TOKENS.length < MIN_TOKENS) {
    console.warn(`REQUESTER_TOKENS has fewer than ${MIN_TOKENS} entries — skipping booking_storm`);
    sleep(1);
    return;
  }
  if (!SINGLE_PEER_ID) {
    console.warn('SINGLE_PEER_ID not set — skipping booking_storm');
    sleep(1);
    return;
  }

  group('race_b_booking_storm', () => {
    // Pick a token from the pool in round-robin using VU id
    const token   = REQUESTER_TOKENS[(__VU - 1) % REQUESTER_TOKENS.length];
    const payload = bookingPayload(SINGLE_PEER_ID, 8 + (__VU % 30));
    const params  = authHeaders(token);

    const res = http.post(`${BASE_URL}/api/peer-sessions`, payload, params);
    recordResult(res, bookingStormLatency, bookingStormErrors, 'booking_storm');
  });

  sleep(0.05); // 50ms between iterations per VU
}

// ---------------------------------------------------------------------------
// Race C — Partial-Write Storm
// 50 VUs, each with a unique token, fire bookings as fast as possible
// to maximise pool pressure during the untransacted write chain.
//
// After the run, the audit query in teardown() checks for sessions
// with no corresponding Payment row (proof of partial write).
// ---------------------------------------------------------------------------

export function runPartialWriteStorm() {
  if (REQUESTER_TOKENS.length < MIN_TOKENS) {
    console.warn('REQUESTER_TOKENS not set — skipping partial_write scenario');
    sleep(1);
    return;
  }
  if (PEER_USER_IDS.length === 0) {
    console.warn('PEER_USER_IDS not set — skipping partial_write scenario');
    sleep(1);
    return;
  }

  group('race_c_partial_write', () => {
    const vuIdx   = (__VU - 1) % REQUESTER_TOKENS.length;
    const peerIdx = __ITER % PEER_USER_IDS.length;
    const token   = REQUESTER_TOKENS[vuIdx];
    const peerId  = PEER_USER_IDS[peerIdx];

    // Vary both the peer and the day so many unique sessions are created
    const payload = bookingPayload(peerId, 14 + (__ITER % 60));
    const params  = authHeaders(token);

    const res = http.post(`${BASE_URL}/api/peer-sessions`, payload, params);
    const ok  = recordResult(res, partialWriteLatency, new Rate('_discard2'), 'partial_write');

    if (ok) {
      // Immediately verify the returned session has a payment embedded
      try {
        const body = JSON.parse(res.body);
        if (!body.payment || !body.payment.id) {
          // The session was created but the payment object is missing from
          // the response — likely a partial write mid-chain.
          partialWrites.add(1);
          console.error(
            `⚠ PARTIAL WRITE — session ${body.id} has no payment in response. ` +
            `Check DB: SELECT * FROM "Payment" WHERE "peerSessionId" = '${body.id}'`
          );
        }
      } catch { /* ignore */ }
    }
  });
  // No sleep — we want back-to-back writes to saturate the pool
}

// ---------------------------------------------------------------------------
// Setup — pre-flight checks
// ---------------------------------------------------------------------------

export function setup() {
  console.log('\n=== Suite 2: Write Lock Contention ===');
  console.log(`Target: ${BASE_URL}`);

  if (REQUESTER_TOKENS.length === 0) {
    console.warn(
      '\n⚠  No REQUESTER_TOKENS provided.\n' +
      '   Run the seed script first:\n' +
      '     node backend/monitoring/k6/seed/02-seed.js\n' +
      '   Then pass the output tokens via --env REQUESTER_TOKENS=\'[...]\'\n'
    );
  }

  if (!SINGLE_PEER_ID) {
    console.warn('⚠  No SINGLE_PEER_ID provided — Race A and B will be skipped.');
  }

  // Health check
  const res = http.get(`${BASE_URL}/api/browse?tab=peers&page=1&limit=1`);
  if (res.status !== 200) {
    throw new Error(`Backend health check failed: ${res.status}`);
  }

  console.log(`✓ Backend healthy`);
  console.log(`  REQUESTER_TOKENS loaded: ${REQUESTER_TOKENS.length}`);
  console.log(`  PEER_USER_IDS loaded:    ${PEER_USER_IDS.length}`);
  console.log(`  SINGLE_PEER_ID:          ${SINGLE_PEER_ID || '(not set)'}`);
  console.log(`  COIN_BUDGET per user:    ${COIN_BUDGET}\n`);

  console.log('Scenario schedule:');
  console.log('  T+0m00s  Race A — Coin TOCTOU         (2 min,  20 VUs)');
  console.log('  T+2m30s  Race B — Booking Storm        (5 min, 100 VUs ramp)');
  console.log('  T+9m00s  Race C — Partial-Write Storm  (3 min,  50 VUs)\n');

  return {};
}

// ---------------------------------------------------------------------------
// Teardown — print diagnosis
// ---------------------------------------------------------------------------

export function teardown(_data) {
  console.log('\n=== Suite 2 Complete ===');
  console.log('\nManual DB audit queries (run these against your PostgreSQL):');

  console.log(`
-- 1. Coin overdraft check (Race A)
--    Any user with negative coins is proof of the TOCTOU race.
SELECT id, name, coins FROM "User" WHERE coins < 0;

-- 2. Orphan sessions (Race C)
--    Sessions without a Payment row = partial write.
SELECT ps.id, ps."requestedById", ps."createdAt"
FROM "PeerSession" ps
LEFT JOIN "Payment" p ON p."peerSessionId" = ps.id
WHERE p.id IS NULL
  AND ps."createdAt" > NOW() - INTERVAL '1 hour';

-- 3. Duplicate time-slot bookings (disabled guard)
--    Same tutor, overlapping slots booked by different users.
SELECT
  "requestedToId",
  date,
  COUNT(*) AS bookings
FROM "PeerSession"
WHERE "sessionStatus" = 'PENDING'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY "requestedToId", date
HAVING COUNT(*) > 1
ORDER BY bookings DESC;

-- 4. Coin ledger balance check
--    Total coins in system should remain constant (zero-sum).
--    If SUM deviates from seeded total, money was created/destroyed.
SELECT SUM(coins) AS total_coins_in_system FROM "User";
`);

  console.log('Next steps:');
  console.log('  - If coin_race_overdraft_total > 0: add $transaction to requestPeerSession()');
  console.log('  - If partial_write_total > 0: wrap all 8 ops in a single Prisma $transaction');
  console.log('  - If booking_storm_error_rate > 5%: check pool exhaustion from Suite 1 results');
}
