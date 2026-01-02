# Quick Start Guide - Webyalaya Monitoring

## 🚀 Step-by-Step Setup (5 Minutes)

### 1️⃣ Generate Google App Password (REQUIRED)

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in to: `debanshughosh685@gmail.com`
3. Enable **2-Factor Authentication** (if not already enabled)
4. Create app password:
   - App: Mail
   - Device: "Grafana Monitoring"
5. **COPY THE 16-CHARACTER PASSWORD**

### 2️⃣ Update Docker Compose

Edit `docker-compose.monitoring.yml`:

```yaml
- GF_SMTP_PASSWORD=your_google_app_password_here  # Replace this line!
```

Replace `your_google_app_password_here` with the password you copied.

### 3️⃣ Start Monitoring Stack

```bash
cd backend

# Start Prometheus & Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Verify containers are running
docker ps | grep webyalaya
```

You should see:
- `webyalaya-prometheus` on port 9090
- `webyalaya-grafana` on port 3002

### 4️⃣ Start Your NestJS Backend

```bash
# In backend directory
pnpm install  # If needed
pnpm start:dev
```

Your backend should be running on http://localhost:3001

### 5️⃣ Verify Metrics Are Working

```bash
# Test the /metrics endpoint
curl http://localhost:3001/metrics | grep http_request_duration_seconds
```

You should see metric definitions (even if no data yet).

### 6️⃣ Configure Grafana

1. **Open Grafana**: http://localhost:3002
   - Username: `admin`
   - Password: `admin`

2. **Add Email Contact Point**:
   - Go to: **Alerting** → **Contact points** → **+ Add contact point**
   - Name: `Email - Debanshu`
   - Integration: **Email**
   - Addresses: `debanshughosh685@gmail.com`
   - Click **Test** (you should receive a test email)
   - Click **Save**

3. **Create Alert Rule**:
   - Go to: **Alerting** → **Alert rules** → **+ Create alert rule**
   - Name: `500 Error Alert - Any Endpoint`
   - Query:
     ```promql
     sum by (method, route, status_code) (
       increase(http_request_duration_seconds_count{status_code=~"5.."}[1m])
     ) > 0
     ```
   - Condition: `WHEN A IS ABOVE 0`
   - Folder: Create new → `API Monitoring`
   - Evaluation: `1m` (every minute)
   - Contact point: `Email - Debanshu`
   - Click **Save**

4. **Create Health Dashboard**:
   - Go to: **Dashboards** → **+ Create Dashboard** → **Add visualization**
   - Select **Prometheus** data source
   - Panel type: **Table**
   - Add these queries (see GRAFANA_SETUP_GUIDE.md for details):
     - Query A (Traffic): `sum by (method, route) (rate(http_request_duration_seconds_count[5m]))`
     - Query B (Response Time): `1000 * (sum by (method, route) (rate(http_request_duration_seconds_sum[5m])) / sum by (method, route) (rate(http_request_duration_seconds_count[5m])))`
     - Query C (Error Rate): `100 * (sum by (method, route) (rate(http_request_duration_seconds_count{status_code=~"5.."}[5m])) / sum by (method, route) (rate(http_request_duration_seconds_count[5m])))`
   - Add transformation: **Merge** (join by method and route)
   - Save dashboard as: `API Health Monitor`

### 7️⃣ Test the Alert (Optional)

Generate some traffic to your API to see metrics:

```bash
# Make some requests
curl http://localhost:3001/
curl http://localhost:3001/health
curl http://localhost:3001/api/users
```

After 1-2 minutes, check:
- **Prometheus**: http://localhost:9090 → Status → Targets (should show UP)
- **Grafana Dashboard**: Should show your endpoints with metrics

---

## ✅ Verification Checklist

- [ ] Google App Password generated
- [ ] `docker-compose.monitoring.yml` updated with password
- [ ] Prometheus container running (port 9090)
- [ ] Grafana container running (port 3002)
- [ ] NestJS backend running (port 3001)
- [ ] `/metrics` endpoint returns data
- [ ] Prometheus shows target as UP
- [ ] Email contact point created and tested
- [ ] Alert rule created
- [ ] Dashboard created with health table

---

## 🎯 What You Get

### ✨ Auto-Discovery
Every API endpoint is automatically tracked. No manual configuration needed.

### 📊 Real-Time Metrics
- **Traffic**: Requests per second
- **Latency**: Average response time
- **Errors**: 5xx error rate percentage

### 🚨 Instant Alerts
Receive email within 1-2 minutes when ANY endpoint throws a 500 error.

### 📈 Full Visibility
See health status of all endpoints in a single table dashboard.

---

## 🆘 Troubleshooting

### Backend Not Starting?
```bash
cd backend
pnpm install
pnpm start:dev
```

### Metrics Not Showing?
```bash
# Check if interceptor is loaded
curl http://localhost:3000/metrics | grep http_request

# Check Prometheus targets
# Go to: http://localhost:9090/targets
```

### Email Not Working?
```bash
# Check Grafana logs
docker logs webyalaya-grafana | grep -i smtp

# Verify app password is correct in docker-compose.monitoring.yml
```

### Containers Not Starting?
```bash
# Check logs
docker-compose -f docker-compose.monitoring.yml logs

# Restart containers
docker-compose -f docker-compose.monitoring.yml restart
```

---

## 📚 Full Documentation

See [GRAFANA_SETUP_GUIDE.md](./GRAFANA_SETUP_GUIDE.md) for:
- Detailed PromQL queries
- Advanced dashboard configurations
- Alert rule customization
- Complete troubleshooting guide

---

**You're ready!** 🎉 Your monitoring stack is now production-ready with automatic endpoint discovery and instant email alerts.
