const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'smart_api_analyzer',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(config);

// Log unexpected errors on idle clients to prevent crashing
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Execute a query with parameterized values
 * @param {string} text - SQL query
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => {
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
};

