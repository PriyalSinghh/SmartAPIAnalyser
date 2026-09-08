const test = require('node:test');
const assert = require('node:assert');
const cacheService = require('../src/services/cacheService');
const logService = require('../src/services/logService');

test('Redis Cache Service Test Suite', async (t) => {
  // Ensure Redis connection is established before assertions
  await cacheService.waitUntilReady(2000);

  await t.test('set and get should store and retrieve JSON objects', async () => {
    const testKey = 'test:key:sample';
    const testData = { message: 'hello redis', count: 42 };

    const setResult = await cacheService.set(testKey, testData, 10);
    assert.strictEqual(setResult, true);

    const retrieved = await cacheService.get(testKey);
    assert.deepStrictEqual(retrieved, testData);

    await cacheService.del(testKey);
    const afterDel = await cacheService.get(testKey);
    assert.strictEqual(afterDel, null);
  });

  await t.test('getOrSet should cache result on first call and return fromCache=true on second call', async () => {
    const testKey = 'test:cache_aside:example';
    let dbQueryCount = 0;

    const mockFetch = async () => {
      dbQueryCount += 1;
      return { answer: 100, queryCount: dbQueryCount };
    };

    // First call (cache miss)
    const res1 = await cacheService.getOrSet(testKey, 15, mockFetch);
    assert.strictEqual(res1.data.answer, 100);
    assert.strictEqual(dbQueryCount, 1);

    // Second call (cache hit)
    const res2 = await cacheService.getOrSet(testKey, 15, mockFetch);
    assert.strictEqual(res2.data.answer, 100);
    assert.strictEqual(res2.fromCache, true);
    assert.strictEqual(dbQueryCount, 1); // Database query not called again!

    await cacheService.del(testKey);
  });

  await t.test('createLog should trigger cache invalidation for analytics:* keys', async () => {
    const analyticsKey = 'analytics:summary:test_cache';
    await cacheService.set(analyticsKey, { totalRequests: 50 }, 60);

    // Ingest log which calls invalidateAnalyticsCaches()
    await logService.createLog({
      method: 'GET',
      endpoint: '/api/users',
      statusCode: 200,
      responseTime: 100,
      service: 'user-service',
      requestId: `cache_inv_${Date.now()}`,
    });

    const cachedAfterWrite = await cacheService.get(analyticsKey);
    assert.strictEqual(cachedAfterWrite, null); // Key should be invalidated!
  });
});
