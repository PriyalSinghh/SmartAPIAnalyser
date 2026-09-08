import React from 'react';
import { Filter, X, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import useLogs from '../hooks/useLogs';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import ErrorState from '../components/ErrorState';

const ENDPOINTS = [
  '/api/users',
  '/api/products',
  '/api/orders',
  '/api/payment',
  '/api/cart',
  '/api/search',
];

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

const STATUS_CODES = [
  { label: 'All Statuses', value: '' },
  { label: '200 OK', value: '200' },
  { label: '201 Created', value: '201' },
  { label: '204 No Content', value: '204' },
  { label: '400 Bad Request', value: '400' },
  { label: '401 Unauthorized', value: '401' },
  { label: '403 Forbidden', value: '403' },
  { label: '404 Not Found', value: '404' },
  { label: '429 Rate Limit', value: '429' },
  { label: '500 Server Error', value: '500' },
  { label: '502 Bad Gateway', value: '502' },
  { label: '503 Service Unavailable', value: '503' },
];

const SERVICES = [
  'user-service',
  'product-service',
  'order-service',
  'payment-service',
  'cart-service',
  'search-service',
];

export default function LogsPage() {
  const {
    logs,
    pagination,
    filters,
    loading,
    error,
    updateFilter,
    resetFilters,
    changePage,
    changeLimit,
    refetch,
  } = useLogs({}, 1, 50);

  const hasActiveFilters = Object.keys(filters).length > 0;

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      cellClassName: 'whitespace-nowrap font-mono text-slate-400',
      render: (row) => new Date(row.timestamp).toLocaleString(),
    },
    {
      header: 'Method',
      accessor: 'method',
      cellClassName: 'font-mono font-bold text-slate-200',
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
            row.method === 'GET'
              ? 'text-sky-400 bg-sky-500/10'
              : row.method === 'POST'
              ? 'text-emerald-400 bg-emerald-500/10'
              : row.method === 'PUT'
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-rose-400 bg-rose-500/10'
          }`}
        >
          {row.method}
        </span>
      ),
    },
    {
      header: 'Endpoint',
      accessor: 'endpoint',
      cellClassName: 'font-mono text-indigo-300 font-medium whitespace-nowrap',
    },
    {
      header: 'Status',
      accessor: 'statusCode',
      render: (row) => <StatusBadge statusCode={row.statusCode} />,
    },
    {
      header: 'Latency',
      accessor: 'responseTime',
      cellClassName: 'font-mono whitespace-nowrap',
      render: (row) => (
        <span
          className={
            row.responseTime > 1000
              ? 'text-rose-400 font-semibold'
              : row.responseTime > 500
              ? 'text-amber-300'
              : 'text-slate-300'
          }
        >
          {row.responseTime} ms
        </span>
      ),
    },
    {
      header: 'Service',
      accessor: 'service',
      cellClassName: 'text-slate-400 whitespace-nowrap font-mono text-xs',
    },
    {
      header: 'Classification',
      accessor: 'failureCategory',
      render: (row) =>
        row.statusCode >= 400 ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 whitespace-nowrap">
            {row.failureCategory || 'Failure'}
          </span>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        ),
    },
    {
      header: 'Error Message',
      accessor: 'errorMessage',
      cellClassName: 'max-w-xs text-xs truncate',
      render: (row) =>
        row.errorMessage ? (
          <span className="text-rose-300 truncate block" title={row.errorMessage}>
            {row.errorMessage}
          </span>
        ) : (
          <span className="text-slate-600 font-mono text-xs">—</span>
        ),
    },
    {
      header: 'Request ID',
      accessor: 'requestId',
      cellClassName: 'font-mono text-slate-500 text-xs',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">API Logs Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Query and filter raw HTTP ingestion records with latency and failure tagging
          </p>
        </div>

        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span>Filters</span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-normal capitalize"
            >
              <X className="w-3.5 h-3.5" />
              Clear all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Endpoint Filter */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Endpoint</label>
            <select
              value={filters.endpoint || ''}
              onChange={(e) => updateFilter('endpoint', e.target.value)}
              className="w-full rounded-lg bg-[#0F172A] border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">All Endpoints</option>
              {ENDPOINTS.map((ep) => (
                <option key={ep} value={ep}>
                  {ep}
                </option>
              ))}
            </select>
          </div>

          {/* Status Code Filter */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Status Code</label>
            <select
              value={filters.statusCode || ''}
              onChange={(e) => updateFilter('statusCode', e.target.value)}
              className="w-full rounded-lg bg-[#0F172A] border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {STATUS_CODES.map((sc) => (
                <option key={sc.value} value={sc.value}>
                  {sc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Method</label>
            <select
              value={filters.method || ''}
              onChange={(e) => updateFilter('method', e.target.value)}
              className="w-full rounded-lg bg-[#0F172A] border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">All Methods</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Service</label>
            <select
              value={filters.service || ''}
              onChange={(e) => updateFilter('service', e.target.value)}
              className="w-full rounded-lg bg-[#0F172A] border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">All Services</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <ErrorState error={error} onRetry={refetch} title="Failed to Fetch API Logs" />
      )}

      {/* Logs Data Table */}
      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        pagination={pagination}
        onPageChange={changePage}
        onLimitChange={changeLimit}
        emptyMessage={
          hasActiveFilters
            ? 'No logs matched the selected filters. Try broadening your filter parameters.'
            : 'No logs have been ingested into PostgreSQL yet. Run "npm run seed" in the backend to populate data.'
        }
      />
    </div>
  );
}

