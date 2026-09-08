const { query } = require('../db/pool');

/**
 * Anomaly Detection Service
 *
 * Implements deterministic, rule-based statistical thresholding to identify:
 * 1. Failure Spikes: Sudden surge in HTTP error rates compared to historical baseline.
 * 2. Latency Anomalies: Significant degradation in response time compared to baseline.
 *
 * Explainable, transparent logic without black-box ML models.
 */

const DEFAULT_CURRENT_WINDOW_HOURS = 2;
const DEFAULT_BASELINE_WINDOW_HOURS = 24;

const ERROR_SPIKE_THRESHOLD = parseFloat(process.env.ANOMALY_ERROR_THRESHOLD) || 2.0;
const LATENCY_SPIKE_THRESHOLD = parseFloat(process.env.ANOMALY_LATENCY_THRESHOLD) || 1.8;

/**
 * Fetch metrics for an endpoint or all endpoints across two time windows
 * @param {object} options
 * @param {string} [options.endpoint]
 * @param {number} [options.currentWindowHours=2]
 * @param {number} [options.baselineWindowHours=24]
 */
async function fetchWindowMetrics(options = {}) {
  const currentHours = options.currentWindowHours || DEFAULT_CURRENT_WINDOW_HOURS;
  const baselineHours = options.baselineWindowHours || DEFAULT_BASELINE_WINDOW_HOURS;

  const endpointClause = options.endpoint ? 'AND endpoint = $1' : '';
  const params = options.endpoint ? [options.endpoint] : [];

  // Single optimized SQL query returning current window and baseline window metrics per endpoint
  const sql = `
    WITH current_metrics AS (
      SELECT
        endpoint,
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS failures,
        COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS avg_latency
      FROM api_logs
      WHERE timestamp >= NOW() - INTERVAL '${currentHours} hours'
      ${endpointClause}
      GROUP BY endpoint
    ),
    baseline_metrics AS (
      SELECT
        endpoint,
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS failures,
        COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS avg_latency
      FROM api_logs
      WHERE timestamp >= NOW() - INTERVAL '${baselineHours} hours'
        AND timestamp < NOW() - INTERVAL '${currentHours} hours'
      ${endpointClause}
      GROUP BY endpoint
    )
    SELECT
      COALESCE(c.endpoint, b.endpoint) AS endpoint,
      COALESCE(c.total, 0)::integer AS current_total,
      COALESCE(c.failures, 0)::integer AS current_failures,
      COALESCE(c.avg_latency, 0)::integer AS current_latency,
      COALESCE(b.total, 0)::integer AS baseline_total,
      COALESCE(b.failures, 0)::integer AS baseline_failures,
      COALESCE(b.avg_latency, 0)::integer AS baseline_latency
    FROM current_metrics c
    FULL OUTER JOIN baseline_metrics b ON c.endpoint = b.endpoint
    WHERE COALESCE(c.total, 0) >= 5; -- Require at least 5 requests in current window for statistical significance
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Detect failure spikes across monitored endpoints
 * @param {object} options
 * @returns {Promise<Array>}
 */
async function detectFailureSpikes(options = {}) {
  const rows = await fetchWindowMetrics(options);
  const anomalies = [];

  for (const row of rows) {
    const currentTotal = row.current_total || 0;
    const currentFailures = row.current_failures || 0;
    const baselineTotal = row.baseline_total || 0;
    const baselineFailures = row.baseline_failures || 0;

    const currentErrorRate = currentTotal > 0
      ? parseFloat(((currentFailures / currentTotal) * 100).toFixed(2))
      : 0;

    const baselineErrorRate = baselineTotal > 0
      ? parseFloat(((baselineFailures / baselineTotal) * 100).toFixed(2))
      : 0;

    // Minimum current error threshold to avoid false positives (e.g. 1 error out of 20 = 5%)
    if (currentErrorRate < 4.5 || currentFailures < 2) continue;

    // Calculate multiplier increase
    let increaseMultiplier;
    let percentageIncrease;

    if (baselineErrorRate <= 0.5) {
      // Baseline was near-zero, surge to current rate
      increaseMultiplier = parseFloat((currentErrorRate / 0.5).toFixed(2));
      percentageIncrease = parseFloat(((currentErrorRate - 0.5) * 100).toFixed(1));
    } else {
      increaseMultiplier = parseFloat((currentErrorRate / baselineErrorRate).toFixed(2));
      percentageIncrease = parseFloat((((currentErrorRate - baselineErrorRate) / baselineErrorRate) * 100).toFixed(1));
    }

    // Check if error rate exceeds threshold
    if (increaseMultiplier >= ERROR_SPIKE_THRESHOLD || (currentErrorRate - baselineErrorRate >= 8.0)) {
      let severity = 'LOW';
      if (increaseMultiplier >= 4.0 || currentErrorRate >= 20.0) {
        severity = 'CRITICAL';
      } else if (increaseMultiplier >= 2.5 || currentErrorRate >= 12.0) {
        severity = 'HIGH';
      } else if (increaseMultiplier >= 1.8 || currentErrorRate >= 7.0) {
        severity = 'MEDIUM';
      }

      anomalies.push({
        type: 'FAILURE_SPIKE',
        endpoint: row.endpoint,
        currentErrorRate,
        baselineErrorRate,
        increaseMultiplier,
        percentageIncrease,
        currentTotal,
        currentFailures,
        severity,
        detectedAt: new Date().toISOString(),
        description: `Error rate surged from ${baselineErrorRate}% to ${currentErrorRate}% (${increaseMultiplier}x baseline)`,
      });
    }
  }

  return anomalies.sort((a, b) => b.increaseMultiplier - a.increaseMultiplier);
}

/**
 * Detect latency anomalies across endpoints
 * @param {object} options
 * @returns {Promise<Array>}
 */
async function detectLatencyAnomalies(options = {}) {
  const rows = await fetchWindowMetrics(options);
  const anomalies = [];

  for (const row of rows) {
    const currentLatency = row.current_latency || 0;
    const baselineLatency = row.baseline_latency || 0;
    const currentTotal = row.current_total || 0;

    if (currentTotal < 5 || baselineLatency <= 0) continue;

    const latencyDiff = currentLatency - baselineLatency;
    const increaseMultiplier = parseFloat((currentLatency / baselineLatency).toFixed(2));
    const percentageIncrease = parseFloat((((currentLatency - baselineLatency) / baselineLatency) * 100).toFixed(1));

    // Must exceed threshold multiplier and have an absolute increase of at least 150ms
    if (increaseMultiplier >= LATENCY_SPIKE_THRESHOLD && latencyDiff >= 150) {
      let severity = 'LOW';
      if (increaseMultiplier >= 3.0 || latencyDiff >= 800) {
        severity = 'CRITICAL';
      } else if (increaseMultiplier >= 2.0 || latencyDiff >= 400) {
        severity = 'HIGH';
      } else if (increaseMultiplier >= 1.5 || latencyDiff >= 200) {
        severity = 'MEDIUM';
      }

      anomalies.push({
        type: 'LATENCY_SPIKE',
        endpoint: row.endpoint,
        currentLatency,
        baselineLatency,
        latencyDiff,
        increaseMultiplier,
        percentageIncrease,
        currentTotal,
        severity,
        detectedAt: new Date().toISOString(),
        description: `Average response time increased by +${latencyDiff}ms (from ${baselineLatency}ms to ${currentLatency}ms, ${increaseMultiplier}x baseline)`,
      });
    }
  }

  return anomalies.sort((a, b) => b.latencyDiff - a.latencyDiff);
}

/**
 * Get unified list of all detected anomalies (both failure and latency spikes)
 * @param {object} options
 * @returns {Promise<Array>}
 */
async function getAllAnomalies(options = {}) {
  const [failures, latencies] = await Promise.all([
    detectFailureSpikes(options),
    detectLatencyAnomalies(options),
  ]);

  const combined = [...failures, ...latencies];

  // Sort by severity priority: CRITICAL > HIGH > MEDIUM > LOW
  const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return combined.sort((a, b) => {
    const rankDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (rankDiff !== 0) return rankDiff;
    return b.increaseMultiplier - a.increaseMultiplier;
  });
}

module.exports = {
  detectFailureSpikes,
  detectLatencyAnomalies,
  getAllAnomalies,
  fetchWindowMetrics,
};
