const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const healthScoreService = require('../src/services/healthScoreService');

test('Health Score Service Test Suite', async (t) => {
  await t.test('computeScore should return 95+ (EXCELLENT) for perfect low-latency endpoint', () => {
    const score = healthScoreService.computeScore({
      errorRate: 0.1,
      avgLatency: 80,
      p95Latency: 120,
      activeAnomalySeverity: null,
    });

    assert.ok(score.score >= 95, `Expected score >= 95, got ${score.score}`);
    assert.strictEqual(score.status, 'EXCELLENT');
  });

  await t.test('computeScore should return WARNING or DEGRADED for moderate errors and latency', () => {
    const score = healthScoreService.computeScore({
      errorRate: 8.5,
      avgLatency: 650,
      p95Latency: 950,
      activeAnomalySeverity: 'MEDIUM',
    });

    assert.ok(score.score < 80, `Expected score < 80, got ${score.score}`);
    assert.ok(['WARNING', 'DEGRADED'].includes(score.status));
  });

  await t.test('computeScore should return CRITICAL for high failure rate and high latency', () => {
    const score = healthScoreService.computeScore({
      errorRate: 25.0,
      avgLatency: 1400,
      p95Latency: 2800,
      activeAnomalySeverity: 'CRITICAL',
    });

    assert.ok(score.score <= 39, `Expected score <= 39, got ${score.score}`);
    assert.strictEqual(score.status, 'CRITICAL');
  });

  await t.test('GET /api/analytics/health should return scores array for all endpoints', async () => {
    const res = await request(app)
      .get('/api/analytics/health')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    for (const item of res.body) {
      assert.ok(item.endpoint);
      assert.ok(typeof item.score === 'number');
      assert.ok(item.score >= 0 && item.score <= 100);
      assert.ok(['EXCELLENT', 'HEALTHY', 'WARNING', 'DEGRADED', 'CRITICAL'].includes(item.status));
    }
  });
});
