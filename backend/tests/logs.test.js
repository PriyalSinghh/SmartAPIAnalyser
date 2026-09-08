const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

test('Logs API Test Suite', async (t) => {
  await t.test('POST /api/logs should successfully ingest a valid log with failure classification', async () => {
    const payload = {
      timestamp: new Date().toISOString(),
      method: 'POST',
      endpoint: '/api/orders',
      statusCode: 500,
      responseTime: 950,
      service: 'order-service',
      errorMessage: 'Simulated deadlock test',
      requestId: `test_req_${Date.now()}`,
    };

    const res = await request(app)
      .post('/api/logs')
      .send(payload)
      .expect(201);

    assert.strictEqual(res.body.message, 'API log recorded successfully');
    assert.ok(res.body.data.id);
    assert.strictEqual(res.body.data.failureCategory, 'Server Error');
    assert.strictEqual(res.body.data.severity, 'critical');
  });

  await t.test('POST /api/logs should reject invalid log payloads with 400 Bad Request', async () => {
    const invalidPayload = {
      method: 'INVALID',
      statusCode: 999,
    };

    const res = await request(app)
      .post('/api/logs')
      .send(invalidPayload)
      .expect(400);

    assert.strictEqual(res.body.error, 'Validation Error');
    assert.ok(Array.isArray(res.body.details));
    assert.ok(res.body.details.length >= 4);
  });

  await t.test('POST /api/logs/bulk should insert multiple logs in batch and report invalid ones', async () => {
    const bulkPayload = {
      logs: [
        {
          method: 'GET',
          endpoint: '/api/products',
          statusCode: 200,
          responseTime: 120,
          service: 'product-service',
          requestId: `bulk_1_${Date.now()}`,
        },
        {
          method: 'POST',
          endpoint: '/api/payment',
          statusCode: 503,
          responseTime: 1800,
          service: 'payment-service',
          errorMessage: 'Settlement timeout',
          requestId: `bulk_2_${Date.now()}`,
        },
        {
          method: 'INVALID', // Should be rejected
          endpoint: '/api/users',
          statusCode: 200,
          responseTime: 50,
          service: 'user-service',
          requestId: `bulk_3_${Date.now()}`,
        },
      ],
    };

    const res = await request(app)
      .post('/api/logs/bulk')
      .send(bulkPayload)
      .expect(201);

    assert.strictEqual(res.body.insertedCount, 2);
    assert.strictEqual(res.body.rejectedCount, 1);
    assert.strictEqual(res.body.validationErrors.length, 1);
  });

  await t.test('GET /api/logs should return paginated logs and support filters', async () => {
    const res = await request(app)
      .get('/api/logs?endpoint=/api/orders&page=1&limit=5')
      .expect(200);

    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
    assert.strictEqual(res.body.pagination.page, 1);
    assert.strictEqual(res.body.pagination.limit, 5);
  });
});
