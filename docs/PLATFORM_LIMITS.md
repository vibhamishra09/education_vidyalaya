# Webyalaya Platform Limits

> Last updated: 2026-03-09
> This document tracks all known hard and soft limits across our infrastructure stack. Review before launches, load tests, or scaling decisions.

---

## 1. Video & Real-time Rooms (LiveKit)

| Limit | Value | Notes |
|-------|-------|-------|
| Monthly minutes | **150,000 min/month** | Resets monthly; ~2,500 hrs |
| Burn rate (10 users in room) | ~10 min/real-minute | 150k min ÷ 10 = 15,000 real-minutes of 10-person rooms |
| Burn rate (2 users in room) | ~2 min/real-minute | 150k min ÷ 2 = 75,000 real-minutes of 1:1 sessions |
| Max participants per room | Check LiveKit plan dashboard | Default varies by plan |
| Concurrent rooms | Check LiveKit plan dashboard | — |

**Risk:** At scale, 150k minutes can be exhausted quickly. A single 2-hour study session with 5 people burns 600 minutes. ~250 such sessions/month hits the cap.

---

## 2. Frontend (Vercel Free + Cloudflare)

### Vercel Free Tier

| Limit | Value |
|-------|-------|
| Bandwidth | **100 GB/month** |
| Serverless function invocations | **100,000/day** |
| Serverless function execution time | **10 sec max per invocation** |
| Serverless function memory | **1,024 MB** |
| Build minutes | **6,000 min/month** |
| Deployments | **Unlimited** |
| Team members | **1 (personal) / limited on hobby** |
| Custom domains | Unlimited |
| Edge middleware | Available |

### Cloudflare (Free Plan, in front of Vercel)

| Limit | Value |
|-------|-------|
| Requests | Unlimited (unmetered) |
| DDoS protection | Included |
| Cache TTL control | Available |
| Workers (if used) | 100,000 req/day free |
| Rate limiting (free) | Not available — requires paid plan |

**Risk:** Vercel's 10-second serverless timeout is a hard wall. Any API route that does heavy DB queries, file processing, or external calls must stay under this. Long-running operations should be offloaded to the backend.

---

## 3. Backend (AWS ECS — Fargate)

| Limit | Value | Notes |
|-------|-------|-------|
| Task size | **0.25 vCPU / 0.5 GB RAM** | Smallest Fargate unit |
| Min tasks | 1 | Always running |
| Max tasks | Unknown — not configured | **Action required: set a max task limit** |
| Network mode | awsvpc | Each task gets its own ENI |
| Max ENIs per VPC | AWS account limit (varies) | Can become a bottleneck at scale |

### Single Task Capacity Estimates (0.25 vCPU / 0.5 GB)

| Workload | Estimated Capacity |
|----------|--------------------|
| REST API requests (lightweight) | ~50–100 concurrent |
| Socket.IO persistent connections | ~200–500 concurrent (memory-bound) |
| Mixed (API + sockets) | ~100–200 concurrent users |

**Risks:**
- Socket.IO runs on the same ECS task as the API. Persistent WebSocket connections are memory-heavy — 500 connections at ~1 KB/conn = 500 KB state, but event loop contention becomes the real bottleneck at 0.25 vCPU.
- Auto-scaling is enabled but **max task count is not set** — unbounded scaling could cause unexpected AWS costs.
- With auto-scaling, Socket.IO state is per-task (not shared). Users may disconnect on scale-out unless sticky sessions or a Redis pub/sub adapter is configured.

---

## 4. Database (PostgreSQL — Azure Flexible Server, General Purpose)

| Limit | Value | Notes |
|-------|-------|-------|
| vCores | 2–4 | General Purpose tier |
| Max connections (2 vCore) | **~262 connections** | PostgreSQL default: 100 × vCores + overhead |
| Max connections (4 vCore) | **~500 connections** | Approximate |
| Storage | Depends on provisioned disk | Auto-grow available |
| Max DB size | Up to 64 TB (Azure limit) | Practical limit is cost |
| Backup retention | 7 days (default free) | Configurable up to 35 days |
| Connection pooling | **PgBouncer — configured** | Mitigates connection exhaustion at scale |

