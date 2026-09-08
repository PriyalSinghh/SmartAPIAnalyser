import { useState, useEffect, useCallback } from 'react';
import {
  fetchSummary,
  fetchEndpointAnalytics,
  fetchErrorDistribution,
  fetchLatencyAnalytics,
  fetchRecentFailures,
  fetchHealth,
  fetchTimeSeries,
  fetchAnomalies,
  fetchHealthScores,
  fetchServices,
  fetchTopSlow,
} from '../services/api';

export function useAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState({ from: null, to: null, label: 'All Time', value: 'all' });

  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [errorDistribution, setErrorDistribution] = useState({});
  const [latency, setLatency] = useState([]);
  const [timeseries, setTimeseries] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [healthScores, setHealthScores] = useState([]);
  const [services, setServices] = useState([]);
  const [topSlow, setTopSlow] = useState([]);
  const [recentFailures, setRecentFailures] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queryParams = {
      ...(timeRange.from && { from: timeRange.from }),
      ...(timeRange.to && { to: timeRange.to }),
    };

    try {
      const [
        healthRes,
        summaryRes,
        endpointsRes,
        errorsRes,
        latencyRes,
        timeseriesRes,
        anomaliesRes,
        healthScoresRes,
        servicesRes,
        topSlowRes,
        failuresRes,
      ] = await Promise.all([
        fetchHealth().catch((err) => ({ status: 'error', error: err.message })),
        fetchSummary(queryParams),
        fetchEndpointAnalytics(queryParams),
        fetchErrorDistribution(queryParams),
        fetchLatencyAnalytics(queryParams),
        fetchTimeSeries(queryParams),
        fetchAnomalies(),
        fetchHealthScores(queryParams),
        fetchServices(queryParams),
        fetchTopSlow(queryParams, 5),
        fetchRecentFailures(15),
      ]);

      setHealth(healthRes);
      setSummary(summaryRes);
      setEndpoints(endpointsRes || []);
      setErrorDistribution(errorsRes || {});
      setLatency(latencyRes || []);
      setTimeseries(timeseriesRes || []);
      setAnomalies(anomaliesRes || []);
      setHealthScores(healthScoresRes || []);
      setServices(servicesRes || []);
      setTopSlow(topSlowRes || []);
      setRecentFailures(failuresRes || []);
    } catch (err) {
      console.error('Failed to load Phase 2 analytics:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading,
    error,
    timeRange,
    setTimeRange,
    health,
    summary,
    endpoints,
    errorDistribution,
    latency,
    timeseries,
    anomalies,
    healthScores,
    services,
    topSlow,
    recentFailures,
    refresh: loadData,
  };
}

export default useAnalytics;
