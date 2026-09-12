// ─── Journal Hook (Phase 1A) ──────────────────────────────────────────────────
// Mirrors the Books/Tasks hooks: requestId/stale-response protection, busy
// guard on refresh, immutable state updates, errors rethrown for screens to
// surface. Local/offline only.

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  JournalEntry,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '@/types/journal';
import {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
} from '@/services/journal';

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadEntries = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const entriesData = await getEntries();

      if (requestId !== requestIdRef.current) return;

      setEntries(entriesData);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load journal entries');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadEntries();
  }, [loadEntries]);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    await loadEntries();
    busyRef.current = false;
  }, [loadEntries]);

  const addEntry = useCallback(
    async (input: CreateJournalEntryInput): Promise<JournalEntry> => {
      const requestId = ++requestIdRef.current;
      const newEntry = await createEntry(input);
      // Skip the local patch only when a newer request already superseded us.
      if (requestId === requestIdRef.current) {
        setEntries((prev) =>
          [...prev, newEntry].sort(
            (a, b) =>
              b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
          ),
        );
      }
      return newEntry;
    },
    [],
  );

  const editEntry = useCallback(async (id: string, input: UpdateJournalEntryInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateEntry(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Journal entry not found');
      // Re-sort: a date change can move the entry (newest-first invariant).
      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? updated : e))
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
          ),
      );
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteEntry(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  return {
    entries,
    loading,
    refreshing,
    error,
    refresh,
    addEntry,
    editEntry,
    removeEntry,
  };
}
