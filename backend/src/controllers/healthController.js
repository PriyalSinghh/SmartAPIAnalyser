const { checkDbConnection } = require('../db/pool');
const cacheService = require('../services/cacheService');

/**
 * Enhanced Health check endpoint for Phase 2
 * GET /health
 */
async function getHealth(req, res) {
  const dbStatus = await checkDbConnection();
  const redisStatus = cacheService.isHealthy();

  const response = {
    status: dbStatus.connected ? 'ok' : 'degraded',
    phase: 'Phase 2: Production-Scale API Monitoring & Failure Detection',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus.connected ? 'connected' : 'disconnected',
      ...(dbStatus.error && { error: dbStatus.error }),
    },
    redis: {
      status: redisStatus.status,
    },
  };

  // The application continues functioning with PostgreSQL even if Redis is down
  const httpStatus = dbStatus.connected ? 200 : 503;
  return res.status(httpStatus).json(response);
}

module.exports = {
  getHealth,
};
