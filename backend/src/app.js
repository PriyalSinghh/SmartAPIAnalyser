const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const healthRoutes = require('./routes/healthRoutes');
const logRoutes = require('./routes/logRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 5001;

// Performance & Diagnostic Middleware
app.use(requestLogger);

// Standard Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));

// Route Mounts
app.use('/health', healthRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SmartAPI - API Failure Analyzer Backend',
    version: '2.0.0',
    phase: 'Phase 2: Production-Scale API Monitoring & Failure Detection',
    endpoints: {
      health: 'GET /health',
      logs: {
        ingestSingle: 'POST /api/logs',
        ingestBulk: 'POST /api/logs/bulk',
        query: 'GET /api/logs(?endpoint=&statusCode=&method=&service=&from=&to=&page=&limit=)',
      },
      analytics: {
        summary: 'GET /api/analytics/summary',
        endpoints: 'GET /api/analytics/endpoints',
        errors: 'GET /api/analytics/errors',
        latency: 'GET /api/analytics/latency',
        timeseries: 'GET /api/analytics/timeseries',
        anomalies: 'GET /api/analytics/anomalies',
        healthScores: 'GET /api/analytics/health',
        services: 'GET /api/analytics/services',
        topSlow: 'GET /api/analytics/top-slow',
        topErrorSpikes: 'GET /api/analytics/top-error-spikes',
        recentFailures: 'GET /api/analytics/recent-failures',
        endpointDetails: 'GET /api/analytics/endpoint-details?endpoint=',
      },
    },
  });
});

// 404 handler for unrecognized endpoints
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling
app.use(errorHandler);

// Only listen if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SmartAPI Phase 2 Backend running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
