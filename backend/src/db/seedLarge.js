const { pool, query } = require('./pool');
const crypto = require('crypto');
const cacheService = require('../services/cacheService');

const TOTAL_LOGS = 100000;
const BATCH_SIZE = 2500;

const ENDPOINTS = [
  { path: '/api/users', service: 'user-service', methods: ['GET', 'POST', 'PUT'], baseLatency: 110, failRate: 0.015 },
  { path: '/api/products', service: 'product-service', methods: ['GET', 'POST'], baseLatency: 150, failRate: 0.02 },
  { path: '/api/orders', service: 'order-service', methods: ['GET', 'POST', 'PUT', 'DELETE'], baseLatency: 280, failRate: 0.04 },
  { path: '/api/payment', service: 'payment-service', methods: ['POST'], baseLatency: 380, failRate: 0.03 },
  { path: '/api/cart', service: 'cart-service', methods: ['GET', 'POST', 'PUT', 'DELETE'], baseLatency: 95, failRate: 0.03 },
  { path: '/api/search', service: 'search-service', methods: ['GET'], baseLatency: 190, failRate: 0.01 },
];

const SUCCESS_STATUSES = [200, 200, 200, 200, 201, 204];

const ERROR_TEMPLATES = {
  400: [
    "Validation failed: missing required parameter 'shippingAddress'",
    "Invalid request payload: 'amount' must be a positive integer",
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
  ],
  429: [
    "Rate limit exceeded: 100 requests per minute quota reached",
    "Too many requests from client IP. Retry after 30 seconds",
  ],
  500: [
    "Database connection timeout after 5000ms",
    "Unhandled NullReferenceException in checkout pipeline",
    "Internal server error: transaction deadlock detected",
  ],
  502: [
    "Bad Gateway: upstream inventory microservice unreachable",
    "Failed to receive valid HTTP response from upstream warehouse cluster",
  ],
  503: [
    "Payment gateway integration temporarily unavailable",
    "Circuit breaker OPEN for external settlement provider",
    "Service unavailable: downstream database undergoing maintenance failover",
  ],
};

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRequestId() {
  return `req_${crypto.randomBytes(5).toString('hex')}`;
}

async function seedLarge() {
  console.log(`================================================================`);
  console.log(`🚀 SmartAPI Phase 2: Generating ${TOTAL_LOGS.toLocaleString()} realistic API logs...`);
  console.log(`================================================================`);

  // Verify DB connection
  try {
    await query('SELECT 1');
  } catch (err) {
    console.error('❌ Cannot connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const twoHoursMs = 2 * 60 * 60 * 1000;

  let insertedCount = 0;
  const startTime = Date.now();

  for (let batchStart = 0; batchStart < TOTAL_LOGS; batchStart += BATCH_SIZE) {
    const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_LOGS - batchStart);
    const valuePlaceholders = [];
    const values = [];

    for (let i = 0; i < currentBatchSize; i++) {
      // 80% distributed across past 7 days; 20% in the last 4 hours
      const inRecentWindow = Math.random() < 0.20;
      const timeOffset = inRecentWindow
        ? Math.random() * (4 * 60 * 60 * 1000)
        : Math.pow(Math.random(), 1.2) * sevenDaysMs;

      const timestamp = new Date(now - timeOffset);
      const isWithinLast2Hours = (now - timestamp.getTime()) < twoHoursMs;

      const endpointConfig = getRandomElement(ENDPOINTS);
      const method = getRandomElement(endpointConfig.methods);

      let isError = Math.random() < endpointConfig.failRate;
      let latencyMultiplier = 1 + (Math.random() * 0.6 - 0.3);

      // INJECTED ANOMALY 1: /api/payment failure spike in the last 2 hours (26% failure rate)
      if (endpointConfig.path === '/api/payment' && isWithinLast2Hours) {
        isError = Math.random() < 0.26;
      }

      // INJECTED ANOMALY 2: /api/orders severe latency spike in the last 2 hours (average 1,250ms)
      if (endpointConfig.path === '/api/orders' && isWithinLast2Hours) {
        latencyMultiplier = 3.5 + Math.random() * 2.0;
        if (Math.random() < 0.12) isError = true;
      }

      let statusCode;
      let errorMessage = null;
      let responseTime;

      if (!isError) {
        statusCode = getRandomElement(SUCCESS_STATUSES);
        responseTime = Math.max(20, Math.round(endpointConfig.baseLatency * latencyMultiplier));
      } else {
        const errorCodes = [500, 502, 503, 400, 401, 403, 404, 429];
        statusCode = getRandomElement(errorCodes);
        const templates = ERROR_TEMPLATES[statusCode] || ['An unexpected error occurred'];
        errorMessage = getRandomElement(templates);
        responseTime = Math.round(endpointConfig.baseLatency * (latencyMultiplier + 1.2)) + Math.floor(Math.random() * 150);
      }

      const offset = i * 8;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
      values.push(
        timestamp,
        method,
        endpointConfig.path,
        statusCode,
        responseTime,
        endpointConfig.service,
        errorMessage,
        generateRequestId()
      );
    }

    const sql = `
      INSERT INTO api_logs (timestamp, method, endpoint, status_code, response_time, service, error_message, request_id)
      VALUES ${valuePlaceholders.join(', ')}
    `;

    await query(sql, values);
    insertedCount += currentBatchSize;

    const progress = ((insertedCount / TOTAL_LOGS) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`⚡ Ingested ${insertedCount.toLocaleString()}/${TOTAL_LOGS.toLocaleString()} logs (${progress}%) - ${elapsed}s elapsed\r`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n✅ Successfully generated and seeded ${insertedCount.toLocaleString()} logs in ${durationSec}s!`);

  // Invalidate any existing analytics cache
  await cacheService.invalidateAnalyticsCaches();
  console.log('🧹 Flushed Redis analytics cache.');

  // Print summary breakdown
  const summaryRes = await query(`
    SELECT
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::integer AS successes,
      COUNT(*) FILTER (WHERE status_code >= 400)::integer AS failures,
      ROUND(AVG(response_time)::numeric, 0)::integer AS avg_latency,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::numeric, 0)::integer AS p95_latency
    FROM api_logs;
  `);

  console.log('\n📊 Database Log Summary:');
  console.table(summaryRes.rows);

  await pool.end();
}

if (require.main === module) {
  seedLarge().catch((err) => {
    console.error('Seed large failed:', err);
    process.exit(1);
  });
}

module.exports = seedLarge;
