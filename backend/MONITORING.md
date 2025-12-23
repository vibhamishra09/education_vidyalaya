# Prometheus & Grafana Monitoring Setup

This guide explains how to use Prometheus and Grafana to monitor your Webyalaya NestJS backend application.

## 🎯 Overview

- **Prometheus**: Collects and stores metrics from your NestJS application
- **Grafana**: Visualizes metrics with pre-configured dashboards
- **Metrics Endpoint**: Available at `http://localhost:3001/metrics`

## 📦 What's Included

### Metrics Being Collected

1. **HTTP Metrics**
   - Request rate by endpoint
   - Response times (P50, P95, P99)
   - Status codes distribution
   - Request duration histograms

2. **Node.js Metrics**
   - Event loop lag
   - Heap memory usage
   - CPU usage
   - Active handles & requests
   - Garbage collection stats

3. **System Metrics**
   - Memory usage
   - CPU usage
   - Open file descriptors
   - Process uptime

## 🚀 Quick Start

### Step 1: Install Dependencies

The `@willsoto/nestjs-prometheus` package is already added to `package.json`. Install it:

```powershell
cd backend
pnpm install
```

### Step 2: Start Your NestJS Backend

```powershell
pnpm run start:dev
```

Your backend will expose metrics at: `http://localhost:3001/metrics`

### Step 3: Start Prometheus & Grafana

```powershell
docker-compose -f docker-compose.monitoring.yml up -d
```

This starts:
- **Prometheus** on `http://localhost:9090`
- **Grafana** on `http://localhost:3002`

### Step 4: Access Grafana Dashboard

1. Open **http://localhost:3002** in your browser
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin`
3. Navigate to **Dashboards** → **Webyalaya NestJS Metrics**

## 📊 Grafana Dashboard

The pre-configured dashboard includes:

### Top Row
- **HTTP Request Rate**: Real-time request rate per endpoint
- **P95 Response Time**: 95th percentile latency gauge

### Middle Rows
- **CPU Usage**: Process CPU consumption over time
- **Memory Usage**: Memory consumption trends
- **HTTP Status Codes**: Distribution of 2xx, 4xx, 5xx responses

### Bottom Row (Stats)
- **Event Loop Lag**: Node.js event loop delay
- **Heap Used**: Current heap memory usage
- **Active Handles**: Number of active Node.js handles
- **Open File Descriptors**: System file descriptor count

## 🔧 Configuration

### Prometheus Configuration

Located at: `backend/monitoring/prometheus/prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'nestjs-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3001']
    scrape_interval: 10s
