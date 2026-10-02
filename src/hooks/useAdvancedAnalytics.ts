import { useCallback, useEffect, useState } from 'react';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import { buildAdvancedIntelligence, setInsightFeedback, type AdvancedIntelligenceResult, type InsightFeedback } from '@/services/advancedAnalyticsIntelligence';
import type { IntelligencePeriod } from '@/services/advancedAnalyticsIntelligence';

export function useAdvancedAnalytics(initialPeriod: IntelligencePeriod = 30, endDate: CivilDate = todayCivilDate()) {
  const [period, setPeriod] = useState<IntelligencePeriod>(initialPeriod);
  const [data, setData] = useState<AdvancedIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPeriod: IntelligencePeriod) => {
    setError(null);
    try { const result = await buildAdvancedIntelligence(endDate, nextPeriod); setData(result); setPeriod(nextPeriod); return result; }
    catch (cause) { const message = cause instanceof Error ? cause.message : 'Failed to load advanced intelligence'; setError(message); throw cause; }
    finally { setLoading(false); setRefreshing(false); }
  }, [endDate]);

  useEffect(() => { void load(initialPeriod); }, [initialPeriod, load]);

  const refresh = useCallback(async () => { setRefreshing(true); await load(period); }, [load, period]);
  const changePeriod = useCallback((value: IntelligencePeriod) => { setLoading(true); void load(value); }, [load]);
  const feedback = useCallback(async (insightId: string, value: InsightFeedback) => {
    await setInsightFeedback(insightId, value);
    setData((current) => current ? { ...current, feedback: [...current.feedback.filter((item) => item.insightId !== insightId), { insightId, feedback: value, updatedAt: new Date().toISOString() }] } : current);
  }, []);

  return { period, data, loading, refreshing, error, refresh, setPeriod: changePeriod, feedback };
}
