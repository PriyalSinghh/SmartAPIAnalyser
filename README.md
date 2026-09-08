# SmartAPI – API Failure Analyzer (Phase 1)

> **Phase 1: Basic API Failure Analyzer**  
> A full-stack developer observability platform for ingesting, classifying, and diagnosing API failures, error distributions, and latency bottlenecks using Node.js, Express, PostgreSQL, React, Vite, and Recharts.

---

## 1. Project Overview

**SmartAPI** is an observability tool tailored for backend engineers, Site Reliability Engineers (SREs), and DevOps teams. In distributed microservice environments, APIs silently degrade, throw transient 5xx errors, or spike in latency before causing full outages. 

**Phase 1** establishes the core foundational pipeline:
- High-throughput API log ingestion with parameterized validation into PostgreSQL.
- SQL-powered analytics engines calculating error rates, percentile status codes, and latency distributions.
- Modular, rule-based failure classification engine tagging failures with human-readable categories (`Server Error`, `Bad Request`, `Rate Limit`, `Authentication Error`, etc.).
- A developer-oriented observability dashboard with interactive Recharts data visualizations, endpoint drill-downs, and a paginated log explorer.

---

## 2. Business Problem & Use Case

In production systems, microservices frequently fail due to:
- **Upstream timeouts and database locks** (HTTP 500/502/503)
- **Authentication token expirations or permission misconfigurations** (HTTP 401/403)
- **Client rate-limiting exhaustion** (HTTP 429)
- **Malformed payloads and schema regressions** (HTTP 400)

Without centralized failure tracking:
1. Engineers only detect broken endpoints when users complain.
2. Latency regressions remain invisible until downstream services cascade.
3. Finding recurring error patterns requires sifting through gigabytes of raw server console logs.

**SmartAPI solves this** by computing real-time endpoint health states (`Healthy < 5%`, `Warning 5–10%`, `Critical ≥ 10%`), visualizing error breakdowns, and isolating common error signatures.

---

## 3. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   React Frontend                       │
│  (Vite + React Router + Recharts + Lucide Icons)       │
│                                                        │
│  Pages:                                                │
│  - / (Dashboard: Summary, Health, Charts)              │
│  - /logs (Paginated Filterable Logs Explorer)          │
│  - /api/:endpoint (Endpoint-specific Deep Dive)        │
└───────────────────────────▲────────────────────────────┘
                            │ Axios HTTP Requests
                            │ (via frontend/src/services/api.js)
┌───────────────────────────▼────────────────────────────┐
│                  Express.js Backend                    │
│                                                        │
│  Routes & Controllers:                                 │
│  - /health (Health & DB connectivity check)            │
│  - /api/logs (POST ingestion, GET with pagination)     │
│  - /api/analytics/summary (Aggregate metrics)          │
│  - /api/analytics/endpoints (Per-endpoint breakdown)   │
│  - /api/analytics/errors (HTTP error code counts)      │
│  - /api/analytics/latency (Latency per endpoint)       │
│  - /api/analytics/recent-failures (Recent errors)      │
│  - /api/analytics/endpoint-details (Deep dive bundle)  │
│                                                        │
│  Services:                                             │
│  - failureClassifier.js (Modular rule-based tagger)    │
│  - logService.js (DB queries with parameterized SQL)   │
│  - analyticsService.js (Aggregation queries)           │
└───────────────────────────▲────────────────────────────┘
                            │ Parameterized SQL queries
                            │ (pg.Pool)
┌───────────────────────────▼────────────────────────────┐
│                 PostgreSQL Database                    │
│                (smart_api_analyzer)                    │
│                                                        │
│  Table: api_logs                                       │
│  - id, timestamp, method, endpoint, status_code,       │
│    response_time, service, error_message, request_id   │
│  Indexes:                                              │
│  - timestamp, endpoint, status_code                    │
└────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios (modular client with interceptors)
- **Charts**: Recharts (Responsive bar charts, error distributions, benchmarks)
- **Styling**: Tailwind CSS (Observability dark-mode theme)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (ES6+ / CommonJS)
- **Framework**: Express.js
- **Database Driver**: `pg` (node-postgres connection pool)
- **Environment**: `dotenv`
- **CORS & Logging**: `cors`, `morgan`

### Database
- **Database**: PostgreSQL
- **Schema**: `api_logs` with B-Tree indexes on `timestamp`, `endpoint`, `status_code`, and `service`.

---

## 5. Folder Structure

