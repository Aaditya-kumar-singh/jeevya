import { useCallback, useEffect, useState } from 'react';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getWeeklyReview } from '@/services/weeklyReview';
import type { WeeklyReviewResult } from '@/types/weeklyReview';

export function useWeeklyReview(endDate: CivilDate = todayCivilDate()) {
  const [data, setData] = useState<WeeklyReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getWeeklyReview(endDate);
      setData(result);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load weekly review';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endDate]);

  useEffect(() => {
    // Keep the review read-time derived from current domain data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  return { data, loading, refreshing, error, refresh };
}
