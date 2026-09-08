-- Phase 2 Database Optimization Migration
-- Composite indexes for fast time-series, anomaly detection, and filtering

-- 1. Accelerates per-endpoint time-series, baseline vs current window comparisons
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_timestamp ON api_logs (endpoint, timestamp DESC);

-- 2. Accelerates service-level time-series analytics
CREATE INDEX IF NOT EXISTS idx_api_logs_service_timestamp ON api_logs (service, timestamp DESC);

-- 3. Accelerates global time-series queries and status code aggregations
CREATE INDEX IF NOT EXISTS idx_api_logs_status_timestamp ON api_logs (status_code, timestamp DESC);

-- 4. Accelerates status code breakdown queries per endpoint over time
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_status_ts ON api_logs (endpoint, status_code, timestamp DESC);

-- 5. Accelerates single request ID lookups
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON api_logs (request_id);
