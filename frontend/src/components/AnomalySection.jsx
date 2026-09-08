import React from 'react';
import { AlertTriangle, TrendingUp, Clock, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AnomalySection({ anomalies = [], loading = false }) {
  const navigate = useNavigate();

  const getSeverityStyle = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          border: 'border-rose-500/40 bg-rose-950/20',
          icon: 'text-rose-400',
        };
      case 'HIGH':
        return {
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          border: 'border-orange-500/40 bg-orange-950/20',
          icon: 'text-orange-400',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          border: 'border-amber-500/40 bg-amber-950/20',
          icon: 'text-amber-400',
        };
      default:
        return {
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          border: 'border-sky-500/40 bg-sky-950/20',
          icon: 'text-sky-400',
        };
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Detected API Anomalies & Spikes
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical deviation comparing current window vs. historical baseline
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {anomalies.length} Active {anomalies.length === 1 ? 'Anomaly' : 'Anomalies'}
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
          Evaluating endpoint statistical thresholds...
        </div>
      ) : anomalies.length === 0 ? (
        <div className="py-6 flex items-center justify-center gap-3 text-emerald-400 text-xs bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>All APIs are currently operating within nominal baseline error and latency boundaries.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {anomalies.map((anomaly, idx) => {
            const style = getSeverityStyle(anomaly.severity);
            const isFailureSpike = anomaly.type === 'FAILURE_SPIKE';

            return (
              <div
                key={idx}
                onClick={() => navigate(`/api${anomaly.endpoint}`)}
                className={`p-4 rounded-xl border ${style.border} transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-200">
                      <AlertTriangle className={`w-4 h-4 ${style.icon}`} />
                      {isFailureSpike ? 'Failure Spike' : 'Latency Anomaly'}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${style.badge}`}
                    >
                      {anomaly.severity}
                    </span>
                  </div>

                  <h4 className="font-mono text-sm font-bold text-indigo-300">
                    {anomaly.endpoint}
                  </h4>

                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {anomaly.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>
                    Baseline:{' '}
                    <strong className="text-slate-200">
                      {isFailureSpike ? `${anomaly.baselineErrorRate}%` : `${anomaly.baselineLatency}ms`}
                    </strong>
                  </span>
                  <span>
                    Current:{' '}
                    <strong className={isFailureSpike ? 'text-rose-400' : 'text-amber-400'}>
                      {isFailureSpike ? `${anomaly.currentErrorRate}%` : `${anomaly.currentLatency}ms`}
                    </strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
