const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply rate limiter to analytics routes
router.use(apiLimiter);

router.get('/summary', analyticsController.getSummary);
router.get('/endpoints', analyticsController.getEndpointAnalytics);
router.get('/errors', analyticsController.getErrorDistribution);
router.get('/latency', analyticsController.getLatencyAnalytics);
router.get('/timeseries', analyticsController.getTimeSeries);
router.get('/anomalies', analyticsController.getAnomalies);
router.get('/health', analyticsController.getHealthScores);
router.get('/services', analyticsController.getServiceAnalytics);
router.get('/top-slow', analyticsController.getTopSlow);
router.get('/top-error-spikes', analyticsController.getTopErrorSpikes);
router.get('/recent-failures', analyticsController.getRecentFailures);
router.get('/endpoint-details', analyticsController.getEndpointDetails);

module.exports = router;
