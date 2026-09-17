import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addWorkoutSet,
  addExerciseToWorkout,
  getPreviousExercisePerformance,
  getWorkoutSessions,
  startWorkout,
  removeWorkoutSet,
  uncompleteWorkoutSet,
  completeWorkoutSet,
  discardWorkout,
  finishWorkout,
  formatDuration,
  getWorkout,
  updateWorkoutSet,
} from '@/services/workouts';
import type { NewWorkoutSetInput, PersonalRecord, Workout } from '@/types/workout';

export function useWorkoutSession(workoutId: string) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restComplete, setRestComplete] = useState(false);
  const [restActive, setRestActive] = useState(false);
  const [newPersonalRecords, setNewPersonalRecords] = useState<PersonalRecord[]>([]);

  const startedAtRef = useRef<string | null>(null);
  const restEndsAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);

  const reload = useCallback(async () => {
    try {
      const found = await getWorkout(workoutId);
      if (!found) {
        setError('Workout not found.');
        return;
      }
      setWorkout(found);
      const firstIncomplete = found.exercises.findIndex((e) =>
        e.sets.some((s) => !s.completed),
      );
      setCurrentIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
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

  useEffect(() => {
    startedAtRef.current = workout?.startedAt ?? null;
  }, [workout?.startedAt]);

  // Single centralized ticker — elapsed & rest both derive from timestamps.
  useEffect(() => {
    const tick = () => {
      const start = startedAtRef.current;
      if (start && !pausedRef.current) {
        const totalMs = Date.now() - Date.parse(start) - accumulatedMsRef.current;
        setElapsedSeconds(Math.max(0, Math.floor(totalMs / 1000)));
      }
      const endsAt = restEndsAtRef.current;
      if (endsAt) {
        const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        setRestRemaining(next);
        if (next === 0) setRestComplete(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const pausedRef = useRef(false);
  const pausedAtRef = useRef<number | null>(null);
  const pausedRestRemainingRef = useRef(0);

  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedAtRef.current = Date.now();
    if (restEndsAtRef.current) {
      pausedRestRemainingRef.current = Math.max(
        0,
        Math.ceil((restEndsAtRef.current - Date.now()) / 1000),
      );
      restEndsAtRef.current = null;
    }
    // eslint-disable-next-line react-hooks/immutability
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    if (pausedAtRef.current) {
      accumulatedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    if (pausedRestRemainingRef.current > 0) {
      const remaining = pausedRestRemainingRef.current;
      restEndsAtRef.current = Date.now() + remaining * 1000;
      setRestRemaining(remaining);
      pausedRestRemainingRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/immutability
    pausedRef.current = false;
    setPaused(false);
  }, []);

  const startRestTimer = useCallback((seconds: number) => {
    const endsAt = Date.now() + seconds * 1000;
    restEndsAtRef.current = endsAt;
    setRestRemaining(seconds);
    setRestComplete(false);
    setRestActive(true);
  }, []);

  const addRestTime = useCallback((seconds: number) => {
    restEndsAtRef.current = (restEndsAtRef.current ?? Date.now()) + seconds * 1000;
    setRestRemaining(Math.max(0, Math.ceil((restEndsAtRef.current - Date.now()) / 1000)));
    setRestComplete(false);
    setRestActive(true);
  }, []);

  const skipRest = useCallback(() => {
    restEndsAtRef.current = null;
    setRestRemaining(0);
    setRestComplete(false);
    setRestActive(false);
  }, []);

  const getPreviousPerformance = useCallback(async (exerciseId: string) => getPreviousExercisePerformance(exerciseId, await getWorkoutSessions()), []);

  const addExercise = useCallback(async (input: Parameters<typeof addExerciseToWorkout>[1]) => {
    const updated = await addExerciseToWorkout(workoutId, input);
    setWorkout(updated);
    return updated;
  }, [workoutId]);

  const start = useCallback(async () => {
    const updated = await startWorkout(workoutId);
    setWorkout(updated);
    return updated;
  }, [workoutId]);

  const completeSet = useCallback(
    async (
      workoutExerciseId: string,
      setId: string,
      patch: NewWorkoutSetInput = {},
    ) => {
      setCompleting(true);
      setError(null);
      try {
        const result = await completeWorkoutSet(workoutId, workoutExerciseId, setId, patch);
        setWorkout(result.workout);
        setNewPersonalRecords((prev) => {
          const fresh = result.newPersonalRecords.filter(
            (r) => !prev.some((p) => p.id === r.id),
          );
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        const exercise = result.workout.exercises.find((e) => e.id === workoutExerciseId);
        if (exercise) startRestTimer(exercise.restSeconds);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save set');
      } finally {
        setCompleting(false);
      }
    },
    [workoutId, startRestTimer],
  );

  const updateSet = useCallback(
    async (
      workoutExerciseId: string,
      setId: string,
      patch: NewWorkoutSetInput,
    ) => {
      try {
        setWorkout(await updateWorkoutSet(workoutId, workoutExerciseId, setId, patch));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update set');
      }
    },
    [workoutId],
  );

  const addSet = useCallback(
    async (workoutExerciseId: string) => {
      try {
        setWorkout(await addWorkoutSet(workoutId, workoutExerciseId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add set');
      }
    },
    [workoutId],
  );

  const removeSet = useCallback(async (workoutExerciseId: string, setId: string) => {
    try {
      setWorkout(await removeWorkoutSet(workoutId, workoutExerciseId, setId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove set');
    }
  }, [workoutId]);

  const uncompleteSet = useCallback(async (workoutExerciseId: string, setId: string) => {
    try {
      setWorkout(await uncompleteWorkoutSet(workoutId, workoutExerciseId, setId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to uncomplete set');
    }
  }, [workoutId]);

  const finish = useCallback(async () => {
    const result = await finishWorkout(workoutId, {
      pausedSeconds: Math.round(accumulatedMsRef.current / 1000),
    });
    setWorkout(result.workout);
    setNewPersonalRecords((prev) => {
      const fresh = result.newPersonalRecords.filter((r) => !prev.some((p) => p.id === r.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    return result;
  }, [workoutId]);

  const discard = useCallback(async () => {
    setWorkout(await discardWorkout(workoutId));
  }, [workoutId]);

  const exercises = workout?.exercises ?? [];
  const currentExercise = exercises[currentIndex] ?? exercises[0] ?? null;
  const totalSets = exercises.reduce((n, e) => n + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.completed).length,
    0,
  );

  return {
    workout,
    loading,
    error,
    completing,
    paused,
    pause,
    resume,
    elapsedSeconds,
    elapsedText: formatDuration(elapsedSeconds),
    currentExercise,
    currentIndex,
    setCurrentIndex,
    exercises,
    totalSets,
    completedSets,
    restRemaining,
    restComplete,
    restActive,
    startRestTimer,
    addRestTime,
    skipRest,
    completeSet,
    updateSet,
    addSet,
    removeSet,
    uncompleteSet,
    finish,
    discard,
    addExercise,
    start,
    getPreviousPerformance,
    newPersonalRecords,
    reload,
  };
}