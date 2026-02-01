# Complete Monitoring Stack - Overview

## 🎯 Monitoring Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Your NestJS Application                     │
│                                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Metrics    │  │  Logs        │  │  Error Tracking    │  │
│  │  Endpoint   │  │  Console     │  │  & Performance     │  │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘  │
└─────────┼─────────────────┼───────────────────┼──────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
   ┌────────────┐    ┌────────────┐     ┌────────────┐
   │ Prometheus │    │  Terminal  │     │   Sentry   │
   │  (Scrape)  │    │   Output   │     │  (Cloud)   │
   └─────┬──────┘    └────────────┘     └─────┬──────┘
         │                                     │
         ▼                                     ▼
   ┌────────────┐                       ┌────────────┐
   │  Grafana   │                       │  Sentry    │
   │ Dashboard  │                       │ Dashboard  │
   └────────────┘                       └────────────┘
```

## 📊 Three Pillars of Observability

| Component | Purpose | Data Type | Retention | Cost |
|-----------|---------|-----------|-----------|------|
| **Prometheus** | System metrics | Time-series data | Configurable | Self-hosted (free) |
| **Grafana** | Visualization | Dashboards | N/A | Self-hosted (free) |
| **Sentry** | Error tracking | Events & traces | 90 days | Free tier: 5k errors/mo |

## 🔍 When to Use Each Tool

### Use Prometheus When:
- ✅ Monitoring system health (CPU, memory, requests/sec)
- ✅ Tracking request rates and latencies
- ✅ Setting up threshold-based alerts
- ✅ Creating time-series graphs
- ✅ Capacity planning

### Use Grafana When:
- ✅ Visualizing metrics from Prometheus
- ✅ Creating custom dashboards
- ✅ Comparing metrics across time periods
- ✅ Setting up visual alerts
- ✅ Sharing metrics with team

### Use Sentry When:
- ✅ Debugging production errors
- ✅ Understanding error context and stack traces
- ✅ Tracking error frequency and user impact
- ✅ Performance profiling
- ✅ Release health monitoring

## 🚀 Complete Setup Workflow

### 1. Prometheus Setup ✅
```bash
# Start Prometheus
docker-compose -f docker-compose.monitoring.yml up -d prometheus

# Verify
curl http://localhost:9090
```

**Endpoint:** `http://localhost:3001/metrics`

### 2. Grafana Setup ✅
```bash
# Start Grafana
docker-compose -f docker-compose.monitoring.yml up -d grafana

# Access
open http://localhost:3000
# Login: admin / admin
```

**Import dashboards from:** `monitoring/grafana/dashboards/`

### 3. Sentry Setup ✅
```bash
# Already installed and configured!

# Just add to .env:
SENTRY_DSN="https://your-dsn@sentry.io/project-id"

# Start app
pnpm start:dev
```

