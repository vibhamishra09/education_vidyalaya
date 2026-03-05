import chalk from 'chalk';

export class Reporter {
  static formatDuration(seconds) {
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}m ${secs}s`;
  }

  static formatLatency(ms) {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  static printSummary(stats) {
    console.log('\n' + chalk.bold.cyan('='.repeat(80)));
    console.log(chalk.bold.cyan('LOAD TEST SUMMARY'));
    console.log(chalk.bold.cyan('='.repeat(80)) + '\n');

    // Test Duration
    console.log(chalk.bold('Test Duration:'), this.formatDuration(stats.duration));
    console.log('');

    // Connections
    console.log(chalk.bold('Connections:'));
    console.log(`  Total Attempted:     ${stats.connections.total}`);
    console.log(`  Successful:          ${chalk.green(stats.connections.successful)}`);
    console.log(`  Failed:              ${chalk.red(stats.connections.failed)}`);
    console.log(`  Disconnected:       ${chalk.yellow(stats.connections.disconnected)}`);
    console.log(`  Success Rate:        ${chalk.bold(stats.connections.successRate.toFixed(2))}%`);
    console.log('');

    // Events
    console.log(chalk.bold('Events:'));
    console.log(`  Total Sent:          ${stats.events.totalSent}`);
    console.log(`  Total Received:      ${stats.events.totalReceived}`);
    console.log(`  Total Errors:        ${chalk.red(stats.events.totalErrors)}`);
    console.log('');

    if (Object.keys(stats.events.sent).length > 0) {
      console.log(chalk.bold('  Events Sent:'));
      Object.entries(stats.events.sent).forEach(([event, count]) => {
        console.log(`    ${event}: ${count}`);
      });
      console.log('');
    }

    if (Object.keys(stats.events.received).length > 0) {
      console.log(chalk.bold('  Events Received:'));
      Object.entries(stats.events.received).forEach(([event, count]) => {
        console.log(`    ${event}: ${count}`);
      });
      console.log('');
    }

    if (Object.keys(stats.events.errors).length > 0) {
      console.log(chalk.bold('  Event Errors:'));
      Object.entries(stats.events.errors).forEach(([event, count]) => {
        console.log(`    ${event}: ${chalk.red(count)}`);
      });
      console.log('');
    }

    // Latency
    console.log(chalk.bold('Latency Statistics:'));
    
    const printLatency = (name, data) => {
      if (data.avg > 0) {
        console.log(`  ${name}:`);
        console.log(`    Min:   ${this.formatLatency(data.min)}`);
        console.log(`    Max:   ${this.formatLatency(data.max)}`);
        console.log(`    Avg:   ${this.formatLatency(data.avg)}`);
        console.log(`    P95:   ${this.formatLatency(data.p95)}`);
        console.log(`    P99:   ${this.formatLatency(data.p99)}`);
      }
    };

    printLatency('Join Session', stats.latency.joinSession);
    printLatency('Message Send', stats.latency.messageSend);
    printLatency('Permission Check', stats.latency.permissionCheck);
    printLatency('Update Permissions', stats.latency.updatePermissions);
    console.log('');

    // Errors
    if (stats.errors.length > 0) {
      console.log(chalk.bold.red(`Errors (showing first 10 of ${stats.errors.length}):`));
      stats.errors.slice(0, 10).forEach((error, idx) => {
        console.log(`  ${idx + 1}. [${error.event}] ${error.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more errors`);
      }
      console.log('');
    }

    // Health Check
    console.log(chalk.bold('Health Check:'));
    const healthScore = this.calculateHealthScore(stats);
    const healthColor = healthScore >= 90 ? 'green' : healthScore >= 70 ? 'yellow' : 'red';
    console.log(`  Score: ${chalk[healthColor].bold(healthScore.toFixed(1))}/100`);
    
    if (healthScore >= 90) {
      console.log(`  Status: ${chalk.green.bold('HEALTHY')} ✅`);
    } else if (healthScore >= 70) {
      console.log(`  Status: ${chalk.yellow.bold('DEGRADED')} ⚠️`);
    } else {
      console.log(`  Status: ${chalk.red.bold('UNHEALTHY')} ❌`);
    }

    console.log('\n' + chalk.bold.cyan('='.repeat(80)) + '\n');
  }

  static calculateHealthScore(stats) {
    let score = 100;

    // Connection success rate (40 points)
    const connectionScore = (stats.connections.successRate / 100) * 40;
    score = Math.min(score, connectionScore + 60);

    // Error rate (30 points)
    const totalEvents = stats.events.totalSent + stats.events.totalReceived;
    if (totalEvents > 0) {
      const errorRate = stats.events.totalErrors / totalEvents;
      const errorScore = Math.max(0, 30 - (errorRate * 1000)); // Penalize high error rates
      score = Math.min(score, errorScore + 70);
    }

    // Latency (30 points)
    const avgLatency = stats.latency.joinSession.avg || 0;
    if (avgLatency > 0) {
      // Penalize latency > 1s
      const latencyPenalty = Math.max(0, (avgLatency - 1000) / 100);
      score = Math.max(0, score - latencyPenalty);
    }

    return Math.max(0, Math.min(100, score));
  }

  static printProgress(current, total, message = '') {
    const percentage = ((current / total) * 100).toFixed(1);
    process.stdout.write(`\r${chalk.cyan(`[${current}/${total}] ${percentage}%`)} ${message}`);
  }

  static printError(message) {
    console.error(chalk.red('❌'), message);
  }

  static printSuccess(message) {
    console.log(chalk.green('✅'), message);
  }

  static printWarning(message) {
    console.warn(chalk.yellow('⚠️'), message);
  }

  static printInfo(message) {
    console.log(chalk.blue('ℹ️'), message);
  }
}
