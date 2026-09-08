# SmartAPI Backend – Phase 1

Express.js and PostgreSQL backend for **SmartAPI – API Failure Analyzer**.

## Prerequisites
- Node.js >= 18
- PostgreSQL >= 14

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and verify your credentials:
   ```bash
   cp .env.example .env
   ```

3. **Database Initialization**:
   Ensure your PostgreSQL server is running and the database `smart_api_analyzer` is created:
   ```bash
   createdb smart_api_analyzer
   npm run db:init
   ```

4. **Seed Sample Data (1500+ Realistic Logs)**:
   ```bash
   npm run seed
   ```

5. **Start the Server**:
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Or production mode
   npm start
   ```

The backend will start at `http://localhost:5001`.

## Endpoints

- `GET /health`: Health and PostgreSQL connectivity check
- `POST /api/logs`: Ingest a new API log
- `GET /api/logs`: Paginated and filterable logs
- `GET /api/analytics/summary`: Aggregate statistics (total, success, failed, error rate, avg response time)
- `GET /api/analytics/endpoints`: Per-endpoint breakdown
- `GET /api/analytics/errors`: HTTP error counts by status code
- `GET /api/analytics/latency`: Latency per endpoint
- `GET /api/analytics/recent-failures`: Most recent failed requests with failure classification

