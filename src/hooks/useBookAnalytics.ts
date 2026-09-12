// ─── Book Analytics Hook (Phase 1G) ───────────────────────────────────────────
// Local/offline only: derives every metric from existing useBooks() records
// plus per-book progress history (existing getProgressHistory API — the
// book-progress service itself is untouched). Goals ride along for insight
// cards via the existing goal progress calculator.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBooks } from '@/hooks/useBooks';
import { useBookGoals } from '@/hooks/useBookGoals';
import { getProgressHistory } from '@/services/book-progress';
import {
  activitySeries,
  bestPoint,
  booksByAuthor,
  booksByCategory,
  computeBookAnalytics,
  ratingDistribution,
  todayDay,
  type BookAnalyticsPeriod,
} from '@/lib/book-analytics';
import { getGoalProgress, isGoalActive } from '@/services/book-goals';
import type { BookProgressEntry } from '@/types/books';

export function useBookAnalytics() {
  const { books, loading: booksLoading, refreshing: booksRefreshing, error: booksError, refresh: refreshBooks } =
    useBooks();
  const { goals } = useBookGoals();
  const [period, setPeriod] = useState<BookAnalyticsPeriod>(30);

  const [entries, setEntries] = useState<BookProgressEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const requestIdRef = useRef(0);
  const today = todayDay();

  // Load every book's history through the existing per-book API.
  useEffect(() => {
    if (booksLoading) return;
    const requestId = ++requestIdRef.current;
    setHistoryLoading(true);
    void (async () => {
      try {
        const lists = await Promise.all(books.map((b) => getProgressHistory(b.id)));
        if (requestId !== requestIdRef.current) return;
        setEntries(lists.flat());
        setHistoryError(null);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setEntries([]);
        setHistoryError(e instanceof Error ? e.message : 'Failed to load reading history');
      } finally {
        if (requestId === requestIdRef.current) setHistoryLoading(false);
      }
    })();
  }, [booksLoading, books, nonce]);

  const refresh = useCallback(async () => {
    await refreshBooks();
    setNonce((n) => n + 1);
  }, [refreshBooks]);

  const summary = useMemo(
    () => computeBookAnalytics(books, entries, period, today),
    [books, entries, period, today],
  );

  const series = useMemo(
    () => activitySeries(entries, period, today),
    [entries, period, today],
  );

  const best = useMemo(() => bestPoint(series), [series]);
  const categories = useMemo(() => booksByCategory(books), [books]);
  const authors = useMemo(() => booksByAuthor(books), [books]);
  const ratings = useMemo(() => ratingDistribution(books), [books]);

  // Active reading goals with live progress (existing goal calculator).
  const goalInsights = useMemo(
    () =>
      goals
        .filter((g) => isGoalActive(g, today))
        .map((goal) => ({ goal, ...getGoalProgress(goal, books) })),
    [goals, books, today],
  );

  return {
    period,
    setPeriod,
    summary,
    series,
    best,
    categories,
    authors,
    ratings,
    goalInsights,
    hasData: books.length > 0,
    loading: booksLoading || historyLoading,
    refreshing: booksRefreshing,
    error: booksError ?? historyError,
    refresh,
  };
}
