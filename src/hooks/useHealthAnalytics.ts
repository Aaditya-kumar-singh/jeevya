import { useCallback, useEffect, useState } from 'react';
import {
  getHealthAnalytics,
  type HealthAnalyticsPeriod,
  type HealthAnalyticsResult,
} from '@/services/healthAnalytics';

export function useHealthAnalytics(initialPeriod: HealthAnalyticsPeriod = '7d') {
  const [period, setPeriod] = useState<HealthAnalyticsPeriod>(initialPeriod);
  const [data, setData] = useState<HealthAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPeriod: HealthAnalyticsPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getHealthAnalytics(nextPeriod);
      setData(result);
      setPeriod(nextPeriod);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load health analytics';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialPeriod);
  }, [initialPeriod, load]);

  const changePeriod = useCallback((nextPeriod: HealthAnalyticsPeriod) => {
    void load(nextPeriod);
  }, [load]);

  return { period, data, loading, error, load, setPeriod: changePeriod };
}
