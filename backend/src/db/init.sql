-- SmartAPI – API Failure Analyzer Schema
-- PostgreSQL Initialization Script

CREATE TABLE IF NOT EXISTS api_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- Latency in milliseconds
    service VARCHAR(100) NOT NULL,
    error_message TEXT,
    request_id VARCHAR(100) NOT NULL
);

-- Indexes for performance and quick analytics lookups
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs (endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs (status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_service ON api_logs (service);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_status ON api_logs (endpoint, status_code);

