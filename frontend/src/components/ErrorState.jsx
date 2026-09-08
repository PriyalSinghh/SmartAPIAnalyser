import React from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';

export default function ErrorState({ error, onRetry, title = 'Data Load Failure' }) {
  const isDbError =
    error?.message?.toLowerCase().includes('database') ||
    error?.message?.toLowerCase().includes('postgresql') ||
    error?.status === 503;

  return (
    <div className="w-full rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 shadow-xl">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {isDbError ? <Database className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-rose-300">{title}</h3>
          <p className="mt-1 text-sm text-slate-300 font-mono bg-black/40 px-3 py-2 rounded border border-rose-900/40">
            {error?.message || 'Failed to communicate with the SmartAPI backend service.'}
          </p>

          {isDbError && (
            <div className="mt-4 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-amber-400">Troubleshooting Steps:</p>
              <p>1. Check if PostgreSQL service is running (<code className="text-indigo-300">brew services start postgresql@16</code>)</p>
              <p>2. Verify database exists: <code className="text-indigo-300">createdb smart_api_analyzer</code></p>
              <p>3. Initialize schema and sample logs: <code className="text-indigo-300">npm run db:init && npm run seed</code> (in backend)</p>
              <p>4. Check database credentials in <code className="text-indigo-300">backend/.env</code></p>
            </div>
          )}

          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

