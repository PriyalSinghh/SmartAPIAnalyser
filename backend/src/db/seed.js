const { pool, query } = require('./pool');
const crypto = require('crypto');

// Configuration for realistic log generation
const ENDPOINTS = [
  { path: '/api/users', service: 'user-service', methods: ['GET', 'POST', 'PUT'], baseLatency: 120, failRate: 0.04 },
  { path: '/api/products', service: 'product-service', methods: ['GET', 'POST'], baseLatency: 180, failRate: 0.03 },
  { path: '/api/orders', service: 'order-service', methods: ['GET', 'POST', 'PUT', 'DELETE'], baseLatency: 350, failRate: 0.16 }, // Critical: > 10%
  { path: '/api/payment', service: 'payment-service', methods: ['POST'], baseLatency: 650, failRate: 0.19 }, // Critical: > 10%
  { path: '/api/cart', service: 'cart-service', methods: ['GET', 'POST', 'PUT', 'DELETE'], baseLatency: 110, failRate: 0.07 }, // Warning: 5-10%
  { path: '/api/search', service: 'search-service', methods: ['GET'], baseLatency: 220, failRate: 0.02 }, // Healthy: < 5%
];

const SUCCESS_STATUSES = [200, 200, 200, 200, 201, 204];

const ERROR_TEMPLATES = {
  400: [
    "Validation failed: missing required parameter 'shippingAddress'",
    "Invalid request payload: 'amount' must be a positive number",
    "Malformed JSON payload in request body",
    "Parameter 'userId' must be a valid UUID",
  ],
  401: [
    "Authorization token missing or expired",
    "Invalid JWT signature in authorization header",
    "Bearer token rejected by authentication provider",
  ],
  403: [
    "Forbidden: insufficient permissions for resource",
    "User lacks 'admin:order_write' role to perform this action",
    "Action blocked by tenant security policy",
  ],
  404: [
    "Resource record not found for requested identifier",
    "Product SKU 'PROD-9812' does not exist in catalog",
    "Active cart not found for session",
    "User profile not found",
  ],
  429: [
    "Rate limit exceeded: 100 requests per minute quota reached",
    "Too many requests from client IP. Retry after 30 seconds",
    "API throttling active for tenant tier",
  ],
  500: [
    "Database connection timeout after 5000ms",
    "Unhandled NullReferenceException in checkout pipeline",
    "Internal server error: transaction deadlock detected",
    "PostgreSQL query execution cancelled due to lock contention",
  ],
  502: [
    "Bad Gateway: upstream inventory microservice unreachable",
    "Failed to receive valid HTTP response from upstream warehouse cluster",
    "Reverse proxy connection reset by peer",
  ],
  503: [
    "Payment gateway integration temporarily unavailable",
    "Circuit breaker OPEN for external settlement provider",
    "Service unavailable: downstream database undergoing maintenance failover",
  ],
};

const ERROR_STATUS_WEIGHTS = [
  { code: 500, weight: 32 },
  { code: 502, weight: 12 },
  { code: 503, weight: 14 },
  { code: 400, weight: 16 },
  { code: 401, weight: 8 },
  { code: 403, weight: 5 },
  { code: 404, weight: 8 },
  { code: 429, weight: 5 },
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomErrorCode() {
  const totalWeight = ERROR_STATUS_WEIGHTS.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of ERROR_STATUS_WEIGHTS) {
    if (random < item.weight) return item.code;
    random -= item.weight;
  }
  return 500;
}

function generateRequestId() {
  return `req_${crypto.randomBytes(6).toString('hex')}`;
}

async function seedLogs(totalCount = 1500) {
  console.log(`--- Seeding ${totalCount} realistic API logs into smart_api_analyzer ---`);

  // Verify connection first
  try {
    await query('SELECT 1');
  } catch (err) {
    console.error('❌ Cannot connect to database for seeding:', err.message);
    process.exit(1);
  }

  // Ensure table exists
  await query(`
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
  `);

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const rows = [];

  for (let i = 0; i < totalCount; i++) {
    // Distribute timestamps over past 7 days, weighted slightly towards more recent hours
    const timeOffset = Math.pow(Math.random(), 1.4) * sevenDaysMs;
    const timestamp = new Date(now - timeOffset);

    const endpointConfig = getRandomElement(ENDPOINTS);
    const method = getRandomElement(endpointConfig.methods);
    const isError = Math.random() < endpointConfig.failRate;

    let statusCode;
    let errorMessage = null;
    let responseTime;

    if (!isError) {
      statusCode = getRandomElement(SUCCESS_STATUSES);
      // Normal latency variance (+/- 40%)
      const variance = (Math.random() * 0.8 - 0.4);
      responseTime = Math.max(25, Math.round(endpointConfig.baseLatency * (1 + variance)));
    } else {
      statusCode = getRandomErrorCode();
      const messages = ERROR_TEMPLATES[statusCode] || ['An unexpected error occurred'];
      errorMessage = getRandomElement(messages);
      // Failures often have higher latency due to timeouts, retries, or downstream bottlenecks
      const timeoutMultiplier = statusCode >= 500 ? (1.5 + Math.random() * 2.5) : (1.0 + Math.random() * 0.8);
      responseTime = Math.round(endpointConfig.baseLatency * timeoutMultiplier) + Math.floor(Math.random() * 200);
    }

    rows.push({
      timestamp,
      method,
      endpoint: endpointConfig.path,
      statusCode,
      responseTime,
      service: endpointConfig.service,
      errorMessage,
      requestId: generateRequestId(),
    });
  }

  // Sort rows chronologically for neat insertion
  rows.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Insert in chunks of 250 for fast batching
  const chunkSize = 250;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const values = [];

    chunk.forEach((row, idx) => {
      const offset = idx * 8;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
      values.push(
        row.timestamp,
        row.method,
        row.endpoint,
        row.statusCode,
        row.responseTime,
        row.service,
        row.errorMessage,
        row.requestId
      );
    });

    const sql = `
      INSERT INTO api_logs (timestamp, method, endpoint, status_code, response_time, service, error_message, request_id)
      VALUES ${valuePlaceholders.join(', ')}
    `;

    await query(sql, values);
    inserted += chunk.length;
    process.stdout.write(`Inserted ${inserted}/${rows.length} logs...\r`);
  }

  console.log(`\n✅ Successfully seeded ${inserted} realistic API logs into api_logs table!`);

  // Print a quick breakdown
  const summaryRes = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400) as successes,
      COUNT(*) FILTER (WHERE status_code >= 400) as failures,
      ROUND(AVG(response_time)::numeric, 1) as avg_latency
    FROM api_logs;
  `);

  console.log('Database Log Summary:', summaryRes.rows[0]);
  await pool.end();
}

if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : 1500;
  seedLogs(count).catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = seedLogs;

