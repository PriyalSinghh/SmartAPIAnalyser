# SmartAPI Frontend – Phase 1

React + Vite + Recharts + Tailwind CSS frontend for **SmartAPI – API Failure Analyzer**.

## Features
- **Observability Dashboard**: High-level KPI summary cards, API health matrix with real-time status pills, Most Failing APIs chart, HTTP Error Code Distribution chart, and Latency Benchmark chart.
- **API Logs Explorer (`/logs`)**: Filterable, paginated raw HTTP log table with status code categorization, latency metrics, and failure classification tags.
- **Endpoint Inspection (`/api/:endpoint`)**: Deep dive metrics, status code distribution, common error messages, and recent failures.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Vite development server**:
   ```bash
   npm run dev
   ```
   The frontend runs by default on `http://localhost:5173` and proxies `/api` and `/health` requests to `http://localhost:5001`.

3. **Production Build**:
   ```bash
   npm run build
   ```

