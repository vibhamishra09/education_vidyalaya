/**
 * Suite 7 — Connection Recovery Chaos
 *
 * Measures how quickly the NestJS backend's PrismaService retry logic recovers
 * after all active database connections are forcibly terminated mid-load.
 *
 * ── What it targets ──────────────────────────────────────────────────────────
 *
 *   PrismaService (`src/prisma/prisma.service.ts`) wraps every query with:
 *
 *   1. ensureConnected()  — skips re-ping if isConnected && lastValidationAt < 30 s
 *   2. $allOperations retry loop — up to MAX_RETRIES=3:
 *        catch retryable error → isConnected=false → $disconnect → backoff (200ms, 400ms)
 *        → $connect (3 retries × 10s timeout each) → retry query
 *   3. Health check interval — every 3 minutes (won't fire during a short chaos window)
 *   4. database_up Prometheus gauge — 1=healthy, 0=failed
 *
 *   Worst-case recovery path per query (if all retries fail):
 *     query fail → 200ms backoff + reconnect → retry → 400ms backoff + reconnect → retry → throw
 *     ≈ 600ms + 2 × connect time (up to 10s each) = up to ~20s before a single request gives up
 *
 *   But in practice: first reconnect succeeds → all subsequent queries on the
 *   same connection are fine. Dark window = time from first ECONNRESET to first
 *   successful query after the pool reconnects.
 *
 * ── The chaos event ──────────────────────────────────────────────────────────
 *
 *   At T+2:00, the operator runs the companion chaos script:
 *     node backend/monitoring/k6/seed/07-chaos.js
 *
 *   The chaos script fires:
 *     SELECT pg_terminate_backend(pid)
 *     FROM pg_stat_activity
 *     WHERE datname = current_database()
 *       AND pid <> pg_backend_pid()
 *       AND state <> 'idle'   -- only active query connections
 *
 *   This kills all active Postgres backend processes the NestJS Prisma pool is using.
 *   Each killed connection receives ECONNRESET / "server closed the connection unexpectedly".
 *   PrismaService detects this → marks isConnected=false → retries with exponential backoff.
 *
 * ── Three phases ─────────────────────────────────────────────────────────────
 *
 *   Phase 1 — baseline      T+0:00 → T+2:00   200 VUs
 *     Browse + platform stats mix. Establishes p95 and error baseline.
 *
 *   Phase 2 — chaos window  T+2:30 → T+5:30   200 VUs (same traffic)
 *     The operator injects chaos at T+2:00 (30 s before this phase).
 *     Requests hitting killed connections will see ECONNRESET/P1017.
 *     The retry middleware reconnects and re-executes — dark window measured here.
 *
 *   Phase 3 — recovery hold T+5:30 → T+10:00  200 VUs (same traffic)
 *     Confirm pool is fully healthy. p95 must return to < 200ms.
 *     database_up Prometheus gauge must be back at 1.
 *
 * ── KPI (PDF) ────────────────────────────────────────────────────────────────
 *
 *   • dark_window_seconds < 60   (recovery time from chaos to first clean response)
 *   • post_chaos_error_rate < 1% (no lingering errors after recovery)
 *   • latency_recovery_ms p(95) < 300ms  (slightly looser — reconnect adds overhead)
 *
 * ── Run ──────────────────────────────────────────────────────────────────────
 *
 *   # Terminal 1 — start k6
 *   k6 run \
 *     --env BASE_URL=http://localhost:3001 \
 *     backend/monitoring/k6/07-recovery-chaos.js
 *
 *   # Terminal 2 — inject chaos at T+2:00 (watch k6 output for the prompt)
 *   node backend/monitoring/k6/seed/07-chaos.js
 *
 *   # Stream to Prometheus
 *   k6 run --out experimental-prometheus-rw \
 *     --env K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
 *     --env BASE_URL=http://localhost:3001 \
 *     backend/monitoring/k6/07-recovery-chaos.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// ─── Custom metrics ────────────────────────────────────────────────────────

// Phase-specific latency trends
const baselineLatency      = new Trend('latency_baseline_ms',       true);
const chaosLatency         = new Trend('latency_chaos_window_ms',   true);
const recoveryLatency      = new Trend('latency_recovery_ms',       true);

// Error rates per phase
const baselineErrorRate    = new Rate('baseline_error_rate');
const chaosErrorRate       = new Rate('chaos_window_error_rate');
const postChaosErrorRate   = new Rate('post_chaos_error_rate');

// Connection-error-specific counters (P1001, P1017, ECONNRESET)
const connectionErrors     = new Counter('connection_errors_total');

// Dark window: seconds between first connection error and first clean recovery
// Set once when first error is detected; read in teardown.
const darkWindowGauge      = new Gauge('dark_window_seconds');

// Retry events (detected from response body containing retry-related error codes)
const retryEvents          = new Counter('prisma_retry_events_total');

// ─── Environment ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// ─── Endpoints ────────────────────────────────────────────────────────────
//
// Two endpoints used (alternating per VU slot):
//   GET /api/browse           — 3-4 DB queries, no auth
//   GET /api/stats/platform   — 9 DB queries (6 counts + 3 aggregates), no auth
//
// The platform stats endpoint is deliberately included because its 9-query
// Promise.all is a harder target for the reconnect logic than the 3-query browse.

const ENDPOINTS = [
  // 70%: browse (3-4 DB queries)
  `${BASE_URL}/api/browse?tab=peers&page=1&limit=20`,
  `${BASE_URL}/api/browse?tab=studyRooms&page=1&limit=20`,
  `${BASE_URL}/api/browse?tab=peers&skills=Mathematics&page=1&limit=20`,
  `${BASE_URL}/api/browse?tab=peers&page=1&limit=20`,
  `${BASE_URL}/api/browse?tab=studyRooms&includeTrendingStudyRooms=true&page=1&limit=20`,
  `${BASE_URL}/api/browse?tab=peers&page=1&limit=20`,
  `${BASE_URL}/api/browse?tab=studyRooms&page=1&limit=20`,

  // 30%: platform stats (9 parallel DB queries — harder recovery target)
  `${BASE_URL}/api/stats/platform`,
  `${BASE_URL}/api/stats/platform`,
  `${BASE_URL}/api/stats/platform`,
];

// ─── Retryable error signatures ──────────────────────────────────────────

const RETRYABLE_SIGS = [
  'P1001', 'P1002', 'P1008', 'P1017', 'P2024',
  'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED',
  'Connection terminated', 'server closed the connection',
  'socket hang up', 'broken pipe',
];

function isConnectionError(body) {
  if (!body) return false;
  return RETRYABLE_SIGS.some((sig) => body.includes(sig));
}

// ─── Load profile ──────────────────────────────────────────────────────────

const N_VUS = 200;

export const options = {
  scenarios: {
    // Phase 1 — baseline (T+0:00 → T+2:00)
    baseline: {
      executor:   'constant-vus',
      vus:        N_VUS,
      duration:   '2m',
      startTime:  '0s',
      exec:       'runBaseline',
      gracefulStop: '10s',
    },

    // Phase 2 — chaos window (T+2:30 → T+5:30)
    // Starts 30 s after chaos injection (chaos injected at T+2:00 via companion script)
    chaos_window: {
      executor:   'constant-vus',
      vus:        N_VUS,
      duration:   '3m',
      startTime:  '2m30s',
      exec:       'runChaosWindow',
      gracefulStop: '10s',
    },

    // Phase 3 — recovery hold (T+5:30 → T+10:00)
    recovery_hold: {
      executor:   'constant-vus',
      vus:        N_VUS,
      duration:   '4m30s',
      startTime:  '5m30s',
      exec:       'runRecoveryHold',
      gracefulStop: '10s',
    },
  },

  thresholds: {
    // Baseline must be clean — if this fails, infra isn't ready for chaos
    'baseline_error_rate':                [{ threshold: 'rate<0.01',  abortOnFail: false }],
    'latency_baseline_ms':                [{ threshold: 'p(95)<200',  abortOnFail: false }],

    // Chaos window allows more errors (retry backoff adds latency)
    // but chaos should not cause a 100% blackout
    'chaos_window_error_rate':            [{ threshold: 'rate<0.50',  abortOnFail: false }],
    'latency_chaos_window_ms':            [{ threshold: 'p(95)<5000', abortOnFail: false }],

    // Recovery: errors must stop and latency must normalise
    'post_chaos_error_rate':              [{ threshold: 'rate<0.01',  abortOnFail: false }],
    'latency_recovery_ms':                [{ threshold: 'p(95)<300',  abortOnFail: false }],

    // PDF KPI: dark window < 60 s
    'dark_window_seconds':                [{ threshold: 'value<60',   abortOnFail: false }],
  },
};

// ─── Shared request helper ─────────────────────────────────────────────────

function pickEndpoint() {
  return ENDPOINTS[(__VU - 1) % ENDPOINTS.length];
}

/**
 * Fire one request and return { ok, dur, isConnErr, body }.
 */
