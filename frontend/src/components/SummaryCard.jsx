import React from 'react';

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'indigo',
}) {
  const colorMap = {
    indigo: {
      bg: 'from-indigo-500/10 to-transparent',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
    },
    rose: {
      bg: 'from-rose-500/10 to-transparent',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      iconBg: 'bg-rose-500/10 text-rose-400',
    },
    amber: {
      bg: 'from-amber-500/10 to-transparent',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      iconBg: 'bg-amber-500/10 text-amber-400',
    },
    cyan: {
      bg: 'from-cyan-500/10 to-transparent',
      border: 'border-cyan-500/20',
      text: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${scheme.border} bg-gradient-to-b ${scheme.bg} bg-[#111827] p-5 shadow-lg shadow-black/20 transition-all hover:border-slate-700`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            {value !== undefined && value !== null ? value : '—'}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`rounded-lg p-2.5 ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend && <div className="mt-3 pt-3 border-t border-slate-800 text-xs">{trend}</div>}
    </div>
  );
}

