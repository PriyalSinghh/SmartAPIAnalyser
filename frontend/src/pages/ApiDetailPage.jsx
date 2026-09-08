import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Percent,
  AlertTriangle,
  ExternalLink,
  Zap,
  Info,
  Timer,
  HeartPulse,
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
} from 'recharts';

import { fetchEndpointDetails, fetchTimeSeries } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import HealthBadge from '../components/HealthBadge';
import StatusBadge from '../components/StatusBadge';
import ChartCard from '../components/ChartCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const STATUS_COLORS = {
  '200': '#10B981',
  '201': '#059669',
  '204': '#047857',
  '400': '#F59E0B',
  '401': '#F97316',
  '403': '#EA580C',
  '404': '#94A3B8',
  '429': '#EC4899',
  '500': '#EF4444',
  '502': '#DC2626',
  '503': '#B91C1C',
};

export default function ApiDetailPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract endpoint path
  const rawSubpath = params['*'] || '';
  const endpoint = rawSubpath.startsWith('/')
    ? `/api${rawSubpath}`
    : rawSubpath
    ? `/api/${rawSubpath}`
    : location.pathname;

  const [data, setData] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailsRes, tsRes] = await Promise.all([
        fetchEndpointDetails(endpoint),
        fetchTimeSeries({ endpoint }),
      ]);
      setData(detailsRes);
      setTimeseries(tsRes || []);
    } catch (err) {
      console.error('Failed to load endpoint details:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [endpoint]);

  if (loading) {
    return <LoadingState message={`Fetching metrics & anomaly diagnosis for ${endpoint}...`} />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
        <ErrorState error={error} onRetry={loadDetails} title={`Failed to Load Details for ${endpoint}`} />
      </div>
    );
  }

  const {
    summary,
    statusCodeDistribution = [],
    commonErrors = [],
    recentFailures = [],
    percentiles = {},
    anomalies = [],
    healthScore = {},
  } = data || {};

  const totalReqs = summary?.totalRequests || 1;
  const successRate = totalReqs > 0 ? parseFloat((((summary?.successfulRequests || 0) / totalReqs) * 100).toFixed(1)) : 100;

  // Format status code distribution with percentages
  const statusChartData = statusCodeDistribution.map((item) => ({
    code: `HTTP ${item.statusCode}`,
    rawCode: item.statusCode.toString(),
    count: Number(item.count),
    percentage: ((Number(item.count) / totalReqs) * 100).toFixed(1),
  }));

  const formattedTimeseries = (timeseries || []).map((point) => {
    const d = new Date(point.timestamp);
    return {
      ...point,
      displayTime: `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`,
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-indigo-300">{endpoint}</h1>
              <HealthBadge errorRate={summary?.errorRate || 0} />
              {healthScore?.score !== undefined && (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Health Score: {healthScore.score}/100 ({healthScore.status})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Production-grade latency percentiles, error signatures, and anomaly tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/logs?endpoint=${encodeURIComponent(endpoint)}`)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Inspect Raw Logs
          </button>
        </div>
      </div>

      {/* Active Anomaly Alerts for this Endpoint */}
      {anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.map((anomaly, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                anomaly.severity === 'CRITICAL'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wide mr-2">
                    [{anomaly.severity} {anomaly.type}]
                  </span>
                  <span>{anomaly.description}</span>
                </div>
              </div>
              <span className="font-mono text-[11px] whitespace-nowrap opacity-80">
                Detected: {new Date(anomaly.detectedAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 1. Summary Metrics with Success Rate & Percentiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <SummaryCard
          title="Total Traffic"
          value={summary?.totalRequests?.toLocaleString()}
          subtitle="All calls"
          icon={Activity}
          color="indigo"
        />
        <SummaryCard
          title="Success Rate"
          value={`${successRate}%`}
          subtitle={`${summary?.successfulRequests || 0} passed`}
          icon={CheckCircle2}
          color="emerald"
        />
        <SummaryCard
          title="Error Rate"
          value={`${summary?.errorRate || 0}%`}
          subtitle={`${summary?.failedRequests || 0} failures`}
          icon={AlertOctagon}
          color={summary?.errorRate >= 10 ? 'rose' : summary?.errorRate >= 5 ? 'amber' : 'emerald'}
        />
        <SummaryCard
          title="Avg Latency"
          value={`${percentiles?.avgLatency || summary?.averageResponseTime || 0} ms`}
          subtitle="Mean response time"
          icon={Clock}
          color="cyan"
        />
        <SummaryCard
          title="P95 Latency"
          value={`${percentiles?.p95 || 0} ms`}
          subtitle="95% within this time"
          icon={Timer}
          color="amber"
        />
        <SummaryCard
          title="P99 Latency"
          value={`${percentiles?.p99 || 0} ms`}
          subtitle="99th percentile peak"
          icon={Timer}
          color="rose"
        />
      </section>

      {/* Explanatory Banner for Percentiles */}
      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>
          <strong>P95 latency ({percentiles?.p95 || 0} ms):</strong> 95% of all requests completed in or under this duration. Only the slowest 5% of requests exceeded this latency.
        </span>
      </div>

      {/* 2. Endpoint Time-Series: Traffic & Latency Trends */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoint Traffic Over Time */}
        <ChartCard
          title="Endpoint Traffic & Failures Over Time"
          subtitle={`Call volume for ${endpoint}`}
          action={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-indigo-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Requests
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Errors
              </span>
            </div>
          }
        >
          {formattedTimeseries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No historical points recorded.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={formattedTimeseries} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
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
                />
                <Area type="monotone" dataKey="totalRequests" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} />
                <Area type="monotone" dataKey="failedRequests" stroke="#EF4444" fill="#EF4444" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Endpoint Latency Over Time */}
        <ChartCard
          title="Endpoint Latency Trend (Avg vs P95)"
          subtitle={`Latency benchmark for ${endpoint}`}
        >
          {formattedTimeseries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No latency series available.
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
                  formatter={(val, name) => [`${val} ms`, name === 'avgResponseTime' ? 'Avg' : 'P95']}
                />
                <Line type="monotone" dataKey="avgResponseTime" stroke="#06B6D4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95ResponseTime" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* 3. Charts: Status Code Distribution & Common Error Messages */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Code Distribution with percentages */}
        <ChartCard
          title="Status Code Distribution"
          subtitle={`All responses for ${endpoint} with % breakdown`}
          action={
            <span className="text-xs font-mono text-slate-400">
              {statusChartData.length} distinct codes
            </span>
          }
        >
          {statusChartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No logs recorded for this endpoint yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
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
                  formatter={(val, name, props) => [`${val} (${props.payload.percentage}%)`, props.payload.code]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry) => (
                    <Cell
                      key={entry.rawCode}
                      fill={STATUS_COLORS[entry.rawCode] || '#6366F1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Common Error Messages */}
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 shadow-lg shadow-black/20 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-800/60 mb-4">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Common Error Signatures
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Frequent error messages recorded in PostgreSQL
            </p>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[260px] pr-1">
            {commonErrors.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No error messages recorded for this endpoint.
              </div>
            ) : (
              commonErrors.map((err, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#0F172A] border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-mono break-words">{err.errorMessage}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge statusCode={err.statusCode} />
                      <span className="text-slate-500 font-mono text-[11px]">HTTP error</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      {err.count}x
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 4. Recent Failures for this Endpoint */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] shadow-lg shadow-black/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Recent Failures for {endpoint}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed breakdown of recent failed calls with classification tags
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#151D2F] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Time</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Classification</th>
                <th className="px-3 py-2.5">Latency</th>
                <th className="px-3 py-2.5">Error Message</th>
                <th className="px-3 py-2.5">Request ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentFailures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No recent failures recorded for this endpoint.
                  </td>
                </tr>
              ) : (
                recentFailures.map((fail) => (
                  <tr key={fail.id} className="hover:bg-[#1E293B]/60 transition">
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(fail.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-200">
                      {fail.method}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge statusCode={fail.statusCode} />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        {fail.failureCategory || 'Failure'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-amber-300 whitespace-nowrap">
                      {fail.responseTime} ms
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 max-w-sm truncate" title={fail.errorMessage}>
                      {fail.errorMessage || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                      {fail.requestId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
