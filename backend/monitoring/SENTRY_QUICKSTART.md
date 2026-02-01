# Sentry Integration - Quick Start

Get Sentry error tracking up and running in 5 minutes!

## ✅ Prerequisites

- [x] Packages installed
- [x] Code integrated
- [ ] Sentry account created
- [ ] Environment variables set

## 🚀 Setup Steps

### Step 1: Create Sentry Account (2 minutes)

1. Go to [sentry.io](https://sentry.io) and sign up (free tier available)
2. Click **Create Project**
3. Select **Node.js** → **NestJS**
4. Name it: `webyalaya-backend`
5. Copy the **DSN** (looks like: `https://abc123@sentry.io/12345`)

### Step 2: Add Environment Variables (1 minute)

Add to your `.env` file:

```bash
SENTRY_DSN="https://your-dsn-here@sentry.io/your-project-id"
NODE_ENV="development"
```

### Step 3: Start Application (1 minute)

```bash
cd backend
pnpm start:dev
```

Look for this message:
```
✅ Sentry initialized for environment: development
🔍 Sentry error tracking enabled
```

### Step 4: Test It Works (1 minute)

**Option A: Use existing debug endpoint**
```bash
curl http://localhost:3001/debug/test-error
```

**Option B: Create a test error**

Add to [src/debug/debug.controller.ts](../src/debug/debug.controller.ts):

```typescript
@Get('sentry-test')
testSentry() {
  throw new Error('Sentry test error - ' + new Date().toISOString());
}
```

Then test:
```bash
curl http://localhost:3001/debug/sentry-test
```

### Step 5: Check Sentry Dashboard

1. Go to [sentry.io](https://sentry.io/issues/)
2. You should see your test error!
3. Click on it to see:
   - Stack trace
   - Request details
   - Environment info

## 🎉 You're Done!

Sentry is now tracking all errors in your application.

## 📊 What's Being Monitored

### ✅ Automatically Tracked

- Server errors (5xx)
- Unhandled exceptions
- Performance metrics
- HTTP request traces
- CPU profiling

### ❌ Not Tracked (by design)

- Client errors (4xx) - only logged as breadcrumbs
- Network timeouts
- Sensitive data (passwords, tokens)

## 🔍 Monitoring Stack Overview

```
┌─────────────┐     ┌──────────┐     ┌────────┐
│ Prometheus  │────▶│ Grafana  │     │ Sentry │
│ (Metrics)   │     │ (Graphs) │     │(Errors)│
└─────────────┘     └──────────┘     └────────┘
      │                    │               │
      └────────────────────┴───────────────┘
                         │
                   Your Application
```

**When something goes wrong:**
1. **Prometheus** alerts on high error rate
2. **Grafana** shows error spike in dashboard
3. **Sentry** provides error details and stack trace
4. You fix the bug! 🐛→✅

## 🔗 Quick Links

- [Full Setup Guide](./SENTRY_SETUP_GUIDE.md)
- [Sentry Dashboard](https://sentry.io)
- [Prometheus Metrics](http://localhost:3001/metrics)

## 💡 Next Steps

1. ✅ Set up Slack/email alerts in Sentry
2. ✅ Create custom error tracking for specific features
3. ✅ Review performance bottlenecks in Sentry dashboard
4. ✅ Configure production settings (lower sampling rates)

## 🆘 Troubleshooting

**Not seeing errors in Sentry?**
- Check `SENTRY_DSN` is set correctly
- Make sure error is 5xx (not 4xx)
- Look for "Sentry initialized" message on startup

**Too many events?**
- Reduce sampling rate in production
- Add more ignored errors
- Set rate limits in Sentry dashboard

---

Need help? Check the [full documentation](./SENTRY_SETUP_GUIDE.md).
