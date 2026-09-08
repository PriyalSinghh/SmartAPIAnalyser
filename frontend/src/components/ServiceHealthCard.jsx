import React from 'react';
import { Server, CheckCircle2, AlertOctagon } from 'lucide-react';

export default function ServiceHealthCard({ services = [], loading = false }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Microservice Health & Reliability
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Service-level aggregation across backend microservice tiers
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
          Loading service health metrics...
        </div>
      ) : services.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          No service records found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((svc) => {
            const isCritical = svc.healthScore < 50 || svc.errorRate >= 10;
            const isWarning = svc.healthScore < 80 || svc.errorRate >= 5;

            return (
              <div
                key={svc.service}
                className="p-3.5 rounded-xl border border-slate-800 bg-[#0F172A] flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-mono text-xs font-bold text-slate-200">
                      {svc.service}
                    </h4>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-sans font-semibold border ${
                        isCritical
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : isWarning
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {svc.healthStatus || 'HEALTHY'} ({svc.healthScore}/100)
                    </span>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-slate-400 block">Traffic</span>
                    <span className="text-slate-200 font-bold">{svc.totalRequests?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Error Rate</span>
                    <span className={svc.errorRate >= 10 ? 'text-rose-400 font-bold' : svc.errorRate >= 5 ? 'text-amber-400' : 'text-emerald-400'}>
                      {svc.errorRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Avg Latency</span>
                    <span className="text-cyan-300">{svc.avgLatency}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">P95 Latency</span>
                    <span className="text-slate-300">{svc.p95Latency || svc.avgLatency}ms</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
