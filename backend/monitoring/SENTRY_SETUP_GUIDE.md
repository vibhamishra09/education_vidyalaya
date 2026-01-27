# Sentry Integration Guide

## Overview

Sentry is integrated into the Webyalaya backend for comprehensive error tracking, performance monitoring, and profiling. This guide covers setup, configuration, and usage.

## 🎯 Features Implemented

- ✅ **Error Tracking**: Automatic capture of unhandled exceptions and errors
- ✅ **Performance Monitoring**: Request tracing and performance metrics
- ✅ **Profiling**: CPU and memory profiling for performance optimization
- ✅ **Context Enrichment**: HTTP context, user info, and custom tags
- ✅ **Sensitive Data Filtering**: Automatic removal of sensitive information
- ✅ **Smart Error Filtering**: Only 5xx errors reported, 4xx errors as breadcrumbs
- ✅ **Integration with Prometheus**: Complementary monitoring stack

## 📋 Prerequisites

- Sentry account (free or paid plan)
- Node.js and NestJS application
- Environment variables configured

## 🚀 Quick Setup

### 1. Create a Sentry Project

1. Go to [Sentry.io](https://sentry.io) and sign up/login
2. Create a new project:
   - Choose **Node.js** as the platform
   - Choose **NestJS** as the framework
   - Name your project (e.g., `webyalaya-backend`)
3. Copy the **DSN** (Data Source Name) - it looks like:
   ```
   https://abc123xyz456@o123456.ingest.sentry.io/789012
   ```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Sentry Configuration
SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"
SENTRY_RELEASE="webyalaya-backend@1.0.0"
NODE_ENV="production"  # or "development"
```

### 3. Environment-Specific Configuration

**Development:**
```bash
NODE_ENV=development
SENTRY_DSN="https://your-dev-dsn@sentry.io/project-id"
# 100% sampling for complete visibility
```

**Production:**
```bash
NODE_ENV=production
SENTRY_DSN="https://your-prod-dsn@sentry.io/project-id"
SENTRY_RELEASE="webyalaya-backend@1.2.3"
# 10% sampling to reduce costs
```

## 📁 File Structure

```
backend/src/
├── common/
│   └── sentry/
│       ├── sentry.module.ts       # Sentry initialization module
│       ├── sentry.interceptor.ts  # Request/error interceptor
│       ├── sentry.filter.ts       # Global exception filter
│       └── index.ts               # Barrel export
├── main.ts                        # Sentry initialization
└── app.module.ts                  # Module imports
```

## 🔧 Configuration Details

### Sentry Module (`sentry.module.ts`)

Handles Sentry initialization with:
- DSN configuration
- Environment-based sampling rates
- Profiling integration
- Sensitive data filtering
- Error filtering (ignore common browser/network errors)

**Key Features:**
```typescript
- tracesSampleRate: 0.1 (production) / 1.0 (development)
- profilesSampleRate: 0.1 (production) / 1.0 (development)
- Filters: authorization headers, cookies, sensitive query params
- Ignored errors: Network errors, browser errors, common timeouts
```

### Sentry Interceptor (`sentry.interceptor.ts`)

Captures:
- All HTTP requests as transactions
- Request context (method, URL, headers)
- User information (if authenticated)
- Only 5xx errors reported to Sentry
- 4xx errors logged as breadcrumbs

### Sentry Filter (`sentry.filter.ts`)

Global exception filter that:
- Catches all unhandled exceptions
- Reports 5xx errors to Sentry with full context
- Returns formatted error responses
- Includes stack traces in development

## 📊 What Gets Tracked

### Automatic Tracking

1. **Errors (5xx)**
   - Unhandled exceptions
   - Server errors
   - Database errors
   - Third-party API failures

2. **Performance**
   - HTTP request duration
   - Database query performance
   - External API calls
   - CPU profiling data

3. **Context**
   - HTTP method and URL
   - Request headers (sanitized)
   - User information (if authenticated)
   - Environment and release version

### Not Tracked (by design)

- 4xx client errors (logged as breadcrumbs only)
- Sensitive data (passwords, tokens, API keys)
- Network timeouts and connection errors
- Common browser errors

## 🧪 Testing Sentry Integration

### 1. Test Error Endpoint

Create a test endpoint to verify Sentry is working:

```typescript
// src/debug/debug.controller.ts
@Get('sentry-test')
testSentry() {
  throw new Error('This is a test error for Sentry!');
}
```

### 2. Send Test Error

```bash
curl http://localhost:3001/debug/sentry-test
```

### 3. Check Sentry Dashboard

1. Go to Sentry dashboard
2. Navigate to **Issues**
3. You should see: "This is a test error for Sentry!"
4. Click on it to see full context:
   - Stack trace
   - HTTP context
   - Environment info
   - Breadcrumbs

### 4. Test Performance Monitoring

```bash
# Make multiple requests to generate performance data
for i in {1..10}; do
  curl http://localhost:3001/api/users
done
```

Check **Performance** tab in Sentry to see transaction traces.

## 📈 Monitoring Integration

### Prometheus + Grafana + Sentry

**Complementary Monitoring Stack:**

| Tool | Purpose | Use Case |
|------|---------|----------|
| **Prometheus** | Metrics collection | System health, request rates, latency |
| **Grafana** | Metrics visualization | Dashboards, alerts, trends |
| **Sentry** | Error tracking | Error details, stack traces, user impact |

**Workflow:**
1. Prometheus alerts on high error rate
2. Grafana dashboard shows error spike
3. Sentry provides error details and context
4. Debug and fix the issue
5. Verify fix in Sentry

### Available Endpoints

```bash
# Prometheus metrics
GET http://localhost:3001/metrics

# Sentry errors
# Automatically sent to Sentry.io dashboard
```

## 🎨 Sentry Dashboard Features

### Issues Tab
- All captured errors
- Error frequency and impact
- Stack traces and context
- User feedback (if configured)

### Performance Tab
- Transaction traces
- Slowest endpoints
- Database query performance
- External API latency

### Releases Tab
- Deploy tracking
- Error rates by version
- Regression detection
- Release health

### Alerts
Set up alerts for:
- New error types
- Error rate spikes
- Performance degradation
- Specific error patterns

## 🔒 Security & Privacy

### Sensitive Data Handling

**Automatically Filtered:**
- `Authorization` headers
- `Cookie` headers
- Query params: `token`, `password`, `api_key`, `secret`

**Request Body Filtering:**
Add custom filters in `sentry.module.ts`:

```typescript
beforeSend(event, hint) {
  // Custom filtering
  if (event.request?.data) {
    delete event.request.data.password;
    delete event.request.data.creditCard;
  }
  return event;
}
```

### User Privacy

Configure in `sentry.interceptor.ts`:

```typescript
// Only send minimal user data
scope.setUser({
  id: user.id,  // Anonymized ID
  // Don't send email in production
  email: process.env.NODE_ENV === 'development' ? user.email : undefined,
});
```

## 🚨 Best Practices

### 1. Custom Error Tracking

```typescript
import * as Sentry from '@sentry/nestjs';

// Add custom context
Sentry.setContext('payment', {
  orderId: order.id,
  amount: order.amount,
});

// Capture custom error
Sentry.captureMessage('Payment processing failed', {
  level: 'error',
  tags: {
    payment_provider: 'stripe',
  },
});
```

### 2. Breadcrumbs

```typescript
// Add breadcrumbs for debugging context
Sentry.addBreadcrumb({
  category: 'database',
  message: 'User query executed',
  level: 'info',
  data: {
    userId: user.id,
    query: 'findMany',
  },
});
```

### 3. Performance Tracking

```typescript
// Track custom operations
const transaction = Sentry.startTransaction({
  op: 'task',
  name: 'Process Video Upload',
});

try {
  // Your code
  await processVideo(file);
} finally {
  transaction.finish();
}
```

### 4. User Feedback

Enable user feedback in Sentry dashboard to let users report issues directly.

## 🐛 Troubleshooting

### Sentry Not Capturing Errors

**Check:**
1. `SENTRY_DSN` is set correctly
2. Environment is not `test`
3. Error is 5xx (not 4xx)
4. Sentry initialization succeeded (check console logs)

```bash
# Should see on startup:
✅ Sentry initialized for environment: production
```

### Too Many Events

**Solutions:**
1. Reduce sampling rates in production
2. Add more ignored errors
3. Filter out noisy errors
4. Set error rate limits in Sentry dashboard

### Performance Impact

**Optimization:**
- Use 10% sampling in production (`tracesSampleRate: 0.1`)
- Enable profiling only when needed
- Use Sentry's performance budgets
- Monitor Sentry's own overhead

### Missing Context

**Enhance:**
```typescript
// Add custom tags
Sentry.setTag('feature', 'payments');
Sentry.setTag('version', 'v2');

// Add custom context
Sentry.setContext('business', {
  customerId: customer.id,
  planType: customer.plan,
});
```

## 📊 Cost Optimization

### Free Tier Limits
- 5,000 errors/month
- 10,000 performance units/month

### Optimization Strategies

1. **Sampling:**
   ```typescript
   tracesSampleRate: 0.1,  // 10% of transactions
   profilesSampleRate: 0.1, // 10% profiling
   ```

2. **Error Filtering:**
   ```typescript
   ignoreErrors: [
     'NetworkError',
     'ECONNRESET',
     // Add noisy errors
   ]
   ```

3. **Environment-Based:**
   - Full sampling in development
   - Reduced sampling in production
   - No Sentry in test environment

4. **Rate Limiting:**
   - Set in Sentry dashboard
   - Limit per error type
   - Limit per time window

## 🔗 Useful Links

- [Sentry Dashboard](https://sentry.io)
- [NestJS Integration Docs](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Error Filtering](https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/)

## 📞 Support

For issues or questions:
1. Check Sentry documentation
2. Review error patterns in dashboard
3. Adjust configuration in `sentry.module.ts`
4. Contact team lead for Sentry account access

---

**Happy Error Tracking! 🐛🔍**
