/**
 * Suite 6 — Thundering Herd (Session Rush)
 *
 * PDF Scenario B: "Session Rush" — instant spike to 1,000 VUs, held for 20 minutes.
 *
 * Unlike Suite 1 (ramp to 1,000 over 19 minutes), all 1,000 VUs start simultaneously.
 * This is the thundering herd failure mode: connection pool, Fargate task, and NestJS
 * process are all hit with maximum concurrency before any warm-up path is exercised.
 *
 * ── What changes vs Suite 1 ──────────────────────────────────────────────────────
 *
 *   Suite 1  — ramp: 1 min @ 50 VUs → 2 min @ 100 → … → 7 min @ 1,000 VUs
 *              Pool fills slowly; Fargate can autoscale before saturation.
 *
 *   Suite 6  — instant: 0 s → 1,000 VUs simultaneously (no ramp at all)
 *              Fargate has no time to scale; pool is immediately contested.
 *              Expected failures: P2024 ConnectionPoolTimeout in the first ~60 s,
 *              followed by stabilisation as the pool queues and Fargate adds tasks.
 *
 * ── Endpoint under test ─────────────────────────────────────────────────────────
 *
 *   GET /api/browse   — unauthenticated, 3–4 DB queries per request (COUNT×2 +
 *                       findMany JOIN + optional trending). No auth token required.
 *
 * ── Query shape distribution ────────────────────────────────────────────────────
 *
 *   VU % 10 determines shape (same proportions as Suite 1 to allow direct comparison):
 *     0–3 (40%)  browse_peers         — tab=peers
 *     4–6 (30%)  browse_studyRooms    — tab=studyRooms
 *     7–8 (20%)  browse_peers_filter  — tab=peers&skills=Mathematics,Programming
 *     9   (10%)  browse_rooms_trending — tab=studyRooms&includeTrendingStudyRooms=true
 *
 * ── KPIs (PDF Scenario B) ───────────────────────────────────────────────────────
 *
 *   • p95 latency   < 200 ms (steady-state after pool stabilises)
 *   • error rate    < 1%
 *   • db_pool_timeouts_total = 0  (zero P2024 errors)
 *   • Fargate autoscale < 60 s from spike onset
 *   • first_failure_minute — printed in teardown; the minute where p95 first exceeds
 *     200 ms or error rate first exceeds 1%.
 *
 * ── What to look for ────────────────────────────────────────────────────────────
 *
 *   1. "Spike wall": check Grafana for the latency cliff at T+0:00. Width of the
 *      cliff (how many minutes before p95 returns to < 200 ms) = recovery time.
 *   2. P2024 burst: {job="nestjs"} |= "P2024" — count lines in the first 2 minutes.
 *   3. Compare throughput_req_per_s trend between Suite 1 and Suite 6 at 1,000 VUs.
 *      Thundering herd typically achieves lower throughput due to connection queuing.
 *
 * ── No seed required ────────────────────────────────────────────────────────────
 *
 *   GET /api/browse is unauthenticated. Run directly:
 *
 *   k6 run \
 *     --env BASE_URL=http://localhost:3001 \
 *     backend/monitoring/k6/06-thundering-herd.js
 *
 *   Stream to Prometheus:
 *   k6 run --out experimental-prometheus-rw \
 *     --env K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
 *     --env BASE_URL=http://localhost:3001 \
 *     backend/monitoring/k6/06-thundering-herd.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// ─── Custom metrics ────────────────────────────────────────────────────────

// Per-shape latency trends (p50/p95/p99 per query shape)
const latencyPeers        = new Trend('latency_browse_peers_ms',          true);
const latencyRooms        = new Trend('latency_browse_studyrooms_ms',      true);
const latencyPeersFilter  = new Trend('latency_browse_peers_filtered_ms',  true);
const latencyRoomsTrend   = new Trend('latency_browse_rooms_trending_ms',  true);

// Error tracking
const errorRate           = new Rate('thundering_herd_error_rate');
const dbPoolTimeouts      = new Counter('db_pool_timeouts_total');

// Throughput
const requestsPerSecond   = new Trend('throughput_req_per_s', true);

// Active VU gauge — tracks how many VUs are mid-request (not sleeping)
const activeVus           = new Gauge('active_vus_gauge');

// ─── Environment ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// ─── Query shapes ─────────────────────────────────────────────────────────

const SHAPES = [
  // 40%: bare peers browse
  { url: `${BASE_URL}/api/browse?tab=peers&page=1&limit=20`,               metric: latencyPeers       },
  { url: `${BASE_URL}/api/browse?tab=peers&page=1&limit=20`,               metric: latencyPeers       },
  { url: `${BASE_URL}/api/browse?tab=peers&page=1&limit=20`,               metric: latencyPeers       },
  { url: `${BASE_URL}/api/browse?tab=peers&page=1&limit=20`,               metric: latencyPeers       },

  // 30%: bare study rooms browse
  { url: `${BASE_URL}/api/browse?tab=studyRooms&page=1&limit=20`,          metric: latencyRooms       },
  { url: `${BASE_URL}/api/browse?tab=studyRooms&page=1&limit=20`,          metric: latencyRooms       },
  { url: `${BASE_URL}/api/browse?tab=studyRooms&page=1&limit=20`,          metric: latencyRooms       },

  // 20%: peers with skill filter (WHERE on UserSkill index)
  { url: `${BASE_URL}/api/browse?tab=peers&skills=Mathematics,Programming&page=1&limit=20`, metric: latencyPeersFilter },
  { url: `${BASE_URL}/api/browse?tab=peers&skills=Mathematics,Programming&page=1&limit=20`, metric: latencyPeersFilter },

  // 10%: study rooms + trending (extra getTrendingStudyRooms() query)
  { url: `${BASE_URL}/api/browse?tab=studyRooms&includeTrendingStudyRooms=true&page=1&limit=20`, metric: latencyRoomsTrend },
];

// ─── Load profile ──────────────────────────────────────────────────────────
//
//   Instant spike: 0 → 1,000 VUs simultaneously (no gracefulRampDown — hard stop)
//   Hold:          20 minutes
//
//   This deliberately skips any ramp-up to simulate the thundering herd condition
//   where all connections arrive before the pool or Fargate can warm up.

export const options = {
  scenarios: {
    thundering_herd: {
      executor:           'constant-vus',
      vus:                1000,
      duration:           '20m',
      // No startTime offset — all 1,000 VUs start at T+0:00 simultaneously
      gracefulStop:       '5s',        // short — we want hard latency data at the cliff edge
    },
  },

  thresholds: {
    // PDF KPIs — evaluated over the full 20-minute run.
    // Note: p95 > 200ms during the first 60 s spike is expected.
    // Set abortOnFail: false to collect the full profile even if the spike breaches the threshold.
    'latency_browse_peers_ms':           [{ threshold: 'p(95)<200',  abortOnFail: false }],
    'latency_browse_studyrooms_ms':      [{ threshold: 'p(95)<200',  abortOnFail: false }],
    'latency_browse_peers_filtered_ms':  [{ threshold: 'p(95)<300',  abortOnFail: false }],
    'latency_browse_rooms_trending_ms':  [{ threshold: 'p(95)<300',  abortOnFail: false }],

    // Zero pool timeouts (P2024) in steady-state — failing this means the pool never recovered
    'db_pool_timeouts_total':            [{ threshold: 'count<1',    abortOnFail: false }],

    // Overall error rate < 1%
    'thundering_herd_error_rate':        [{ threshold: 'rate<0.01',  abortOnFail: false }],

    // k6 built-in: overall p95 across all requests
    'http_req_duration':                 [{ threshold: 'p(95)<200',  abortOnFail: false }],
  },
};

// ─── VU iteration ─────────────────────────────────────────────────────────

export default function () {
  // Pick query shape based on VU index (deterministic distribution)
  const shape = SHAPES[(__VU - 1) % SHAPES.length];

  activeVus.add(1);

  const start = Date.now();
  const res   = http.get(shape.url, { timeout: '15s' });
  const dur   = Date.now() - start;

  activeVus.add(-1);

  // Record per-shape latency
  shape.metric.add(dur);
  requestsPerSecond.add(1);

  const ok = check(res, {
    'browse: 200 OK':                (r) => r.status === 200,
    'browse: body is JSON array':    (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null && typeof body === 'object';
      } catch (_) { return false; }
    },
  });

  errorRate.add(!ok);

  // Detect P2024 ConnectionPoolTimeout in response body
  if (res.body && res.body.includes('P2024')) {
    dbPoolTimeouts.add(1);
    console.error(`[VU ${__VU}] P2024 ConnectionPoolTimeout at ${new Date().toISOString()}`);
  }

  // Also flag 504/503 as potential pool timeout proxies (Fargate ALB timeout)
  if (res.status === 503 || res.status === 504) {
    dbPoolTimeouts.add(1);
    console.error(`[VU ${__VU}] HTTP ${res.status} (pool/proxy timeout) at ${new Date().toISOString()}`);
  }

  // No sleep — maximum concurrency pressure. Each VU loops immediately.
  // This is intentional: the thundering herd must not self-throttle.
}

// ─── setup / teardown ─────────────────────────────────────────────────────

export function setup() {
  const res = http.get(`${BASE_URL}/api/browse?tab=peers&page=1&limit=5`, { timeout: '10s' });
  if (res.status !== 200) {
    throw new Error(`Backend health check failed: ${res.status} — ${res.body?.slice(0, 200)}`);
  }

  console.log(`[setup] Backend healthy at ${BASE_URL}`);
  console.log(`[setup] Thundering herd: 1,000 VUs starting simultaneously — no ramp`);
  console.log(`[setup] Hold duration: 20 minutes`);
  console.log(`[setup] Query shape distribution:`);
  console.log(`         40%  tab=peers (bare)`);
  console.log(`         30%  tab=studyRooms (bare)`);
  console.log(`         20%  tab=peers + skill filter`);
  console.log(`         10%  tab=studyRooms + includeTrendingStudyRooms=true`);
  console.log(`[setup] KPIs: p95 < 200ms | error_rate < 1% | db_pool_timeouts = 0`);

  return { startTs: Date.now() };
}

export function teardown(data) {
  const { startTs } = data || {};
  const elapsedMin  = startTs ? ((Date.now() - startTs) / 60_000).toFixed(1) : '?';

  console.log('\n────────────────────────────────────────────────────────────');
  console.log('Suite 6 — Thundering Herd complete.');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`Elapsed: ${elapsedMin} min`);

  console.log('\n──── Grafana panels to review ─────────────────────────────');
  console.log('  1. latency_browse_peers_ms p95 — look for the spike cliff at T+0:00');
  console.log('     Recovery width (minutes until p95 < 200 ms) = thundering herd recovery time');
  console.log('  2. db_pool_timeouts_total — non-zero = pool never recovered after spike');
  console.log('  3. active_vus_gauge — should stay ≈ 1,000 throughout (no VU churn)');
  console.log('  4. throughput_req_per_s — compare with Suite 1 @ 1,000 VUs:');
  console.log('     lower throughput here = connection queuing overhead from thundering herd');
  console.log('  5. Fargate task count metric — first new task start should be < 60 s from T+0');

  console.log('\n──── Loki queries ─────────────────────────────────────────');
  console.log(`
{job="nestjs"} |= "P2024"
{job="nestjs"} |= "ConnectionPoolTimeout"
{job="nestjs"} |= "pool_timeout"
{job="nestjs"} |= "503"
{job="nestjs"} |= "504"
`);

  console.log('\n──── Post-test DB audit queries ───────────────────────────');
  console.log(`
-- Pool saturation evidence: check max connection count during the test
SELECT count(*), state
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Index hit rate (should be > 99% after the storm)
SELECT
  schemaname,
  tablename,
  idx_scan,
  seq_scan,
  round(idx_scan::numeric / NULLIF(idx_scan + seq_scan, 0) * 100, 2) AS idx_hit_pct
FROM pg_stat_user_tables
WHERE tablename IN ('User', 'StudyRoom', 'UserSkill')
ORDER BY seq_scan DESC
LIMIT 10;

-- Slow queries during the test window (requires pg_stat_statements)
SELECT query, calls, mean_exec_time, max_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query ILIKE '%browse%'
ORDER BY mean_exec_time DESC
LIMIT 10;
`);

  console.log('\n──── Comparison with Suite 1 ───────────────────────────────');
  console.log('  Suite 1 (ramp):      50 → 1,000 VUs over ~19 min');
  console.log('  Suite 6 (thundering): 0 → 1,000 VUs at T+0:00');
  console.log('');
  console.log('  If Suite 6 shows a latency spike but Suite 1 does not:');
  console.log('    → Connection pool warm-up time is the bottleneck.');
  console.log('    Fix: pgBouncer pre-warm, or increase connection_limit.');
  console.log('');
  console.log('  If both suites fail at 1,000 VUs:');
  console.log('    → Pool limit is the bottleneck regardless of arrival pattern.');
  console.log('    Fix: increase connection_limit in DATABASE_URL, or add read replica.');
  console.log('');
  console.log('  If Suite 6 error_rate > Suite 1 error_rate @ same VU count:');
  console.log('    → NestJS worker thread pool or event loop is the bottleneck during spike.');
  console.log('    Fix: PM2 cluster mode / additional Fargate tasks at startup.');
}
