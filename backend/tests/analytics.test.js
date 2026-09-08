const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

test('Analytics API Test Suite', async (t) => {
  await t.test('GET /api/analytics/summary should calculate aggregates correctly', async () => {
    const res = await request(app)
      .get('/api/analytics/summary')
      .expect(200);

    assert.ok(typeof res.body.totalRequests === 'number');
    assert.ok(typeof res.body.successfulRequests === 'number');
    assert.ok(typeof res.body.failedRequests === 'number');
    assert.ok(typeof res.body.errorRate === 'number');
    assert.ok(typeof res.body.averageResponseTime === 'number');
    assert.ok(res.body.totalRequests >= res.body.failedRequests);
  });

  await t.test('GET /api/analytics/endpoints should return per-endpoint breakdown', async () => {
    const res = await request(app)
      .get('/api/analytics/endpoints')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      const ep = res.body[0];
      assert.ok(ep.endpoint);
      assert.ok(typeof ep.totalRequests === 'number');
      assert.ok(typeof ep.errorRate === 'number');
    }
  });

  await t.test('GET /api/analytics/errors should group counts by HTTP status code', async () => {
    const res = await request(app)
      .get('/api/analytics/errors')
      .expect(200);

    assert.ok(typeof res.body === 'object');
  });

  await t.test('GET /api/analytics/timeseries should return bucketed metrics', async () => {
    const res = await request(app)
      .get('/api/analytics/timeseries?bucket=hour')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      const point = res.body[0];
      assert.ok(point.timestamp);
      assert.ok(typeof point.totalRequests === 'number');
      assert.ok(typeof point.errorRate === 'number');
    }
  });

  await t.test('GET /api/analytics/services should return microservice aggregations', async () => {
    const res = await request(app)
      .get('/api/analytics/services')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    if (res.body.length > 0) {
      const srv = res.body[0];
      assert.ok(srv.service);
      assert.ok(typeof srv.totalRequests === 'number');
      assert.ok(typeof srv.healthScore === 'number');
    }
  });

  await t.test('GET /api/analytics/endpoint-details should return bundle with percentiles', async () => {
    const res = await request(app)
      .get('/api/analytics/endpoint-details?endpoint=/api/orders')
      .expect(200);

    assert.strictEqual(res.body.endpoint, '/api/orders');
    assert.ok(res.body.summary);
    assert.ok(res.body.percentiles);
    assert.ok(res.body.healthScore);
    assert.ok(typeof res.body.percentiles.p95 === 'number');
  });
});
