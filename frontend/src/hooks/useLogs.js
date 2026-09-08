import { useState, useEffect, useCallback } from 'react';
import { fetchLogs } from '../services/api';

export function useLogs(initialFilters = {}, initialPage = 1, initialLimit = 50) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.endpoint && { endpoint: filters.endpoint }),
        ...(filters.statusCode && { statusCode: filters.statusCode }),
        ...(filters.method && { method: filters.method }),
        ...(filters.service && { service: filters.service }),
      };

      const result = await fetchLogs(queryParams);
      setLogs(result.data || []);
      setPagination(result.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load logs:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const updateFilter = (key, value) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };
      if (!value) delete updated[key];
      return updated;
    });
    // Reset to page 1 on filter change
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const changePage = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const changeLimit = (newLimit) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  return {
    logs,
    pagination,
    filters,
    loading,
    error,
    updateFilter,
    resetFilters,
    changePage,
    changeLimit,
    refetch: loadLogs,
  };
}

export default useLogs;

