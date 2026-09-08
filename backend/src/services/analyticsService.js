const { query } = require('../db/pool');
const { enhanceWithClassification } = require('./failureClassifier');
const cacheService = require('./cacheService');

// Helper to build SQL WHERE clause for time-range and endpoint filtering
function buildWhereClause(options = {}) {
  const whereClauses = [];
  const params = [];

  if (options.endpoint) {
    params.push(options.endpoint);
    whereClauses.push(`endpoint = $${params.length}`);
  }

  if (options.service) {
    params.push(options.service);
    whereClauses.push(`service = $${params.length}`);
  }

  if (options.from) {
    params.push(new Date(options.from).toISOString());
    whereClauses.push(`timestamp >= $${params.length}`);
  }

  if (options.to) {
    params.push(new Date(options.to).toISOString());
    whereClauses.push(`timestamp <= $${params.length}`);
  }

  return {
    whereClause: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
    params,
  };
}

/**
 * Get high-level summary across all API requests (with Redis caching and time-range support)
 * @param {object|string} [optionsOrEndpoint]
 * @returns {Promise<{ totalRequests: number, successfulRequests: number, failedRequests: number, errorRate: number, averageResponseTime: number }>}
 */
async function getSummary(optionsOrEndpoint = {}) {
  const options = typeof optionsOrEndpoint === 'string'
    ? { endpoint: optionsOrEndpoint }
    : (optionsOrEndpoint || {});

  const cacheKey = `analytics:summary:${options.endpoint || 'all'}:${options.service || 'all'}:${options.from || ''}:${options.to || ''}`;

  const { data } = await cacheService.getOrSet(cacheKey, 45, async () => {
    const { whereClause, params } = buildWhereClause(options);

    const sql = `
      SELECT
        COUNT(*)::integer AS "totalRequests",
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::integer AS "successfulRequests",
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS "failedRequests",
        COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "averageResponseTime",
        COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95ResponseTime"
      FROM api_logs
      ${whereClause};
    `;

    const result = await query(sql, params);
    const row = result.rows[0] || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
    };

    const total = row.totalRequests || 0;
    const failed = row.failedRequests || 0;
    const errorRate = total > 0 ? parseFloat(((failed / total) * 100).toFixed(2)) : 0;

    return {
      totalRequests: total,
      successfulRequests: row.successfulRequests || 0,
      failedRequests: failed,
      errorRate,
      averageResponseTime: row.averageResponseTime || 0,
      p95ResponseTime: row.p95ResponseTime || 0,
    };
  });

  return data;
}

/**
 * Get per-endpoint analytics breakdown (with Redis caching & time-range support)
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
async function getEndpointAnalytics(options = {}) {
  const cacheKey = `analytics:endpoints:${options.service || 'all'}:${options.from || ''}:${options.to || ''}`;

  const { data } = await cacheService.getOrSet(cacheKey, 60, async () => {
    const { whereClause, params } = buildWhereClause(options);

    const sql = `
      SELECT
        endpoint,
        COUNT(*)::integer AS "totalRequests",
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS "failedRequests",
        COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "averageResponseTime",
        COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95ResponseTime"
      FROM api_logs
      ${whereClause}
      GROUP BY endpoint
      ORDER BY "failedRequests" DESC, "totalRequests" DESC;
    `;

    const result = await query(sql, params);

    return result.rows.map((row) => {
      const total = row.totalRequests || 0;
      const failed = row.failedRequests || 0;
      const errorRate = total > 0 ? parseFloat(((failed / total) * 100).toFixed(2)) : 0;

      return {
        endpoint: row.endpoint,
        totalRequests: total,
        failedRequests: failed,
        errorRate,
        averageResponseTime: row.averageResponseTime || 0,
        p95ResponseTime: row.p95ResponseTime || 0,
      };
    });
  });

  return data;
}

/**
 * Get error distribution grouped by HTTP status code (with Redis caching & time filtering)
 * @param {object|string} [optionsOrEndpoint]
 * @returns {Promise<Record<string, number>>}
 */
