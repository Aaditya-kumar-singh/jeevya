import { useCallback, useEffect, useRef, useState } from 'react';
import type { Habit, HabitLog } from '@/types/habit';
import {
  getHabits,
  getTodayHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  archiveHabit,
  restoreHabit,
  toggleHabitCompletion,
  getHabitLogs,
  getHabitById,
  type CreateHabitInput,
  type UpdateHabitInput,
} from '@/services/habits';
import { getHabitStats } from '@/services/habitStats';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayHabits, setTodayHabits] = useState<
    (Habit & { isCompleted: boolean })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadHabits = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const [habitsData, todayData] = await Promise.all([
        getHabits(),
        getTodayHabits(),
      ]);

      if (requestId !== requestIdRef.current) return;

      setHabits(habitsData);
      setTodayHabits(todayData);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load habits');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadHabits();
  }, [loadHabits]);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    await loadHabits();
    busyRef.current = false;
  }, [loadHabits]);

  const addHabit = useCallback(
    async (input: CreateHabitInput) => {
      const requestId = ++requestIdRef.current;
      try {
        const newHabit = await createHabit(input);

        if (requestId !== requestIdRef.current) return;

        setHabits((prev) => [newHabit, ...prev]);
        setTodayHabits((prev) => {
          const dayOfWeek = new Date().getDay();
          const weekdayMap: Record<number, string> = {
            0: 'sunday',
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday',
            6: 'saturday',
          };

          const currentWeekday = weekdayMap[dayOfWeek];
          const isDaily = newHabit.frequency === 'daily';
          const isScheduled = isDaily || newHabit.days.includes(currentWeekday as any);

          if (isScheduled) {
            return [{ ...newHabit, isCompleted: false }, ...prev];
          }
          return prev;
        });
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [],
  );

  const editHabit = useCallback(
    async (id: string, input: UpdateHabitInput) => {
      const requestId = ++requestIdRef.current;
      try {
        const updated = await updateHabit(id, input);

        if (requestId !== requestIdRef.current) return;
        if (!updated) throw new Error('Habit not found');

        setHabits((prev) =>
          prev.map((h) => (h.id === id ? updated : h)),
        );

        setTodayHabits((prev) =>
          prev.map((h) => (h.id === id ? { ...updated, isCompleted: h.isCompleted } : h)),
        );
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [],
  );

  const removeHabit = useCallback(
    async (id: string) => {
      const requestId = ++requestIdRef.current;
      try {
        const success = await deleteHabit(id);

        if (requestId !== requestIdRef.current) return;

        if (success) {
          setHabits((prev) => prev.filter((h) => h.id !== id));
          setTodayHabits((prev) => prev.filter((h) => h.id !== id));
        }
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [],
  );

  const archive = useCallback(
    async (id: string) => {
      const requestId = ++requestIdRef.current;
      try {
        const archived = await archiveHabit(id);

        if (requestId !== requestIdRef.current) return;
        if (!archived) throw new Error('Habit not found');

        setHabits((prev) =>
          prev.map((h) => (h.id === id ? archived : h)),
        );
        setTodayHabits((prev) => prev.filter((h) => h.id !== id));
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [],
  );

  const restore = useCallback(
    async (id: string) => {
      const requestId = ++requestIdRef.current;
      try {
        const restored = await restoreHabit(id);

        if (requestId !== requestIdRef.current) return;
        if (!restored) throw new Error('Habit not found');

        setHabits((prev) =>
          prev.map((h) => (h.id === id ? restored : h)),
        );
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [],
  );

  const toggleCompletion = useCallback(
    async (habitId: string) => {
      const requestId = ++requestIdRef.current;
      const today = new Date().toISOString().split('T')[0];

      try {
        const log = await toggleHabitCompletion(habitId, today);

        if (requestId !== requestIdRef.current) return;

        setTodayHabits((prev) =>
          prev.map((h) =>
            h.id === habitId ? { ...h, isCompleted: log.completed } : h,
          ),
        );
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [],
  );

  const getArchivedHabits = useCallback(async () => {
    const allHabits = await getHabits();
    return allHabits.filter((h) => h.isArchived);
  }, []);

  const getHabitLogsForHabit = useCallback(
    async (habitId: string) => {
      return getHabitLogs(habitId);
    },
    [],
  );

  const getHabitStatsForHabit = useCallback(
    (habit: Habit, logs: HabitLog[]) => {
      return getHabitStats(habit, logs);
    },
    [],
  );

  const getHabitByIdFn = useCallback(
    async (id: string) => {
      return getHabitById(id);
    },
    [],
  );

  return {
    habits,
    todayHabits,
    loading,
    refreshing,
    error,
    refresh,
    addHabit,
    editHabit,
    removeHabit,
    archive,
    restore,
    toggleCompletion,
    getArchivedHabits,
    getHabitLogsForHabit,
    getHabitStatsForHabit,
    getHabitByIdFn,
  };
}

