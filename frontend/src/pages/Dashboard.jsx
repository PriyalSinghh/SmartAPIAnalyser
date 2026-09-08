import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  AlertOctagon,
  Percent,
  Clock,
  ExternalLink,
  Flame,
  Timer,
  AlertTriangle,
  Zap,
  TrendingUp,
  Server,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

import SummaryCard from '../components/SummaryCard';
import HealthBadge from '../components/HealthBadge';
import StatusBadge from '../components/StatusBadge';
import ChartCard from '../components/ChartCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import AnomalySection from '../components/AnomalySection';
import HealthScoreTable from '../components/HealthScoreTable';
import ServiceHealthCard from '../components/ServiceHealthCard';

const STATUS_COLORS = {
  '400': '#F59E0B',
  '401': '#F97316',
  '403': '#EA580C',
  '404': '#94A3B8',
  '429': '#EC4899',
  '500': '#EF4444',
  '502': '#DC2626',
  '503': '#B91C1C',
};

export default function Dashboard({ analytics, onRefresh }) {
  const navigate = useNavigate();
  const {
    loading,
    error,
    timeRange,
    summary,
    endpoints,
    errorDistribution,
    latency,
    timeseries,
    anomalies,
    healthScores,
    services,
    topSlow,
    recentFailures,
  } = analytics;

  if (loading && !summary) {
    return <LoadingState message="Loading production API observability metrics..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRefresh} title="Failed to Load Dashboard Metrics" />;
  }

  // Format error distribution for Recharts
  const errorChartData = Object.entries(errorDistribution || {}).map(([code, count]) => ({
    code: `HTTP ${code}`,
    rawCode: code,
    count: Number(count),
  }));

  // Format timeseries timestamps for clean X-axis display
  const formattedTimeseries = (timeseries || []).map((point) => {
    const d = new Date(point.timestamp);
    return {
      ...point,
      displayTime:
        timeRange.value === '1h' || timeRange.value === '6h'
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`,
    };
  });

  // Most failing APIs
  const mostFailingData = [...endpoints]
    .sort((a, b) => b.failedRequests - a.failedRequests)
    .slice(0, 6);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Summary KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          title="Total Requests"
          value={summary?.totalRequests?.toLocaleString()}
          subtitle={timeRange.label}
          icon={Activity}
          color="indigo"
        />
        <SummaryCard
          title="Successful"
          value={summary?.successfulRequests?.toLocaleString()}
          subtitle="HTTP 200–399"
          icon={CheckCircle2}
          color="emerald"
        />
        <SummaryCard
          title="Failed Requests"
          value={summary?.failedRequests?.toLocaleString()}
          subtitle="HTTP 400–599"
          icon={AlertOctagon}
          color="rose"
        />
        <SummaryCard
          title="System Error Rate"
          value={`${summary?.errorRate || 0}%`}
          subtitle={
            summary?.errorRate >= 10
              ? 'Critical failure threshold'
              : summary?.errorRate >= 5
              ? 'Elevated warning'
              : 'Nominal operating zone'
          }
          icon={Percent}
          color={summary?.errorRate >= 10 ? 'rose' : summary?.errorRate >= 5 ? 'amber' : 'emerald'}
        />
        <SummaryCard
          title="Latency (Avg / P95)"
          value={`${summary?.averageResponseTime || 0} / ${summary?.p95ResponseTime || summary?.averageResponseTime || 0}ms`}
          subtitle="Avg ms / P95 percentile"
          icon={Clock}
          color="cyan"
        />
      </section>

      {/* 2. Phase 2 Anomaly Detection Section */}
      <section>
        <AnomalySection anomalies={anomalies} loading={loading} />
      </section>

      {/* 3. Phase 2 Time-Series Analytics: Traffic & Error Rate Over Time */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic & Errors Trend */}
        <ChartCard
          title="Traffic & Failure Trend Over Time"
          subtitle={`Total requests and failures (${timeRange.label})`}
          action={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-indigo-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Requests
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Failures
              </span>
            </div>
          }
        >
          {formattedTimeseries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No time-series data in selected range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={formattedTimeseries} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <defs>
                  <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="failColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="displayTime" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val, name) => [
                    `${val} ${name === 'totalRequests' ? 'requests' : 'errors'}`,
                    name === 'totalRequests' ? 'Total Traffic' : 'Failures',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="totalRequests"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#totalColor)"
                />
                <Area
                  type="monotone"
                  dataKey="failedRequests"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#failColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Latency Over Time (Avg & P95) */}
        <ChartCard
          title="Latency Progression (Avg vs P95)"
          subtitle={`Response time in milliseconds (${timeRange.label})`}
          action={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-cyan-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Avg Latency
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> P95 Latency
              </span>
            </div>
          }
        >
          {formattedTimeseries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No latency points in selected range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={formattedTimeseries} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="displayTime" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val, name) => [`${val} ms`, name === 'avgResponseTime' ? 'Avg Latency' : 'P95 Latency']}
                />
                <Line
                  type="monotone"
                  dataKey="avgResponseTime"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p95ResponseTime"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* 4. Phase 2 API Health Scores Table */}
      <section>
        <HealthScoreTable healthScores={healthScores} loading={loading} />
      </section>

      {/* 5. Phase 2 Microservice Breakdown */}
      <section>
        <ServiceHealthCard services={services} loading={loading} />
      </section>

      {/* 6. Charts Row: Most Failing APIs & Error Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Failing APIs */}
        <ChartCard
          title="Most Failing APIs"
          subtitle="Endpoints with highest absolute failure volume"
          action={
            <span className="text-xs font-mono text-slate-400">
              Ranked by failure count
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mostFailingData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis
                dataKey="endpoint"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(val) => [`${val} failures`, 'Failures']}
              />
              <Bar dataKey="failedRequests" radius={[4, 4, 0, 0]}>
                {mostFailingData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.errorRate >= 10 ? '#EF4444' : entry.errorRate >= 5 ? '#F59E0B' : '#6366F1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Error Code Distribution */}
        <ChartCard
          title="Error Distribution by HTTP Status Code"
          subtitle="Breakdown across 4xx and 5xx failure categories"
          action={
            <span className="text-xs font-mono text-slate-400">
              Total {summary?.failedRequests || 0} errors
            </span>
          }
        >
          {errorChartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No errors recorded in this time range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={errorChartData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="code" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(val, name, props) => [`${val} occurrences`, props.payload.code]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {errorChartData.map((entry) => (
                    <Cell
                      key={entry.rawCode}
                      fill={STATUS_COLORS[entry.rawCode] || '#EF4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* 7. Slowest APIs Quick Reference */}
      {topSlow.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-cyan-400" />
              Slowest API Endpoints (Top Latency Bottlenecks)
            </h4>
            <span className="text-xs text-slate-400 font-mono">P95 percentile benchmarks</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topSlow.map((item) => (
              <div
                key={item.endpoint}
                onClick={() => navigate(`/api${item.endpoint}`)}
                className="p-3 rounded-lg bg-[#0F172A] border border-slate-800 hover:border-slate-700 cursor-pointer transition flex flex-col justify-between"
              >
                <span className="font-mono text-xs text-indigo-300 truncate">{item.endpoint}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Avg</span>
                    <span className="text-cyan-300 font-bold font-mono text-sm">{item.avgLatency}ms</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">P95</span>
                    <span className="text-amber-400 font-bold font-mono text-sm">{item.p95Latency}ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. Recent Failures Stream */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] shadow-lg shadow-black/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Recent Failed API Requests
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live error stream classified by rule-based failure engine
            </p>
          </div>
          <button
            onClick={() => navigate('/logs')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            View All Logs &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#151D2F] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Time</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Endpoint</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Classification</th>
                <th className="px-3 py-2.5">Latency</th>
                <th className="px-3 py-2.5">Service</th>
                <th className="px-3 py-2.5">Error Message</th>
                <th className="px-3 py-2.5">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentFailures.slice(0, 8).map((fail) => (
                <tr key={fail.id} className="hover:bg-[#1E293B]/60 transition">
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                    {new Date(fail.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-slate-200">
                    {fail.method}
                  </td>
                  <td className="px-3 py-2.5 text-indigo-300 whitespace-nowrap">
                    {fail.endpoint}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge statusCode={fail.statusCode} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      {fail.failureCategory || 'Server Error'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-amber-300 whitespace-nowrap">
                    {fail.responseTime} ms
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                    {fail.service}
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 max-w-xs truncate" title={fail.errorMessage}>
                    {fail.errorMessage || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                    {fail.requestId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
