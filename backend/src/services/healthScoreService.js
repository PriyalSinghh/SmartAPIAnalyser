const { query } = require('../db/pool');

/**
 * Health Score Service
 *
 * Computes deterministic, explainable 0–100 health scores based on:
 * - Error rate (50 points max)
 * - Response latency & P95 (30 points max)
 * - Anomaly & failure penalty (20 points max)
 */

function calculateErrorScore(errorRate) {
  const rate = parseFloat(errorRate) || 0;
  if (rate <= 0.5) return 50;
  if (rate <= 2.0) return 46;
  if (rate <= 5.0) return 38;
  if (rate <= 10.0) return 24;
  if (rate <= 15.0) return 12;
  if (rate <= 25.0) return 5;
  return 0;
}

function calculateLatencyScore(avgLatency, p95Latency = null) {
  const latency = parseFloat(p95Latency || avgLatency) || 0;
  if (latency <= 150) return 30;
  if (latency <= 300) return 25;
  if (latency <= 600) return 18;
  if (latency <= 1000) return 10;
  if (latency <= 1800) return 4;
  return 0;
}

function calculateAnomalyScore(activeAnomalySeverity = null) {
  if (!activeAnomalySeverity) return 20;
  const sev = activeAnomalySeverity.toUpperCase();
  if (sev === 'CRITICAL') return 0;
  if (sev === 'HIGH') return 5;
  if (sev === 'MEDIUM') return 10;
  if (sev === 'LOW') return 15;
  return 20;
}

function getStatusTier(score) {
  if (score >= 95) return 'EXCELLENT';
  if (score >= 80) return 'HEALTHY';
  if (score >= 60) return 'WARNING';
  if (score >= 40) return 'DEGRADED';
  return 'CRITICAL';
}

/**
 * Compute health score for a given metrics object
 * @param {object} metrics
 * @returns {object}
 */
function computeScore(metrics) {
  const errorScore = calculateErrorScore(metrics.errorRate);
  const latencyScore = calculateLatencyScore(metrics.avgLatency, metrics.p95Latency);
  const anomalyScore = calculateAnomalyScore(metrics.activeAnomalySeverity);

  const totalScore = Math.max(0, Math.min(100, errorScore + latencyScore + anomalyScore));
  const status = getStatusTier(totalScore);

  return {
    score: totalScore,
    status,
    factors: {
      errorRate: metrics.errorRate,
      avgLatency: metrics.avgLatency,
      p95Latency: metrics.p95Latency || metrics.avgLatency,
      recentFailures: metrics.failedRequests || 0,
      totalRequests: metrics.totalRequests || 0,
      breakdown: {
        errorScore,
        latencyScore,
        anomalyScore,
      },
    },
  };
}

/**
 * Get health scores for all monitored endpoints
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
async function getEndpointHealthScores(options = {}) {
  const timeClause = options.from && options.to
    ? 'WHERE timestamp >= $1 AND timestamp <= $2'
    : options.from
    ? 'WHERE timestamp >= $1'
    : '';

  const params = [];
  if (options.from) params.push(new Date(options.from).toISOString());
  if (options.to) params.push(new Date(options.to).toISOString());

  const sql = `
    SELECT
      endpoint,
      COUNT(*)::integer AS "totalRequests",
      COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS "failedRequests",
      COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "avgLatency",
      COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95Latency"
    FROM api_logs
    ${timeClause}
    GROUP BY endpoint
    ORDER BY "failedRequests" DESC, "totalRequests" DESC;
  `;

  const result = await query(sql, params);

  return result.rows.map((row) => {
    const total = row.totalRequests || 0;
    const failed = row.failedRequests || 0;
    const errorRate = total > 0 ? parseFloat(((failed / total) * 100).toFixed(2)) : 0;

    const computed = computeScore({
      errorRate,
      avgLatency: row.avgLatency,
      p95Latency: row.p95Latency,
      failedRequests: failed,
      totalRequests: total,
    });

    return {
      endpoint: row.endpoint,
      score: computed.score,
      status: computed.status,
      factors: computed.factors,
    };
  });
}

/**
 * Get health scores per microservice
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
async function getServiceHealthScores(options = {}) {
  const timeClause = options.from && options.to
    ? 'WHERE timestamp >= $1 AND timestamp <= $2'
    : options.from
    ? 'WHERE timestamp >= $1'
    : '';

  const params = [];
  if (options.from) params.push(new Date(options.from).toISOString());
  if (options.to) params.push(new Date(options.to).toISOString());

  const sql = `
    SELECT
      service,
      COUNT(*)::integer AS "totalRequests",
      COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS "failedRequests",
      COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "avgLatency",
      COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95Latency"
    FROM api_logs
    ${timeClause}
    GROUP BY service
    ORDER BY "totalRequests" DESC;
  `;

  const result = await query(sql, params);

  return result.rows.map((row) => {
    const total = row.totalRequests || 0;
    const failed = row.failedRequests || 0;
    const errorRate = total > 0 ? parseFloat(((failed / total) * 100).toFixed(2)) : 0;

    const computed = computeScore({
      errorRate,
      avgLatency: row.avgLatency,
      p95Latency: row.p95Latency,
      failedRequests: failed,
      totalRequests: total,
    });

    return {
      service: row.service,
      score: computed.score,
      status: computed.status,
      factors: computed.factors,
    };
  });
}

module.exports = {
  computeScore,
  getEndpointHealthScores,
  getServiceHealthScores,
  getStatusTier,
};
