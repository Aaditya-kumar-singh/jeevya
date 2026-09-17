import { useCallback, useEffect, useRef, useState } from 'react';
import { getLifeOSDailyState } from '@/services/lifeosIntegration';
import type { LifeOSDailyState } from '@/types/lifeosIntegration';
import { todayCivilDate } from '@/lib/date';

export function useLifeOSIntegration(initialDate: string = todayCivilDate()) {
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<LifeOSDailyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const load = useCallback(async (nextDate: string = date) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getLifeOSDailyState(nextDate);
      if (requestId !== requestIdRef.current) return result;
      setData(result);
      setDate(nextDate);
      return result;
    } catch (cause) {
      if (requestId !== requestIdRef.current) throw cause;
      const message = cause instanceof Error ? cause.message : 'Failed to load LifeOS state';
      setError(message);
      throw cause;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialDate);
  }, [initialDate, load]);

  const refresh = useCallback(() => load(date), [date, load]);
  const changeDate = useCallback((nextDate: string) => { void load(nextDate); }, [load]);

  return { date, data, loading, error, load, refresh, setDate: changeDate };
}
