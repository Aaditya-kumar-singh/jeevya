import { useCallback, useEffect, useState } from 'react';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getLifeOSAnalytics } from '@/services/lifeosAnalytics';
import type { LifeOSAnalyticsPeriod, LifeOSAnalyticsResult } from '@/types/lifeosAnalytics';

export function useLifeOSAnalytics(initialPeriod: LifeOSAnalyticsPeriod = 7, endDate: CivilDate = todayCivilDate()) {
  const [period, setPeriod] = useState<LifeOSAnalyticsPeriod>(initialPeriod);
  const [data, setData] = useState<LifeOSAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPeriod: LifeOSAnalyticsPeriod = initialPeriod) => {
    setError(null);
    try {
      const result = await getLifeOSAnalytics(nextPeriod, endDate);
      setData(result);
      setPeriod(nextPeriod);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load LifeOS analytics';
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

  const changePeriod = useCallback((nextPeriod: LifeOSAnalyticsPeriod) => {
    setLoading(true);
    void load(nextPeriod);
  }, [load]);

  return { period, data, loading, refreshing, error, refresh, setPeriod: changePeriod };
}