```

**Note**: If running on Linux, change `host.docker.internal` to `172.17.0.1` or use host networking.

### Grafana Provisioning

- **Datasources**: `monitoring/grafana/provisioning/datasources/`
- **Dashboards**: `monitoring/grafana/dashboards/`

Grafana automatically loads these on startup.

## 📈 Creating Custom Metrics

### 1. Counter Example (Track Events)

```typescript
import { Injectable } from '@nestjs/common';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class StudyRoomsService {
  constructor(
    @InjectMetric('study_rooms_created_total')
    private readonly studyRoomsCounter: Counter,
  ) {}

  async createStudyRoom(data: CreateStudyRoomDto) {
    const room = await this.prisma.studyRoom.create({ data });
    this.studyRoomsCounter.inc(); // Increment counter
    return room;
  }
}
```

### 2. Gauge Example (Current Values)

```typescript
import { Injectable } from '@nestjs/common';
import { Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class DashboardService {
  constructor(
    @InjectMetric('active_sessions_total')
    private readonly activeSessionsGauge: Gauge,
  ) {}

  async updateActiveSessions() {
    const count = await this.prisma.studyRoom.count({
      where: { sessionStatus: 'ONGOING' }
    });
    this.activeSessionsGauge.set(count);
  }
}
```

### 3. Histogram Example (Duration Distribution)

```typescript
import { Injectable } from '@nestjs/common';
import { Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectMetric('payment_processing_duration_seconds')
    private readonly paymentDurationHistogram: Histogram,
  ) {}

  async processPayment(data: PaymentDto) {
    const end = this.paymentDurationHistogram.startTimer();
    try {
      const result = await this.doPaymentLogic(data);
      return result;
    } finally {
      end(); // Records duration
    }
  }
}
```

### 4. Register Custom Metrics in Module

Add to your feature module:

```typescript
import { Module } from '@nestjs/common';
import { makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

@Module({
  providers: [
    makeCounterProvider({
      name: 'study_rooms_created_total',
      help: 'Total number of study rooms created',
      labelNames: ['status'],
    }),
    makeGaugeProvider({
      name: 'active_sessions_total',
      help: 'Number of currently active study sessions',
    }),
    makeHistogramProvider({
      name: 'payment_processing_duration_seconds',
      help: 'Payment processing duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
    // ... your services
  ],
})
export class YourModule {}
```

## 🛠 Useful Commands

### Start Monitoring Stack
```powershell
docker-compose -f docker-compose.monitoring.yml up -d
```

### View Logs
```powershell
docker-compose -f docker-compose.monitoring.yml logs -f
```

### Stop Monitoring Stack
```powershell
docker-compose -f docker-compose.monitoring.yml down
```

### Stop and Remove Volumes (Delete Data)
```powershell
docker-compose -f docker-compose.monitoring.yml down -v
```

### Restart Services
```powershell
docker-compose -f docker-compose.monitoring.yml restart
```

### Check Prometheus Targets
Open `http://localhost:9090/targets` to verify NestJS is being scraped.

### Reload Prometheus Config (Without Restart)
```powershell
curl -X POST http://localhost:9090/-/reload
```

## 🔍 Querying Prometheus

### Useful PromQL Queries

**Request rate per endpoint:**
```promql
rate(http_requests_total{service="webyalaya-backend"}[5m])
```

**P95 response time:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000
```

**Error rate:**
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

**Memory growth rate:**
```promql
rate(process_resident_memory_bytes[5m])
```

## 📝 Troubleshooting

### Metrics Endpoint Returns 404
- Ensure `@willsoto/nestjs-prometheus` is installed
- Check `app.module.ts` has `PrometheusModule.register()`
- Verify NestJS is running on port 3001

### Prometheus Can't Reach NestJS
- **Windows/Mac**: Use `host.docker.internal:3001`
- **Linux**: Use `172.17.0.1:3001` or `--network host`
- Check backend is accessible: `curl http://localhost:3001/metrics`

### Grafana Shows No Data
1. Check Prometheus is scraping successfully: `http://localhost:9090/targets`
2. Verify datasource in Grafana: Settings → Data Sources → Prometheus
3. Ensure time range in dashboard includes recent data

### Dashboard Not Loading
- Check `monitoring/grafana/dashboards/` directory exists
- Verify dashboard provisioning config in `monitoring/grafana/provisioning/dashboards/`
- Restart Grafana container

## 🔐 Security Notes

### For Production:

1. **Change Grafana Password**: Set `GF_SECURITY_ADMIN_PASSWORD` in docker-compose
2. **Enable Authentication**: Add basic auth to Prometheus or use a reverse proxy
3. **Restrict Metrics Endpoint**: Add authentication middleware to `/metrics`
4. **Use HTTPS**: Configure TLS certificates for both services
5. **Limit Retention**: Adjust `--storage.tsdb.retention.time` in Prometheus

### Example: Secure Metrics Endpoint

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { ApiKeyGuard } from './guards/api-key.guard';

@Controller()
@UseGuards(ApiKeyGuard) // Add auth guard
export class SecurePrometheusController extends PrometheusController {}
```

## 🎓 Best Practices

1. **Use Labels Wisely**: Don't create high-cardinality labels (like user IDs)
2. **Name Conventions**: Follow Prometheus naming: `<namespace>_<name>_<unit>`
3. **Document Metrics**: Add clear `help` text for each metric
4. **Set Appropriate Buckets**: For histograms, choose buckets matching your SLOs
5. **Monitor the Monitors**: Set up alerts for Prometheus/Grafana downtime

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [@willsoto/nestjs-prometheus](https://github.com/willsoto/nestjs-prometheus)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)

## 🆘 Support

For issues or questions:
1. Check Prometheus targets: `http://localhost:9090/targets`
2. View container logs: `docker-compose -f docker-compose.monitoring.yml logs`
3. Verify metrics manually: `curl http://localhost:3001/metrics`

---

**Happy Monitoring! 📊✨**
