import React from 'react';
import { Calendar } from 'lucide-react';

const PRESETS = [
  { label: '1 Hour', value: '1h', hours: 1 },
  { label: '6 Hours', value: '6h', hours: 6 },
  { label: '24 Hours', value: '24h', hours: 24 },
  { label: '7 Days', value: '7d', hours: 168 },
  { label: '30 Days', value: '30d', hours: 720 },
  { label: 'All Time', value: 'all', hours: null },
];

export default function TimeRangeSelector({ selectedRange, onRangeChange }) {
  const handleSelect = (preset) => {
    if (preset.value === 'all') {
      onRangeChange({ from: null, to: null, label: preset.label, value: preset.value });
      return;
    }

    const to = new Date();
    const from = new Date(to.getTime() - preset.hours * 60 * 60 * 1000);

    onRangeChange({
      from: from.toISOString(),
      to: to.toISOString(),
      label: preset.label,
      value: preset.value,
    });
  };

  return (
    <div className="flex items-center gap-1.5 bg-[#0F172A] p-1 rounded-lg border border-slate-800 text-xs">
      <div className="flex items-center gap-1.5 px-2 text-slate-400">
        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
        <span className="hidden sm:inline font-mono">Range:</span>
      </div>
      <div className="flex items-center gap-1">
        {PRESETS.map((preset) => {
          const isSelected = (selectedRange?.value || 'all') === preset.value;
          return (
            <button
              key={preset.value}
              onClick={() => handleSelect(preset)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
