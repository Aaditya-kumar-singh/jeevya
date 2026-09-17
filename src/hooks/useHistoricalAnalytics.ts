import { useCallback, useEffect, useState } from 'react';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getHistoricalAnalytics } from '@/services/historicalAnalytics';
import type { HistoricalAnalyticsFilter, HistoricalAnalyticsPeriod, HistoricalAnalyticsResult } from '@/types/historicalAnalytics';

export function useHistoricalAnalytics(initialPeriod: HistoricalAnalyticsPeriod = 7, initialFilter: HistoricalAnalyticsFilter = 'all', endDate: CivilDate = todayCivilDate()) {
  const [period, setPeriod] = useState<HistoricalAnalyticsPeriod>(initialPeriod);
  const [filter, setFilter] = useState<HistoricalAnalyticsFilter>(initialFilter);
  const [data, setData] = useState<HistoricalAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPeriod: HistoricalAnalyticsPeriod, nextFilter: HistoricalAnalyticsFilter) => {
    setError(null);
    try {
      const result = await getHistoricalAnalytics({ period: nextPeriod, filter: nextFilter, endDate });
      setData(result);
      setPeriod(nextPeriod);
      setFilter(nextFilter);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load historical analytics';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endDate]);

  useEffect(() => {
    // Initial load only. Explicit selectors perform subsequent loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialPeriod, initialFilter);
  }, [initialFilter, initialPeriod, load]);

  const refresh = useCallback(async () => { setRefreshing(true); await load(period, filter); }, [filter, load, period]);
  const changePeriod = useCallback((value: HistoricalAnalyticsPeriod) => { setLoading(true); void load(value, filter); }, [filter, load]);
  const changeFilter = useCallback((value: HistoricalAnalyticsFilter) => { setLoading(true); void load(period, value); }, [load, period]);

  return { period, filter, data, loading, refreshing, error, refresh, setPeriod: changePeriod, setFilter: changeFilter };
}
