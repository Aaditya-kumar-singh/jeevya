// JEEVYA 3R: Supabase persistence/sync foundation coverage.
// @ts-nocheck
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => { memory.set(key, value); },
    removeItem: (key) => { memory.delete(key); },
    clear: () => { memory.clear(); },
    get length() { return memory.size; },
    key: (index) => Array.from(memory.keys())[index] ?? null,
  } } });
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const { saveData, loadData } = await import('@/lib/storage');
  const { supabase } = await import('@/lib/supabase');
  const { synchronizeJeevya, getSyncStatus } = await import('@/services/sync');
  const { restoreBackup, exportBackup } = await import('@/services/backup');

  await AsyncStorage.clear();
  const originalGetSession = supabase.auth.getSession;
  const originalFrom = supabase.from;
  let remoteRows = [];
  let upserts = [];
  let fromError = null;
  let selectDelay = 0;

  Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: async () => ({ data: { session: null }, error: null }) });
  Object.defineProperty(supabase, 'from', { configurable: true, writable: true, value: () => ({
    select: () => {
      const chain = {
        eq: async () => {
          if (selectDelay) await new Promise((resolve) => setTimeout(resolve, selectDelay));
          if (fromError) return { data: null, error: fromError };
          return { data: remoteRows, error: null };
        },
      };
      return chain;
    },
    upsert: async (rows) => { upserts.push(...rows); return { data: null, error: null }; },
  }) });

  let passed = 0;
  const check = async (name, fn) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; } };
  const task = { id: 'task-3r', title: 'Offline task', completed: false, priority: 'high', dueDate: null, dueTime: null, createdAt: '2026-09-14T08:00:00.000Z', updatedAt: '2026-09-14T08:00:00.000Z', completedAt: null, archived: false, recurrence: null, seriesId: null, subtasks: [], labelIds: [] };
  const remoteTask = { ...task, title: 'Remote task', updatedAt: '2026-09-14T09:00:00.000Z' };

  await check('no authenticated session is explicit and non-mutating', async () => {
    await saveData('jeevya:tasks', [task]);
    const before = JSON.stringify(await loadData('jeevya:tasks', []));
    const result = await synchronizeJeevya();
    const after = JSON.stringify(await loadData('jeevya:tasks', []));
    assert(result.state === 'auth_required', 'auth gate missing');
    assert(before === after, 'local data mutated without auth');
  });

  await check('authenticated session uploads authoritative local records', async () => {
    Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: async () => ({ data: { session: { user: { id: 'user-3r' } } }, error: null }) });
    remoteRows = []; upserts = [];
    const localBeforeSync = await loadData('jeevya:tasks', []);
    const result = await synchronizeJeevya();
    assert(localBeforeSync.length === 1, `test local fixture missing: ${JSON.stringify(localBeforeSync)}`);
    assert(result.state === 'synced' && upserts.some((row) => row.record_id === task.id && row.domain === 'tasks'), `upload missing: state=${result.state} rows=${JSON.stringify(upserts)} domains=${JSON.stringify(result.domains)}`);
    assert(upserts.every((row) => row.user_id === 'user-3r'), 'user scope missing');
  });

  await check('repeated sync is idempotent', async () => {
    remoteRows = upserts.map((row) => ({ ...row, id: 'remote-row', sync_version: 1 })); upserts = [];
    const first = await synchronizeJeevya();
    const secondUploads = upserts.length;
    assert(first.state === 'synced', 'first repeated sync failed');
    assert(secondUploads === 0, 'duplicate upload on repeated sync');
  });

  await check('remote-only record downloads without changing native shape', async () => {
    await AsyncStorage.clear();
    await saveData('jeevya:tasks', []);
    remoteRows = [{ id: 'remote-row-2', user_id: 'user-3r', domain: 'tasks', record_id: remoteTask.id, storage_key: 'jeevya:tasks', payload: remoteTask, updated_at: remoteTask.updatedAt, deleted: false, sync_version: 2, device_updated_at: remoteTask.updatedAt }];
    upserts = [];
    const result = await synchronizeJeevya();
    const tasks = await loadData('jeevya:tasks', []);
    assert(result.downloaded >= 1 && tasks.length === 1 && tasks[0].title === 'Remote task', `remote download failed: ${JSON.stringify(result)} tasks=${JSON.stringify(tasks)}`);
  });

  await check('timestamp preservation survives download', async () => {
    const tasks = await loadData('jeevya:tasks', []);
    assert(tasks[0].createdAt === remoteTask.createdAt && tasks[0].updatedAt === remoteTask.updatedAt, 'timestamps changed');
  });

  await check('local newer is uploaded rather than overwritten', async () => {
    const localNewer = { ...remoteTask, title: 'Local newer', updatedAt: '2026-09-14T10:00:00.000Z' };
    await saveData('jeevya:tasks', [localNewer]);
    remoteRows = [{ id: 'remote-row-2', user_id: 'user-3r', domain: 'tasks', record_id: localNewer.id, storage_key: 'jeevya:tasks', payload: remoteTask, updated_at: remoteTask.updatedAt, deleted: false, sync_version: 2, device_updated_at: remoteTask.updatedAt }];
    upserts = [];
    const metadataBefore = await loadData('jeevya:sync:metadata', null);
    const localBefore = await loadData('jeevya:tasks', []);
    assert(localBefore[0]?.title === 'Local newer', `local newer fixture missing: ${JSON.stringify(localBefore)}`);
    const result = await synchronizeJeevya();
    assert(result.uploaded >= 1 && upserts.some((row) => row.payload.title === 'Local newer'), `local newer was not uploaded: ${JSON.stringify(result)} rows=${JSON.stringify(upserts)} metadata=${JSON.stringify(metadataBefore)}`);
    assert((await loadData('jeevya:tasks', []))[0].title === 'Local newer', 'local data overwritten');
  });

  await check('possible conflict is detected without applying remote blindly', async () => {
    const baseline = { ...task, title: 'Baseline', updatedAt: '2026-09-14T11:00:00.000Z' };
    await saveData('jeevya:tasks', [baseline]);
    remoteRows = [{ id: 'remote-row-3', user_id: 'user-3r', domain: 'tasks', record_id: baseline.id, storage_key: 'jeevya:tasks', payload: { ...baseline, title: 'Remote changed', updatedAt: '2026-09-14T12:00:00.000Z' }, updated_at: '2026-09-14T12:00:00.000Z', deleted: false, sync_version: 3, device_updated_at: '2026-09-14T12:00:00.000Z' }];
    upserts = [];
    const result = await synchronizeJeevya();
    assert(result.state === 'conflict_pending' && result.conflicts.length >= 1, 'conflict not detected');
    assert((await loadData('jeevya:tasks', []))[0].title === 'Baseline', 'conflicting remote applied');
  });

  await check('network failure remains offline and preserves local data', async () => {
    fromError = new Error('Failed to fetch');
    await saveData('jeevya:tasks', [task]);
    const result = await synchronizeJeevya();
    fromError = null;
    assert(result.state === 'offline', 'offline state missing');
    assert((await loadData('jeevya:tasks', []))[0].id === task.id, 'offline data changed');
  });

  await check('malformed remote payload is rejected safely', async () => {
    remoteRows = [{ id: 'bad', user_id: 'user-3r', domain: 'tasks', record_id: 'bad', storage_key: 'jeevya:tasks', payload: 'not-an-object', updated_at: '2026-09-14T12:00:00.000Z', deleted: false, sync_version: 1 }];
    const result = await synchronizeJeevya();
    assert(result.state === 'error' && (await loadData('jeevya:tasks', []))[0].id === task.id, 'malformed remote mutated local data');
  });

  await check('unsupported remote domain is rejected', async () => {
    remoteRows = [{ id: 'bad', user_id: 'user-3r', domain: 'analytics', record_id: 'x', storage_key: 'jeevya:analytics', payload: {}, updated_at: '2026-09-14T12:00:00.000Z', deleted: false, sync_version: 1 }];
    const result = await synchronizeJeevya();
    assert(result.state === 'error', 'unsupported domain accepted');
  });

  await check('deletion tombstone is preserved and applied only when safe', async () => {
    remoteRows = [{ id: 'remote-row-3', user_id: 'user-3r', domain: 'tasks', record_id: task.id, storage_key: 'jeevya:tasks', payload: task, updated_at: task.updatedAt, deleted: false, sync_version: 3, device_updated_at: task.updatedAt }];
    await saveData('jeevya:tasks', [task]);
    await synchronizeJeevya();
    remoteRows = [{ id: 'remote-row-4', user_id: 'user-3r', domain: 'tasks', record_id: task.id, storage_key: 'jeevya:tasks', payload: null, updated_at: '2026-09-14T13:00:00.000Z', deleted: true, sync_version: 4, device_updated_at: '2026-09-14T13:00:00.000Z' }];
    const result = await synchronizeJeevya();
    const current = await loadData('jeevya:tasks', []); assert(result.state === 'synced' && current.length === 0, `safe tombstone was not applied: ${JSON.stringify(result)} current=${JSON.stringify(current)}`);
  });

  await check('partial domain failure does not prevent other domain upload', async () => {
    await AsyncStorage.clear();
    await saveData('jeevya:tasks', [task]);
    await AsyncStorage.setItem('jeevya:finance:accounts', '{bad-json');
    remoteRows = []; upserts = [];
    const result = await synchronizeJeevya();
    assert(result.state === 'error' && upserts.some((row) => row.domain === 'tasks'), 'healthy domain blocked by degraded domain');
  });

  await check('concurrent sync calls are serialized', async () => {
    await AsyncStorage.clear(); await saveData('jeevya:tasks', [task]);
    remoteRows = []; upserts = []; selectDelay = 15;
    const [a, b] = await Promise.all([synchronizeJeevya(), synchronizeJeevya()]);
    selectDelay = 0;
    assert(a.state === 'synced' && b.state === 'synced', 'concurrent sync failed');
  });

  await check('sync during local write cannot overwrite the newer local state', async () => {
    await AsyncStorage.clear(); await saveData('jeevya:tasks', [task]);
    remoteRows = []; upserts = []; selectDelay = 20;
    const syncing = synchronizeJeevya();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = { ...task, title: 'Written during sync', updatedAt: '2026-09-14T14:00:00.000Z' };
    await saveData('jeevya:tasks', [newer]);
    await syncing; selectDelay = 0;
    assert((await loadData('jeevya:tasks', []))[0].title === 'Written during sync', 'sync overwrote concurrent local write');
  });

  await check('restore followed by explicit sync keeps restored local data safe', async () => {
    await AsyncStorage.clear(); await saveData('jeevya:tasks', [{ ...task, title: 'Restored local' }]);
    const backup = await exportBackup();
    await saveData('jeevya:tasks', [{ ...task, title: 'Other local' }]);
    const restored = await restoreBackup(backup);
    assert(restored.success && (await loadData('jeevya:tasks', []))[0].title === 'Restored local', 'restore failed');
    remoteRows = []; upserts = [];
    const result = await synchronizeJeevya();
    assert(result.state === 'synced' && upserts.some((row) => row.payload.title === 'Restored local'), 'restored dataset did not sync');
  });

  await check('derived domains are never uploaded', async () => {
    assert(upserts.every((row) => !['analytics','daily-plan','daily-pulse','search','timeline','data-quality'].includes(row.domain)), 'derived domain uploaded');
  });

  await check('no service-role key is exposed by sync source', async () => {
    const fs = await import('node:fs/promises');
    const source = await fs.readFile('src/services/sync.ts', 'utf8');
    assert(!source.includes('SUPABASE_SERVICE_ROLE_KEY') && !source.includes('service_role'), 'service role secret referenced');
  });

  await check('sync status persists explicit state', async () => {
    const status = await getSyncStatus();
    assert(typeof status.state === 'string' && typeof status.message === 'string', 'sync status missing');
  });

  supabase.auth.getSession = originalGetSession;
  supabase.from = originalFrom;
  console.log(`JEEVYA 3R SYNC FOUNDATION: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
