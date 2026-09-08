import React from 'react';

export default function ChartCard({
  title,
  subtitle,
  children,
  action,
  className = '',
}) {
  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-[#111827] p-5 shadow-lg shadow-black/20 flex flex-col justify-between ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/60">
        <div>
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            {title}
          </h4>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="w-full flex-1 min-h-[260px]">{children}</div>
    </div>
  );
}

