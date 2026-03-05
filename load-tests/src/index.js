import { config } from './config.js';
import { MetricsCollector } from './metrics.js';
import { Reporter } from './reporter.js';
import { ScenarioRunner } from './scenarios.js';

// Get scenario from command line args (supports both --scenario=foo and --scenario foo)
const scenarioIdx = process.argv.indexOf('--scenario');
const scenarioEqArg = process.argv.find(arg => arg.startsWith('--scenario='));
const scenario = scenarioIdx !== -1
  ? process.argv[scenarioIdx + 1]
  : scenarioEqArg
    ? scenarioEqArg.split('=')[1]
    : 'study-room';

// Token generation function.
// Clerk does not support generating session JWTs server-side without an active
// browser session. Set TEST_AUTH_TOKEN in .env to a real JWT copied from
// browser devtools (Application → Cookies → __session, or from the
// Authorization header in any authenticated request to the backend).
// All virtual users will share the same token — sufficient for load testing.
function generateToken(userId) {
  if (config.testAuthToken) {
    return config.testAuthToken;
  }
  // Mock token — the backend will reject this and disconnect immediately.
  console.warn(`⚠️  No TEST_AUTH_TOKEN set. Mock token used for ${userId} — backend will reject it.`);
  return `mock-token-${userId}`;
}

async function main() {
  console.log('\n🚀 Starting WebSocket Load Test\n');
  console.log(`Scenario: ${scenario}`);
  console.log(`Total Users: ${config.totalUsers}`);
  console.log(`Ramp Up Time: ${config.rampUpTime}s`);
  console.log(`Test Duration: ${config.testDuration}s`);
  console.log(`WebSocket URL: ${config.wsUrl}\n`);

  const metrics = new MetricsCollector();
  metrics.start();

  const runner = new ScenarioRunner(metrics, generateToken);

  try {
    switch (scenario) {
      case 'study-room':
        await runner.runStudyRoomScenario();
        break;
      case 'chat-heavy':
        await runner.runChatHeavyScenario();
        break;
      case 'permissions':
        await runner.runPermissionsScenario();
        break;
      case 'all':
        console.log('Running all scenarios sequentially...\n');
        await runner.runStudyRoomScenario();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await runner.runChatHeavyScenario();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await runner.runPermissionsScenario();
        break;
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  } catch (error) {
    Reporter.printError(`Test failed: ${error.message}`);
    console.error(error);
  } finally {
    metrics.end();
    const stats = metrics.getStats();
    Reporter.printSummary(stats);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

main().catch(console.error);