**Status:** PgBouncer is already active. Connection exhaustion risk is significantly reduced. Monitor PgBouncer pool saturation as ECS tasks scale up.

---

## 5. Authentication (Clerk — Free Plan)

| Limit | Value |
|-------|-------|
| Monthly Active Users (MAU) | **10,000 MAU** |
| Social connections (OAuth) | 2 providers free |
| SMS / phone OTP | 100 free SMS/month |
| Organizations | Not available on free |
| Bot / scripted sign-ups | Rate limited by Clerk |
| Sessions per user | Unlimited |
| Custom JWT claims | Available |

**Risk:** At 10,001 MAU, the account is blocked or requires upgrade. Plan ahead for the Clerk Pro upgrade at ~7,000–8,000 MAU.

---

## 6. Redis Cache (Upstash — Free Tier)

| Limit | Value | Notes |
|-------|-------|-------|
| Max memory | **256 MB** | Hard limit on free tier |
| Max commands/day | **10,000 requests/day** | Free tier daily cap |
| Max connections | **100 concurrent** | Free tier |
| Eviction policy | Custom (code-managed) | `cache.service.ts` evicts debate transcripts when >200 MB |
| Default cache TTL | **5 minutes** | Configurable per key |

**Warning thresholds (coded in `cache.service.ts`):**
- Warning at 200 MB (78%) — evicts 10 debate transcript keys
- Critical at 230 MB (90%) — evicts 20 debate transcript keys

**Risk:** 10,000 commands/day is the binding constraint. At scale, a single page load hitting multiple cached endpoints could burn 5–10 commands. 1,000 active users × 10 commands = 10,000 commands/day — you're at the cap. Upgrade Upstash or reduce cache-miss churn before hitting ~500 daily active users.

---

## 7. Real-time Chat (Socket.IO on ECS)

| Limit | Value | Notes |
|-------|-------|-------|
| Connections per task | ~200–500 | Memory and CPU bound (0.25 vCPU / 0.5 GB) |
| Rooms/namespaces | Unlimited (in-memory) | Lost on task restart |
| Message history | Persisted to DB via `ChatService` | Not lost on restart |
| Redis adapter | **Not configured** | Confirmed by code audit |
| Sticky sessions | Unknown — needs verification | Required for multi-task Socket.IO |

**Risk:** Redis is used only for DB caching — **not** as a Socket.IO adapter. If ECS scales to 2+ tasks, users on different tasks cannot see each other's messages and room joins are not shared. This is a **confirmed gap**.

---

## 8. Summary — Critical Risks to Address

| # | Risk | Severity | Status | Action |
|---|------|----------|--------|--------|
| 1 | LiveKit minutes exhausted at scale | High | Open | Add usage monitoring + alerts at 80% |
| 2 | ECS max task count uncapped | High | Open | Set max tasks (e.g., 5–10) to cap AWS costs |
| 3 | Socket.IO not multi-instance safe (no Redis adapter) | High | **Confirmed gap** | Add `@socket.io/redis-adapter` before scaling beyond 1 task |
| 4 | Upstash free tier: 10k commands/day cap | Medium | Open | Upgrade Upstash at ~500 DAU |
| 5 | Vercel 10s function timeout | Medium | Open | Audit all Next.js API routes for slow queries |
| 6 | Clerk MAU cap at 10,000 | Medium | Open | Plan Pro upgrade at ~7,500 MAU |
| 7 | No rate limiting on free Cloudflare | Low | Open | Add Vercel Edge middleware rate limiting |
| 8 | DB connections | Low | **Mitigated** | PgBouncer already configured |

---

## 9. Things to Verify / Unknown

- [ ] LiveKit plan: exact concurrent room and participant-per-room limits
- [ ] ECS auto-scaling policy: min/max task count, scale-in/out thresholds
- [ ] Azure Postgres: exact vCore count in use
- [ ] Vercel: are any API routes close to the 10s timeout?
- [ ] Cloudflare: which features/plan are active beyond DNS proxy?
- [ ] Upstash: current daily command usage (check Upstash dashboard)
