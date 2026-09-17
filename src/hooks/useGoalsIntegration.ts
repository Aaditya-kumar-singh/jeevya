import { useCallback, useEffect, useState } from 'react';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getUnifiedGoals } from '@/services/goalsIntegration';
import type { UnifiedGoal } from '@/types/goalsIntegration';

export function useGoalsIntegration(initialDate: CivilDate = todayCivilDate()) {
  const [date, setDate] = useState<CivilDate>(initialDate);
  const [goals, setGoals] = useState<UnifiedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextDate: CivilDate = date) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUnifiedGoals(nextDate);
      setGoals(result);
      setDate(nextDate);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load goals';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => {
    // Initial data load synchronizes the hook with the existing domain services.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialDate);
  }, [initialDate, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(date);
  }, [date, load]);

  const changeDate = useCallback((nextDate: CivilDate) => {
    setLoading(true);
    void load(nextDate);
  }, [load]);

  return { date, goals, loading, refreshing, error, load, refresh, setDate: changeDate };
}
