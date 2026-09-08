const { query } = require('../db/pool');
const { enhanceWithClassification } = require('./failureClassifier');
const cacheService = require('./cacheService');

/**
 * Validate a single log object
 * @param {object} log
 * @returns {{ valid: boolean, errors?: string[], normalized?: object }}
 */
function validateSingleLog(log) {
  if (!log || typeof log !== 'object') {
    return { valid: false, errors: ['Log entry must be a valid JSON object'] };
  }

  const method = (log.method || '').toString().trim().toUpperCase();
  const endpoint = (log.endpoint || '').toString().trim();
  const statusCode = parseInt(log.statusCode !== undefined ? log.statusCode : log.status_code, 10);
  const responseTime = parseInt(log.responseTime !== undefined ? log.responseTime : log.response_time, 10);
  const service = (log.service || '').toString().trim();
  const errorMessage = log.errorMessage || log.error_message || null;
  const requestId = (log.requestId || log.request_id || '').toString().trim();
  const timestamp = log.timestamp || new Date().toISOString();

  const errors = [];
  if (!method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].includes(method)) {
    errors.push(`Invalid HTTP method: "${method}"`);
  }
  if (!endpoint || typeof endpoint !== 'string') {
    errors.push('Endpoint is required and must be a string');
  }
  if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    errors.push(`Status code must be an integer between 100 and 599 (received: ${log.statusCode || log.status_code})`);
  }
  if (isNaN(responseTime) || responseTime < 0) {
    errors.push('Response time must be a non-negative integer (milliseconds)');
  }
  if (!service || typeof service !== 'string') {
    errors.push('Service is required and must be a non-empty string');
  }
  if (!requestId) {
    errors.push('RequestId is required');
  }
  if (isNaN(Date.parse(timestamp))) {
    errors.push('Timestamp must be a valid ISO 8601 date string');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    normalized: {
      timestamp,
      method,
      endpoint,
      statusCode,
      responseTime,
      service,
      errorMessage,
      requestId,
    },
  };
}

/**
 * Insert a single API log into PostgreSQL and invalidate cache
 * @param {object} logData
 * @returns {Promise<object>}
 */
async function createLog(logData) {
  const {
    timestamp = new Date().toISOString(),
    method,
    endpoint,
    statusCode,
    responseTime,
    service,
    errorMessage = null,
    requestId,
  } = logData;

  const sql = `
    INSERT INTO api_logs (
      timestamp, method, endpoint, status_code, response_time, service, error_message, request_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    timestamp,
    method.toUpperCase(),
    endpoint,
    parseInt(statusCode, 10),
    parseInt(responseTime, 10),
    service,
    errorMessage || null,
    requestId,
  ];

  const result = await query(sql, values);
  const row = result.rows[0];

  // Invalidate cached analytics upon new write
  try {
    await cacheService.invalidateAnalyticsCaches();
  } catch (e) {}

  return enhanceWithClassification(row);
}

/**
 * High-throughput bulk log insertion with per-item validation and multi-row batching
 * @param {Array<object>} logsArray
 * @returns {Promise<{ insertedCount: number, rejectedCount: number, errors: Array }>}
 */
async function bulkInsertLogs(logsArray) {
  if (!Array.isArray(logsArray)) {
    throw new Error('Logs payload must be an array');
  }

  const validRows = [];
  const rejectedErrors = [];

  logsArray.forEach((log, index) => {
    const validation = validateSingleLog(log);
    if (validation.valid) {
      validRows.push(validation.normalized);
    } else {
      rejectedErrors.push({
        index,
        requestId: log?.requestId || log?.request_id || `item_${index}`,
        errors: validation.errors,
      });
    }
  });

  let insertedCount = 0;
  const chunkSize = 250; // Parameterized batch size (250 * 8 params = 2000 params, within Postgres limit)

  for (let i = 0; i < validRows.length; i += chunkSize) {
    const chunk = validRows.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const values = [];

    chunk.forEach((row, idx) => {
      const offset = idx * 8;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
      values.push(
        row.timestamp,
        row.method,
        row.endpoint,
        row.statusCode,
        row.responseTime,
        row.service,
        row.errorMessage,
        row.requestId
      );
    });

    const sql = `
      INSERT INTO api_logs (timestamp, method, endpoint, status_code, response_time, service, error_message, request_id)
      VALUES ${valuePlaceholders.join(', ')}
    `;

    await query(sql, values);
    insertedCount += chunk.length;
  }

  // Invalidate cached analytics if any logs were inserted
  if (insertedCount > 0) {
    try {
      await cacheService.invalidateAnalyticsCaches();
    } catch (e) {}
  }

  return {
    insertedCount,
    rejectedCount: rejectedErrors.length,
    validationErrors: rejectedErrors.slice(0, 50), // Cap error details at 50 to avoid bloated response
  };
}

/**
 * Retrieve paginated logs with optional filters
 * @param {object} filters
 * @param {string} [filters.endpoint]
 * @param {number|string} [filters.statusCode]
 * @param {string} [filters.method]
 * @param {string} [filters.service]
 * @param {string} [filters.from]
 * @param {string} [filters.to]
 * @param {object} pagination
 * @param {number} [pagination.page=1]
 * @param {number} [pagination.limit=50]
 * @returns {Promise<{ data: Array, pagination: object }>}
 */
async function getLogs(filters = {}, pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(pagination.limit, 10) || 50));
  const offset = (page - 1) * limit;

  const whereClauses = [];
  const queryParams = [];

  if (filters.endpoint) {
    queryParams.push(filters.endpoint);
    whereClauses.push(`endpoint = $${queryParams.length}`);
  }

  if (filters.statusCode) {
    queryParams.push(parseInt(filters.statusCode, 10));
    whereClauses.push(`status_code = $${queryParams.length}`);
  }

  if (filters.method) {
    queryParams.push(filters.method.toUpperCase());
    whereClauses.push(`method = $${queryParams.length}`);
  }

  if (filters.service) {
    queryParams.push(filters.service);
    whereClauses.push(`service = $${queryParams.length}`);
  }

  if (filters.from) {
    queryParams.push(new Date(filters.from).toISOString());
    whereClauses.push(`timestamp >= $${queryParams.length}`);
  }

  if (filters.to) {
    queryParams.push(new Date(filters.to).toISOString());
    whereClauses.push(`timestamp <= $${queryParams.length}`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count matching the filters
  const countSql = `SELECT COUNT(*) as total FROM api_logs ${whereString};`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Retrieve paginated records
  const dataParams = [...queryParams, limit, offset];
  const dataSql = `
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
    ${whereString}
    ORDER BY timestamp DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;

  const dataResult = await query(dataSql, dataParams);
  const enhancedRows = enhanceWithClassification(dataResult.rows);

  return {
    data: enhancedRows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = {
  createLog,
  bulkInsertLogs,
  getLogs,
  validateSingleLog,
};