function fireRequest() {
  const url   = pickEndpoint();
  const start = Date.now();
  const res   = http.get(url, { timeout: '30s' });
  const dur   = Date.now() - start;

  const ok = res.status >= 200 && res.status < 300 &&
             check(res, { 'response is JSON': (r) => {
               try { return r.body && JSON.parse(r.body) !== null; } catch (_) { return false; }
             }});

  const connErr = isConnectionError(res.body) || res.status === 503 || res.status === 504;

  return { ok, dur, connErr, body: res.body };
}

// ─── Phase 1: baseline ─────────────────────────────────────────────────────

export function runBaseline() {
  const { ok, dur, connErr } = fireRequest();

  baselineLatency.add(dur);
  baselineErrorRate.add(!ok);

  if (connErr) {
    connectionErrors.add(1);
    console.error(`[baseline VU ${__VU}] Unexpected connection error — is DB up?`);
  }

  sleep(0.1); // ~10 req/s per VU = 2,000 req/s total across 200 VUs
}

// ─── Phase 2: chaos window ─────────────────────────────────────────────────

// Track the dark window: first error timestamp → first clean response timestamp
let _chaosFirstErrorMs   = 0;
let _chaosFirstCleanMs   = 0;
let _darkWindowRecorded  = false;

export function runChaosWindow() {
  const { ok, dur, connErr, body } = fireRequest();

  chaosLatency.add(dur);
  chaosErrorRate.add(!ok);

  if (connErr || !ok) {
    connectionErrors.add(1);

    // Detect PrismaService retry events from response error details
    if (body && (body.includes('retry') || body.includes('P1017') || body.includes('P1001'))) {
      retryEvents.add(1);
    }

    // Record first error time (cross-VU shared via module-level var — approximate)
    if (_chaosFirstErrorMs === 0) {
      _chaosFirstErrorMs = Date.now();
      console.log(`[chaos] First connection error at ${new Date(_chaosFirstErrorMs).toISOString()}`);
    }
  } else {
    // Clean response after errors — record recovery point
    if (_chaosFirstErrorMs > 0 && _chaosFirstCleanMs === 0) {
      _chaosFirstCleanMs = Date.now();
      const darkWindowS = (_chaosFirstCleanMs - _chaosFirstErrorMs) / 1000;
      darkWindowGauge.add(darkWindowS);
      console.log(`[chaos] Recovery detected at ${new Date(_chaosFirstCleanMs).toISOString()}`);
      console.log(`[chaos] Dark window: ${darkWindowS.toFixed(1)} s`);
    }
  }

  sleep(0.1);
}

