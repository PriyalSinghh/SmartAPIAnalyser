import React from 'react';

export default function StatusBadge({ statusCode, className = '' }) {
  const code = parseInt(statusCode, 10);

  let style = 'bg-slate-800 text-slate-300 border-slate-700';

  if (code >= 200 && code < 300) {
    style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  } else if (code >= 300 && code < 400) {
    style = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  } else if (code >= 400 && code < 500) {
    style = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (code >= 500 && code < 600) {
    style = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold border ${style} ${className}`}
    >
      {code || '---'}
    </span>
  );
}

