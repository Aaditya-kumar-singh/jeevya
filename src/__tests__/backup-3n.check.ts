// JEEVYA 3N: cross-module backup, validation, replace restore, and rollback coverage.
// @ts-nocheck
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
    removeItem: (key: string) => { memory.delete(key); },
    clear: () => { memory.clear(); },
    get length() { return memory.size; },
    key: (index: number) => Array.from(memory.keys())[index] ?? null,
  } } });
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const { saveData, loadData } = await import('@/lib/storage');
  const { exportBackup, validateBackup, restoreBackup, preflightBackup } = await import('@/services/backup');
  const { getJeevyaDailyState } = await import('@/services/jeevyaIntegration');
  const { buildDailyPlan } = await import('@/services/dailyPlan');

  await AsyncStorage.clear();
  let passed = 0;
  const check = async (name, fn) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; } };

  await check('empty-state backup', async () => {
    const backup = await exportBackup();
    assert(backup.format === 'jeevya-backup' && backup.version === 1, 'metadata');
    assert(Object.keys(backup.domains).length === 0, 'empty domains should be omitted');
  });

  const task = { id: 'task-1', title: 'Restore me', completed: false, priority: 'high', dueDate: '2026-09-14', dueTime: null, createdAt: '2026-09-13T10:00:00.000Z', updatedAt: '2026-09-13T10:00:00.000Z', completedAt: null, archived: false, recurrence: null, seriesId: null, subtasks: [], labelIds: ['label-1'] };
  const label = { id: 'label-1', name: 'Important', createdAt: '2026-09-13T10:00:00.000Z' };
  const habit = { id: 'habit-1', name: 'Read', isActive: true, isArchived: false, frequency: 'daily', days: [0,1,2,3,4,5,6], targetCount: 1, startDate: '2026-09-01', endDate: null };
  const book = { id: 'book-1', title: 'Book', author: 'Author', status: 'reading', totalPages: 100, currentPage: 20, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-14T10:00:00.000Z' };
  const account = { id: 'account-1', name: 'Cash', type: 'cash', balance: 100, currency: 'INR', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-14T10:00:00.000Z' };
  const category = { id: 'category-1', name: 'Food', icon: 'utensils', type: 'expense', createdAt: '2026-09-01T10:00:00.000Z' };
  const transaction = { id: 'txn-1', accountId: 'account-1', type: 'expense', amount: 20, categoryId: 'category-1', title: 'Lunch', note: '', date: '2026-09-14', createdAt: '2026-09-14T09:00:00.000Z', updatedAt: '2026-09-14T09:00:00.000Z' };
  const sleep = { id: 'sleep-1', date: '2026-09-14', sleepStart: '2026-09-13T23:00:00.000Z', sleepEnd: '2026-09-14T07:00:00.000Z', durationMinutes: 480, quality: 'excellent', createdAt: '2026-09-14T07:00:00.000Z', updatedAt: '2026-09-14T07:00:00.000Z' };

  await check('populated multi-domain backup and domain inclusion', async () => {
    await saveData('jeevya:tasks', [task]); await saveData('jeevya:labels', [label]); await saveData('jeevya:habits', [habit]);
    await saveData('jeevya:books', [book]); await saveData('jeevya:finance:accounts', [account]); await saveData('jeevya:finance:categories', [category]);
    await saveData('jeevya:finance:transactions', [transaction]); await saveData('jeevya:health:sleep', [sleep]);
    const backup = await exportBackup();
    assert(Object.keys(backup.domains).includes('tasks') && Object.keys(backup.domains).includes('finance'), 'domains missing');
    assert(!('dailyPlan' in backup) && !('dailyPulse' in backup) && !('analytics' in backup) && !('search' in backup), 'derived data duplicated');
    assert(JSON.stringify(backup).indexOf('SUPABASE') === -1, 'secret leaked');
  });

  await check('deterministic output structure and preserved records', async () => {
    const a = await exportBackup(); const b = await exportBackup();
    assert(JSON.stringify(Object.keys(a.domains)) === JSON.stringify(Object.keys(b.domains)), 'domain order changed');
    assert(JSON.stringify(a.domains) === JSON.stringify(b.domains), 'domain payload changed');
    assert(a.domains.tasks['jeevya:tasks'][0].id === task.id, 'ID not preserved');
    assert(a.domains.tasks['jeevya:tasks'][0].createdAt === task.createdAt, 'timestamp not preserved');
  });

  await check('invalid JSON rejection', async () => assert(!validateBackup('{bad-json').valid, 'invalid JSON accepted'));
  await check('invalid format rejection', async () => assert(!validateBackup({ format: 'other', version: 1, createdAt: new Date().toISOString(), appVersion: '1', domains: {} }).valid, 'format accepted'));
  await check('unsupported future version rejection', async () => assert(!validateBackup({ format: 'jeevya-backup', version: 99, createdAt: new Date().toISOString(), appVersion: '1', domains: {} }).valid, 'future version accepted'));
  await check('malformed domain rejection', async () => assert(!validateBackup({ format: 'jeevya-backup', version: 1, createdAt: new Date().toISOString(), appVersion: '1', domains: { tasks: [] } }).valid, 'malformed domain accepted'));
  await check('invalid IDs and dates rejection', async () => {
    const bad = { format: 'jeevya-backup', version: 1, createdAt: new Date().toISOString(), appVersion: '1', domains: { tasks: { 'jeevya:tasks': [{ id: '', dueDate: 'not-a-date' }] } } };
    const result = validateBackup(bad); assert(!result.valid && result.issues.some((x) => x.code === 'invalid_id') && result.issues.some((x) => x.code === 'invalid_date'), 'invalid fields accepted');
  });
  await check('invalid relationships rejection', async () => {
    const bad = { format: 'jeevya-backup', version: 1, createdAt: new Date().toISOString(), appVersion: '1', domains: { tasks: { 'jeevya:tasks': [{ id: 't', labelIds: ['missing'] }] } } };
    const result = validateBackup(bad); assert(!result.valid && result.issues.some((x) => x.code === 'invalid_relationship'), 'broken relationship accepted');
  });

  await check('preflight validation does not mutate data', async () => {
    const before = await loadData('jeevya:tasks', []); const result = await preflightBackup(JSON.stringify(await exportBackup())); const after = await loadData('jeevya:tasks', []);
    assert(result.valid && JSON.stringify(before) === JSON.stringify(after), 'preflight mutated data');
  });

  await check('successful restore with replace semantics', async () => {
    const source = await exportBackup();
    await saveData('jeevya:tasks', [{ ...task, id: 'old-task', title: 'Old' }]);
    await saveData('jeevya:journal', [{ id: 'stale-journal', date: '2026-09-14', title: 'stale' }]);
    const result = await restoreBackup(source);
    assert(result.success, result.message);
    const restored = await loadData('jeevya:tasks', []); const stale = await loadData('jeevya:journal', []);
    assert(restored[0].id === 'task-1' && stale.length === 0, 'replace semantics failed');
  });

  await check('restored cross-domain relationships and regenerated projections', async () => {
    const restored = await loadData('jeevya:tasks', []); const labels = await loadData('jeevya:labels', []); const tx = await loadData('jeevya:finance:transactions', []);
    assert(restored[0].labelIds[0] === labels[0].id && tx[0].accountId === account.id, 'relationships not restored');
    const state = await getJeevyaDailyState('2026-09-14'); const plan = buildDailyPlan(state);
    assert(plan.date === '2026-09-14' && plan.items.some((item) => item.source === 'tasks'), 'daily projections did not regenerate');
  });

  await check('missing optional domains remain valid', async () => {
    const minimal = { format: 'jeevya-backup', version: 1, createdAt: new Date().toISOString(), appVersion: '1', domains: { tasks: { 'jeevya:tasks': [task], 'jeevya:labels': [label] } } };
    assert(validateBackup(minimal).valid, 'optional domains incorrectly required');
  });

  await check('duplicate prevention', async () => {
    const duplicate = { format: 'jeevya-backup', version: 1, createdAt: new Date().toISOString(), appVersion: '1', domains: { tasks: { 'jeevya:tasks': [task, task] } } };
    assert(!validateBackup(duplicate).valid, 'duplicate record accepted');
  });

  await check('failed restore preserves existing data through rollback', async () => {
    const original = await loadData('jeevya:tasks', []);
    const source = await exportBackup();
    const originalMultiSet = AsyncStorage.multiSet;
    let writeCalls = 0;
    AsyncStorage.multiSet = async (entries) => {
      writeCalls += 1;
      if (writeCalls === 1) {
        if (entries[0]) await originalMultiSet([entries[0]]);
        throw new Error('forced write failure');
      }
      return originalMultiSet(entries);
    };
    const result = await restoreBackup(source);
    AsyncStorage.multiSet = originalMultiSet;
    const after = await loadData('jeevya:tasks', []);
    assert(!result.success && JSON.stringify(after) === JSON.stringify(original), 'rollback did not preserve data');
  });

  await check('no destructive mutation behavior outside explicit replace restore', async () => {
    const before = await loadData('jeevya:books', []);
    await preflightBackup(await exportBackup());
    const after = await loadData('jeevya:books', []);
    assert(JSON.stringify(before) === JSON.stringify(after), 'validation changed books');
  });

  await AsyncStorage.clear();
  console.log(`JEEVYA 3N BACKUP: ${passed} passed, 0 failed`);
})();