// ─── Phase 3: recovery hold ────────────────────────────────────────────────

export function runRecoveryHold() {
  const { ok, dur, connErr } = fireRequest();

  recoveryLatency.add(dur);
  postChaosErrorRate.add(!ok);

  if (connErr || !ok) {
    connectionErrors.add(1);
    console.warn(`[recovery VU ${__VU}] Error in recovery phase — pool may not have fully recovered`);
  }

  sleep(0.1);
}

// ─── setup / teardown ─────────────────────────────────────────────────────

export function setup() {
  const res = http.get(`${BASE_URL}/api/browse?tab=peers&page=1&limit=5`, { timeout: '10s' });
  if (res.status !== 200) {
    throw new Error(`Backend health check failed: ${res.status} — ${res.body?.slice(0, 200)}`);
  }

  console.log(`[setup] Backend healthy at ${BASE_URL}`);
  console.log('[setup] Suite 7 — Connection Recovery Chaos');
  console.log('[setup] Phase 1: baseline   T+0:00 → T+2:00 (200 VUs)');
  console.log('[setup] Phase 2: chaos      T+2:30 → T+5:30 (200 VUs — inject chaos at T+2:00)');
  console.log('[setup] Phase 3: recovery   T+5:30 → T+10:00 (200 VUs)');
  console.log('');
  console.log('>>> ACTION REQUIRED: At T+2:00, open a second terminal and run:');
  console.log('>>>   node backend/monitoring/k6/seed/07-chaos.js');
  console.log('');
  console.log('[setup] KPIs: dark_window_seconds < 60 | post_chaos_error_rate < 1%');

  return { startTs: Date.now() };
}

