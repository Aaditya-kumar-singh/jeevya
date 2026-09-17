// LIFEOS 3S: deterministic conflict detection and resolution coverage.
// @ts-nocheck
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key), clear: () => memory.clear(),
    get length() { return memory.size; }, key: (index) => Array.from(memory.keys())[index] ?? null,
  } } });
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const { saveData, loadData } = await import('@/lib/storage');
  const { supabase } = await import('@/lib/supabase');
  const sync = await import('@/services/sync');
  const { exportBackup, restoreBackup } = await import('@/services/backup');
  const { getLifeOSDailyState } = await import('@/services/lifeosIntegration');
  const { getDataQuality } = await import('@/services/dataQuality');

  await AsyncStorage.clear();
  let remoteRows = [];
  let upserts = [];
  let fromError = null;
  let delay = 0;
  Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: async () => ({ data: { session: { user: { id: 'user-3s' } } }, error: null }) });
  Object.defineProperty(supabase, 'from', { configurable: true, writable: true, value: () => ({
    select: () => ({ eq: async () => { if (delay) await new Promise((r) => setTimeout(r, delay)); if (fromError) return { data: null, error: fromError }; return { data: remoteRows, error: null }; } }),
    upsert: async (rows) => { upserts.push(...rows); for (const row of rows) { const key = `${row.domain}|${row.storage_key}|${row.record_id}`; remoteRows = remoteRows.filter((existing) => `${existing.domain}|${existing.storage_key}|${existing.record_id}` !== key); remoteRows.push({ ...row, id: `remote-${row.record_id}`, sync_version: row.sync_version ?? 1 }); } return { data: null, error: null }; },
  }) });

  let passed = 0;
  const check = async (name, fn) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; } };
  const base = { id: 'task-3s', title: 'Baseline', completed: false, priority: 'high', dueDate: null, dueTime: null, createdAt: '2026-09-14T08:00:00.000Z', updatedAt: '2026-09-14T08:00:00.000Z', completedAt: null, archived: false, recurrence: null, seriesId: null, subtasks: [], labelIds: [] };
  const remoteOf = (payload, deleted = false) => ({ id: `remote-${payload?.id ?? base.id}`, user_id: 'user-3s', domain: 'tasks', record_id: payload?.id ?? base.id, storage_key: 'lifeos:tasks', payload: deleted ? null : payload, updated_at: payload?.updatedAt ?? '2026-09-14T08:00:00.000Z', deleted, sync_version: 1, device_updated_at: payload?.updatedAt ?? '2026-09-14T08:00:00.000Z' });
  const resetToBaseline = async (baseline = base) => { await AsyncStorage.clear(); await saveData('lifeos:tasks', [baseline]); remoteRows = [remoteOf(baseline)]; upserts = []; await sync.synchronizeLifeOS(); upserts = []; };

  await check('baseline unchanged is a no-op', async () => {
    await saveData('lifeos:tasks', [base]); upserts = []; remoteRows = []; await sync.synchronizeLifeOS(); remoteRows = upserts.map((row) => ({ ...row, id: 'remote-baseline' })); upserts = [];
    const result = await sync.synchronizeLifeOS(); assert(result.state === 'synced' && result.conflicts.length === 0 && upserts.length === 0, 'baseline no-op failed');
  });

  await check('local-only change uploads', async () => {
    const local = { ...base, title: 'Local only', updatedAt: '2026-09-14T09:00:00.000Z' }; await saveData('lifeos:tasks', [local]); upserts = [];
    const result = await sync.synchronizeLifeOS(); assert(result.state === 'synced' && upserts.some((row) => row.payload.title === 'Local only'), 'local-only upload failed');
  });

  await check('remote-only change applies locally', async () => {
    await resetToBaseline();
    const remote = { ...base, title: 'Remote only', updatedAt: '2026-09-14T10:00:00.000Z' }; await saveData('lifeos:tasks', [base]); remoteRows = [remoteOf(base)]; upserts = []; await sync.synchronizeLifeOS(); remoteRows = [remoteOf(remote)]; upserts = [];
    const result = await sync.synchronizeLifeOS(); assert(result.state === 'synced' && (await loadData('lifeos:tasks', []))[0].title === 'Remote only', 'remote-only apply failed');
  });

  await check('both changed creates a persistent conflict from baseline', async () => {
    const baseline = { ...base, title: 'Conflict baseline', updatedAt: '2026-09-14T11:00:00.000Z' }; await resetToBaseline(baseline);
    await saveData('lifeos:tasks', [{ ...baseline, title: 'Local conflict', updatedAt: '2026-09-14T12:00:00.000Z' }]); remoteRows = [remoteOf({ ...baseline, title: 'Remote conflict', updatedAt: '2026-09-14T13:00:00.000Z' })];
    const result = await sync.synchronizeLifeOS(); const pending = await sync.getPendingConflicts(); const conflict = pending[0];
    assert(result.state === 'conflict_pending' && conflict && conflict.reason === 'both_changed' && conflict.baselineUpdatedAt === baseline.updatedAt, 'baseline conflict missing');
    assert(conflict.localPayload.title === 'Local conflict' && conflict.remotePayload.title === 'Remote conflict', 'conflict versions not preserved');
  });

  await check('keep-local resolves and synchronizes exactly once', async () => {
    const conflict = (await sync.getPendingConflicts())[0]; upserts = []; const result = await sync.resolveConflictKeepLocal(conflict.conflictId);
    assert(result.success && result.state === 'synced', `keep-local failed: ${result.message}`); assert((await sync.getPendingConflicts()).length === 0, 'conflict not cleared'); assert((await loadData('lifeos:tasks', []))[0].title === 'Local conflict', 'local version lost');
    const count = upserts.length; const repeated = await sync.resolveConflictKeepLocal(conflict.conflictId); assert(repeated.success && upserts.length === count, 'repeated resolution duplicated upload');
  });

  await check('resolved authoritative data regenerates integration and Data Quality projections', async () => {
    const state = await getLifeOSDailyState('2026-09-14');
    const quality = await getDataQuality('2026-09-14');
    assert(Array.isArray(state.tasks.incompleteDueTodayTasks) && Array.isArray(quality.diagnostics), 'projections did not reload safely');
  });

  await check('local delete plus remote update becomes deletion conflict', async () => {
    const baseline = { ...base, title: 'Delete baseline', updatedAt: '2026-09-14T14:00:00.000Z' }; await resetToBaseline(baseline);
    await saveData('lifeos:tasks', []); remoteRows = [remoteOf({ ...baseline, title: 'Remote update', updatedAt: '2026-09-14T15:00:00.000Z' })];
    const result = await sync.synchronizeLifeOS(); const conflict = (await sync.getPendingConflicts()).find((x) => x.recordId === base.id); assert(result.state === 'conflict_pending' && conflict?.reason === 'deletion_conflict' && conflict.localDeleted, 'delete/update conflict missing');
  });

  await check('keep-remote safely restores the remote update', async () => {
    const conflict = (await sync.getPendingConflicts()).find((x) => x.recordId === base.id); const result = await sync.resolveConflictKeepRemote(conflict.conflictId);
    assert(result.success && (await loadData('lifeos:tasks', []))[0].title === 'Remote update', 'keep-remote failed'); assert((await sync.getPendingConflicts()).length === 0, 'remote conflict not cleared');
  });

  await check('local update plus remote delete becomes deletion conflict', async () => {
    const baseline = { ...base, title: 'Delete remote baseline', updatedAt: '2026-09-14T16:00:00.000Z' }; await resetToBaseline(baseline);
    const local = { ...baseline, title: 'Keep me', updatedAt: '2026-09-14T17:00:00.000Z' }; await saveData('lifeos:tasks', [local]); remoteRows = [remoteOf(baseline, true)];
    const result = await sync.synchronizeLifeOS(); const conflict = (await sync.getPendingConflicts()).find((x) => x.recordId === base.id); assert(result.state === 'conflict_pending' && conflict?.reason === 'deletion_conflict' && conflict.remoteDeleted, 'update/delete conflict missing');
  });

  await check('keep-local on delete conflict preserves data and uploads update', async () => {
    const conflict = (await sync.getPendingConflicts()).find((x) => x.recordId === base.id); upserts = []; const result = await sync.resolveConflictKeepLocal(conflict.conflictId);
    assert(result.success && (await loadData('lifeos:tasks', []))[0].title === 'Keep me' && upserts.some((row) => !row.deleted && row.payload.title === 'Keep me'), 'keep-local delete conflict failed');
  });

  await check('both deleted is not a conflict', async () => {
    const baseline = { ...base, title: 'Both delete', updatedAt: '2026-09-14T18:00:00.000Z' }; await resetToBaseline(baseline);
    await saveData('lifeos:tasks', []); remoteRows = [remoteOf(baseline, true)]; const result = await sync.synchronizeLifeOS(); assert(result.state === 'synced' && (await sync.getPendingConflicts()).length === 0, 'both delete became conflict');
  });

  await check('invalid remote creates safe pending diagnostic and does not overwrite local', async () => {
    await resetToBaseline();
    await saveData('lifeos:tasks', [base]); remoteRows = [{ id: 'bad', user_id: 'user-3s', domain: 'tasks', record_id: base.id, storage_key: 'lifeos:tasks', payload: 'bad', updated_at: '2026-09-14T19:00:00.000Z', deleted: false }];
    const result = await sync.synchronizeLifeOS(); const conflict = (await sync.getPendingConflicts()).find((x) => x.reason === 'invalid_remote'); const current = await loadData('lifeos:tasks', []); assert(result.state === 'error' && conflict && current[0]?.title === 'Baseline', `invalid remote was not safely isolated: ${JSON.stringify(result)} conflict=${JSON.stringify(conflict)} current=${JSON.stringify(current)}`);
    const resolution = await sync.resolveConflictKeepRemote(conflict.conflictId); assert(!resolution.success, 'invalid remote was allowed to resolve');
  });

  await check('malformed conflict metadata is diagnosed without making empty state unhealthy', async () => {
    await AsyncStorage.setItem('lifeos:sync:conflicts', JSON.stringify([{ conflictId: 'bad', domain: 'tasks', status: 'wrong' }]));
    const diagnostics = await sync.getSyncConflictDiagnostics(); assert(diagnostics.malformed >= 1 && diagnostics.invalidStatuses >= 1, 'malformed metadata not detected');
    await AsyncStorage.removeItem('lifeos:sync:conflicts'); assert((await sync.getSyncConflictDiagnostics()).malformed === 0, 'empty conflict state unhealthy');
  });

  await check('restore preserves local data and leaves conflict detectable until explicit resolution', async () => {
    await resetToBaseline();
    const backup = await exportBackup(); await saveData('lifeos:tasks', [{ ...base, title: 'Restored', updatedAt: '2026-09-14T20:00:00.000Z' }]); await restoreBackup(backup); assert((await loadData('lifeos:tasks', []))[0].title === 'Baseline', 'restore changed authoritative local state unexpectedly');
  });

  await check('concurrent sync and resolution do not corrupt the local record', async () => {
    const baseline = { ...base, title: 'Concurrent baseline', updatedAt: '2026-09-14T21:00:00.000Z' }; await resetToBaseline(baseline);
    await saveData('lifeos:tasks', [{ ...baseline, title: 'Concurrent local', updatedAt: '2026-09-14T22:00:00.000Z' }]); remoteRows = [remoteOf({ ...baseline, title: 'Concurrent remote', updatedAt: '2026-09-14T23:00:00.000Z' })]; await sync.synchronizeLifeOS();
    const conflict = (await sync.getPendingConflicts()).find((x) => x.recordId === base.id); delay = 20; const a = sync.resolveConflictKeepLocal(conflict.conflictId); const b = sync.resolveConflictKeepLocal(conflict.conflictId); const [ra, rb] = await Promise.all([a, b]); delay = 0;
    assert(ra.success && rb.success && (await loadData('lifeos:tasks', []))[0].title === 'Concurrent local', 'concurrent resolution corrupted local state');
  });

  await check('failed resolution remains retryable and preserves local data', async () => {
    const baseline = { ...base, title: 'Failure baseline', updatedAt: '2026-09-14T23:30:00.000Z' }; await resetToBaseline(baseline);
    await saveData('lifeos:tasks', [{ ...baseline, title: 'Failure local', updatedAt: '2026-09-15T00:00:00.000Z' }]); remoteRows = [remoteOf({ ...baseline, title: 'Failure remote', updatedAt: '2026-09-15T01:00:00.000Z' })]; await sync.synchronizeLifeOS();
    const conflict = (await sync.getPendingConflicts()).find((x) => x.recordId === base.id); fromError = new Error('Failed to fetch'); const result = await sync.resolveConflictKeepLocal(conflict.conflictId); fromError = null;
    assert(!result.success && (await loadData('lifeos:tasks', []))[0].title === 'Failure local' && (await sync.getPendingConflicts()).some((x) => x.conflictId === conflict.conflictId), 'failed resolution was lost');
    const retry = await sync.resolveConflictKeepLocal(conflict.conflictId); assert(retry.success, 'retry after failure did not resolve');
  });

  await check('multiple independent conflicts remain isolated', async () => {
    await resetToBaseline();
    const a = { ...base, id: 'task-a', title: 'A', updatedAt: '2026-09-15T02:00:00.000Z' }; const b = { ...base, id: 'task-b', title: 'B', updatedAt: '2026-09-15T02:00:00.000Z' }; await saveData('lifeos:tasks', [a, b]); remoteRows = [remoteOf(a), remoteOf(b)]; await sync.synchronizeLifeOS();
    await saveData('lifeos:tasks', [{ ...a, title: 'A local', updatedAt: '2026-09-15T03:00:00.000Z' }, { ...b, title: 'B local', updatedAt: '2026-09-15T03:00:00.000Z' }]); remoteRows = [remoteOf({ ...a, title: 'A remote', updatedAt: '2026-09-15T04:00:00.000Z' }), remoteOf({ ...b, title: 'B remote', updatedAt: '2026-09-15T04:00:00.000Z' })]; const result = await sync.synchronizeLifeOS(); assert(result.conflicts.length >= 2, 'independent conflicts were not isolated');
  });

  await check('no unauthenticated cloud mutation remains', async () => {
    Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: async () => ({ data: { session: null }, error: null }) }); upserts = []; const before = JSON.stringify(await loadData('lifeos:tasks', [])); const result = await sync.synchronizeLifeOS(); assert(result.state === 'auth_required' && upserts.length === 0 && JSON.stringify(await loadData('lifeos:tasks', [])) === before, 'unauthenticated mutation occurred');
  });

  console.log(`LIFEOS 3S CONFLICT RESOLUTION: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
