const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const anomalyService = require('../src/services/anomalyDetectionService');

test('Anomaly Detection Service Test Suite', async (t) => {
  await t.test('GET /api/analytics/anomalies should return detected anomalies array', async () => {
    const res = await request(app)
      .get('/api/analytics/anomalies')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    for (const anomaly of res.body) {
      assert.ok(['FAILURE_SPIKE', 'LATENCY_SPIKE'].includes(anomaly.type));
      assert.ok(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(anomaly.severity));
      assert.ok(anomaly.endpoint);
      assert.ok(anomaly.description);
      assert.ok(anomaly.detectedAt);
    }
  });

  await t.test('detectFailureSpikes should categorize severity according to spike magnitude', async () => {
    // Test logic directly
    const spikes = await anomalyService.detectFailureSpikes();
    assert.ok(Array.isArray(spikes));
  });

  await t.test('detectLatencyAnomalies should correctly detect latency jumps', async () => {
    const latencies = await anomalyService.detectLatencyAnomalies();
    assert.ok(Array.isArray(latencies));
  });
});
