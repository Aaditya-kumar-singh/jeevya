import { useCallback, useEffect, useRef, useState } from 'react';

import { EXERCISES_PAGE_SIZE, getExercises } from '@/services/exercises';
import type { Exercise, ExerciseFilter } from '@/types/exercise';

export function useExercises(pageSize: number = EXERCISES_PAGE_SIZE) {
  const [data, setData] = useState<Exercise[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('supabase');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilterState] = useState<ExerciseFilter>({});

  const pageRef = useRef(0);
  const busyRef = useRef(false);
  const requestIdRef = useRef(0);
  const filterRef = useRef(filter);
  // eslint-disable-next-line react-hooks/refs
  filterRef.current = filter;

  const fetchPage = useCallback(
    async (page: number, activeFilter: ExerciseFilter) =>
      getExercises({ page, pageSize, filter: activeFilter }),
    [pageSize],
  );

  const loadFirst = useCallback(
    async (nextFilter: ExerciseFilter, silent = false) => {
      const requestId = ++requestIdRef.current;
      pageRef.current = 0;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await fetchPage(0, nextFilter);
        if (requestId !== requestIdRef.current) return;
        setData(result.data);
        setTotal(result.count);
        setHasMore(result.hasMore);
        setSource(result.source);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : 'Failed to load exercises');
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [fetchPage],
  );

  const setFilter = useCallback(
    (nextFilter: ExerciseFilter) => {
      setFilterState(nextFilter);
      void loadFirst(nextFilter);
    },
    [loadFirst],
  );

  const loadMore = useCallback(async () => {
    if (busyRef.current || loadingMore) return;
    busyRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const result = await fetchPage(nextPage, filterRef.current);
      pageRef.current = nextPage;
      setData((prev) => [...prev, ...result.data]);
      setTotal(result.count);
      setHasMore(result.hasMore);
      setSource(result.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, loadingMore]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirst(filterRef.current, true);
    setRefreshing(false);
  }, [loadFirst]);

  useEffect(() => {
    void loadFirst(filterRef.current);
  }, [loadFirst]);

  return {
    data,
    total,
    source,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    filter,
    setFilter,
    loadMore,
    refresh,
  };
}