/**
 * Suite 5 — Gamification Upsert Contention
 *
 * Targets two write-path vulnerabilities in session completion:
 *
 * ── The write chain (per POST /api/study-rooms/:id/complete) ───────────────
 *
 *   user.findUnique + studyRoom.findUnique + studyRoomParticipant.findFirst
 *   studyRoom.update (status → DONE)
 *   studyRoomParticipant.findMany
 *
 *   Per user (creator + every participant) — sequential:
 *     user.findUnique             (timezone lookup)
 *     dailyActivity.upsert        ← sessionCount { increment: 1 }
 *     calculateStreak:
 *       user.findUnique           (timezone)
 *       dailyActivity.findMany    (all dates)
 *     user.findUnique             (longestStreak)
 *     user.update                 (currentStreak, longestStreak)
 *
 *   checkSessionAchievements:
 *     peerSession.count ×2 + studyRoomParticipant.count + studyRoom.count
 *     For each qualifying milestone:
 *       userAchievement.findUnique
 *       achievement.findUnique + userAchievement.upsert  ← progress { increment }
 *       if progress >= maxProgress:
 *         userAchievement.update  (unlockedAt)
 *         user.update             (coins { increment: coinReward })  ← RACE TARGET
 *   review.count + peerSession.findMany (distinct learners)
 *   checkStreakAchievements: similar milestone loop
 *
 *   Total: ~20–30 sequential DB ops per single completion call.
 *
 * ── TOCTOU race (achievement_first_teach, coinReward = 15) ─────────────────
 *
 *   If N VUs share one user and fire complete simultaneously, ALL N concurrent
 *   executions can pass the `if (!userAchievement.unlockedAt)` guard
 *   (they all read null before anyone sets it) and all issue
 *     user.update({ coins: { increment: 15 } })
 *   resulting in user.coins = 15 × N instead of 15.
 *
 * ── Three scenarios ────────────────────────────────────────────────────────
 *
 *   1. daily_activity_storm   T+0:00 → T+3:00   50 VUs constant
 *      Each VU loops: complete its own room → sleep 1s → repeat.
 *      The room is already DONE from the 2nd iteration onward — the service
 *      re-runs the full activity/achievement chain every call regardless.
 *      Tests: pool exhaustion from 50 × ~25 concurrent sequential DB ops.
 *
 *   2. achievement_toctou     T+3:30 → T+4:00   20 VUs simultaneous
 *      All 20 share one token + one fresh room and fire complete at the
 *      exact same instant. Detects the double-coin award race.
 *
 *   3. browse_starvation      T+0:00 → T+3:00   100 VUs constant (parallel with 1)
 *      GET /api/browse at 5 req/sec per VU to detect pool starvation.
 *
 * Prerequisites:
 *   node backend/monitoring/k6/seed/05-seed.js
 *   npx prisma db seed  (if achievement rows are missing)
 *
 * Run:
 *   k6 run \
 *     --env BASE_URL=http://localhost:3001 \
 *     --env STORM_USERS='<from seed>' \
 *     --env TOCTOU_TOKEN='<from seed>' \
 *     --env TOCTOU_ROOM_ID='<from seed>' \
 *     --env TOCTOU_USER_ID='<from seed>' \
 *     backend/monitoring/k6/05-gamification-upserts.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// ─── Custom metrics ────────────────────────────────────────────────────────

const completeLatency     = new Trend('latency_complete_session_ms', true);
const completeErrorRate   = new Rate('complete_session_error_rate');
const dailyUpsertCounter  = new Counter('daily_activity_upsert_calls_total');

const toctouLatency       = new Trend('latency_toctou_complete_ms', true);
const toctouErrorRate     = new Rate('toctou_complete_error_rate');

const browseLatency       = new Trend('latency_browse_starvation_ms', true);
const browseErrorRate     = new Rate('pool_starvation_browse_error_rate');

// Coin balance before and after TOCTOU burst — read in setup/teardown
const toctouCoinDelta     = new Gauge('toctou_coin_delta');

// ─── Environment ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// [{token, roomId}] — one entry per storm VU
const STORM_USERS  = JSON.parse(__ENV.STORM_USERS  || '[]');
const TOCTOU_TOKEN  = __ENV.TOCTOU_TOKEN   || '';
const TOCTOU_ROOM_ID = __ENV.TOCTOU_ROOM_ID || '';
const TOCTOU_USER_ID = __ENV.TOCTOU_USER_ID || '';

// ─── Load profile ─────────────────────────────────────────────────────────

const N_TOCTOU_VUS = 20; // simultaneous completion burst for TOCTOU scenario

export const options = {
  scenarios: {
    // 50 VUs repeatedly complete their own study rooms
    daily_activity_storm: {
      executor:  'constant-vus',
      vus:       STORM_USERS.length || 50,
      duration:  '3m',
      exec:      'dailyActivityStorm',
      startTime: '0s',
    },

    // 20 VUs simultaneously complete the same room — achievement unlock TOCTOU
    achievement_toctou: {
      executor:    'shared-iterations',
      vus:         N_TOCTOU_VUS,
      iterations:  N_TOCTOU_VUS,
      maxDuration: '60s',
      exec:        'achievementToctou',
      startTime:   '3m30s',
    },

    // 100 browse VUs — pool starvation check during the storm
    browse_starvation: {
      executor:  'constant-vus',
      vus:       100,
      duration:  '3m',
      exec:      'browseStarvation',
      startTime: '0s',
    },
  },

  thresholds: {
    // Storm scenario
    latency_complete_session_ms:   [{ threshold: 'p(95)<2000',  abortOnFail: false }],
    complete_session_error_rate:   [{ threshold: 'rate<0.05',   abortOnFail: false }],

    // TOCTOU scenario
    latency_toctou_complete_ms:    [{ threshold: 'p(95)<3000',  abortOnFail: false }],
    toctou_complete_error_rate:    [{ threshold: 'rate<0.20',   abortOnFail: false }],

    // Browse starvation
    pool_starvation_browse_error_rate: [{ threshold: 'rate<0.01', abortOnFail: false }],
    latency_browse_starvation_ms:  [{ threshold: 'p(95)<500',   abortOnFail: false }],
  },
};

// ─── Shared auth header builder ───────────────────────────────────────────

function authHeaders(token) {
  return {
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: '30s',
  };
}

// ─── Scenario 1: daily_activity_storm ─────────────────────────────────────

export function dailyActivityStorm() {
  if (STORM_USERS.length === 0) {
    console.warn('[daily_activity_storm] STORM_USERS not set — run seed/05-seed.js first');
    sleep(10);
    return;
  }

  const { token, roomId } = STORM_USERS[(__VU - 1) % STORM_USERS.length];

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/study-rooms/${roomId}/complete`,
    null,
    authHeaders(token),
  );
  const dur = Date.now() - start;

  completeLatency.add(dur);
  dailyUpsertCounter.add(1);

  const ok = check(res, {
    'complete session: 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  completeErrorRate.add(!ok);

  // 1 second between iterations — prevents VUs from racing too fast
  // (~50 req/s total across 50 VUs during the 3-minute storm)
  sleep(1);
}

// ─── Scenario 2: achievement_toctou ───────────────────────────────────────

export function achievementToctou() {
  if (!TOCTOU_TOKEN || !TOCTOU_ROOM_ID) {
    console.warn('[achievement_toctou] TOCTOU_TOKEN/ROOM_ID not set — run seed/05-seed.js first');
    sleep(5);
    return;
  }

  // All 20 VUs hit the endpoint simultaneously (no sleep before first request)
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/study-rooms/${TOCTOU_ROOM_ID}/complete`,
    null,
    { ...authHeaders(TOCTOU_TOKEN), timeout: '30s' },
  );
  toctouLatency.add(Date.now() - start);

  const ok = check(res, {
    'toctou complete: 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  toctouErrorRate.add(!ok);
}

// ─── Scenario 3: browse_starvation ────────────────────────────────────────

export function browseStarvation() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/browse`, { timeout: '10s' });
  browseLatency.add(Date.now() - start);

  const ok = check(res, {
    'browse (starvation check): 200 OK': (r) => r.status === 200,
  });
  browseErrorRate.add(!ok);

  sleep(0.2); // 5 req/sec per VU = 500 req/sec total across 100 VUs
}

// ─── setup / teardown ─────────────────────────────────────────────────────

export function setup() {
  // Health check
  const health = http.get(`${BASE_URL}/api/browse`, { timeout: '10s' });
  if (health.status !== 200) {
    throw new Error(`Backend health check failed: ${health.status}`);
  }

  // Read TOCTOU user's initial coin balance
  let initialCoins = null;
  if (TOCTOU_TOKEN) {
    const res = http.get(`${BASE_URL}/api/users/me`, authHeaders(TOCTOU_TOKEN));
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        initialCoins = body.coins ?? body.user?.coins ?? null;
        console.log(`[setup] TOCTOU user initial coins: ${initialCoins}`);
      } catch (_) {}
    }
  }

  console.log(`[setup] Storm VUs:   ${STORM_USERS.length}`);
  console.log(`[setup] TOCTOU VUs:  ${N_TOCTOU_VUS}`);
  return { initialCoins };
}

export function teardown(data) {
  const { initialCoins } = data || {};

  // ── TOCTOU coin audit ────────────────────────────────────────────────────
  let finalCoins = null;
  if (TOCTOU_TOKEN) {
    const res = http.get(`${BASE_URL}/api/users/me`, authHeaders(TOCTOU_TOKEN));
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        finalCoins = body.coins ?? body.user?.coins ?? null;
      } catch (_) {}
    }
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log('Suite 5 complete — TOCTOU coin audit:');
  console.log('────────────────────────────────────────────────────────────');

  if (initialCoins !== null && finalCoins !== null) {
    const delta = Number(finalCoins) - Number(initialCoins);
    toctouCoinDelta.add(delta);
    console.log(`  Initial coins:   ${initialCoins}`);
    console.log(`  Final coins:     ${finalCoins}`);
    console.log(`  Delta:           ${delta}`);
    console.log(`  Expected delta:  15  (achievement_first_teach coinReward)`);
    if (delta > 15) {
      console.log(`  ⚠️  TOCTOU DETECTED: user received ${delta} coins instead of 15`);
      console.log(`     ${Math.round(delta / 15)} concurrent unlockAchievement calls fired.`);
    } else if (delta === 15) {
      console.log('  ✓  No TOCTOU — achievement unlocked exactly once.');
    } else if (delta === 0) {
      console.log('  ℹ  No achievement awarded (achievement_first_teach may not exist in DB).');
      console.log('     Run: cd backend && npx prisma db seed');
    } else {
      console.log(`  ⚠️  Unexpected delta: ${delta} — investigate UserAchievement + User rows.`);
    }
  } else {
    console.log('  Could not read coin balance — TOCTOU_TOKEN may be invalid.');
  }

  console.log('\nPost-test DB audit queries:');
  console.log(`
-- DailyActivity storm: verify sessionCount incremented beyond 1 (expected for repeated calls)
SELECT u.name, da."sessionCount", da."minutesTaught", da."minutesLearned"
FROM "DailyActivity" da
JOIN "User" u ON u.id = da."userId"
WHERE u.email LIKE 'k6-suite5-test-storm%'
ORDER BY da."sessionCount" DESC
LIMIT 10;

-- TOCTOU coin audit: check current balance vs expected
SELECT u.name, u.coins
FROM "User" u
WHERE u.email LIKE 'k6-suite5-test-toctou%';

-- Achievement unlock count: was achievement_first_teach unlocked multiple times?
SELECT ua."userId", COUNT(*) AS unlock_attempts
FROM "UserAchievement" ua
JOIN "User" u ON u.id = ua."userId"
WHERE u.email LIKE 'k6-suite5-test-toctou%'
  AND ua."achievementId" = 'achievement_first_teach'
GROUP BY ua."userId";

-- DailyActivity sessionCount for TOCTOU user
-- If 20 concurrent completions, sessionCount should be 20 (proving all 20 hit the upsert)
SELECT u.name, da."sessionCount"
FROM "DailyActivity" da
JOIN "User" u ON u.id = da."userId"
WHERE u.email LIKE 'k6-suite5-test-toctou%';

-- Streak sanity: should be 1 (all completions on same day)
SELECT u.name, u."currentStreak", u."longestStreak"
FROM "User" u
WHERE u.email LIKE 'k6-suite5-test-toctou%';

-- Cleanup
-- DELETE FROM "StudyRoom" WHERE title LIKE 'k6-suite5-%';
`);
}
