/**
 * Suite 3: recurrence.util Overhead — StudyRoom Bulk Insert
 *
 * Goal: Quantify the DB cost of createStudyRoom() with recurring
 *       schedules and find the concurrency level that exhausts the pool.
 *
 * Why this endpoint is uniquely dangerous:
 *
 *   For a DAILY room spanning 1 year, a single POST /api/study-rooms
 *   triggers:
 *
 *     prisma.$transaction(async (tx) => {
 *       for (const occurrence of occurrences) {      // up to 366 iterations
 *         await tx.studyRoom.create({ skills: { create: [...] } })  // 1 + N_SKILLS writes
 *       }
 *       await tx.studyRoom.updateMany(...)            // 1 updateMany
 *     })
 *
 *     for (const room of createdRooms) {             // sequential, NOT Promise.all
 *       await chatService.getOrCreateChannelForStudyRoom(room.id, [...])
 *     }
 *
 *   With 3 skills per room and 366 occurrences:
 *     366 × (1 studyRoom.create + 3 studyRoomSkill.create)  = 1,464 writes in tx
 *     366 × (1 Channel.create + 1 ChannelMember.create)     =   732 writes after tx
 *     ─────────────────────────────────────────────────────────────────────
 *     Total DB ops per single request                        ≈ 2,196
 *
 *   The $transaction holds ONE connection for its entire duration.
 *   With N concurrent blast VUs, N connections are pinned for seconds,
 *   starving all other queries waiting in the pool.
 *
 * Four scenarios (run sequentially, no VU overlap):
 *
 *   A — Baseline      : non-recurring (1 room), 200 VUs, 3 min
 *                       establishes p95 < 200ms floor
 *
 *   B — Weekly burst  : WEEKLY/Mon+Wed+Fri/6 months (~78 rooms), 20 VUs, 3 min
 *                       first meaningful recurrence pressure
 *
 *   C — Daily blast   : DAILY/1-year (366 rooms), 5 VUs, 3 min
 *                       maximum write amplification
 *
 *   D — Starvation    : Scenario C blast (5 VUs) + browse reads (100 VUs) simultaneously
 *                       does the long transaction starve the pool for read queries?
 *
 * ─── Prerequisites ────────────────────────────────────────────────────
 *
 *   Reuses the seed users from Suite 2. Run Suite 2 seed first if you
 *   haven't already:
 *     node backend/monitoring/k6/seed/02-seed.js
 *
 *   k6 run \
 *     --env BASE_URL=http://localhost:3001 \
 *     --env REQUESTER_TOKENS='["tok_1","tok_2",...]' \
 *     backend/monitoring/k6/03-recurrence-overhead.js
 *
 * ─── KPIs ─────────────────────────────────────────────────────────────
 *   Latency p95 (baseline, non-recurring)  < 200ms
 *   Latency p95 (weekly ~78 rooms)         < 2,000ms   (10× budget for bulk)
 *   Latency p95 (daily blast 366 rooms)    < 15,000ms  (max tx duration budget)
 *   recurrence_correctness_failures        = 0         (occurrencesCreated must match expected)
 *   pool_starvation_browse_error_rate      < 1%        (reads must not fail during blast)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL         = __ENV.BASE_URL || 'http://localhost:3001';
const TOKENS: string[] = JSON.parse(__ENV.REQUESTER_TOKENS || '[]');

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

// Per-scenario latency (allows separate p95 thresholds per recurrence size)
const latencyBaseline = new Trend('latency_single_room_ms',   true);
const latencyWeekly   = new Trend('latency_weekly_78_ms',     true);
const latencyDailyBlast = new Trend('latency_daily_366_ms',   true);
const latencyBrowseDuringBlast = new Trend('latency_browse_during_blast_ms', true);

// Correctness: did the server create the expected number of occurrences?
const correctnessFails = new Counter('recurrence_correctness_failures');

// Error rates per scenario
const baselineErrors  = new Rate('baseline_error_rate');
const weeklyErrors    = new Rate('weekly_error_rate');
const blastErrors     = new Rate('blast_error_rate');
const starvationRate  = new Rate('pool_starvation_browse_error_rate');

// Total rooms written to DB (for monitoring the actual write amplification)
const roomsCreated    = new Counter('study_rooms_created_total');

// ---------------------------------------------------------------------------
// Load profile
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {

    // ── A: Baseline — single room, high concurrency ──────────────────
    // Proves the endpoint handles load when there is no recurrence overhead.
    // Sets the p95 floor we'll compare all other scenarios against.
    baseline_single: {
      executor: 'constant-vus',
      vus: 200,
      duration: '3m',
      exec: 'runBaseline',
      startTime: '0s',
      tags: { scenario: 'baseline' },
    },

    // ── B: Weekly recurrence — moderate bulk insert ───────────────────
    // Mon+Wed+Fri weekly for 6 months ≈ 78 rooms per request.
    // 20 VUs × 78 rooms = 1,560 studyRoom.create calls/iteration.
    weekly_burst: {
      executor: 'constant-vus',
      vus: 20,
      duration: '3m',
      exec: 'runWeekly',
      startTime: '4m',     // 3m scenario + 1m cool-down
      tags: { scenario: 'weekly' },
    },

    // ── C: Daily blast — maximum recurrence (366 rooms / request) ─────
    // 5 VUs is enough — each holds a $transaction for several seconds.
    // The goal is to measure transaction duration and find where it fails,
    // NOT to maximise throughput.
    daily_blast: {
      executor: 'constant-vus',
      vus: 5,
      duration: '3m',
      exec: 'runDailyBlast',
      startTime: '8m',
      tags: { scenario: 'daily_blast' },
    },

    // ── D: Starvation probe — blast + reads in parallel ───────────────
    // Run the daily blast concurrently with browse reads.
    // The blast VUs hold pool connections inside $transaction.
    // If browse latency or error rate spikes, the pool is being starved.
    starvation_blast: {
      executor: 'constant-vus',
      vus: 5,
      duration: '3m',
      exec: 'runDailyBlast',     // reuse blast exec
      startTime: '12m',
      tags: { scenario: 'starvation_blast' },
    },
    starvation_browse: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m',
      exec: 'runBrowseDuringBlast',
      startTime: '12m',          // exactly overlaps with starvation_blast
      tags: { scenario: 'starvation_browse' },
    },
  },

  thresholds: {
    // Global
    'http_req_duration{scenario:baseline}':      ['p(95)<200'],
    'http_req_duration{scenario:weekly}':        ['p(95)<2000'],
    'http_req_duration{scenario:daily_blast}':   ['p(95)<15000'],

    // Per-metric
    latency_single_room_ms:        ['p(95)<200'],
    latency_weekly_78_ms:          ['p(95)<2000'],
    latency_daily_366_ms:          ['p(95)<15000'],

    // Zero tolerance for correctness errors (wrong room count) and starvation
    recurrence_correctness_failures: ['count<1'],
    pool_starvation_browse_error_rate: ['rate<0.01'],

    // Per-scenario error rates
    baseline_error_rate: ['rate<0.01'],
    weekly_error_rate:   ['rate<0.01'],
    blast_error_rate:    ['rate<0.05'],   // 5% tolerance — some timeouts at 366 rooms expected
  },
};

// ---------------------------------------------------------------------------
// Date helpers (computed once, not per VU — avoids clock skew)
// ---------------------------------------------------------------------------

// Build YYYY-MM-DD string N days from now
function futureDate(daysFromNow) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

const START_DATE       = futureDate(1);    // tomorrow
const END_WEEKLY_6MO   = futureDate(182);  // 6 months out
const END_DAILY_1YR    = futureDate(364);  // 1 year out (364 = 365 occurrences)

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

// Scenario A: no recurrence — 1 room
function payloadSingle(title) {
  return JSON.stringify({
    title,
    description: 'k6 baseline test room',
    date:     START_DATE,
    time:     '10:00',
    timezone: 'UTC',
    duration: 60,
    maxParticipants: 10,
    joiningFee: 0,
    skills:   ['JavaScript'],
  });
}

// Scenario B: WEEKLY / Mon+Wed+Fri / 6 months ≈ 78 occurrences
function payloadWeekly(title) {
  return JSON.stringify({
    title,
    description: 'k6 weekly recurrence test',
    date:     START_DATE,
    time:     '10:00',
    timezone: 'UTC',
    duration: 60,
    maxParticipants: 10,
    joiningFee: 0,
    skills:   ['JavaScript', 'Python'],
    recurrence: {
      mode:        'WEEKLY',
      interval:    1,
      weekdays:    [1, 3, 5],          // Monday, Wednesday, Friday
      repeatUntil: END_WEEKLY_6MO,
    },
  });
}

// Scenario C: DAILY / every day / 1 year = 365 occurrences
function payloadDailyBlast(title) {
  return JSON.stringify({
    title,
    description: 'k6 daily blast recurrence test',
    date:     START_DATE,
    time:     '10:00',
    timezone: 'UTC',
    duration: 60,
    maxParticipants: 10,
    joiningFee: 0,
    skills:   ['JavaScript', 'Python', 'TypeScript'],
    recurrence: {
      mode:        'DAILY',
      interval:    1,
      repeatUntil: END_DAILY_1YR,
    },
  });
}

// ---------------------------------------------------------------------------
// Token picker
// ---------------------------------------------------------------------------

function pickToken() {
  if (TOKENS.length === 0) return null;
  return TOKENS[(__VU - 1) % TOKENS.length];
}

function authParams(token) {
  return {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    // Per-scenario timeouts:
    // Baseline needs only 5s; blast may need up to 60s for 366 rooms.
    // We set 90s to not mask the real latency with a k6 abort.
    timeout: '90s',
  };
}

// ---------------------------------------------------------------------------
// Shared response handler
// ---------------------------------------------------------------------------

function handleCreate(res, latencyMetric, errorRate, scenario, expectedOccurrences) {
  const ok = res.status === 200 || res.status === 201;

  latencyMetric.add(res.timings.duration);
  errorRate.add(ok ? 0 : 1);

  check(res, {
    [`${scenario}: status 2xx`]: (r) => r.status === 200 || r.status === 201,
    [`${scenario}: has id`]:     (r) => {
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
    [`${scenario}: correct occurrences created`]: (r) => {
      if (!ok || expectedOccurrences == null) return true;
      try {
        const body = JSON.parse(r.body);
        const created = body.occurrencesCreated ?? 1;
        if (created !== expectedOccurrences) {
          correctnessFails.add(1);
          console.error(
            `⚠ CORRECTNESS FAIL [${scenario}]: expected ${expectedOccurrences} occurrences, ` +
            `got ${created}. SeriesId: ${body.seriesId}`
          );
          return false;
        }
        return true;
      } catch { return true; }
    },
  });

  if (ok) {
    try {
      const body = JSON.parse(res.body);
      roomsCreated.add(body.occurrencesCreated ?? 1);
    } catch { /* ignore */ }
  }

  return ok;
}