async function getErrorDistribution(optionsOrEndpoint = {}) {
  const options = typeof optionsOrEndpoint === 'string'
    ? { endpoint: optionsOrEndpoint }
    : (optionsOrEndpoint || {});

  const cacheKey = `analytics:errors:${options.endpoint || 'all'}:${options.from || ''}:${options.to || ''}`;

  const { data } = await cacheService.getOrSet(cacheKey, 60, async () => {
    const whereClauses = ['status_code >= 400 AND status_code < 600'];
    const params = [];

    if (options.endpoint) {
      params.push(options.endpoint);
      whereClauses.push(`endpoint = $${params.length}`);
    }

    if (options.from) {
      params.push(new Date(options.from).toISOString());
      whereClauses.push(`timestamp >= $${params.length}`);
    }

    if (options.to) {
      params.push(new Date(options.to).toISOString());
      whereClauses.push(`timestamp <= $${params.length}`);
    }

    const sql = `
      SELECT
        status_code::text AS code,
        COUNT(*)::integer AS count
      FROM api_logs
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY status_code
      ORDER BY status_code ASC;
    `;

    const result = await query(sql, params);
    const distribution = {};

    result.rows.forEach((row) => {
      distribution[row.code] = row.count;
    });

    return distribution;
  });

  return data;
}

/**
 * Get average response time grouped by endpoint
 * @param {object} [options]
 * @returns {Promise<Array<{ endpoint: string, averageResponseTime: number }>>}
 */
async function getLatencyAnalytics(options = {}) {
  const cacheKey = `analytics:latency:${options.from || ''}:${options.to || ''}`;

  const { data } = await cacheService.getOrSet(cacheKey, 60, async () => {
    const { whereClause, params } = buildWhereClause(options);

    const sql = `
      SELECT
        endpoint,
        COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "averageResponseTime",
        COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95ResponseTime"
      FROM api_logs
      ${whereClause}
      GROUP BY endpoint
      ORDER BY "averageResponseTime" DESC;
    `;

    const result = await query(sql, params);
    return result.rows;
  });

  return data;
}

/**
 * Get time-series aggregated metrics with dynamic PostgreSQL time bucketing
 * @param {object} [options]
 * @param {string} [options.from]
 * @param {string} [options.to]
 * @param {string} [options.endpoint]
 * @param {string} [options.service]
 * @param {string} [options.bucket] - 'minute', 'hour', 'day'
 * @returns {Promise<Array>}
 */
