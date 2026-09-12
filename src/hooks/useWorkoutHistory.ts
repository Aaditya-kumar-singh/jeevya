import { useCallback, useEffect, useState } from 'react';

import { getWorkoutHistory } from '@/services/workouts';
import type { Workout } from '@/types/workout';

export function useWorkoutHistory() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode?: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setWorkouts(await getWorkoutHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load('initial');
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  return { workouts, loading, refreshing, error, reload: load, refresh };
}