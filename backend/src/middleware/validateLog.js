/**
 * Middleware to validate incoming API log payload for POST /api/logs
 */
function validateLog(req, res, next) {
  const body = req.body || {};

  // Normalize camelCase and snake_case keys
  const method = (body.method || '').toString().trim().toUpperCase();
  const endpoint = (body.endpoint || '').toString().trim();
  const statusCode = parseInt(body.statusCode !== undefined ? body.statusCode : body.status_code, 10);
  const responseTime = parseInt(body.responseTime !== undefined ? body.responseTime : body.response_time, 10);
  const service = (body.service || '').toString().trim();
  const errorMessage = body.errorMessage || body.error_message || null;
  const requestId = (body.requestId || body.request_id || '').toString().trim();
  const timestamp = body.timestamp || new Date().toISOString();

  const errors = [];

  if (!method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].includes(method)) {
    errors.push("Field 'method' is required and must be a valid HTTP verb (e.g. GET, POST, PUT, DELETE)");
  }

  if (!endpoint || typeof endpoint !== 'string') {
    errors.push("Field 'endpoint' is required and must be a non-empty string (e.g. /api/orders)");
  }

  if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    errors.push("Field 'statusCode' is required and must be an integer between 100 and 599");
  }

  if (isNaN(responseTime) || responseTime < 0) {
    errors.push("Field 'responseTime' is required and must be a non-negative integer (milliseconds)");
  }

  if (!service || typeof service !== 'string') {
    errors.push("Field 'service' is required and must be a non-empty string (e.g. order-service)");
  }

  if (!requestId) {
    errors.push("Field 'requestId' is required (e.g. req_abc123)");
  }

  // Validate timestamp if provided
  if (isNaN(Date.parse(timestamp))) {
    errors.push("Field 'timestamp' must be a valid ISO 8601 date string");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid log data provided',
      details: errors,
    });
  }

  // Attach normalized payload to request object
  req.validatedLog = {
    timestamp,
    method,
    endpoint,
    statusCode,
    responseTime,
    service,
    errorMessage,
    requestId,
  };

  next();
}

module.exports = validateLog;