```
smart-api-analyzer/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── analyticsController.js   # Analytics query handlers
│   │   │   ├── healthController.js      # /health endpoint handler
│   │   │   └── logController.js         # Log ingestion and search handlers
│   │   ├── routes/
│   │   │   ├── analyticsRoutes.js       # Route definitions for /api/analytics
│   │   │   ├── healthRoutes.js          # Route definitions for /health
│   │   │   └── logRoutes.js             # Route definitions for /api/logs
│   │   ├── services/
│   │   │   ├── analyticsService.js      # SQL aggregation & metrics service
│   │   │   ├── failureClassifier.js     # Modular rule-based classification engine
│   │   │   └── logService.js            # Parameterized log query execution
│   │   ├── db/
│   │   │   ├── init.sql                 # DDL schema definition with indexes
│   │   │   ├── initDb.js                # Schema runner script (npm run db:init)
│   │   │   ├── pool.js                  # pg.Pool connection manager & health check
│   │   │   └── seed.js                  # 1,500+ realistic logs generator (npm run seed)
│   │   ├── middleware/
│   │   │   ├── errorHandler.js          # Centralized error handler & DB error mapping
│   │   │   └── validateLog.js           # Payload validator for POST /api/logs
│   │   └── app.js                       # Express app entrypoint & configuration
│   ├── package.json
│   ├── .env.example
│   ├── .env
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChartCard.jsx            # Recharts container wrapper
│   │   │   ├── DataTable.jsx            # Paginated log table
│   │   │   ├── ErrorState.jsx           # Diagnostic error banner & troubleshooting
│   │   │   ├── HealthBadge.jsx          # Healthy / Warning / Critical status pill
│   │   │   ├── LoadingState.jsx         # Loading spinner
│   │   │   ├── Navbar.jsx               # Header with DB health & refresh trigger
│   │   │   ├── Sidebar.jsx              # Navigation & active endpoint list
│   │   │   ├── StatusBadge.jsx          # HTTP status code badge (2xx/3xx/4xx/5xx)
│   │   │   └── SummaryCard.jsx          # High-level metric KPI card
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx            # Main dashboard overview
│   │   │   ├── LogsPage.jsx             # Filterable /logs explorer
│   │   │   └── ApiDetailPage.jsx        # Endpoint inspection /api/:endpoint
│   │   ├── services/
│   │   │   └── api.js                   # Axios client & REST service functions
│   │   ├── hooks/
│   │   │   ├── useAnalytics.js          # Dashboard state hook
│   │   │   └── useLogs.js               # Paginated logs query hook
│   │   ├── App.jsx                      # Router & layout container
│   │   ├── main.jsx                     # Vite React entry point
│   │   └── index.css                    # Tailwind CSS directives
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── README.md
│
└── README.md
```

---

## 6. Database Setup

### Step 1: Install and Start PostgreSQL
If not already installed on macOS:
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Step 2: Create the Database
```bash
createdb smart_api_analyzer
```

### Step 3: Run Database Schema Initialization
Navigate to `backend` and run:
```bash
cd backend
npm run db:init
```

This executes `src/db/init.sql`:
```sql
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
```

---

## 7. Environment Variables

Create `backend/.env` (or copy from `backend/.env.example`):

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_api_analyzer
DB_USER=postgres
DB_PASSWORD=postgres

# Alternatively configure via connection URL:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_api_analyzer
```

---

## 8. How to Seed Sample Data

Run the realistic log seeder in `backend`:
```bash
cd backend
npm run seed
```

This populates 1,500+ realistic API logs across 6 services:
- `/api/users` (`user-service`) — Low error rate (~1.5%)
- `/api/products` (`product-service`) — Low error rate (~3%)
- `/api/orders` (`order-service`) — High error rate (~13–18% Critical)
- `/api/payment` (`payment-service`) — High error rate (~16–20% Critical)
- `/api/cart` (`cart-service`) — Moderate error rate (~5–7% Warning)
- `/api/search` (`search-service`) — Low error rate (~2%)

Includes realistic error codes (`400`, `401`, `403`, `404`, `429`, `500`, `502`, `503`) and actual error messages (e.g. *"Database connection timeout after 5000ms"*, *"Circuit breaker OPEN for external settlement provider"*).

---

## 9. How to Run the Application

### 1. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
Backend runs at: `http://localhost:5001`

### 2. Start Frontend Application
In a separate terminal tab:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 10. API Documentation

