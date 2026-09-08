const { run } = require('node:test');
const { spec } = require('node:test/reporters');
const path = require('path');
const { pool } = require('../src/db/pool');
const cacheService = require('../src/services/cacheService');

process.env.NODE_ENV = 'test';

async function main() {
  console.log('🧪 Running SmartAPI Phase 2 Automated Test Suite...\n');

  const testStream = run({
    files: [
      path.resolve(__dirname, 'logs.test.js'),
      path.resolve(__dirname, 'analytics.test.js'),
      path.resolve(__dirname, 'anomalies.test.js'),
      path.resolve(__dirname, 'healthScore.test.js'),
      path.resolve(__dirname, 'cache.test.js'),
    ],
    concurrency: 1, // Sequential execution for predictable DB state
  });

  testStream.compose(new spec()).pipe(process.stdout);

  let hasFailures = false;

  testStream.on('test:fail', () => {
    hasFailures = true;
  });

  testStream.on('end', async () => {
    try {
      await pool.end();
      await cacheService.close();
    } catch (e) {}

    console.log(hasFailures ? '\n❌ Some tests failed.' : '\n✅ All tests passed successfully!');
    process.exit(hasFailures ? 1 : 0);
  });
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
