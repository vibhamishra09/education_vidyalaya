# Stress Test & Monitoring Verification

## 🎯 Purpose

This script tests your monitoring setup by:
- Generating traffic to all backend endpoints
- Creating load to test metrics collection
- Triggering errors to verify alerting works
- Validating Prometheus is collecting metrics

## 🚀 Quick Start

### Run the Test

```bash
# From backend directory
node monitoring/stress-test.js

# Or with custom backend URL
BASE_URL=http://localhost:3001 node monitoring/stress-test.js
```

### What It Does

1. **Endpoint Testing** (Phase 1)
   - Tests all main API endpoints
   - Measures response times
   - Validates connectivity

2. **Load Testing** (Phase 2)
   - Sends 10 requests to each endpoint
   - Generates realistic traffic
   - Creates data for dashboard

3. **Error Scenarios** (Phase 3)
   - Triggers 404 and 500 errors
   - Tests alert conditions
   - Should trigger email alert

4. **Metrics Verification** (Phase 4)
   - Queries Prometheus
   - Validates metrics are collected
   - Shows sample data

5. **Statistics Summary**
   - Total requests made
   - Success/error rates
   - Response time analysis
   - Status code distribution

## 📊 Expected Output

```
═══════════════════════════════════════════════════════
🚀 Monitoring Stress Test & Alert Verification
═══════════════════════════════════════════════════════

Backend URL:     http://localhost:3001
Prometheus URL:  http://localhost:9090

═══════════════════════════════════════════════════════
📡 Testing Backend Endpoints
═══════════════════════════════════════════════════════

✓ Root → 200 (45ms)
✓ Health Check → 200 (12ms)
✓ Metrics Endpoint → 200 (156ms)
...

═══════════════════════════════════════════════════════
🔥 Load Testing (10 requests per endpoint)
═══════════════════════════════════════════════════════

✓ Root → Completed 10 requests
✓ Health Check → Completed 10 requests
...

═══════════════════════════════════════════════════════
🚨 Testing Error Scenarios (Alert Triggers)
═══════════════════════════════════════════════════════

ℹ Generating errors to test Grafana alerting...
⚠ You should receive an email alert within 1-2 minutes if configured correctly.

✓ Not Found (404) → 404 (Error triggered for alerting)
...

═══════════════════════════════════════════════════════
📊 Verifying Prometheus Metrics
═══════════════════════════════════════════════════════

✓ Found 15 metric series

Sample endpoints being tracked:
  GET / → Status 200
  GET /health → Status 200
  GET /metrics → Status 200
  ...

═══════════════════════════════════════════════════════
📈 Test Statistics
═══════════════════════════════════════════════════════

Total Requests:      127
Successful (2xx):    95
Errors (4xx/5xx):    32

Response Times:
  Average:           45.23ms
  Min:               8ms
  Max:               234ms

Status Code Distribution:
  200: 85 requests
  404: 20 requests
  401: 10 requests
  500: 2 requests
```

## ✅ Verification Steps

After running the test:

### 1. Check Prometheus Targets
- Open: http://localhost:9090/targets
- Verify: `nestjs-backend` target shows **UP** status
- Screenshot if needed

### 2. Query Prometheus
- Open: http://localhost:9090/graph
- Run query: `http_request_duration_seconds_count`
- You should see data for all tested endpoints

### 3. View Grafana Dashboard
- Open: http://localhost:3002
- Login: admin/admin
- Navigate to your imported dashboard
- Verify: Table shows all endpoints with metrics
- Check: Error rate column shows percentages

### 4. Check Alert Status
- Grafana → Alerting → Alert rules
- Find: "500 Error Alert - Any Endpoint"
- Status should be **Firing** (red) if errors detected
- Status shows **Normal** (green) if no errors

### 5. Verify Email Alert
- Check inbox: debanshughosh685@gmail.com
- Look for: "[Webyalaya] API Error Alert"
- Should arrive: Within 1-2 minutes of test
- Contains: Endpoint details and error status

## 🔧 Customization

### Test Specific Endpoints

Edit `stress-test.js` and modify the `endpoints` array:

```javascript
const endpoints = [
  { method: 'GET', path: '/your-endpoint', name: 'Your Endpoint' },
  { method: 'POST', path: '/api/something', name: 'POST Test', body: { data: 'test' } },
];
```

### Adjust Load Testing

Change the number of requests:

```javascript
await loadTest(50); // 50 requests per endpoint instead of 10
```

### Add Custom Tests

```javascript
// Add to testErrorScenarios function
async function testErrorScenarios() {
  // ... existing code ...
  
  // Your custom error test
  log.info('Testing custom error scenario...');
  await makeRequest('POST', '/api/custom-error', { invalid: 'data' });
}
```

## 🐛 Troubleshooting

### Backend Not Reachable
```bash
# Check if backend is running
curl http://localhost:3001/health

# If not, start it
pnpm start:dev
```

### No Metrics in Prometheus
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Restart Prometheus
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Alerts Not Firing

1. Check alert rule exists:
   - Grafana → Alerting → Alert rules
   - Verify "500 Error Alert" is present

2. Check evaluation:
   - Alert should evaluate every 1 minute
   - Wait 2-3 minutes after running test

3. Verify email config:
   - Grafana → Alerting → Contact points
   - Test email delivery

### Script Errors

**"Cannot find module"**
```bash
# Make sure you're using Node.js 18+
node --version

# The script uses native fetch (Node 18+)
```

**"Connection refused"**
- Verify backend is running on port 3001
- Check `BASE_URL` environment variable

## 📋 Quick Commands

```bash
# Run full test
node monitoring/stress-test.js

# Run with custom settings
BASE_URL=http://localhost:3001 node monitoring/stress-test.js

# View live Prometheus metrics
curl http://localhost:3001/metrics | grep http_request

# Check Grafana status
curl http://localhost:3002/api/health

# Restart monitoring stack
docker-compose -f docker-compose.monitoring.yml restart
```

## 🎯 Success Criteria

✅ **Monitoring is working if:**
- All Prometheus targets show UP status
- Grafana dashboard displays endpoint metrics
- Error rate shows percentage when errors occur
- Email alert arrives within 2 minutes

❌ **Troubleshoot if:**
- Prometheus target shows DOWN
- No metrics appear in Grafana
- No email received after 5 minutes
- Response times are extremely high (>5s)

## 📚 Related Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Initial setup guide
- [GRAFANA_SETUP_GUIDE.md](./GRAFANA_SETUP_GUIDE.md) - Detailed Grafana config
- [README.md](./README.md) - Complete monitoring overview

---

**Need help?** Check the troubleshooting section in GRAFANA_SETUP_GUIDE.md
