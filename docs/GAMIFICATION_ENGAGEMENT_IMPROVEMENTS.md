# Gamification And Coin Engagement Improvements

## Purpose

This document proposes product, UX, and reliability improvements to make Webyalaya more engaging, increase repeat visits, and make the gamification + coin system feel trustworthy.

It is grounded in the current platform behavior:

- Achievement categories already exist: Learning, Teaching, Community, Milestones, and Streaks.
- Coins are already used as an in-platform value layer for sessions and rewards.
- Wallet history, streaks, achievement tracking, notifications, and dashboard widgets already exist.
- The current experience is functional, but it is still mostly a passive progress display rather than an active habit-forming system.

## Current State Summary

Based on the current implementation and UI:

- Users can earn achievements and streaks, but the system mostly reports progress after activity rather than driving the next visit.
- Coins are visible in wallet/profile/dashboard, but the value loop is not fully motivating because users do not always see:
  - what they should do next,
  - what they will earn next,
  - why a coin balance changed,
  - or what coins unlock beyond session participation.
- The Achievements screen is clean, but it is largely archival:
  - it shows totals,
  - category progress,
  - and completed/in-progress/locked items,
  - but it does not strongly answer: "Why should I come back today?"
- Reliability concerns in reward delivery can weaken trust in the whole loop. If coin balance, unlock timing, or transaction history feels inconsistent, even a good gamification design will underperform.

## Key Problems To Solve

### 1. Weak Habit Loop

The current system rewards completed actions, but it does not create a strong daily or weekly return loop.

Examples:

- No daily mission board
- No weekly challenge cadence
- No comeback bonus for inactive users
- No visible "next best action" on the dashboard

### 2. Limited Motivation Between Major Milestones

Large achievements are good, but users need smaller wins between them.

Current risk:

- users may see many locked achievements,
- little active progress,
- and no immediate reward path.

### 3. Coins Feel Transactional More Than Aspirational

Coins are currently useful, but the platform can make them feel more meaningful by clarifying:

- how users earn them,
- where they are held,
- when they are released,
- how they are spent,
- and what special value they unlock.

### 4. Social Energy Is Underused

This is a peer learning platform, so the most powerful retention lever is not just solo streaks; it is social accountability and recognition.

### 5. Trust Gaps Hurt Engagement

If achievements unlock late, balance changes feel unclear, or wallet history looks stale/incomplete, users stop emotionally investing in the reward system.

## Product Goals

The improved system should:

1. Increase weekly return visits.
2. Increase the number of users completing at least one meaningful action per week.
3. Increase session creation and completion.
4. Increase review submission rate after sessions.
5. Make coin rewards understandable and trusted.
6. Make achievements feel like a journey, not just a badge list.

## Recommended Engagement Strategy

## 1. Build A Daily Habit Loop

Introduce a lightweight daily engagement layer.

### Recommended features

- Daily check-in reward
  - Small coin reward for opening the app and completing one meaningful action.
- Daily missions
  - Example: join one session, send one peer request, leave one review, complete one streak-saving activity.
- Weekly quest board
  - Example: complete 3 sessions this week, teach once, review 2 peers, maintain 5-day activity streak.
- Streak freeze
  - Let users preserve one streak break per week or per month.
- Comeback quests
  - If a user has been inactive for 3, 7, or 14 days, offer a special return mission with bonus reward.

### Why this matters

This gives users a reason to return even when they are not currently chasing a large achievement.

## 2. Make Progress Feel Immediate

The current achievements layout can be upgraded from a summary dashboard into an action-driving screen.

### Recommended UI changes for the Achievements screen

- Add a "Next easiest unlock" card at the top.
- Add an "Almost there" section for achievements at 60%+ completion.
- Show exact remaining requirement:
  - "2 more sessions to unlock"
  - "1 more review needed"
  - "3-day streak away from reward"
- Highlight one recommended action per category.
- Show reward preview more clearly:
  - coins,
  - rarity,
  - title,
  - and benefit.
- Add a "Complete today" badge for achievements that can be unlocked with one action now.

### Screenshot-specific improvement ideas

For the current achievement layout shown:

- Replace the passive summary row with one actionable panel:
  - `Next Reward: 25 Coins`
  - `Do this: complete 1 more learning session`
- When `Tracking` is `0`, show a guided empty state instead of a neutral number.
- Add category CTAs under each card:
  - `Find a session`
  - `Teach today`
  - `Invite peers`
- Add a small reward calendar or streak preview near the Streaks card.
- Let users pin one target achievement to the dashboard.

## 3. Add More Short-Cycle Rewards

Users revisit more often when rewards are frequent, clear, and varied.

### Recommended additions

- First action of the day bonus
- First teaching session of the week bonus
- Review completion bonus
- Profile completion bonus
- Consecutive week consistency rewards
- Study squad participation rewards
- Referral/invite rewards
- Weekend challenge rewards

### Suggested reward types

