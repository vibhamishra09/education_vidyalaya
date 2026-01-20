# Grafana Setup Guide - Complete Monitoring & Alerting

## Part 3: Dashboard Queries & Alert Configuration

### 🎯 Health Table Dashboard - PromQL Queries

#### Query 1: Traffic (Requests per Second)
```promql
sum by (method, route) (rate(http_request_duration_seconds_count[5m]))
```
**Panel Type:** Table  
**Description:** Shows requests/second for each endpoint (averaged over 5 minutes)

#### Query 2: Average Response Time (milliseconds)
```promql
1000 * (
  sum by (method, route) (rate(http_request_duration_seconds_sum[5m]))
  /
  sum by (method, route) (rate(http_request_duration_seconds_count[5m]))
)
```
**Panel Type:** Table  
**Description:** Shows average response time in milliseconds for each endpoint

#### Query 3: Error Rate (%)
```promql
100 * (
  sum by (method, route) (rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]))
  /
  sum by (method, route) (rate(http_request_duration_seconds_count[5m]))
)
```
**Panel Type:** Table  
**Description:** Shows percentage of 5xx errors per endpoint

#### Combined Table Query (Recommended)
Create a **single table panel** with these queries:

**Query A (Traffic):**
```promql
sum by (method, route) (rate(http_request_duration_seconds_count[5m]))
```
**Format:** Instant  
**Legend:** `Traffic (req/s)`

**Query B (Avg Response Time):**
```promql
1000 * (
  sum by (method, route) (rate(http_request_duration_seconds_sum[5m]))
  /
  sum by (method, route) (rate(http_request_duration_seconds_count[5m]))
)
```
**Format:** Instant  
**Legend:** `Avg Response Time (ms)`

**Query C (Error Rate):**
```promql
100 * (
  sum by (method, route) (rate(http_request_duration_seconds_count{status_code=~"5.."}[5m]))
  /
  sum by (method, route) (rate(http_request_duration_seconds_count[5m]))
)
```
**Format:** Instant  
**Legend:** `Error Rate (%)`

**Query D (Status Check - Color Coding):**
```promql
sum by (method, route) (rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) > 0
```
**Format:** Instant  
**Legend:** `Has Errors`

### 📊 Creating the Health Table Dashboard

1. **Go to Grafana**: http://localhost:3002 (login: admin/admin)
2. **Create New Dashboard**: Click "+" → "Dashboard"
3. **Add Visualization**: Click "Add visualization" → Select "Prometheus" data source
4. **Configure Panel:**
   - Panel Type: **Table**
   - Panel Title: **API Endpoint Health Status**
5. **Add All 4 Queries** (A, B, C, D from above)
6. **Configure Table:**
   - **Transformations** → Add transformation → **Merge**
   - Join by: `method` and `route`
7. **Column Overrides:**
   - `method`: Width = 80px
   - `route`: Width = Auto
   - `Value #A` (Traffic): Decimals = 2, Unit = "req/s"
   - `Value #B` (Response Time): Decimals = 1, Unit = "ms"
   - `Value #C` (Error Rate): Decimals = 2, Unit = "%", Thresholds: Green (0), Yellow (1), Red (5)
   - `Value #D` (Has Errors): Display = "Color background", Thresholds: Green (0), Red (1)
8. **Save Dashboard**: Name it "API Health Monitor"

---

## 🚨 Alert Rule for 500 Errors

### Alert Query (Detects ANY 5xx Error)
```promql
sum by (method, route, status_code) (
  increase(http_request_duration_seconds_count{status_code=~"5.."}[1m])
) > 0
```
**Description:** Triggers if ANY endpoint has 1 or more 5xx errors in the last minute

### Alternative (More Sensitive - Per Request)
```promql
rate(http_request_duration_seconds_count{status_code=~"5.."}[1m]) > 0
```
**Description:** Triggers on ANY 5xx error rate > 0

---

## 📧 Setting Up Email Alerts (CRITICAL STEPS)

### Step 1: Generate Google App Password

