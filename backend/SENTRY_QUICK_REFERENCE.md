# 🚀 Sentry Integration - Quick Reference Card

## ⚡ 60-Second Setup

```bash
# 1. Add to .env
echo 'SENTRY_DSN="https://your-dsn@sentry.io/project-id"' >> .env

# 2. Start app
pnpm start:dev

# 3. Look for this message:
# ✅ Sentry initialized for environment: development
# 🔍 Sentry error tracking enabled
```

## 🎯 What You Need

1. **Sentry DSN**: Get from https://sentry.io (free account)
2. **Environment Variable**: Add to `.env` file
3. **Start Application**: That's it!

## 📊 What Gets Tracked

### ✅ YES - Automatically Tracked
- 5xx server errors (500, 502, 503, etc.)
- Unhandled exceptions
- HTTP request context
- Performance metrics
- User info (if authenticated)

### ❌ NO - Not Tracked
- 4xx client errors (only breadcrumbs)
- Passwords, tokens, API keys
- Network timeouts

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| **Sentry Dashboard** | https://sentry.io |
| **Create Project** | https://sentry.io/organizations/your-org/projects/new/ |
| **Quick Start Guide** | [SENTRY_QUICKSTART.md](./monitoring/SENTRY_QUICKSTART.md) |
| **Full Documentation** | [SENTRY_SETUP_GUIDE.md](./monitoring/SENTRY_SETUP_GUIDE.md) |

## 🧪 Test It Works

```bash
# Option 1: Use debug endpoint (if available)
curl http://localhost:3001/debug/test-error

# Option 2: Create test endpoint
# Add to any controller:
# @Get('test-sentry')
# testSentry() { throw new Error('Test'); }

# Then check Sentry dashboard - should see error!
```

## 💰 Cost

**FREE Tier:**
- 5,000 errors/month
- 10,000 performance events/month
- With 10% sampling = ~50k total errors/month
- **More than enough for most apps!**

## 🔒 Security

All sensitive data automatically filtered:
- Authorization headers
- Cookies
- Passwords, tokens, API keys
- Query parameters with sensitive names

## 📞 Need Help?

1. **Quick Setup**: [SENTRY_QUICKSTART.md](./monitoring/SENTRY_QUICKSTART.md)
2. **Full Guide**: [SENTRY_SETUP_GUIDE.md](./monitoring/SENTRY_SETUP_GUIDE.md)
3. **Monitoring Stack**: [COMPLETE_MONITORING_STACK.md](./monitoring/COMPLETE_MONITORING_STACK.md)

---

## 🎨 Complete Monitoring Stack

```
Your App
    │
    ├─→ Prometheus → Grafana  (Metrics & Dashboards)
    └─→ Sentry                (Error Tracking)
```

**Access Points:**
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Sentry**: https://sentry.io
- **Metrics API**: http://localhost:3001/metrics

---

**Status:** ✅ Ready to Use
**Just add:** SENTRY_DSN to .env
**Time to setup:** 5 minutes