export function teardown(data) {
  const { startTs } = data || {};
  const elapsed = startTs ? ((Date.now() - startTs) / 60_000).toFixed(1) : '?';

  console.log('\n────────────────────────────────────────────────────────────');
  console.log('Suite 7 — Connection Recovery Chaos complete.');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`Elapsed: ${elapsed} min`);

  console.log('\n──── Dark window summary ───────────────────────────────────');
  if (_chaosFirstErrorMs > 0 && _chaosFirstCleanMs > 0) {
    const darkS = (_chaosFirstCleanMs - _chaosFirstErrorMs) / 1000;
    console.log(`  First connection error: ${new Date(_chaosFirstErrorMs).toISOString()}`);
    console.log(`  First clean response:  ${new Date(_chaosFirstCleanMs).toISOString()}`);
    console.log(`  Dark window:           ${darkS.toFixed(1)} s`);
    if (darkS < 60) {
      console.log('  ✓ KPI passed — recovery < 60 s');
    } else {
      console.log(`  ✗ KPI FAILED — recovery took ${darkS.toFixed(1)} s (limit: 60 s)`);
      console.log('    Investigate: MAX_RETRIES in prisma.service.ts, $connect timeout, PgBouncer settings');
    }
  } else if (_chaosFirstErrorMs > 0) {
    console.log('  Connection errors detected but no clean recovery observed during chaos window.');
    console.log('  Check the recovery_hold phase metrics — recovery may have completed there.');
  } else {
    console.log('  No connection errors detected — chaos may not have been injected, or');
    console.log('  PrismaService retry logic masked the errors before k6 could observe them.');
    console.log('  Check Prometheus: database_up gauge should have dipped to 0 during chaos.');
  }

  console.log('\n──── Grafana panels to review ─────────────────────────────');
  console.log('  1. latency_chaos_window_ms p95 — look for spike at chaos injection time');
  console.log('     Width of spike = dark window (should be < 60 s)');
  console.log('  2. database_up gauge — should dip to 0, then return to 1');
  console.log('     Time to return to 1 = PrismaService reconnect time');
  console.log('  3. connection_errors_total — count of ECONNRESET/P1017 during chaos window');
  console.log('  4. prisma_retry_events_total — retry middleware fires (expected during chaos)');
  console.log('  5. chaos_window_error_rate — < 50% expected (retries succeed within window)');
  console.log('  6. post_chaos_error_rate — < 1% expected (full recovery)');
  console.log('  7. latency_recovery_ms p95 — should return to < 300ms in recovery phase');

  console.log('\n──── Loki queries to correlate ────────────────────────────');
  console.log(`
{job="nestjs"} |= "Connection error"
{job="nestjs"} |= "retrying with backoff"
{job="nestjs"} |= "Connection restored"
{job="nestjs"} |= "reconnected"
{job="nestjs"} |= "P1001"
{job="nestjs"} |= "P1017"
{job="nestjs"} |= "ECONNRESET"
{job="nestjs"} |= "Health check"
`);

  console.log('\n──── Retry path analysis ───────────────────────────────────');
  console.log('  PrismaService retry chain per failing query:');
  console.log('    Attempt 1: query → ECONNRESET → isConnected=false → $disconnect → 200ms → $connect → retry');
  console.log('    Attempt 2: query → (if still failing) → $disconnect → 400ms → $connect → retry');
  console.log('    Attempt 3: query → throw (after MAX_RETRIES=3)');
  console.log('');
  console.log('  ensureConnected() skips re-ping if isConnected && lastValidatedAt < 30s');
  console.log('  → Stale connections are not proactively detected within the 30s window');
  console.log('  → First query after chaos may incur full retry cost, subsequent queries use new connection');
  console.log('');
  console.log('  Health check interval: 3 minutes — too slow to help in this test window');
  console.log('  → If dark_window > 30s: stale connection trust window is the bottleneck');
  console.log('    Fix: reduce CONNECTION_VALIDATION_INTERVAL_MS in prisma.service.ts (30_000)');

  console.log('\n──── Post-test DB audit ────────────────────────────────────');
  console.log(`
-- Connections killed during chaos (run in psql immediately after chaos injection)
SELECT count(*), state, application_name
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state, application_name;

-- Verify database_up recovered (Prometheus query)
-- database_up{job="nestjs"} — should be 1 after recovery

-- Slow query evidence from retry chain
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query ILIKE '%browse%' OR query ILIKE '%User%'
ORDER BY max_exec_time DESC
LIMIT 10;
`);
}
