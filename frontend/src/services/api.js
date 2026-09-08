import axios from 'axios';

// Base URL: in development, Vite proxy forwards /api and /health to backend.
const baseURL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred';
    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.response?.data?.error) {
      message = error.response.data.error;
    } else if (error.message) {
      message = error.message;
    }

    const enhancedError = new Error(message);
    enhancedError.status = error.response?.status;
    enhancedError.details = error.response?.data?.details;
    enhancedError.raw = error;
    return Promise.reject(enhancedError);
  }
);

// Analytics API Services
export const fetchHealth = async () => {
  const { data } = await apiClient.get('/health');
  return data;
};

export const fetchSummary = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/summary', { params });
  return data;
};

export const fetchEndpointAnalytics = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/endpoints', { params });
  return data;
};

export const fetchErrorDistribution = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/errors', { params });
  return data;
};

export const fetchLatencyAnalytics = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/latency', { params });
  return data;
};

export const fetchTimeSeries = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/timeseries', { params });
  return data;
};

export const fetchAnomalies = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/anomalies', { params });
  return data;
};

export const fetchHealthScores = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/health', { params });
  return data;
};

export const fetchServices = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/services', { params });
  return data;
};

export const fetchTopSlow = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/top-slow', { params });
  return data;
};

export const fetchTopErrorSpikes = async (params = {}) => {
  const { data } = await apiClient.get('/api/analytics/top-error-spikes', { params });
  return data;
};

export const fetchRecentFailures = async (limit = 20, endpoint) => {
  const params = { limit, ...(endpoint && { endpoint }) };
  const { data } = await apiClient.get('/api/analytics/recent-failures', { params });
  return data;
};

export const fetchEndpointDetails = async (endpoint, params = {}) => {
  const { data } = await apiClient.get('/api/analytics/endpoint-details', {
    params: { endpoint, ...params },
  });
  return data;
};

// Logs API Services
export const fetchLogs = async (params = {}) => {
  const { data } = await apiClient.get('/api/logs', { params });
  return data;
};

export const postLog = async (logData) => {
  const { data } = await apiClient.post('/api/logs', logData);
  return data;
};

export const postBulkLogs = async (logs) => {
  const { data } = await apiClient.post('/api/logs/bulk', { logs });
  return data;
};

export default apiClient;
