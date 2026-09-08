/**
 * Centralized error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // PostgreSQL Connection / Database Errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'Database Connection Error',
      message: 'Could not connect to PostgreSQL. Please verify that the database server is running.',
      details: err.message,
    });
  }

  if (err.code === '3D000') {
    return res.status(503).json({
      error: 'Database Not Found',
      message: 'The database "smart_api_analyzer" does not exist. Run "npm run db:init" to create it.',
      details: err.message,
    });
  }

  if (err.code === '42P01') {
    return res.status(503).json({
      error: 'Table Not Found',
      message: 'The "api_logs" table does not exist. Please run "npm run db:init" to initialize the schema.',
      details: err.message,
    });
  }

  if (err.code === '28P01') {
    return res.status(500).json({
      error: 'Database Authentication Failed',
      message: 'Invalid PostgreSQL credentials. Check DB_USER and DB_PASSWORD in backend/.env.',
      details: err.message,
    });
  }

  // Syntax or bad parameter errors
  if (err.status === 400 || err.statusCode === 400) {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message,
    });
  }

  // Generic internal server error fallback
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on the server',
  });
}

module.exports = errorHandler;