### System Health
```http
GET /health
```
**Response (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2026-09-03T12:29:07.483Z",
  "uptime": 18.5,
  "database": {
    "status": "connected"
  }
}
```

---

### Ingest Log
```http
POST /api/logs
Content-Type: application/json
```
**Request Body**:
```json
{
  "timestamp": "2026-09-03T10:31:25Z",
  "method": "POST",
  "endpoint": "/api/orders",
  "statusCode": 500,
  "responseTime": 890,
  "service": "order-service",
  "errorMessage": "Database connection timeout",
  "requestId": "abc123"
}
```
**Response (201 Created)**:
```json
{
  "message": "API log recorded successfully",
  "data": {
    "id": "1501",
    "timestamp": "2026-09-03T10:31:25.000Z",
    "method": "POST",
    "endpoint": "/api/orders",
    "status_code": 500,
    "response_time": 890,
    "service": "order-service",
    "error_message": "Database connection timeout",
    "request_id": "abc123",
    "failureCategory": "Server Error",
    "severity": "critical",
    "failureDescription": "Internal server failure, unhandled exception, or upstream gateway timeout"
  }
}
```

---

### Query Logs (Paginated & Filterable)
```http
GET /api/logs?endpoint=/api/orders&statusCode=500&page=1&limit=50
```
**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "1501",
      "timestamp": "2026-09-03T10:31:25.000Z",
      "method": "POST",
      "endpoint": "/api/orders",
      "statusCode": 500,
      "responseTime": 890,
      "service": "order-service",
      "errorMessage": "Database connection timeout",
      "requestId": "abc123",
      "failureCategory": "Server Error",
      "severity": "critical"
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

### Overall Summary Analytics
```http
GET /api/analytics/summary
```
**Response (200 OK)**:
```json
{
  "totalRequests": 1501,
  "successfulRequests": 1398,
  "failedRequests": 103,
  "errorRate": 6.86,
  "averageResponseTime": 310
}
```

---

### Endpoint Breakdown Analytics
```http
GET /api/analytics/endpoints
```
**Response (200 OK)**:
```json
[
  {
    "endpoint": "/api/payment",
    "totalRequests": 252,
    "failedRequests": 41,
    "errorRate": 16.27,
    "averageResponseTime": 777
  },
  {
    "endpoint": "/api/orders",
    "totalRequests": 241,
    "failedRequests": 32,
    "errorRate": 13.28,
    "averageResponseTime": 418
  }
]
```

---

### Error Distribution by Status Code
```http
GET /api/analytics/errors
```
**Response (200 OK)**:
```json
{
  "400": 19,
  "401": 3,
  "403": 5,
  "404": 5,
  "429": 4,
  "500": 35,
  "502": 20,
  "503": 12
}
```

---

### Latency Analytics
```http
GET /api/analytics/latency
```
**Response (200 OK)**:
```json
[
  { "endpoint": "/api/payment", "averageResponseTime": 777 },
  { "endpoint": "/api/orders", "averageResponseTime": 418 },
  { "endpoint": "/api/search", "averageResponseTime": 226 }
]
```

---

### Recent Failures Stream
```http
GET /api/analytics/recent-failures?limit=10
```

---

## 11. Failure Classification Engine

Rule-based categorization lives inside `backend/src/services/failureClassifier.js`:

| Status Code Range | Category | Severity | Description |
|---|---|---|---|
| `500–599` | **Server Error** | Critical | Internal server failure, unhandled exception, or upstream timeout |
| `400` | **Bad Request** | Medium | Malformed request syntax, invalid parameters, or payload validation failure |
| `401` | **Authentication Error** | High | Missing, expired, or invalid authentication credentials |
| `403` | **Authorization Error** | High | Client does not have permission to access requested resource |
| `404` | **Resource Not Found** | Low | Requested endpoint or entity does not exist |
| `429` | **Rate Limit** | Critical | Too many requests sent within rate limit window |
| `200–399` | **Success** | None | Request completed successfully |

---

## 12. Screenshots Section Placeholder

> *Screenshots will be captured when running in visual mode:*

1. **Dashboard Overview**: Summary KPI cards, API Health table, Most Failing APIs bar chart, and HTTP error distribution.
2. **Logs Explorer**: Paginated HTTP log table with filters for endpoint, status code, method, and service.
3. **Endpoint Inspection**: Status code distribution chart, common error signatures, and recent failure logs for `/api/orders`.

---

## 13. Future Roadmap (Phase 2+)

The following features were intentionally excluded from Phase 1 to preserve clean, modular fundamentals:
- **AI / LLM Root-Cause Analysis**: Auto-summarizing stack traces and suggesting code fixes with Gemini.
- **Anomaly & Spike Detection**: Statistical z-score / IQR algorithms alerting on sudden error rate spikes.
- **Redis Caching**: Sub-millisecond caching for high-frequency summary metrics.
- **Alerting & Webhooks**: Slack, PagerDuty, and email notifications on Critical threshold breaches.
- **Distributed Tracing**: OpenTelemetry / Jaeger correlation with parent trace IDs.
- **Authentication & RBAC**: JWT / OAuth2 developer logins and role-based views.
- **Docker & Kubernetes**: Multi-container Docker Compose definitions.

