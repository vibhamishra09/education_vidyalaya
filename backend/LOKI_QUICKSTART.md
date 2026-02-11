# Loki Integration Quick Start Guide

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

This will install the `pino-loki` package that was added to `package.json`.

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Enable Loki
LOKI_ENABLED=true
LOKI_HOST=http://localhost:3100
LOKI_BATCH_SIZE=100
LOKI_BATCH_INTERVAL=5000
```

### 3. Start Loki and Grafana

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

This will start:
- **Loki** on `http://localhost:3100`
- **Prometheus** on `http://localhost:9090`
- **Grafana** on `http://localhost:3002`

### 4. Start Your Backend

```bash
pnpm run start:dev
```

Your application logs will now be sent to Loki!

### 5. View Logs in Grafana

1. Open **http://localhost:3002** in your browser
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin` (or your configured password)
3. Navigate to **Dashboards** → **Webyalaya Loki Logs**

## 📊 Using the Dashboard

The dashboard includes:

- **Live Log Stream**: Real-time view of all logs
- **Log Level Distribution**: Breakdown by log level (debug, info, warn, error)
- **Error Rate Over Time**: Time series of error occurrences
- **Error Logs**: Filtered view of error-level logs
- **HTTP Request Logs**: Filtered view of HTTP request logs
- **Summary Gauges**: Quick stats for errors, log rate, HTTP requests, and warnings

## 🔍 LogQL Queries

You can create custom queries in Grafana using LogQL:

### Basic Queries

```logql
# All logs
{service="webyalaya-backend"}

# Errors only
{service="webyalaya-backend"} | json | level="error"

# HTTP requests
{service="webyalaya-backend"} | json | context="HTTP"

# Errors in last hour
{service="webyalaya-backend"} | json | level="error" [1h]
```

### Advanced Queries

```logql
# Count errors by context
sum by (context) (count_over_time({service="webyalaya-backend"} | json | level="error" [5m]))

# Request duration > 1s
{service="webyalaya-backend"} | json | duration > 1000

# Search for specific text
{service="webyalaya-backend"} |= "database"
```

## 🛠️ Troubleshooting

### Logs Not Appearing in Loki

1. **Check Loki is running:**
   ```bash
   docker ps | grep loki
   ```

2. **Check Loki logs:**
   ```bash
   docker logs webyalaya-loki
   ```

3. **Verify LOKI_ENABLED is set:**
   ```bash
   echo $LOKI_ENABLED  # Should be "true"
   ```

4. **Check backend logs for Loki errors:**
   Look for "Failed to initialize Loki transport" messages

### Grafana Can't Connect to Loki

1. **Verify Loki datasource:**
   - Go to Grafana → Configuration → Data Sources
   - Check "Loki" datasource URL is `http://loki:3100`

2. **Check network:**
   ```bash
   docker network ls
   docker network inspect backend_monitoring
   ```

### High Memory Usage

If you notice high memory usage:

1. **Reduce batch size:**
   ```env
   LOKI_BATCH_SIZE=50
   ```

2. **Increase batch interval:**
   ```env
   LOKI_BATCH_INTERVAL=10000
   ```

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOKI_ENABLED` | `false` | Enable/disable Loki integration |
| `LOKI_HOST` | `http://localhost:3100` | Loki server URL |
| `LOKI_BATCH_SIZE` | `100` | Number of logs to batch before sending |
| `LOKI_BATCH_INTERVAL` | `5000` | Milliseconds between batch sends |

### Loki Configuration

Loki configuration is in `monitoring/loki/loki-config.yml`:

- **Retention**: 7 days (configurable)
- **Storage**: Filesystem (local) or S3 (production)
- **Limits**: Configurable ingestion and query limits

## 📈 Production Deployment

For production (AWS ECS), see the full integration plan:
- `LOKI_INTEGRATION_PLAN.md` - Phase 3: AWS ECS Deployment

Key considerations:
- Use Loki as sidecar container in ECS task
- Configure persistent storage (EFS or S3)
- Set appropriate retention policies
- Monitor Loki resource usage

## 🎯 Next Steps

1. **Customize Dashboards**: Create dashboards for specific use cases
2. **Set Up Alerts**: Configure alerting rules in `monitoring/loki/rules/alerts.yml`
3. **Optimize Labels**: Review label strategy to avoid high cardinality
4. **Monitor Performance**: Track Loki ingestion rate and query performance

## 📚 Resources

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Pino-Loki Transport](https://github.com/Julien-R44/pino-loki)
- Full Integration Plan: `LOKI_INTEGRATION_PLAN.md`

---

**Happy Logging! 📊✨**
