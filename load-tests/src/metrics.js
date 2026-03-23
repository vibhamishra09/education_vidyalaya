export class MetricsCollector {
  constructor() {
    this.metrics = {
      connections: {
        total: 0,
        successful: 0,
        failed: 0,
        disconnected: 0,
      },
      events: {
        sent: {},
        received: {},
        errors: {},
      },
      latency: {
        joinSession: [],
        messageSend: [],
        permissionCheck: [],
        updatePermissions: [],
      },
      timestamps: {
        start: null,
        end: null,
      },
      errors: [],
    };
  }

  recordConnection(success) {
    this.metrics.connections.total++;
    if (success) {
      this.metrics.connections.successful++;
    } else {
      this.metrics.connections.failed++;
    }
  }

  recordDisconnection() {
    this.metrics.connections.disconnected++;
  }

  recordEventSent(eventName) {
    if (!this.metrics.events.sent[eventName]) {
      this.metrics.events.sent[eventName] = 0;
    }
    this.metrics.events.sent[eventName]++;
  }

  recordEventReceived(eventName) {
    if (!this.metrics.events.received[eventName]) {
      this.metrics.events.received[eventName] = 0;
    }
    this.metrics.events.received[eventName]++;
  }

  recordError(eventName, error) {
    if (!this.metrics.events.errors[eventName]) {
      this.metrics.events.errors[eventName] = 0;
    }
    this.metrics.events.errors[eventName]++;
    this.metrics.errors.push({
      event: eventName,
      error: error.message || error,
      timestamp: Date.now(),
    });
  }

  recordLatency(eventName, latency) {
    if (this.metrics.latency[eventName]) {
      this.metrics.latency[eventName].push(latency);
    }
  }

  start() {
    this.metrics.timestamps.start = Date.now();
  }

  end() {
    this.metrics.timestamps.end = Date.now();
  }

  getStats() {
    const duration = this.metrics.timestamps.end 
      ? (this.metrics.timestamps.end - this.metrics.timestamps.start) / 1000
      : 0;

    const calculateStats = (values) => {
      if (values.length === 0) return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
      const sorted = [...values].sort((a, b) => a - b);
      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    };

    return {
      duration,
      connections: {
        ...this.metrics.connections,
        successRate: this.metrics.connections.total > 0
          ? (this.metrics.connections.successful / this.metrics.connections.total) * 100
          : 0,
      },
      events: {
        sent: this.metrics.events.sent,
        received: this.metrics.events.received,
        errors: this.metrics.events.errors,
        totalSent: Object.values(this.metrics.events.sent).reduce((a, b) => a + b, 0),
        totalReceived: Object.values(this.metrics.events.received).reduce((a, b) => a + b, 0),
        totalErrors: Object.values(this.metrics.events.errors).reduce((a, b) => a + b, 0),
      },
      latency: {
        joinSession: calculateStats(this.metrics.latency.joinSession),
        messageSend: calculateStats(this.metrics.latency.messageSend),
        permissionCheck: calculateStats(this.metrics.latency.permissionCheck),
        updatePermissions: calculateStats(this.metrics.latency.updatePermissions),
      },
      errors: this.metrics.errors,
    };
  }

  getMetrics() {
    return this.metrics;
  }
}
