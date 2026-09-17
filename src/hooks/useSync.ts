import { useCallback, useEffect, useState } from 'react';
import { getPendingConflicts, getSyncStatus, resolveConflictKeepLocal, resolveConflictKeepRemote, synchronizeLifeOS } from '@/services/sync';
import type { SyncConflict, SyncConflictResolutionResult, SyncResult, SyncStatus } from '@/types/sync';

const DEFAULT_STATUS: SyncStatus = { state: 'idle', lastSyncedAt: null, conflicts: 0, message: 'Ready to synchronize.' };

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>(DEFAULT_STATUS);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  const refresh = useCallback(async () => {
    const [next, pending] = await Promise.all([getSyncStatus(), getPendingConflicts()]);
    setStatus(next); setConflicts(pending); return next;
  }, []);

  const sync = useCallback(async (): Promise<SyncResult> => {
    setStatus((current) => ({ ...current, state: 'syncing', message: 'Synchronizing local data with Supabase.' }));
    const result = await synchronizeLifeOS();
    const pending = await getPendingConflicts();
    setStatus({ state: result.state, lastSyncedAt: result.state === 'synced' || result.state === 'conflict_pending' ? new Date().toISOString() : null, conflicts: pending.length, message: result.message });
    setConflicts(pending);
    return result;
  }, []);

  const resolveKeepLocal = useCallback(async (conflictId: string): Promise<SyncConflictResolutionResult> => {
    const result = await resolveConflictKeepLocal(conflictId); await refresh(); return result;
  }, [refresh]);
  const resolveKeepRemote = useCallback(async (conflictId: string): Promise<SyncConflictResolutionResult> => {
    const result = await resolveConflictKeepRemote(conflictId); await refresh(); return result;
  }, [refresh]);

  useEffect(() => {
    let active = true;
    void Promise.all([getSyncStatus(), getPendingConflicts()]).then(([next, pending]) => { if (active) { setStatus(next); setConflicts(pending); } });
    return () => { active = false; };
  }, []);

  return { status, conflicts, refresh, sync, resolveKeepLocal, resolveKeepRemote };
}
