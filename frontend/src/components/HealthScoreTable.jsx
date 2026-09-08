import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, ChevronRight, ExternalLink } from 'lucide-react';

export default function HealthScoreTable({ healthScores = [], loading = false }) {
  const navigate = useNavigate();

  const getStatusColor = (status, score) => {
    if (score >= 95) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 80) return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (score >= 40) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const getProgressBarColor = (score) => {
    if (score >= 95) return 'bg-emerald-500';
    if (score >= 80) return 'bg-teal-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-emerald-400" />
            API Health Scores
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic 0–100 health composite (Error rate 50%, Latency 30%, Anomaly spikes 20%)
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#151D2F] text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">API Endpoint</th>
              <th className="px-4 py-3">Health Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Error Rate</th>
              <th className="px-4 py-3">Avg Latency</th>
              <th className="px-4 py-3">P95 Latency</th>
              <th className="px-4 py-3 text-right">Drilldown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 animate-pulse">
                  Calculating real-time API health scores...
                </td>
              </tr>
            ) : healthScores.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No health scores available.
                </td>
              </tr>
            ) : (
              healthScores.map((item) => (
                <tr
                  key={item.endpoint}
                  onClick={() => navigate(`/api${item.endpoint}`)}
                  className="hover:bg-[#1E293B]/70 cursor-pointer transition"
                >
                  <td className="px-4 py-3 font-semibold text-indigo-300">
                    {item.endpoint}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 w-8">{item.score}</span>
                      <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressBarColor(item.score)}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-medium border ${getStatusColor(
                        item.status,
                        item.score
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        item.factors?.errorRate >= 10
                          ? 'text-rose-400 font-bold'
                          : item.factors?.errorRate >= 5
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {item.factors?.errorRate || 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cyan-300">
                    {item.factors?.avgLatency || 0} ms
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    {item.factors?.p95Latency || 0} ms
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                      View <ExternalLink className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
