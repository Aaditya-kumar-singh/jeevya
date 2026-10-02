import { useCallback, useState } from 'react';
import { searchJeevya, type UnifiedSearchOptions } from '@/services/unifiedSearch';
import type { UnifiedSearchResponse } from '@/types/unifiedSearch';
import { todayCivilDate } from '@/lib/date';

export function useUnifiedSearch() {
  const [data, setData] = useState<UnifiedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, filters?: UnifiedSearchOptions['filters']) => {
    if (!query.trim()) {
      setData({ query: '', date: todayCivilDate(), filters, results: [], total: 0 });
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await searchJeevya(query, todayCivilDate(), { filters });
      setData(result);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Search failed';
      setError(message);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, search };
}