// ---------------------------------------------------------------------------
// Scenario A — Baseline (single room, no recurrence)
// ---------------------------------------------------------------------------

export function runBaseline() {
  const token = pickToken();
  if (!token) { sleep(1); return; }

  group('scenario_a_baseline', () => {
    const title   = `k6-single-${__VU}-${__ITER}`;
    const payload = payloadSingle(title);
    const res     = http.post(`${BASE_URL}/api/study-rooms`, payload, authParams(token));
    handleCreate(res, latencyBaseline, baselineErrors, 'baseline', 1);
  });

  sleep(0.2);
}

// ---------------------------------------------------------------------------
// Scenario B — Weekly recurrence (~78 occurrences per request)
// ---------------------------------------------------------------------------

export function runWeekly() {
  const token = pickToken();
  if (!token) { sleep(1); return; }

  group('scenario_b_weekly', () => {
    const title   = `k6-weekly-${__VU}-${__ITER}`;
    const payload = payloadWeekly(title);
    const res     = http.post(`${BASE_URL}/api/study-rooms`, payload, authParams(token));
    // ~78 occurrences: Mon+Wed+Fri across 26 weeks
    handleCreate(res, latencyWeekly, weeklyErrors, 'weekly', null); // null = skip exact count check
  });

  // Longer sleep — each request is heavy; don't pile them up
  sleep(1);
}