async function getTimeSeries(options = {}) {
  const cacheKey = `analytics:timeseries:${options.endpoint || 'all'}:${options.service || 'all'}:${options.from || ''}:${options.to || ''}:${options.bucket || 'auto'}`;

  const { data } = await cacheService.getOrSet(cacheKey, 60, async () => {
    const now = new Date();
    const fromDate = options.from ? new Date(options.from) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const toDate = options.to ? new Date(options.to) : now;

    const diffHours = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60);

    // Determine sensible time bucket
    let timeBucket = options.bucket;
    if (!timeBucket || timeBucket === 'auto') {
      if (diffHours <= 2) {
        timeBucket = 'minute'; // 1-minute intervals for short windows
      } else if (diffHours <= 24) {
        timeBucket = 'hour'; // 1-hour intervals for 24h
      } else if (diffHours <= 168) {
        timeBucket = 'hour'; // 1-hour intervals for 7d
      } else {
        timeBucket = 'day'; // 1-day intervals for 30d
      }
    }

    const whereClauses = ['timestamp >= $1 AND timestamp <= $2'];
    const params = [fromDate.toISOString(), toDate.toISOString()];

    if (options.endpoint) {
      params.push(options.endpoint);
      whereClauses.push(`endpoint = $${params.length}`);
    }

    if (options.service) {
      params.push(options.service);
      whereClauses.push(`service = $${params.length}`);
    }

    const sql = `
      SELECT
        date_trunc('${timeBucket}', timestamp) AS "timestamp",
        COUNT(*)::integer AS "totalRequests",
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS "failedRequests",
        COALESCE(ROUND((COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::numeric / NULLIF(COUNT(*), 0) * 100), 2), 0)::float AS "errorRate",
        COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "avgResponseTime",
        COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95ResponseTime"
      FROM api_logs
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const result = await query(sql, params);
    return result.rows;
  });

  return data;
}

/**
 * Get service-level analytics
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
async function getServiceAnalytics(options = {}) {
  const cacheKey = `analytics:services:${options.from || ''}:${options.to || ''}`;

  const { data } = await cacheService.getOrSet(cacheKey, 60, async () => {
    const { whereClause, params } = buildWhereClause(options);

    const sql = `
      SELECT
        service,
        COUNT(*)::integer AS "totalRequests",
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS "failedRequests",
        COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "avgLatency",
        COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95Latency"
      FROM api_logs
      ${whereClause}
      GROUP BY service
      ORDER BY "totalRequests" DESC;
    `;

    const result = await query(sql, params);

    return result.rows.map((row) => {
      const total = row.totalRequests || 0;
      const failed = row.failedRequests || 0;
      const errorRate = total > 0 ? parseFloat(((failed / total) * 100).toFixed(2)) : 0;

      return {
        service: row.service,
        totalRequests: total,
        failedRequests: failed,
        errorRate,
        avgLatency: row.avgLatency,
        p95Latency: row.p95Latency,
      };
    });
  });

  return data;
}

/**
 * Get top slowest APIs
 * @param {object} [options]
 * @param {number} [limit=5]
 * @returns {Promise<Array>}
 */
async function getTopSlow(options = {}, limit = 5) {
  const safeLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 5));
  const { whereClause, params } = buildWhereClause(options);
  params.push(safeLimit);

  const sql = `
    SELECT
      endpoint,
      COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "avgLatency",
      COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95Latency",
      COUNT(*)::integer AS "totalRequests"
    FROM api_logs
    ${whereClause}
    GROUP BY endpoint
    HAVING COUNT(*) >= 5
    ORDER BY "avgLatency" DESC
    LIMIT $${params.length};
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get top APIs by recent failure spikes
 * @param {object} [options]
 * @param {number} [limit=5]
 * @returns {Promise<Array>}
 */
async function getTopErrorSpikes(options = {}, limit = 5) {
  const safeLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 5));
  const { whereClause, params } = buildWhereClause(options);
  params.push(safeLimit);

  const sql = `
    SELECT
      endpoint,
      COUNT(*)::integer AS "totalRequests",
      COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::integer AS "failedRequests",
      COALESCE(ROUND((COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600)::numeric / NULLIF(COUNT(*), 0) * 100), 2), 0)::float AS "errorRate"
    FROM api_logs
    ${whereClause}
    GROUP BY endpoint
    HAVING COUNT(*) >= 5 AND COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 600) > 0
    ORDER BY "errorRate" DESC
    LIMIT $${params.length};
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get the most recent failed API requests
 * @param {number} [limit=20]
 * @param {string} [endpoint]
 * @returns {Promise<Array>}
 */
async function getRecentFailures(limit = 20, endpoint = null) {
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const whereClauses = ['status_code >= 400 AND status_code < 600'];
  const params = [];

  if (endpoint) {
    params.push(endpoint);
    whereClauses.push(`endpoint = $${params.length}`);
  }

  params.push(safeLimit);
  const sql = `
    SELECT
      id,
      timestamp,
      method,
      endpoint,
      status_code as "statusCode",
      response_time as "responseTime",
      service,
      error_message as "errorMessage",
      request_id as "requestId"
    FROM api_logs
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY timestamp DESC
    LIMIT $${params.length};
  `;

  const result = await query(sql, params);
  return enhanceWithClassification(result.rows);
}

/**
 * Get most common error messages
 */
async function getCommonErrorMessages(endpoint = null, limit = 10) {
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const whereClauses = ['status_code >= 400 AND status_code < 600 AND error_message IS NOT NULL'];
  const params = [];

  if (endpoint) {
    params.push(endpoint);
    whereClauses.push(`endpoint = $${params.length}`);
  }

  params.push(safeLimit);
  const sql = `
    SELECT
      error_message AS "errorMessage",
      status_code AS "statusCode",
      COUNT(*)::integer AS count
    FROM api_logs
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY error_message, status_code
    ORDER BY count DESC
    LIMIT $${params.length};
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get status code distribution
 */
async function getStatusCodeDistribution(endpoint) {
  const sql = `
    SELECT
      status_code AS "statusCode",
      COUNT(*)::integer AS count
    FROM api_logs
    WHERE endpoint = $1
    GROUP BY status_code
    ORDER BY status_code ASC;
  `;

  const result = await query(sql, [endpoint]);
  return result.rows;
}

/**
 * Get percentile latency details (P50, P90, P95, P99) for an endpoint
 * @param {string} endpoint
 * @returns {Promise<object>}
 */
async function getPercentileLatency(endpoint) {
  const sql = `
    SELECT
      COALESCE(ROUND(AVG(response_time)::numeric, 0)::integer, 0) AS "avgLatency",
      COALESCE(ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p50",
      COALESCE(ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p90",
      COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p95",
      COALESCE(ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer, 0) AS "p99",
      MIN(response_time)::integer AS "min",
      MAX(response_time)::integer AS "max"
    FROM api_logs
    WHERE endpoint = $1;
  `;

  const result = await query(sql, [endpoint]);
  return result.rows[0] || { avgLatency: 0, p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0 };
}

module.exports = {
  getSummary,
  getEndpointAnalytics,
  getErrorDistribution,
  getLatencyAnalytics,
  getTimeSeries,
  getServiceAnalytics,
  getTopSlow,
  getTopErrorSpikes,
  getRecentFailures,
  getCommonErrorMessages,
  getStatusCodeDistribution,
  getPercentileLatency,
};
