const analyticsService = require('../services/analyticsService');
const anomalyDetectionService = require('../services/anomalyDetectionService');
const healthScoreService = require('../services/healthScoreService');

/**
 * Overall summary analytics
 * GET /api/analytics/summary
 */
async function getSummary(req, res, next) {
  try {
    const { endpoint, service, from, to } = req.query;
    const summary = await analyticsService.getSummary({ endpoint, service, from, to });
    return res.status(200).json(summary);
  } catch (error) {
    return next(error);
  }
}

/**
 * Per-endpoint analytics breakdown
 * GET /api/analytics/endpoints
 */
async function getEndpointAnalytics(req, res, next) {
  try {
    const { service, from, to } = req.query;
    const endpoints = await analyticsService.getEndpointAnalytics({ service, from, to });
    return res.status(200).json(endpoints);
  } catch (error) {
    return next(error);
  }
}

/**
 * Error distribution grouped by status code
 * GET /api/analytics/errors
 */
async function getErrorDistribution(req, res, next) {
  try {
    const { endpoint, from, to } = req.query;
    const errors = await analyticsService.getErrorDistribution({ endpoint, from, to });
    return res.status(200).json(errors);
  } catch (error) {
    return next(error);
  }
}

/**
 * Latency analytics grouped by endpoint
 * GET /api/analytics/latency
 */
async function getLatencyAnalytics(req, res, next) {
  try {
    const { from, to } = req.query;
    const latency = await analyticsService.getLatencyAnalytics({ from, to });
    return res.status(200).json(latency);
  } catch (error) {
    return next(error);
  }
}

/**
 * Time-series traffic and error trends with dynamic bucketing
 * GET /api/analytics/timeseries
 */
async function getTimeSeries(req, res, next) {
  try {
    const { from, to, endpoint, service, bucket } = req.query;
    const timeseries = await analyticsService.getTimeSeries({ from, to, endpoint, service, bucket });
    return res.status(200).json(timeseries);
  } catch (error) {
    return next(error);
  }
}

/**
 * Detected failure spikes and latency anomalies
 * GET /api/analytics/anomalies
 */
async function getAnomalies(req, res, next) {
  try {
    const { endpoint, currentWindowHours, baselineWindowHours } = req.query;
    const anomalies = await anomalyDetectionService.getAllAnomalies({
      endpoint,
      currentWindowHours: currentWindowHours ? parseFloat(currentWindowHours) : undefined,
      baselineWindowHours: baselineWindowHours ? parseFloat(baselineWindowHours) : undefined,
    });
    return res.status(200).json(anomalies);
  } catch (error) {
    return next(error);
  }
}

/**
 * API Health scores (0-100) per endpoint
 * GET /api/analytics/health
 */
async function getHealthScores(req, res, next) {
  try {
    const { from, to } = req.query;
    const healthScores = await healthScoreService.getEndpointHealthScores({ from, to });
    return res.status(200).json(healthScores);
  } catch (error) {
    return next(error);
  }
}

/**
 * Microservice-level analytics
 * GET /api/analytics/services
 */
async function getServiceAnalytics(req, res, next) {
  try {
    const { from, to } = req.query;
    const [services, serviceScores] = await Promise.all([
      analyticsService.getServiceAnalytics({ from, to }),
      healthScoreService.getServiceHealthScores({ from, to }),
    ]);

    // Merge score into service metrics
    const scoreMap = new Map(serviceScores.map((s) => [s.service, s]));
    const merged = services.map((srv) => ({
      ...srv,
      healthScore: scoreMap.get(srv.service)?.score ?? 85,
      healthStatus: scoreMap.get(srv.service)?.status ?? 'HEALTHY',
    }));

    return res.status(200).json(merged);
  } catch (error) {
    return next(error);
  }
}

/**
 * Top slowest APIs
 * GET /api/analytics/top-slow
 */
async function getTopSlow(req, res, next) {
  try {
    const { from, to, limit } = req.query;
    const slowApis = await analyticsService.getTopSlow({ from, to }, limit);
    return res.status(200).json(slowApis);
  } catch (error) {
    return next(error);
  }
}

/**
 * Top APIs by recent failure spikes
 * GET /api/analytics/top-error-spikes
 */
async function getTopErrorSpikes(req, res, next) {
  try {
    const { from, to, limit } = req.query;
    const errorSpikes = await analyticsService.getTopErrorSpikes({ from, to }, limit);
    return res.status(200).json(errorSpikes);
  } catch (error) {
    return next(error);
  }
}

/**
 * Most recent failed requests
 * GET /api/analytics/recent-failures
 */
async function getRecentFailures(req, res, next) {
  try {
    const { limit, endpoint } = req.query;
    const failures = await analyticsService.getRecentFailures(limit, endpoint);
    return res.status(200).json(failures);
  } catch (error) {
    return next(error);
  }
}

/**
 * Detailed metrics for a single endpoint (used by API Details page)
 * GET /api/analytics/endpoint-details
 */
async function getEndpointDetails(req, res, next) {
  try {
    const { endpoint, from, to } = req.query;
    if (!endpoint) {
      return res.status(400).json({ error: 'Bad Request', message: "Query parameter 'endpoint' is required" });
    }

    const [summary, errorDistribution, statusCodeDistribution, commonErrors, recentFailures, percentiles, anomalies] =
      await Promise.all([
        analyticsService.getSummary({ endpoint, from, to }),
        analyticsService.getErrorDistribution({ endpoint, from, to }),
        analyticsService.getStatusCodeDistribution(endpoint),
        analyticsService.getCommonErrorMessages(endpoint, 10),
        analyticsService.getRecentFailures(10, endpoint),
        analyticsService.getPercentileLatency(endpoint),
        anomalyDetectionService.getAllAnomalies({ endpoint }),
      ]);

    // Calculate endpoint-specific health score
    const activeAnomaly = anomalies.find((a) => a.endpoint === endpoint);
    const healthScore = healthScoreService.computeScore({
      errorRate: summary.errorRate,
      avgLatency: percentiles.avgLatency || summary.averageResponseTime,
      p95Latency: percentiles.p95,
      failedRequests: summary.failedRequests,
      totalRequests: summary.totalRequests,
      activeAnomalySeverity: activeAnomaly ? activeAnomaly.severity : null,
    });

    return res.status(200).json({
      endpoint,
      summary,
      errorDistribution,
      statusCodeDistribution,
      commonErrors,
      recentFailures,
      percentiles,
      anomalies,
      healthScore,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSummary,
  getEndpointAnalytics,
  getErrorDistribution,
  getLatencyAnalytics,
  getTimeSeries,
  getAnomalies,
  getHealthScores,
  getServiceAnalytics,
  getTopSlow,
  getTopErrorSpikes,
  getRecentFailures,
  getEndpointDetails,
};
