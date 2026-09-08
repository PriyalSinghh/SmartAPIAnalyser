import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Activity,
  Layers,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function Sidebar({ endpoints = [] }) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Logs Explorer', path: '/logs', icon: FileText },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0E1524] border-r border-slate-800/80 flex flex-col justify-between min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
              SmartAPI
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Phase 1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">Failure Analyzer</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="px-3 py-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 font-mono">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Monitored Endpoints Quick Nav */}
        {endpoints.length > 0 && (
          <div className="px-3 py-2">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Endpoints ({endpoints.length})
              </p>
            </div>
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1">
              {endpoints.map((ep) => (
                <NavLink
                  key={ep.endpoint}
                  to={`/api${ep.endpoint}`}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-indigo-300 font-semibold border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <span className="truncate">{ep.endpoint}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      ep.errorRate >= 10
                        ? 'text-rose-400 bg-rose-500/10'
                        : ep.errorRate >= 5
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-emerald-400 bg-emerald-500/10'
                    }`}
                  >
                    {ep.errorRate}%
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0B101B]">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>PostgreSQL Observability</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">
          Rule-based classification engine
        </p>
      </div>
    </aside>
  );
}

