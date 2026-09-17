import { useCallback, useEffect, useState } from 'react';
import { getLifeIntelligence } from '@/services/lifeIntelligence';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import type { LifeIntelligenceResult } from '@/types/lifeIntelligence';

export function useLifeIntelligence(initialDate: CivilDate = todayCivilDate()) {
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<LifeIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (nextDate: CivilDate = date) => {
    setLoading(true); setError(null);
    try { const result = await getLifeIntelligence(nextDate); setData(result); setDate(nextDate); return result; }
    catch (cause) { const message = cause instanceof Error ? cause.message : 'Failed to load LifeOS intelligence'; setError(message); throw cause; }
    finally { setLoading(false); }
  }, [date]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialDate);
  }, [initialDate, load]);
  const refresh = useCallback(() => load(date), [date, load]);
  return { date, data, loading, error, load, refresh, setDate: (nextDate: CivilDate) => { void load(nextDate); } };
}
