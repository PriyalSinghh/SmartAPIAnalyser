const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

let config;
if (connectionString) {
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  config = {
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
} else {
  config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'smart_api_analyzer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(config);

// Log unexpected errors on idle clients to prevent crashing
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

let schemaInitialized = false;

/**
 * Ensure database schema and indexes exist (auto-migration on cold start)
 */
async function ensureSchema() {
  if (schemaInitialized) return;
  try {
    const initSql = `
      CREATE TABLE IF NOT EXISTS api_logs (
        id BIGSERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        method VARCHAR(10) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        status_code INTEGER NOT NULL,
        response_time INTEGER NOT NULL,
        service VARCHAR(100) NOT NULL,
        error_message TEXT,
        request_id VARCHAR(100) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs (endpoint);
      CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs (status_code);
      CREATE INDEX IF NOT EXISTS idx_api_logs_service ON api_logs (service);
      CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_status ON api_logs (endpoint, status_code);
      CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_timestamp ON api_logs (endpoint, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_api_logs_service_timestamp ON api_logs (service, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_api_logs_status_timestamp ON api_logs (status_code, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_status_ts ON api_logs (endpoint, status_code, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON api_logs (request_id);
    `;
    await pool.query(initSql);
    schemaInitialized = true;
  } catch (err) {
    console.warn(`[DB Schema] Auto-init check note: ${err.message}`);
  }
}

// Trigger initial schema verification in background
ensureSchema().catch(() => {});

/**
 * Execute a query with parameterized values
 * @param {string} text - SQL query
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  if (!schemaInitialized) {
    await ensureSchema().catch(() => {});
  }
  return pool.query(text, params);
};

/**
 * Check if the database is reachable
 * @returns {Promise<{ connected: boolean, error?: string, timestamp?: Date }>}
 */
const checkDbConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as now');
    return { connected: true, timestamp: res.rows[0].now };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

module.exports = {
  pool,
  query,
  checkDbConnection,
  ensureSchema,
};
