// ─── Book Progress Hook (Phase 1D) ────────────────────────────────────────────
// Loads a single book's reading history and appends new milestones.
// Page persistence on the Book itself stays with useBooks/editBook — this hook
// only owns the separate history log. Local/offline only.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BookProgressEntry } from '@/types/books';
import {
  getProgressHistory,
  recordProgress,
  deleteProgressHistory,
} from '@/services/book-progress';

export function useBookProgress(bookId: string | undefined) {
  const [entries, setEntries] = useState<BookProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!bookId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    try {
      const data = await getProgressHistory(bookId);
      if (requestId !== requestIdRef.current) return;
      setEntries(data);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load progress history');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [bookId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const logProgress = useCallback(
    async (page: number): Promise<BookProgressEntry> => {
      if (!bookId) throw new Error('Book ID is required');
      const entry = await recordProgress(bookId, page);
      // recordProgress is duplicate-safe: refresh from storage only when the
      // entry is actually new, otherwise keep current state untouched.
      setEntries((prev) =>
        prev.some((e) => e.id === entry.id) ? prev : [entry, ...prev],
      );
      return entry;
    },
    [bookId],
  );

  const clearHistory = useCallback(async () => {
    if (!bookId) return;
    await deleteProgressHistory(bookId);
    setEntries([]);
  }, [bookId]);

  return {
    entries,
    loading,
    error,
    reload: load,
    logProgress,
    clearHistory,
  };
}