- Coins
- Achievement progress boosts
- Streak shields / streak freeze tokens
- Temporary profile highlight
- Leaderboard visibility boost
- Exclusive badge frames or status styles

## 4. Use Social Motivation More Aggressively

Gamification becomes much more effective when it is social.

### Recommended social loops

- Weekly leaderboard
  - top learners,
  - top teachers,
  - longest active streaks,
  - most helpful reviewers.
- Study squads
  - small groups pursuing a shared weekly target.
- Public milestone feed
  - "Aarav unlocked Week Warrior"
  - "Priya completed her 10th teaching session"
- Friendly rivalry
  - compare streaks and achievements with friends or followed users.
- Mentor recognition
  - badges for consistent teachers, high-rated teachers, or dependable hosts.

### Caution

Leaderboards should reward effort and contribution, not only volume. Avoid making the system feel pay-to-win or overly competitive.

## 5. Strengthen The Coin Economy

Coins should feel like a meaningful progression layer, not just a payment artifact.

### Improve earning clarity

Show users a simple breakdown:

- Earned from teaching
- Earned from achievements
- Earned from streaks
- Earned from challenges
- Refunded from cancelled/not-completed sessions

### Improve spending clarity

Show:

- Spent on peer sessions
- Spent on study room join fees
- Reserved in escrow
- Released after completion/review

### Add better coin sinks

Good retention often needs reasons to keep earning.

Suggested sinks:

- priority discovery boost for sessions,
- special room highlighting,
- premium challenge entries,
- badge cosmetics,
- profile spotlight for teachers,
- community event entry.

### Add coin anticipation

On session cards and dashboard widgets, show:

- `Earn 20 Coins if completed`
- `This reward will be released after review`
- `You are 15 Coins away from joining this room`

## 6. Create Lifecycle-Based Re-Engagement

Different user stages need different nudges.

### New users: first 7 days

- Starter missions
- onboarding streak
- first 3 achievements intentionally easy
- guided "earn your first coins" journey

### Active users

- weekly challenge rotation
- personalized next best action
- progress reminders for near-complete rewards

### At-risk users

- comeback bonus
- missed streak reminder
- unfinished goal reminder
- peer/session recommendations based on prior activity

### Power users

- elite milestones
- seasonal tournaments
- mentor ranking
- exclusive badges and recognition tiers

## UX Recommendations By Surface

## Dashboard

Add:

- Today's mission card
- Current streak status with loss-risk warning
- Next achievement to unlock
- Wallet delta since last week
- Upcoming reward opportunities

## Achievements Page

Add:

- Recommended achievement
- Almost-unlocked carousel
- Claim animation / reward feedback
- Category-specific action buttons
- Shareable unlock moments

## Wallet / Coin History

Add:

- clear labels for `earned`, `spent`, `refunded`, `escrowed`, `released`
- running balance after each transaction
- source tags:
  - session,
  - achievement,
  - streak,
  - refund,
  - challenge,
  - bonus
- explanations for pending/escrow transactions

## Session Completion / Review Flow

Add:

- post-session reward summary
- "leave review to release coins" prompt where applicable
- summary of progress earned:
  - streak updated,
  - achievement progress,
  - coins earned,
  - next milestone

## Notification Strategy

Notifications should be useful, not noisy.

### Recommended notification types

- Streak at risk
- Daily mission incomplete
- Weekly challenge close to completion
- Achievement almost unlocked
- Escrow released / refund processed
- Friend or squad milestone
- Personalized suggested session based on target achievement

### Recommended cadence

- Morning habit reminder
- Evening streak-save reminder
- Weekly progress summary
- Comeback win-back notifications after inactivity

## Reliability Foundation: Must-Fix Before Scaling Gamification

Retention systems only work when users trust them. The following items should be treated as platform foundations.

## 1. Introduce A Real Coin Ledger

Current behavior updates `User.coins` directly in multiple places. That makes balance changes hard to audit and explain.

### Recommendation

Add an immutable ledger table, for example:

- `CoinLedgerEntry`
  - `id`
  - `userId`
  - `type`
  - `amount`
  - `balanceAfter`
  - `referenceType`
  - `referenceId`
  - `status`
  - `metadata`
  - `createdAt`

### Benefit

- easier debugging,
- transparent wallet history,
- safer refunds,
- easier support resolution,
- better analytics.

## 2. Centralize Reward Settlement Rules

Session completion, escrow release, review-gated release, streak updates, and achievement checks are spread across multiple services.

### Risk

Business rules can drift over time. For example, coin release timing for peer sessions and study rooms is not modeled in one unified reward pipeline.

### Recommendation

Create one reward orchestration flow that owns:

- session settlement,
- escrow release,
- refund handling,
- achievement awarding,
- streak updates,
- coin ledger entries,
- notification generation.

Also make it idempotent so repeated calls do not duplicate rewards.

## 3. Wrap Balance-Critical Operations In Transactions

Coin deduction, payment creation, payment release, refunds, and settlement side effects should be atomic where possible.