**Dashboard:** [sentry.io](https://sentry.io)

## 📈 Monitoring Scenarios

### Scenario 1: High Response Time

**Symptoms:**
- Users reporting slow performance
- Need to identify bottleneck

**Investigation Flow:**
1. **Grafana** → Check "HTTP Request Duration" graph
   - Identify which endpoints are slow
   - Check if it's a recent spike or trend

2. **Sentry** → Performance tab
   - View transaction traces for slow endpoints
   - See database query times
   - Check external API latencies

3. **Prometheus** → Query specific metrics
   ```promql
   rate(http_request_duration_seconds_sum[5m])
   ```

**Result:** Identify and fix the slow code/query

---

### Scenario 2: Error Spike

**Symptoms:**
- Sudden increase in errors
- Need to understand root cause

**Investigation Flow:**
1. **Grafana** → Check "HTTP Error Rate" graph
   - See when errors started
   - Check error rate trend

2. **Sentry** → Issues tab
   - View new error types
   - Read stack traces
   - Check affected users

3. **Prometheus** → Correlate with system metrics
   - Check if CPU/memory spiked
   - Check request rate at same time

**Result:** Understand error cause and fix

---

### Scenario 3: Service Degradation

**Symptoms:**
- Some features working, others failing
- Need to identify affected components

**Investigation Flow:**
1. **Prometheus** → Check service-level metrics
   ```promql
   sum(rate(http_requests_total[5m])) by (status_code)
   ```

2. **Grafana** → View "Request Rate by Endpoint"
   - Identify which endpoints are affected
   - Check if pattern matches known issues

3. **Sentry** → Filter by tags
   - Filter errors by endpoint
   - Check if errors are user-specific

**Result:** Isolate and fix affected service

## 🎨 Dashboard Setup

### Grafana Dashboards

**Already Created:**
1. **NestJS Application Overview**
   - Request rate
   - Response time
   - Error rate
   - System metrics

2. **HTTP Metrics**
   - Requests per endpoint
   - Status code distribution
   - Slowest endpoints

3. **System Health**
   - CPU usage
   - Memory usage
   - Active connections

### Sentry Dashboards

**Configure These:**
1. **Production Errors**
   - Filter: `environment:production`
   - Group by: error type

2. **API Performance**
   - Transaction: `http.server`
   - Sort by: duration

3. **User Impact**
   - View: Affected users
   - Sort by: frequency

## 🚨 Alerting Strategy

### Prometheus Alerts

Create alerts for:
- **High error rate:** > 5% of requests fail
- **High latency:** P95 response time > 1s
- **High CPU:** > 80% for 5 minutes
- **High memory:** > 90% for 5 minutes

### Grafana Alerts

Visual alerts on dashboards:
- Red threshold lines
- Email/Slack notifications
- PagerDuty integration

### Sentry Alerts

Configure in Sentry dashboard:
- New error types
- Error frequency spikes
- Performance degradation
- Release health issues

## 🔒 Security & Privacy

### Data Retention

| System | Data | Retention | Location |
|--------|------|-----------|----------|
| Prometheus | Metrics | 15 days (configurable) | Local |
| Grafana | Dashboards | Indefinite | Local |
| Sentry | Errors | 90 days | Cloud (US/EU) |

### Sensitive Data

**Automatically Filtered:**
- Passwords
- API keys
- Authorization tokens
- Credit card numbers
- Personal data (configurable)

**Configurable in:**
- `backend/src/common/sentry/sentry.module.ts`
- Sentry dashboard → Settings → Data Scrubbing

## 💰 Cost Analysis

### Self-Hosted (Prometheus + Grafana)

**Costs:**
- Server resources: ~$10-20/month (small instance)
- Storage: ~$5/month (100GB)
- Maintenance: Dev time

**Total:** ~$15-25/month + dev time

### Sentry (Cloud)

**Free Tier:**
- 5,000 errors/month
- 10,000 performance units/month
- 90-day retention

**Paid Plans:**
- Developer: $26/month
- Team: $80/month
- Business: Custom pricing

**Optimization:**
- Use 10% sampling in production
- Filter noisy errors
- Use environment-based configuration

## 📊 Metrics Reference

### Key Metrics to Monitor

**Application Metrics:**
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# Response time (P95)
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Active connections
http_active_connections
```

**System Metrics:**
```promql
# CPU usage
process_cpu_seconds_total

# Memory usage
process_resident_memory_bytes

# Event loop lag
nodejs_eventloop_lag_seconds
```

### Sentry Metrics

**Error Metrics:**
- Error frequency
- Affected users
- Error rate by release

**Performance Metrics:**
- Transaction duration
- Database query time
- External API latency
- LCP, FID, CLS (web vitals)

## 🧪 Testing the Stack

### 1. Generate Test Traffic

```bash
# Install hey (HTTP load testing)
# Windows: choco install hey
# Mac: brew install hey

# Generate load
hey -n 1000 -c 10 http://localhost:3001/api/users
```

### 2. Generate Test Errors

```bash
# Trigger test error
curl http://localhost:3001/debug/sentry-test
```

### 3. Verify Monitoring

**Prometheus:**
```bash
# Check if metrics are being collected
curl http://localhost:3001/metrics | grep http_requests_total
```

**Grafana:**
- Open http://localhost:3000
- View dashboards
- Check if graphs are updating

**Sentry:**
- Open https://sentry.io
- Check Issues tab
- Verify test error appears

## 🚀 Production Deployment

### Environment Configuration

**Development:**
```bash
NODE_ENV=development
SENTRY_DSN="dev-project-dsn"
# Full sampling for visibility
```

**Staging:**
```bash
NODE_ENV=staging
SENTRY_DSN="staging-project-dsn"
# Moderate sampling
```

**Production:**
```bash
NODE_ENV=production
SENTRY_DSN="prod-project-dsn"
# Low sampling for cost optimization
```

### Deployment Checklist

- [ ] Prometheus accessible (port 9090)
- [ ] Grafana accessible (port 3000)
- [ ] Sentry DSN configured
- [ ] Environment variables set
- [ ] Alerts configured
- [ ] Dashboards imported
- [ ] Team has access to dashboards
- [ ] On-call rotation configured

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [MONITORING.md](./MONITORING.md) | Prometheus & Grafana setup |
| [QUICKSTART.md](./QUICKSTART.md) | Quick monitoring setup |
| [SENTRY_QUICKSTART.md](./SENTRY_QUICKSTART.md) | Quick Sentry setup |
| [SENTRY_SETUP_GUIDE.md](./SENTRY_SETUP_GUIDE.md) | Complete Sentry guide |
| [GRAFANA_SETUP_GUIDE.md](./GRAFANA_SETUP_GUIDE.md) | Grafana configuration |

## 🆘 Troubleshooting

### Prometheus Not Scraping

**Check:**
1. Application is running on correct port
2. `/metrics` endpoint is accessible
3. Prometheus configuration has correct target
4. No firewall blocking port 9090

### Grafana Not Showing Data

**Check:**
1. Prometheus is running
2. Data source is configured correctly
3. Query syntax is correct
4. Time range is appropriate

### Sentry Not Receiving Errors

**Check:**
1. `SENTRY_DSN` is set
2. Sentry initialized (check logs)
3. Error is 5xx (not 4xx)
4. Internet connectivity (Sentry is cloud-based)

## 🔗 Quick Access Links

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000 (admin/admin)
- **Metrics API:** http://localhost:3001/metrics
- **Sentry:** https://sentry.io
- **API Docs:** http://localhost:3001/api/docs

## 🎓 Learning Resources

**Prometheus:**
- [Official Docs](https://prometheus.io/docs/)
- [Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)

**Grafana:**
- [Official Docs](https://grafana.com/docs/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)

**Sentry:**
- [NestJS Integration](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

---

## 📞 Support

For monitoring questions or issues:
1. Check relevant documentation
2. Review Grafana dashboards
3. Check Sentry issues
4. Contact DevOps team

**Happy Monitoring! 📊🔍**
