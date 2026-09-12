// ─── Book Goals Hook (Phase 1F) ───────────────────────────────────────────────
// Mirrors the Books hook: requestId/stale-response protection, immutable state
// updates, errors rethrown for screens to surface. Local/offline only.

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BookGoal,
  CreateBookGoalInput,
  UpdateBookGoalInput,
} from '@/types/book-goals';
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from '@/services/book-goals';

export function useBookGoals() {
  const [goals, setGoals] = useState<BookGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadGoals = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const goalsData = await getGoals();

      if (requestId !== requestIdRef.current) return;

      setGoals(goalsData);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load goals');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadGoals();
  }, [loadGoals]);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    await loadGoals();
    busyRef.current = false;
  }, [loadGoals]);

  const addGoal = useCallback(async (input: CreateBookGoalInput): Promise<BookGoal> => {
    const requestId = ++requestIdRef.current;
    const newGoal = await createGoal(input);
    if (requestId === requestIdRef.current) {
      setGoals((prev) =>
        [...prev, newGoal].sort((a, b) => b.startDate.localeCompare(a.startDate)),
      );
    }
    return newGoal;
  }, []);

  const editGoal = useCallback(async (id: string, input: UpdateBookGoalInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateGoal(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Goal not found');
      setGoals((prev) =>
        prev
          .map((g) => (g.id === id ? updated : g))
          .sort((a, b) => b.startDate.localeCompare(a.startDate)),
      );
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteGoal(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  return {
    goals,
    loading,
    refreshing,
    error,
    refresh,
    addGoal,
    editGoal,
    removeGoal,
  };
}
