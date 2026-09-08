import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LogsPage from './pages/LogsPage';
import ApiDetailPage from './pages/ApiDetailPage';
import useAnalytics from './hooks/useAnalytics';

export default function App() {
  const analytics = useAnalytics();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Observability Dashboard';
    if (location.pathname === '/logs') return 'API Ingestion Logs Explorer';
    if (location.pathname.startsWith('/api')) return 'API Endpoint Inspection';
    return 'SmartAPI';
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F17] text-slate-100 antialiased font-sans">
      {/* Sidebar Navigation */}
      <Sidebar endpoints={analytics.endpoints} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          health={analytics.health}
          onRefresh={analytics.refresh}
          loading={analytics.loading}
          title={getPageTitle()}
          timeRange={analytics.timeRange}
          onRangeChange={analytics.setTimeRange}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  analytics={analytics}
                  onRefresh={analytics.refresh}
                />
              }
            />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/api/*" element={<ApiDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
