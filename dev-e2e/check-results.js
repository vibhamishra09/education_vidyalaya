const fs = require('fs');

const data = JSON.parse(fs.readFileSync('test-results.json', 'utf-8'));

let total = 0;
let passed = 0;

function walkSuites(suites) {
  for (const suite of suites) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests) {
          total++;

          const result = test.results.at(-1); 

          if (result.status === 'passed') {
            passed++;
          }
        }
      }
    }

    if (suite.suites) {
      walkSuites(suite.suites);
    }
  }
}

walkSuites(data.suites);

const percent = total === 0 ? 0 : (passed / total) * 100;

console.log(`Passed: ${passed}/${total} (${percent.toFixed(2)}%)`);

if (percent < 50) {
  console.error('Less than 50% tests passed');
  process.exit(1);
} else {
  console.log(percent, ' tests passed');
}