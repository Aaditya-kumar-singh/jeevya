import { useCallback, useEffect, useState } from 'react';
import { getXPProgress, type XPProgress } from '@/services/xp';

export function useXPProgress() {
  const [progress, setProgress] = useState<XPProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setProgress(await getXPProgress());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { progress, loading, refresh };
}
