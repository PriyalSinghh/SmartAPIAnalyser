import React from 'react';

/**
 * Health Badge component
 * Rules:
 * - Healthy: error rate < 5%
 * - Warning: error rate >= 5% and < 10%
 * - Critical: error rate >= 10%
 */
export function getHealthStatus(errorRate) {
  const rate = parseFloat(errorRate);
  if (isNaN(rate) || rate < 5) return 'Healthy';
  if (rate < 10) return 'Warning';
  return 'Critical';
}

export default function HealthBadge({ errorRate, status: explicitStatus, className = '' }) {
  const status = explicitStatus || getHealthStatus(errorRate);

  const configs = {
    Healthy: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    },
    Warning: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-400',
      glow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]',
    },
    Critical: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      dot: 'bg-rose-400',
      glow: 'shadow-[0_0_8px_rgba(244,63,94,0.4)]',
    },
  };

  const config = configs[status] || configs.Healthy;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.glow}`} />
      {status}
    </span>
  );
}

