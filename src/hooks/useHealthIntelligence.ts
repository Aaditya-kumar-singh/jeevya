import { useCallback, useEffect, useState } from 'react';
import {
  getHealthInsights,
  getHealthInsightsForDate,
  type HealthInsight,
} from '@/services/healthIntelligence';
import type { HealthAnalyticsPeriod } from '@/services/healthAnalytics';

export function useHealthIntelligence(initialPeriod: HealthAnalyticsPeriod = '30d') {
  const [period, setPeriod] = useState(initialPeriod);
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async (nextPeriod: HealthAnalyticsPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getHealthInsights(nextPeriod);
      setInsights(result);
      setPeriod(nextPeriod);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load health insights';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInsights(initialPeriod);
  }, [initialPeriod, loadInsights]);

  const getInsightsForDate = useCallback(async (date: string, nextPeriod: HealthAnalyticsPeriod = period) => {
    return getHealthInsightsForDate(date, nextPeriod);
  }, [period]);

  return { period, insights, loading, error, loadInsights, getInsightsForDate, setPeriod: loadInsights };
}
