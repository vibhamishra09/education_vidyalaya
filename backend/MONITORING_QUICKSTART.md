# Quick Setup Guide: Monitoring Backend at be.test.webyalaya.com

## ✅ What's Already Done

1. **Backend has `/metrics` endpoint** - Already configured with PrometheusModule
2. **Prometheus config updated** - Now points to `be.test.webyalaya.com:443` with HTTPS
3. **Environment variables ready** - `.env.monitoring` file created

## 🚀 Deployment Steps

### 1. Verify Backend Metrics Endpoint

First, confirm your backend is exposing metrics publicly:

```bash
curl https://be.test.webyalaya.com/metrics
```

You should see Prometheus metrics output like:
```
# HELP nodejs_heap_size_total_bytes ...
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 12345678
...
```

### 2. Update .env.monitoring File

Edit [.env.monitoring](backend/.env.monitoring):

```env
# Backend URL - Already configured for your deployment
BACKEND_URL=be.test.webyalaya.com
BACKEND_PROTOCOL=https

# Grafana Root URL - Update this with your EC2 monitoring instance
GRAFANA_ROOT_URL=http://YOUR_EC2_PUBLIC_IP:3002
# or if using subdomain: https://monitoring.webyalaya.com

# Change default password!
GRAFANA_ADMIN_PASSWORD=YourSecurePassword123!
```

### 3. Deploy to EC2

**A. Upload files to EC2:**

```powershell
# From your local machine
$EC2_IP = "your-ec2-ip"
$KEY = "your-key.pem"

scp -i $KEY backend/docker-compose.monitoring.yml ec2-user@${EC2_IP}:~/monitoring/
scp -i $KEY backend/.env.monitoring ec2-user@${EC2_IP}:~/monitoring/.env
scp -r -i $KEY backend/monitoring ec2-user@${EC2_IP}:~/monitoring/
```

**B. On EC2, start the services:**

```bash
cd ~/monitoring
docker-compose -f docker-compose.monitoring.yml --env-file .env up -d
```

### 4. Verify Connection

**Check Prometheus is scraping:**

1. Access Prometheus: `http://YOUR_EC2_IP:9090`
2. Go to Status → Targets
3. Verify `nestjs-backend` target shows as **UP** (green)

**Check Grafana:**

1. Access Grafana: `http://YOUR_EC2_IP:3002`
2. Login: admin / (your password)
3. Add Prometheus data source: `http://prometheus:9090`

## 🔒 Important Security Notes

### Backend Security

Your metrics endpoint at `https://be.test.webyalaya.com/metrics` is currently **publicly accessible**. Consider:

#### Option 1: IP Whitelist (Recommended)
Only allow your monitoring EC2 IP to access `/metrics`:

In [main.ts](backend/src/main.ts), add:

```typescript
// After app creation
app.use('/metrics', (req, res, next) => {
  const allowedIPs = ['YOUR_EC2_IP', 'YOUR_OFFICE_IP'];
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (allowedIPs.includes(clientIP)) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
});
```

#### Option 2: Basic Auth
Add authentication to the metrics endpoint in app.module.ts:

```typescript
PrometheusModule.register({
  path: '/metrics',
  defaultMetrics: { enabled: true },
  basicAuth: {
    username: process.env.METRICS_USER || 'prometheus',
    password: process.env.METRICS_PASSWORD || 'secure-password',
  },
}),
```

Then update prometheus.yml:
```yaml
- job_name: 'nestjs-backend'
  basic_auth:
    username: prometheus
    password: secure-password
  # ... rest of config
```

### EC2 Security Group

Configure AWS Security Group:

```
Inbound Rules:
- Port 3002 (Grafana): Your IP only / VPN IP
- Port 9090 (Prometheus): Internal only (optional, for debugging)
- Port 22 (SSH): Your IP only
```

## 📊 Testing the Setup

### 1. Test Metrics Collection

```bash
# On your local machine
curl https://be.test.webyalaya.com/metrics
```

### 2. Query in Prometheus

Access `http://YOUR_EC2_IP:9090` and run query:
```promql
nodejs_heap_size_total_bytes
```

### 3. Create Dashboard in Grafana

1. Access Grafana: `http://YOUR_EC2_IP:3002`
2. Create new dashboard
3. Add panel with query: `rate(http_requests_total[5m])`

## 🐛 Troubleshooting

### Prometheus shows target as DOWN

```bash
# Check from EC2 if it can reach backend
curl https://be.test.webyalaya.com/metrics

# Check Prometheus logs
docker logs webyalaya-prometheus

# Common issues:
# - Firewall blocking outbound HTTPS from EC2
# - Backend not exposing metrics publicly
# - SSL certificate issues
```

### Backend metrics not showing

```bash
# Verify metrics module is loaded
curl https://be.test.webyalaya.com/metrics | head -20

# Check backend logs
# Ensure PrometheusModule is imported in app.module.ts
```

### Can't access Grafana

```bash
# Check container is running
docker ps

# Check Grafana logs
docker logs webyalaya-grafana

# Verify EC2 security group allows port 3002
```

## 📈 Next Steps

1. **Set up alerts** in Grafana for critical metrics
2. **Create dashboards** for application monitoring
3. **Configure SMTP** for email notifications
4. **Set up SSL** for Grafana with Let's Encrypt
5. **Backup configs** regularly

## Files Reference

- [docker-compose.monitoring.yml](backend/docker-compose.monitoring.yml) - Main compose file
- [.env.monitoring](backend/.env.monitoring) - Environment variables
- [prometheus.yml](backend/monitoring/prometheus/prometheus.yml) - Prometheus scrape config
- [MONITORING_DEPLOYMENT.md](backend/MONITORING_DEPLOYMENT.md) - Full deployment guide
