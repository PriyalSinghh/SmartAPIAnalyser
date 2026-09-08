const logService = require('../services/logService');

/**
 * Ingest a single API log
 * POST /api/logs
 */
async function createLog(req, res, next) {
  try {
    const createdLog = await logService.createLog(req.validatedLog);
    return res.status(201).json({
      message: 'API log recorded successfully',
      data: createdLog,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * High-volume bulk log ingestion
 * POST /api/logs/bulk
 */
async function createBulkLogs(req, res, next) {
  try {
    const logs = req.body?.logs;
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: "Request body must contain a 'logs' array",
      });
    }

    if (logs.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: "'logs' array cannot be empty",
      });
    }

    if (logs.length > 10000) {
      return res.status(400).json({
        error: 'Payload Too Large',
        message: 'Maximum batch size is 10,000 logs per bulk request',
      });
    }

    const result = await logService.bulkInsertLogs(logs);

    return res.status(201).json({
      message: `Bulk log ingestion completed. Successfully inserted ${result.insertedCount} logs.`,
      insertedCount: result.insertedCount,
      rejectedCount: result.rejectedCount,
      validationErrors: result.validationErrors,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get paginated & filtered logs
 * GET /api/logs
 */
async function getLogs(req, res, next) {
  try {
    const { endpoint, statusCode, method, service, from, to, page, limit } = req.query;

    const filters = {
      endpoint,
      statusCode,
      method,
      service,
      from,
      to,
    };

    const pagination = {
      page,
      limit,
    };

    const result = await logService.getLogs(filters, pagination);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createLog,
  createBulkLogs,
  getLogs,
};
