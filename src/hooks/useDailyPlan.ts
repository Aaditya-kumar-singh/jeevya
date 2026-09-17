import { useCallback, useEffect, useRef, useState } from 'react';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getDailyPlan } from '@/services/dailyPlan';
import { completeTask } from '@/services/tasks';
import { toggleHabitCompletion } from '@/services/habits';
import type { DailyPlanItem, DailyPlanModel } from '@/types/dailyPlan';

export function useDailyPlan(initialDate: CivilDate = todayCivilDate()) {
  const [date, setDate] = useState<CivilDate>(initialDate);
  const [data, setData] = useState<DailyPlanModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (nextDate: CivilDate = date) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getDailyPlan(nextDate);
      if (requestId !== requestIdRef.current) return result;
      setData(result);
      setDate(nextDate);
      return result;
    } catch (cause) {
      if (requestId !== requestIdRef.current) throw cause;
      const message = cause instanceof Error ? cause.message : 'Failed to load Daily Plan';
      setError(message);
      throw cause;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialDate);
  }, [initialDate, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      return await load(date);
    } finally {
      setRefreshing(false);
    }
  }, [date, load]);

  const changeDate = useCallback((nextDate: CivilDate) => {
    void load(nextDate);
  }, [load]);

  const execute = useCallback(async (item: DailyPlanItem) => {
    if (!item.actionTargetId) return;
    if (item.actionType === 'complete_task') {
      const result = await completeTask(item.actionTargetId);
      if (!result.task) throw new Error('Task not found');
    } else if (item.actionType === 'complete_habit') {
      await toggleHabitCompletion(item.actionTargetId, date);
    } else {
      return;
    }
    await load(date);
  }, [date, load]);

  return { date, data, loading, refreshing, error, load, refresh, setDate: changeDate, execute };
}
