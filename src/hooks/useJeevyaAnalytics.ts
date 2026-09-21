import { useCallback, useEffect, useState } from 'react';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getJeevyaAnalytics } from '@/services/jeevyaAnalytics';
import type { JeevyaAnalyticsPeriod, JeevyaAnalyticsResult } from '@/types/jeevyaAnalytics';

export function useJeevyaAnalytics(initialPeriod: JeevyaAnalyticsPeriod = 7, endDate: CivilDate = todayCivilDate()) {
  const [period, setPeriod] = useState<JeevyaAnalyticsPeriod>(initialPeriod);
  const [data, setData] = useState<JeevyaAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPeriod: JeevyaAnalyticsPeriod = initialPeriod) => {
    setError(null);
    try {
      const result = await getJeevyaAnalytics(nextPeriod, endDate);
      setData(result);
      setPeriod(nextPeriod);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load Jeevya analytics';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endDate, initialPeriod]);

  useEffect(() => {
    // Initial load only; later period changes use the explicit selector handler.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialPeriod);
  }, [initialPeriod, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(period);
  }, [load, period]);

  const changePeriod = useCallback((nextPeriod: JeevyaAnalyticsPeriod) => {
    setLoading(true);
    void load(nextPeriod);
  }, [load]);

  return { period, data, loading, refreshing, error, refresh, setPeriod: changePeriod };
}
