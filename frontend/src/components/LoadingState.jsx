import React from 'react';

export default function LoadingState({ message = 'Loading metrics...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] w-full p-8 rounded-xl border border-slate-800 bg-[#111827]">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <div className="absolute w-6 h-6 rounded-full border-2 border-cyan-400/30 border-b-cyan-400 animate-spin" style={{ animationDirection: 'reverse' }} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-400 animate-pulse">{message}</p>
    </div>
  );
}