### High-priority examples from the current codebase

- Peer session request currently creates payment and deducts coins in separate operations.
- Session completion updates status, payment state, teacher balance, streaks, achievements, summary generation, and notifications as a multi-step flow.

### Recommendation

Use database transactions for all money-affecting state changes and use a follow-up async job/event for non-critical side effects like notifications and summaries.

## 4. Make Transaction History Fully Trustworthy

Wallet history should always answer: "What happened to my balance?"

### Current risks

- Merged sent/received history is built from separate paginated queries, which can produce confusing ordering or incomplete pages.
- Frontend cache lifetime can make wallet updates feel delayed after a recent action.

### Recommendation

- Move to ledger-based history.
- Sort from one canonical source.
- Show pending vs settled vs refunded clearly.
- Reduce stale wallet views after payment-affecting actions by invalidating relevant queries immediately.

## 5. Remove Any Mock Or Placeholder Rewards From Production

If users see achievements that are not actually theirs, trust drops immediately.

### Recommendation

Do not inject mock achievements into the production user view, even as a fallback empty state. Use a real empty state with guided actions instead.

## 6. Add Observability For Reward Failures

Track and alert on:

- achievement unlock failures,
- reward calculation failures,
- payment status mismatches,
- negative balance attempts,
- duplicate settlement attempts,
- refund failures,
- stale cache mismatches between balance and transaction history.

## Recommended New Feature Set

Below is a practical shortlist of improvements with high retention value.

| Priority | Feature | Impact | Effort | Notes |
| --- | --- | --- | --- | --- |
| P0 | Reward reliability fixes | Very high | Medium | Trust layer; do before scaling gamification |
| P0 | Daily mission card | High | Medium | Strong repeat-visit driver |
| P0 | Next best action on dashboard | High | Low | Makes progress actionable |
| P1 | Almost-unlocked achievement section | High | Low | Increases completion motivation |
| P1 | Better wallet history labels + escrow explanation | High | Medium | Reduces confusion |
| P1 | Weekly challenge system | High | Medium | Creates weekly habit loop |
| P1 | Streak freeze / shield | Medium | Medium | Prevents demotivation |
| P2 | Social leaderboard and milestone feed | Medium to high | Medium | Strong for community energy |
| P2 | Study squads / accountability groups | High | High | Good long-term retention |
| P2 | Seasonal events | Medium | Medium | Great for marketing + reactivation |
| P3 | Cosmetic reward marketplace | Medium | High | Useful once core trust is strong |

## Suggested 30-60-90 Day Rollout

## Days 1-30

Focus on trust + visibility.

- Fix reward reliability gaps
- add wallet explanations,
- add next best action,
- add almost-unlocked achievements,
- add better post-session reward summary

## Days 31-60

Focus on repeat visits.

- Launch daily missions
- launch weekly challenges,
- add streak protection,
- add reminder notifications,
- add comeback rewards for inactive users

## Days 61-90

Focus on social retention.

- Launch leaderboard
- launch milestone feed,
- add squad challenges,
- add seasonal events and elite milestones

## Success Metrics

Track these after rollout:

- DAU / WAU ratio
- weekly returning users
- 7-day retention
- 30-day retention
- average sessions completed per active user
- review completion rate
- number of active streak users
- achievement unlock rate per active user
- mission completion rate
- challenge participation rate
- coin earning/spending frequency
- support tickets related to missing rewards or incorrect balances

## Experiment Ideas

Run A/B tests on:

1. Daily mission reward size
2. Streak freeze availability
3. Progress-first vs collection-first achievement layouts
4. Social leaderboard visibility
5. Push reminder timing
6. Comeback reward thresholds

## Engineering Notes: Relevant Current Code Areas

These areas are likely to be involved when implementing the improvements:

- `backend/src/achievements/achievements.service.ts`
- `backend/src/streaks/streaks.service.ts`
- `backend/src/payments/payments.service.ts`
- `backend/src/peer-sessions/peer-sessions.service.ts`
- `backend/src/study-rooms/study-rooms.service.ts`
- `backend/src/reviews/reviews.service.ts`
- `backend/prisma/schema.prisma`
- `my-app/src/components/achievements/achievement-showcase.tsx`
- `my-app/src/components/achievements/achievement-showcase-connected.tsx`
- `my-app/src/components/profile/wallet-tab.tsx`
- `my-app/src/components/dashboard/coin-widget.tsx`
- `my-app/src/hooks/use-achievements.ts`
- `my-app/src/hooks/use-transactions.ts`

## Final Recommendation

The best path is not to add more badges first.

The best path is:

1. Make rewards fully trustworthy.
2. Turn achievements from a passive record into an action system.
3. Add daily and weekly loops that create a reason to return.
4. Add social accountability so users come back not only for themselves, but for other people.
5. Make coins feel clear, desirable, and auditable.

If this order is followed, Webyalaya can turn gamification from a nice visual layer into a real retention system.
