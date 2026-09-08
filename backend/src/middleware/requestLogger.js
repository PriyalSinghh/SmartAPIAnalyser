/**
 * High-resolution API Performance Monitoring Middleware
 * Measures exact execution duration and appends X-Response-Time header.
 */
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  // Intercept response finish
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = (Number(end - start) / 1e6).toFixed(2);

    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      const statusColor =
        res.statusCode >= 500
          ? '\x1b[31m' // Red
          : res.statusCode >= 400
          ? '\x1b[33m' // Yellow
          : '\x1b[32m'; // Green
      const resetColor = '\x1b[0m';

      console.log(
        `[API Perf] ${req.method} ${req.originalUrl || req.url} ${statusColor}${res.statusCode}${resetColor} - ${durationMs}ms`
      );
    }
  });

  // Calculate and set header before headers are sent
  const originalSend = res.send;
  res.send = function (...args) {
    const end = process.hrtime.bigint();
    const durationMs = (Number(end - start) / 1e6).toFixed(2);
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs}ms`);
    }
    return originalSend.apply(this, args);
  };

  next();
}

module.exports = requestLogger;
