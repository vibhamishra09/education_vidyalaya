/**
 * Suite 1: Prisma Connection Pool Exhaustion Ramp
 *
 * Goal: Find the exact VU count at which P2024 (ConnectionPoolTimeout) errors
 *       begin. Every iteration fires 3+ DB queries via GET /api/browse
 *       (two COUNTs + one JOIN-heavy findMany with inline rating aggregation).
 *
 * KPIs (from PDF):
 *   - p95 latency  < 200ms
 *   - error rate   < 1%
 *   - target load  = 1,000 concurrent VUs
 *
 * Run:
 *   k6 run --env BASE_URL=http://localhost:3001 \
 *          backend/monitoring/k6/01-pool-exhaustion.js
 *
 * Optional env vars:
 *   BASE_URL          – backend origin          (default: http://localhost:3001)
 *   POOL_LIMIT        – expected pool size hint  (default: 10, informational)
 *   RAMP_HOLD_MINUTES – minutes to hold at 1000 VUs (default: 5)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
// import { htmlReport } from 'https://raw.githubusercontent.com/grafana/xk6-dashboard/0.7.3/packages/xk6-dashboard/dashboard.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const RAMP_HOLD_MINUTES = parseInt(__ENV.RAMP_HOLD_MINUTES || '5', 10);

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

// Tracks 504 / P2024-style responses (pool timeout)
const poolTimeouts = new Counter('db_pool_timeouts_total');

// Tracks every non-2xx that is NOT a 504 (validation errors, etc.)
const otherErrors = new Counter('other_errors_total');

// Per-query-type latency — lets us spot which query shape breaks first
const latencyPeersTab       = new Trend('latency_browse_peers_ms',        true);
const latencyStudyRoomsTab  = new Trend('latency_browse_studyrooms_ms',   true);
const latencyFilteredPeers  = new Trend('latency_browse_peers_filtered_ms', true);
const latencyFilteredRooms  = new Trend('latency_browse_rooms_trending_ms', true);

// Current active VU count (informational — visible in Grafana via k6 → Prometheus)
const errorRate = new Rate('error_rate');

// ---------------------------------------------------------------------------
// Load profile  ← the staged ramp defined in the PDF (page 3 + 10)
// ---------------------------------------------------------------------------

const holdDuration = `${RAMP_HOLD_MINUTES}m`;

export const options = {
  // Staged ramp: warm up → incremental steps → hold at target → cool down
  stages: [
    { duration: '1m',  target: 50   },  // baseline warm-up
    { duration: '2m',  target: 100  },  // step 1
    { duration: '2m',  target: 200  },  // step 2
    { duration: '2m',  target: 400  },  // step 3 — first signs of pool pressure
    { duration: '2m',  target: 600  },  // step 4
    { duration: '2m',  target: 800  },  // step 5
    { duration: '2m',  target: 1000 },  // step 6 — target throughput (PDF KPI)
    { duration: holdDuration, target: 1000 },  // hold — confirm sustained stability
    { duration: '2m',  target: 0    },  // cool-down
  ],

  thresholds: {
    // Primary KPIs from PDF page 12
    http_req_duration:         ['p(95)<200'],   // p95 must stay under 200ms
    error_rate:                ['rate<0.01'],    // < 1% errors across all requests

    // Suite-specific: zero pool timeout budget during ramp phases
    // (we expect some during hold; this is the discovery threshold)
    db_pool_timeouts_total:    ['count<1'],      // FAILS as soon as first P2024 hits

    // Per-query-shape latency budgets — tighter than global p95
    latency_browse_peers_ms:        ['p(95)<200'],
    latency_browse_studyrooms_ms:   ['p(95)<200'],
    latency_browse_peers_filtered_ms: ['p(95)<300'], // filtered query is heavier
    latency_browse_rooms_trending_ms: ['p(95)<300'], // trending needs extra query
  },
};

// ---------------------------------------------------------------------------
// Query variants — four shapes that map to different Prisma query paths
// ---------------------------------------------------------------------------

// Shape A: bare peers tab — COUNT×2 + user.findMany (JOIN: userSkills, reviewsReceived, _count)
function queryPeers(params) {
  const url = `${BASE_URL}/api/browse?tab=peers&page=1&limit=12`;
  const res = http.get(url, params);
  latencyPeersTab.add(res.timings.duration);
  return res;
}

// Shape B: bare studyRooms tab — COUNT×2 + studyRoom.findMany (JOIN: createdBy, skills, learners)
function queryStudyRooms(params) {
  const url = `${BASE_URL}/api/browse?tab=studyRooms&page=1&limit=12`;
  const res = http.get(url, params);
  latencyStudyRoomsTab.add(res.timings.duration);
  return res;
}

// Shape C: skill-filtered peers — same as A but WHERE clause on UserSkill JOIN
// This forces Postgres to traverse the UserSkill index on every row
function queryFilteredPeers(params) {
  const url = `${BASE_URL}/api/browse?tab=peers&page=1&limit=12&skills=JavaScript&skills=Python`;
  const res = http.get(url, params);
  latencyFilteredPeers.add(res.timings.duration);
  return res;
}

// Shape D: studyRooms + trending — triggers a 4th DB query (getTrendingStudyRooms)
// This is the heaviest single request: COUNT×2 + findMany + getTrending
function queryRoomsWithTrending(params) {
  const url = `${BASE_URL}/api/browse?tab=studyRooms&page=1&limit=12&includeTrendingStudyRooms=true&trendingLimit=4`;
  const res = http.get(url, params);
  latencyFilteredRooms.add(res.timings.duration);
  return res;
}

// ---------------------------------------------------------------------------
// Response classifier
// ---------------------------------------------------------------------------

function classify(res, label) {
  const ok = check(res, {
    [`${label}: status 200`]: (r) => r.status === 200,
    [`${label}: has data`]:   (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null && typeof body === 'object';
      } catch {
        return false;
      }
    },
  });

  if (res.status === 504 || res.status === 503) {
    // 504 = Gateway Timeout → almost certainly a P2024 ConnectionPoolTimeout
    poolTimeouts.add(1);
    errorRate.add(1);
  } else if (res.status >= 400) {
    otherErrors.add(1);
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  return ok;
}

// ---------------------------------------------------------------------------
// VU iteration — each VU runs one of the four shapes per iteration
// Weighted distribution mirrors real browse traffic:
//   40% bare peers, 30% bare studyRooms, 20% filtered peers, 10% trending rooms
// ---------------------------------------------------------------------------

const commonParams = {
  headers: { 'Accept': 'application/json' },
  timeout: '10s',  // fail fast — don't let stalled pool connections inflate p99
};

export default function () {
  const roll = Math.random();

  if (roll < 0.40) {
    group('browse_peers', () => {
      const res = queryPeers(commonParams);
      classify(res, 'browse_peers');
    });
  } else if (roll < 0.70) {
    group('browse_study_rooms', () => {
      const res = queryStudyRooms(commonParams);
      classify(res, 'browse_study_rooms');
    });
  } else if (roll < 0.90) {
    group('browse_filtered_peers', () => {
      const res = queryFilteredPeers(commonParams);
      classify(res, 'browse_filtered_peers');
    });
  } else {
    group('browse_rooms_trending', () => {
      const res = queryRoomsWithTrending(commonParams);
      classify(res, 'browse_rooms_trending');
    });
  }

  // No artificial sleep — we want to maximise pool pressure.
  // Real users would pause between page loads but we're probing the pool limit.
}

// ---------------------------------------------------------------------------
// Setup: health check before spending 19 minutes running
// ---------------------------------------------------------------------------

export function setup() {
  console.log(`\n=== Suite 1: Connection Pool Exhaustion Ramp ===`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Hold at 1000 VUs for: ${holdDuration}`);
  console.log(`\nRunning pre-flight health check...`);

  const res = http.get(`${BASE_URL}/api/browse?tab=peers&page=1&limit=1`, commonParams);

  if (res.status !== 200) {
    throw new Error(
      `Health check failed: ${BASE_URL}/api/browse returned ${res.status}.\n` +
      `Make sure the backend is running and DATABASE_URL is reachable.`
    );
  }

  const body = JSON.parse(res.body);
  if (!body || !body.counts) {
    throw new Error(`Unexpected response shape: ${res.body.substring(0, 200)}`);
  }

  console.log(`✓ Backend healthy. Users in DB: ${body.counts.peers}, Rooms: ${body.counts.studyRooms}`);
  console.log(`\n⚠  Watch for: db_pool_timeouts_total > 0 → that VU count is your pool limit.\n`);

  return {
    totalUsers: body.counts.peers,
    totalRooms: body.counts.studyRooms,
  };
}

// ---------------------------------------------------------------------------
// Teardown: print pool exhaustion diagnosis
// ---------------------------------------------------------------------------

export function teardown(data) {
  console.log(`\n=== Suite 1 Complete ===`);
  console.log(`Seed data: ${data.totalUsers} users, ${data.totalRooms} study rooms`);
  console.log(`\nNext steps:`);
  console.log(`  1. Check db_pool_timeouts_total in the k6 summary above.`);
  console.log(`     - If 0: pool held at 1000 VUs → proceed to Suite 2.`);
  console.log(`     - If > 0: find the stage where it first appeared in Grafana.`);
  console.log(`       That VU count is your effective pool limit.`);
  console.log(`  2. Compare against: DATABASE_URL + '?connection_limit=20&pool_timeout=10'`);
  console.log(`     Re-run this suite with the tuned URL to measure the difference.`);
  console.log(`  3. Log line to grep in Loki:`);
  console.log(`     {job="nestjs"} |= "P2024" or "ConnectionPoolTimeout" or "pool_timeout"`);
}

// ---------------------------------------------------------------------------
// Optional: generate HTML report (requires xk6-dashboard extension)
// Comment out if not using the extended k6 binary.
// ---------------------------------------------------------------------------

// export function handleSummary(data) {
//   return {
//     'backend/monitoring/k6/reports/01-pool-exhaustion.html': htmlReport(data),
//   };
// }