// ---------------------------------------------------------------------------
// Scenario C / D(blast) — Daily blast (365 occurrences per request)
// ---------------------------------------------------------------------------

export function runDailyBlast() {
  const token = pickToken();
  if (!token) { sleep(1); return; }

  group('scenario_c_daily_blast', () => {
    const title   = `k6-daily-${__VU}-${__ITER}`;
    const payload = payloadDailyBlast(title);
    const res     = http.post(`${BASE_URL}/api/study-rooms`, payload, authParams(token));
    // 1 day from now to 364 days from now inclusive = 364 occurrences
    handleCreate(res, latencyDailyBlast, blastErrors, 'daily_blast', 364);
  });

  // After a blast request, give the pool a moment — we're measuring
  // saturation, not maximising throughput.
  sleep(2);
}

// ---------------------------------------------------------------------------
// Scenario D(browse) — Browse reads running DURING the daily blast
// Purpose: does the long $transaction starve the pool for reads?
// ---------------------------------------------------------------------------

export function runBrowseDuringBlast() {
  group('scenario_d_browse_during_blast', () => {
    const res = http.get(
      `${BASE_URL}/api/browse?tab=peers&page=1&limit=12`,
      { headers: { Accept: 'application/json' }, timeout: '10s' },
    );

    const ok = res.status === 200;
    latencyBrowseDuringBlast.add(res.timings.duration);
    starvationRate.add(ok ? 0 : 1);

    check(res, {
      'browse_during_blast: status 200': (r) => r.status === 200,
      'browse_during_blast: p95 < 200ms': (r) => r.timings.duration < 200,
    });
  });
  // No sleep — we want sustained read pressure during the blast
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function setup() {
  console.log('\n=== Suite 3: recurrence.util Overhead ===');
  console.log(`Target:  ${BASE_URL}`);
  console.log(`Tokens:  ${TOKENS.length} loaded`);

  if (TOKENS.length === 0) {
    console.warn(
      '\n⚠  No REQUESTER_TOKENS. Run the seed script first:\n' +
      '   node backend/monitoring/k6/seed/02-seed.js\n'
    );
  }

  // Health check
  const res = http.get(`${BASE_URL}/api/browse?tab=peers&page=1&limit=1`);
  if (res.status !== 200) {
    throw new Error(`Backend not healthy: ${res.status}`);
  }

  console.log('✓ Backend healthy\n');
  console.log('Scenario schedule:');
  console.log('  T+0m   Scenario A — baseline (1 room/req,  200 VUs, 3 min)');
  console.log('  T+4m   Scenario B — weekly   (~78 rooms/req, 20 VUs, 3 min)');
  console.log('  T+8m   Scenario C — blast    (365 rooms/req,  5 VUs, 3 min)');
  console.log('  T+12m  Scenario D — starvation (5 blast + 100 browse VUs, 3 min)');
  console.log('  ─────────────────────────────────────────────────────────');
  console.log('  Total: ~16 minutes\n');

  console.log('Per-request DB write amplification:');
  console.log('  Scenario A:  ~6   DB ops (1 studyRoom + 1 skill + channel)');
  console.log('  Scenario B:  ~471 DB ops (78 rooms × 3 writes + 78×2 channel)');
  console.log('  Scenario C:  ~2196 DB ops (365 rooms × 4 writes + 365×2 channel)\n');

  return {
    startDate:    START_DATE,
    endWeekly:    END_WEEKLY_6MO,
    endDailyBlast: END_DAILY_1YR,
  };
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

export function teardown(data) {
  console.log('\n=== Suite 3 Complete ===\n');

  console.log('Key questions from the results:');
  console.log('');
  console.log('1. latency_single_room_ms p95 vs latency_daily_366_ms p95');
  console.log('   → Ratio tells you the per-occurrence cost in DB time.');
  console.log('   → If daily_blast p95 > 15,000ms: the transaction is too slow for production.');
  console.log('   → Fix: replace the sequential for-loop with prisma.studyRoom.createMany()');
  console.log('     and handle skills separately, to reduce 366 roundtrips → 1.');
  console.log('');
  console.log('2. pool_starvation_browse_error_rate (Scenario D)');
  console.log('   → If > 1%: 5 blast VUs holding connections starved 100 browse VUs.');
  console.log('   → Fix: set a transaction timeout in Prisma or increase connection_limit.');
  console.log('');
  console.log('3. recurrence_correctness_failures');
  console.log('   → If > 0: the recurrence engine produced wrong occurrence counts.');
  console.log('   → Check: does buildStudyRoomOccurrences() handle year boundaries correctly?');
  console.log('');
  console.log('DB audit queries:');
  console.log(`
-- 1. Confirm total rooms created this run (should equal study_rooms_created_total counter)
SELECT COUNT(*) FROM "StudyRoom"
WHERE title LIKE 'k6-%'
  AND "createdAt" > NOW() - INTERVAL '1 hour';

-- 2. Confirm series integrity (every occurrence in a series has the same seriesRootId)
SELECT "seriesId", COUNT(*) AS occurrences, COUNT(DISTINCT "seriesRootId") AS roots
FROM "StudyRoom"
WHERE "seriesId" IS NOT NULL
  AND "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY "seriesId"
HAVING COUNT(DISTINCT "seriesRootId") > 1;   -- should return 0 rows

-- 3. Find orphan rooms (series without chat channels — partial write)
SELECT sr.id, sr.title, sr."seriesId"
FROM "StudyRoom" sr
LEFT JOIN "Channel" ch ON ch."externalId" = sr.id AND ch."externalType" = 'studyRoom'
WHERE sr.title LIKE 'k6-daily-%'
  AND sr."createdAt" > NOW() - INTERVAL '1 hour'
  AND ch.id IS NULL;   -- should return 0 rows

-- 4. Largest series (confirm 365 occurrence limit is respected)
SELECT "seriesId", COUNT(*) AS cnt
FROM "StudyRoom"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY "seriesId"
ORDER BY cnt DESC
LIMIT 5;

-- 5. Clean up after testing
DELETE FROM "StudyRoom" WHERE title LIKE 'k6-%'
  AND "createdAt" > NOW() - INTERVAL '2 hours';
`);
}