**⚠️ IMPORTANT:** You MUST create a Google App Password to use Gmail SMTP

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in to `debanshughosh685@gmail.com`
3. Click "App passwords" (if you don't see it, enable 2-Factor Authentication first)
4. Select:
   - **App:** Mail
   - **Device:** Other (Custom name) → Enter: "Grafana Monitoring"
5. Click **Generate**
6. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
7. **Update docker-compose.monitoring.yml:**
   ```yaml
   - GF_SMTP_PASSWORD=abcd efgh ijkl mnop  # Replace with YOUR app password
   ```
8. **Restart Grafana:**
   ```bash
   cd backend
   docker-compose -f docker-compose.monitoring.yml down
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

### Step 2: Create Email Contact Point in Grafana

1. **Login to Grafana**: http://localhost:3002
2. **Go to Alerting**:
   - Click **Alerting** (bell icon) in left sidebar
   - Click **Contact points**
3. **Add New Contact Point**:
   - Click **"+ Add contact point"**
   - **Name:** `Email - Debanshu`
   - **Integration:** Select **Email**
   - **Addresses:** `debanshughosh685@gmail.com`
   - **Optional - Subject:** `🚨 [Webyalaya] API Error Alert`
   - **Optional - Message:** Leave default or customize
4. **Test & Save**:
   - Click **"Test"** to send a test email
   - If successful, click **"Save contact point"**

### Step 3: Create Alert Rule

1. **Go to Alert Rules**:
   - Click **Alerting** → **Alert rules**
   - Click **"+ Create alert rule"**

2. **Configure Alert Rule:**

   **Section 1: Rule Name**
   - **Rule name:** `500 Error Alert - Any Endpoint`

   **Section 2: Query and Alert Condition**
   - **Query A:**
     ```promql
     sum by (method, route, status_code) (
       increase(http_request_duration_seconds_count{status_code=~"5.."}[1m])
     ) > 0
     ```
   - **Classic condition:**
     - **WHEN:** `A` **IS ABOVE** `0`

   **Section 3: Alert Evaluation Behavior**
   - **Folder:** Create new → Name: `API Monitoring`
   - **Evaluation group:** Create new → Name: `Critical Errors`
   - **Evaluation interval:** `1m` (checks every minute)
   - **Pending period:** `0s` (alerts immediately, no delay)

   **Section 4: Configure Labels & Notifications**
   - **Labels:**
     - `severity`: `critical`
     - `team`: `backend`
   - **Custom annotations:**
     - `summary`: `5xx Error Detected on {{ $labels.route }}`
     - `description`: `Endpoint {{ $labels.method }} {{ $labels.route }} returned {{ $labels.status_code }} error`

   **Section 5: Notification Policy**
   - **Contact point:** Select `Email - Debanshu`
   - **Mute timings:** Leave empty (always alert)

3. **Save and Test**:
   - Click **"Save rule and exit"**
   - The alert will now monitor ALL endpoints automatically

### Step 4: Test the Alert (Optional)

To verify the alert works, you can manually trigger a 500 error:

1. Create a test endpoint that throws an error:
```typescript
// Add to app.controller.ts
@Get('test-error')
testError() {
  throw new Error('Test 500 error');
}
```

2. Call the endpoint:
```bash
curl http://localhost:3000/test-error
```

3. **Within 1-2 minutes**, you should receive an email at `debanshughosh685@gmail.com`

---

## 📋 Complete PromQL Cheat Sheet

### All Endpoints List
```promql
count by (method, route) (http_request_duration_seconds_count)
```

### Total Request Count (Last Hour)
```promql
sum by (method, route) (increase(http_request_duration_seconds_count[1h]))
```

### P95 Response Time (ms)
```promql
1000 * histogram_quantile(0.95, sum by (method, route, le) (rate(http_request_duration_seconds_bucket[5m])))
```

### P99 Response Time (ms)
```promql
1000 * histogram_quantile(0.99, sum by (method, route, le) (rate(http_request_duration_seconds_bucket[5m])))
```

### Total 5xx Errors (Last 24h)
```promql
sum by (method, route) (increase(http_request_duration_seconds_count{status_code=~"5.."}[24h]))
```

### Success Rate (%)
```promql
100 * (
  sum by (method, route) (rate(http_request_duration_seconds_count{status_code!~"5.."}[5m]))
  /
  sum by (method, route) (rate(http_request_duration_seconds_count[5m]))
)
```

### Endpoints by Traffic (Top 10)
```promql
topk(10, sum by (route) (rate(http_request_duration_seconds_count[5m])))
```

### Slowest Endpoints (Top 10)
```promql
topk(10, 
  sum by (route) (rate(http_request_duration_seconds_sum[5m]))
  /
  sum by (route) (rate(http_request_duration_seconds_count[5m]))
)
```

---

## 🔥 Quick Verification Checklist

- [ ] Interceptor created at `src/logging.interceptor.ts`
- [ ] `app.module.ts` updated with histogram provider and global interceptor
- [ ] Google App Password generated
- [ ] `docker-compose.monitoring.yml` updated with SMTP settings
- [ ] Containers restarted: `docker-compose -f docker-compose.monitoring.yml up -d`
- [ ] Backend running: Check `/metrics` endpoint
- [ ] Prometheus scraping: http://localhost:9090 → Status → Targets (should be UP)
- [ ] Grafana accessible: http://localhost:3002
- [ ] Email contact point created and tested
- [ ] Alert rule created with 1-minute evaluation
- [ ] Health table dashboard created with all metrics

---

## 🎯 Expected Results

### After Setup:
1. **All API endpoints** will be automatically tracked (no manual configuration needed)
2. **Grafana table** will show real-time health metrics for every endpoint
3. **Email alerts** will arrive within 1-2 minutes of any 500 error
4. **Zero maintenance** - new endpoints are auto-discovered

### Email Alert Example:
```
Subject: 🚨 [Webyalaya] API Error Alert

Alert: 500 Error Alert - Any Endpoint
Status: Firing
Severity: critical

Summary: 5xx Error Detected on /api/users/:id
Description: Endpoint GET /api/users/:id returned 500 error

Time: 2025-12-22 10:45:32 UTC
```

---

## 🛠️ Troubleshooting

### No Metrics Showing?
```bash
# Check if metrics endpoint works
curl http://localhost:3001/metrics | grep http_request_duration_seconds

# Verify Prometheus is scraping
# Go to: http://localhost:9090/targets
# Should show "http://host.docker.internal:3001/metrics" as UP
```

### Email Not Sending?
```bash
# Check Grafana logs
docker logs webyalaya-grafana | grep -i smtp

# Verify SMTP settings in Grafana
# Go to: Configuration → Settings → SMTP
```

### Alert Not Triggering?
```bash
# Check if Prometheus has data
# Go to: http://localhost:9090/graph
# Run query: http_request_duration_seconds_count{status_code=~"5.."}

# Check alert rule status
# Grafana → Alerting → Alert rules → Your rule → "View details"
```

---

## 📞 Support

If you encounter issues, check:
1. Docker container logs: `docker-compose -f docker-compose.monitoring.yml logs -f`
2. Prometheus targets: http://localhost:9090/targets
3. Grafana data source: Configuration → Data Sources → Prometheus (Test & Save)

**You're all set!** 🚀 Your monitoring is now production-ready with automatic endpoint discovery and instant email alerts.
