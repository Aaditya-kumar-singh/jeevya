import { useCallback, useEffect, useState } from 'react';
import {
  createSleepEntry,
  deleteSleepEntry,
  getSleepEntry,
  getSleepEntryByDate,
  getSleepEntriesByDateRange,
  listSleepEntries,
  updateSleepEntry,
} from '@/services/sleep';
import type { CreateSleepEntryInput, SleepEntry, UpdateSleepEntryInput } from '@/services/sleep';

export function useSleep() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listSleepEntries();
      setEntries(next);
      return next;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load sleep entries';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEntries();
  }, [loadEntries]);

  const addSleepEntry = useCallback(async (input: CreateSleepEntryInput) => {
    setError(null);
    try {
      const entry = await createSleepEntry(input);
      setEntries((current) => [entry, ...current]);
      setEntries((current) => current.slice().sort((a, b) => b.date.localeCompare(a.date) || Date.parse(b.sleepStart) - Date.parse(a.sleepStart)));
      return entry;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add sleep entry');
      throw e;
    }
  }, []);

  const editSleepEntry = useCallback(async (id: string, patch: UpdateSleepEntryInput) => {
    setError(null);
    try {
      const updated = await updateSleepEntry(id, patch);
      setEntries((current) => current.map((entry) => (entry.id === id ? updated : entry)).sort((a, b) => b.date.localeCompare(a.date) || Date.parse(b.sleepStart) - Date.parse(a.sleepStart)));
      return updated;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update sleep entry');
      throw e;
    }
  }, []);

  const removeSleepEntry = useCallback(async (id: string) => {
    setError(null);
    try {
      await deleteSleepEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete sleep entry');
      throw e;
    }
  }, []);

  return {
    entries,
    loading,
    error,
    loadEntries,
    addSleepEntry,
    editSleepEntry,
    removeSleepEntry,
    getSleepEntry,
    getSleepEntryByDate,
    getSleepEntriesByDateRange,
  };
}
