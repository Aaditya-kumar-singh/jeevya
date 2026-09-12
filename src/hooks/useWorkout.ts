import { useCallback, useEffect, useState } from 'react';

import {
  addExerciseToWorkout,
  createWorkout,
  deleteEmptyDrafts,
  deleteWorkout,
  duplicateWorkoutExercise,
  getWorkout,
  moveWorkoutExercise,
  removeWorkoutExercise,
  saveWorkout,
  startWorkout,
  updateWorkoutExercise,
  updateWorkoutName,
} from '@/services/workouts';
import type { Workout, WorkoutExerciseConfig } from '@/types/workout';

export function useWorkout(workoutId?: string | null) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      if (workoutId) {
        const found = await getWorkout(workoutId);
        if (!found) {
          setError('Workout not found.');
          return;
        }
        setWorkout(found);
      } else {
        await deleteEmptyDrafts();
        setWorkout(await createWorkout());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workout');
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const addExercise = useCallback(
    async (config: WorkoutExerciseConfig) => {
      if (!workout) return;
      setWorkout(await addExerciseToWorkout(workout.id, config));
    },
    [workout],
  );

  const removeExercise = useCallback(
    async (workoutExerciseId: string) => {
      if (!workout) return;
      setWorkout(await removeWorkoutExercise(workout.id, workoutExerciseId));
    },
    [workout],
  );

  const duplicateExercise = useCallback(
    async (workoutExerciseId: string) => {
      if (!workout) return;
      setWorkout(await duplicateWorkoutExercise(workout.id, workoutExerciseId));
    },
    [workout],
  );

  const updateExercise = useCallback(
    async (
      workoutExerciseId: string,
      patch: Parameters<typeof updateWorkoutExercise>[2],
    ) => {
      if (!workout) return;
      setWorkout(await updateWorkoutExercise(workout.id, workoutExerciseId, patch));
    },
    [workout],
  );

  const moveExercise = useCallback(
    async (workoutExerciseId: string, direction: -1 | 1) => {
      if (!workout) return;
      setWorkout(await moveWorkoutExercise(workout.id, workoutExerciseId, direction));
    },
    [workout],
  );

  const updateName = useCallback(
    async (name: string) => {
      if (!workout) return;
      setWorkout(await updateWorkoutName(workout.id, name));
    },
    [workout],
  );

  const save = useCallback(async () => {
    if (!workout) return;
    setSaving(true);
    setError(null);
    try {
      setWorkout(await saveWorkout(workout));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  }, [workout]);

  const start = useCallback(async () => {
    if (!workout) return null;
    setSaving(true);
    setError(null);
    try {
      const active = await startWorkout(workout.id);
      setWorkout(active);
      return active;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start workout');
      return null;
    } finally {
      setSaving(false);
    }
  }, [workout]);

  return {
    workout,
    setWorkout,
    loading,
    saving,
    error,
    addExercise,
    removeExercise,
    duplicateExercise,
    updateExercise,
    moveExercise,
    updateName,
    save,
    start,
  };
}