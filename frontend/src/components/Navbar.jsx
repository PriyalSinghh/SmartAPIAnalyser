import React from 'react';
import { RefreshCw, Database, Server, Zap } from 'lucide-react';
import TimeRangeSelector from './TimeRangeSelector';

export default function Navbar({
  health,
  onRefresh,
  loading = false,
  title = 'API Failure Analyzer',
  timeRange,
  onRangeChange,
}) {
  const isDbConnected = health?.database?.status === 'connected';
  const isRedisConnected = health?.redis?.status === 'connected';

  return (
    <header className="border-b border-slate-800/80 bg-[#0E1524]/70 backdrop-blur sticky top-0 z-20 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Time Range Selector */}
        {onRangeChange && (
          <TimeRangeSelector selectedRange={timeRange} onRangeChange={onRangeChange} />
        )}

        {/* PostgreSQL Connection Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono">
          <Database className={`w-3 h-3 ${isDbConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="text-slate-400">Postgres:</span>
          <span className={isDbConnected ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
            {isDbConnected ? 'Live' : 'Off'}
          </span>
        </div>

        {/* Redis Cache Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono">
          <Zap className={`w-3 h-3 ${isRedisConnected ? 'text-amber-400' : 'text-slate-500'}`} />
          <span className="text-slate-400">Redis:</span>
          <span className={isRedisConnected ? 'text-amber-400 font-medium' : 'text-slate-400 font-medium'}>
            {isRedisConnected ? 'Cached' : 'Bypass'}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition disabled:opacity-50"
          title="Refresh metrics from backend"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
