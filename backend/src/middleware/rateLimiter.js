const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 300;

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Maximum ${max} requests per ${windowMs / 1000} seconds. Please retry later.`,
  },
  skip: (req) => {
    // Skip rate limiting during automated test suites or local health checks
    return process.env.NODE_ENV === 'test' || req.path === '/health';
  },
});

// Bulk ingestion specific rate limiter
const bulkLimiter = rateLimit({
  windowMs: 60000,
  max: 60, // 60 bulk requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Bulk log ingestion rate limit exceeded (max 60 bulk batches/minute).',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = {
  apiLimiter,
  bulkLimiter,
};
