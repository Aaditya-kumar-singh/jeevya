import { useCallback, useEffect, useState } from 'react';
import { getLifeTimeline } from '@/services/lifeTimeline';
import type { LifeTimelineQuery, LifeTimelineResult } from '@/types/lifeTimeline';

export function useLifeTimeline(initialQuery: LifeTimelineQuery = {}) {
  const [query, setQuery] = useState<LifeTimelineQuery>(initialQuery);
  const [data, setData] = useState<LifeTimelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextQuery: LifeTimelineQuery) => {
    setError(null);
    try {
      const result = await getLifeTimeline(nextQuery);
      setData(result);
      setQuery(nextQuery);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load Jeevya timeline';
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialQuery);
  }, [initialQuery, load]);

  const update = useCallback((patch: Partial<LifeTimelineQuery>) => {
    const next = { ...query, ...patch, offset: 0 };
    setLoading(true);
    void load(next);
  }, [load, query]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(query);
  }, [load, query]);

  return {
    data,
    query,
    loading,
    refreshing,
    error,
    refresh,
    setFilter: (filter: LifeTimelineQuery['filter']) => update({ filter }),
    setSearch: (search: string) => update({ search }),
    setRange: (startDate?: LifeTimelineQuery['startDate'], endDate?: LifeTimelineQuery['endDate']) => update({ startDate, endDate }),
    setNewestFirst: (newestFirst: boolean) => update({ newestFirst }),
  };
}
