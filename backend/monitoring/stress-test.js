#!/usr/bin/env node

/**
 * Monitoring Stress Test & Alert Verification
 * 
 * This script:
 * 1. Tests all backend endpoints to generate metrics
 * 2. Triggers 500 errors to test alerting
 * 3. Verifies Prometheus is collecting metrics
 * 4. Provides a summary of results
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const PROMETHEUS_URL = 'http://localhost:9090';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`),
};

// Test endpoints configuration - Focus on 500 error endpoints
const endpoints = [
  { method: 'GET', path: '/debug/trigger-500', name: 'Debug Trigger 500 Error', expectError: true, trigger500: true },
];

// Error-triggering endpoints
const errorEndpoints = [
  { method: 'GET', path: '/nonexistent-route', name: 'Not Found (404)' },
  { method: 'POST', path: '/api/users/invalid', name: 'Invalid POST', body: { invalid: 'data' } },
  { method: 'GET', path: '/api/test-error', name: 'Intentional Error (if exists)' },
];

const stats = {
  total: 0,
  success: 0,
  errors: 0,
  status: {},
  responseTimes: [],
};

// Helper: Make HTTP request
async function makeRequest(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const startTime = Date.now();
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    
    stats.total++;
    stats.responseTimes.push(responseTime);
    stats.status[response.status] = (stats.status[response.status] || 0) + 1;
    
    if (response.ok) {
      stats.success++;
    } else {
      stats.errors++;
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      responseTime,
      ok: response.ok,
    };
  } catch (error) {
    stats.total++;
    stats.errors++;
    const responseTime = Date.now() - startTime;
    
    return {
      status: 0,
      statusText: error.message,
      responseTime,
      ok: false,
      error: true,
    };
  }
}

// Helper: Sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Query Prometheus
async function queryPrometheus(query) {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}

// Test 1: Basic endpoint testing
async function testEndpoints() {
  log.section('📡 Testing Backend Endpoints');
  
  for (const endpoint of endpoints) {
    const { method, path, name, expectError } = endpoint;
    
    process.stdout.write(`${colors.gray}Testing ${name}...${colors.reset}`);
    
    const result = await makeRequest(method, path);
    
    // Clear line and show result
    process.stdout.write('\r\x1b[K');
    
    if (result.ok || (expectError && !result.ok)) {
      log.success(`${name} → ${result.status} (${result.responseTime}ms)`);
    } else if (result.error) {
      log.error(`${name} → Connection Failed: ${result.statusText}`);
    } else {
      log.warning(`${name} → ${result.status} ${result.statusText} (${result.responseTime}ms)`);
    }
    
    await sleep(100); // Small delay between requests
  }
}

// Test 2: Load testing (multiple requests)
async function loadTest(requestsPerEndpoint = 500) {
  log.section(`🔥 Heavy Load Testing (${requestsPerEndpoint} requests per endpoint)`);
  
  log.info(`Sending ${requestsPerEndpoint} requests to ${endpoints.length} endpoints...`);
  log.warning(`Total: ${requestsPerEndpoint * endpoints.length} requests - This will take ~2-3 minutes\n`);
  
  for (const endpoint of endpoints) {
    const { method, path, name } = endpoint;
    
    process.stdout.write(`${colors.gray}Load testing ${name}... 0/${requestsPerEndpoint}${colors.reset}`);
    
    for (let i = 0; i < requestsPerEndpoint; i++) {
      await makeRequest(method, path);
      
      // Update progress every 50 requests
      if (i % 50 === 0 || i === requestsPerEndpoint - 1) {
        process.stdout.write(`\r${colors.gray}Load testing ${name}... ${i + 1}/${requestsPerEndpoint}${colors.reset}`);
      }
      
      // Small delay to avoid overwhelming the server
      if (i % 100 === 0) {
        await sleep(10);
      }
    }
    
    process.stdout.write('\r\x1b[K');
    log.success(`${name} → Completed ${requestsPerEndpoint} requests`);
  }
  
  log.success(`\nTotal load test completed: ${requestsPerEndpoint * endpoints.length} requests sent!`);
}

// Test 3: Trigger errors for alert testing
async function testErrorScenarios() {
  log.section('🚨 Testing Error Scenarios (Alert Triggers)');
  
  log.info('Generating errors to test Grafana alerting...');
  log.warning('You should receive an email alert within 1-2 minutes if configured correctly.\n');
  
  for (const endpoint of errorEndpoints) {
    const { method, path, name, body } = endpoint;
    
    const result = await makeRequest(method, path, body);
    
    if (result.status >= 400) {
      log.success(`${name} → ${result.status} (Error triggered for alerting)`);
    } else {
      log.warning(`${name} → ${result.status} (No error triggered)`);
    }
    
    await sleep(200);
  }
  
  // Additional error attempts
  log.info('\nGenerating multiple 404 errors...');
  for (let i = 0; i < 5; i++) {
    await makeRequest('GET', `/random-path-${i}`);
    await sleep(100);
  }
  log.success('Completed error generation');
}

// Test 4: Verify Prometheus metrics
async function verifyPrometheusMetrics() {
  log.section('📊 Verifying Prometheus Metrics');
  
  // Query 1: Check if metrics exist
  log.info('Checking if metrics are being collected...');
  const metricsQuery = await queryPrometheus('http_request_duration_seconds_count');
  
  if (metricsQuery && metricsQuery.status === 'success' && metricsQuery.data.result.length > 0) {
    log.success(`Found ${metricsQuery.data.result.length} metric series`);
    
    // Show sample metrics
    console.log('\nSample endpoints being tracked:');
    metricsQuery.data.result.slice(0, 5).forEach(metric => {
      const labels = metric.metric;
      console.log(`  ${colors.cyan}${labels.method} ${labels.route}${colors.reset} → Status ${labels.status_code}`);
    });
  } else {
    log.error('No metrics found! Wait a few seconds and try again.');
    return false;
  }
  
  // Query 2: Check for errors
  log.info('\nChecking for 5xx errors in metrics...');
  const errorQuery = await queryPrometheus('http_request_duration_seconds_count{status_code=~"5.."}');
  
  if (errorQuery && errorQuery.data.result.length > 0) {
    log.success(`Found ${errorQuery.data.result.length} endpoints with 5xx errors`);
    console.log('\n🚨 ALL 5xx ERRORS DETECTED:');
    errorQuery.data.result.forEach(metric => {
      const labels = metric.metric;
      const count = metric.value[1];
      console.log(`  ${colors.red}${labels.method} ${labels.route}${colors.reset} → Status ${labels.status_code} (Count: ${count})`);
    });
    
    // Calculate total error count
    const totalErrors = errorQuery.data.result.reduce((sum, r) => sum + parseFloat(r.value[1]), 0);
    log.warning(`\nTotal 5xx errors: ${totalErrors} - Alert should be FIRING!`);
  } else {
    log.warning('No 5xx errors detected in metrics yet');
  }
  
  // Query 3: Check request rate
  log.info('\nChecking request rate...');
  const rateQuery = await queryPrometheus('rate(http_request_duration_seconds_count[1m])');
  
  if (rateQuery && rateQuery.data.result.length > 0) {
    const totalRate = rateQuery.data.result.reduce((sum, r) => sum + parseFloat(r.value[1]), 0);
    log.success(`Current request rate: ${totalRate.toFixed(2)} req/s`);
  }
  
  return true;
}

// Calculate and display statistics
function displayStatistics() {
  log.section('📈 Test Statistics');
  
  const avgResponseTime = stats.responseTimes.length > 0
    ? (stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length).toFixed(2)
    : 0;
  
  const minResponseTime = stats.responseTimes.length > 0 ? Math.min(...stats.responseTimes) : 0;
  const maxResponseTime = stats.responseTimes.length > 0 ? Math.max(...stats.responseTimes) : 0;
  
  console.log(`Total Requests:      ${colors.cyan}${stats.total}${colors.reset}`);
  console.log(`Successful (2xx):    ${colors.green}${stats.success}${colors.reset}`);
  console.log(`Errors (4xx/5xx):    ${colors.red}${stats.errors}${colors.reset}`);
  console.log(`\nResponse Times:`);
  console.log(`  Average:           ${avgResponseTime}ms`);
  console.log(`  Min:               ${minResponseTime}ms`);
  console.log(`  Max:               ${maxResponseTime}ms`);
  
  console.log(`\nStatus Code Distribution:`);
  Object.entries(stats.status)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([status, count]) => {
      const color = status.startsWith('2') ? colors.green : status.startsWith('4') || status.startsWith('5') ? colors.red : colors.yellow;
      console.log(`  ${color}${status}${colors.reset}: ${count} requests`);
    });
}

// Next steps guidance
function displayNextSteps() {
  log.section('✅ Next Steps - Verify Monitoring');
  
  console.log('1. Check Prometheus Targets:');
  console.log(`   ${colors.blue}http://localhost:9090/targets${colors.reset}`);
  console.log('   → Verify "nestjs-backend" target is UP\n');
  
  console.log('2. View Metrics in Prometheus:');
  console.log(`   ${colors.blue}http://localhost:9090/graph${colors.reset}`);
  console.log('   → Query: http_request_duration_seconds_count\n');
  
  console.log('3. Check Grafana Dashboard:');
  console.log(`   ${colors.blue}http://localhost:3002${colors.reset}`);
  console.log('   → Login: admin/admin');
  console.log('   → View your imported dashboard\n');
  
  console.log('4. Verify Alert Triggered:');
  console.log('   → Check Grafana: Alerting → Alert rules');
  console.log('   → Should show "Firing" status if errors detected');
  console.log(`   → Check email: ${colors.cyan}debanshughosh685@gmail.com${colors.reset}`);
  console.log('   → Alert should arrive within 1-2 minutes\n');
  
  console.log('5. Run this test again:');
  console.log(`   ${colors.gray}node monitoring/stress-test.js${colors.reset}\n`);
}

// Main execution
async function main() {
  console.clear();
  log.section('🚀 Monitoring Stress Test & Alert Verification');
  
  console.log(`Backend URL:     ${colors.cyan}${BASE_URL}${colors.reset}`);
  console.log(`Prometheus URL:  ${colors.cyan}${PROMETHEUS_URL}${colors.reset}\n`);
  
  try {
    // Phase 1: Basic endpoint testing
    await testEndpoints();
    await sleep(1000);
    
    // Phase 2: Heavy load testing (500 requests per endpoint)
    await loadTest(500);
    await sleep(2000);
    
    log.info('\nWaiting 10 seconds for Prometheus to scrape all metrics...');
    await sleep(10000);
    
    // Phase 3: Verify Prometheus
    await verifyPrometheusMetrics();
    
    // Display statistics
    await sleep(1000);
    displayStatistics();
    
    // Show next steps
    displayNextSteps();
    
    log.success('Stress test completed successfully! 🎉');
    
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { makeRequest, queryPrometheus };
