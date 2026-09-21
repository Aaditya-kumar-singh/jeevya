import AsyncStorage from '@react-native-async-storage/async-storage';
import { readStorage, updateStorage } from '@/services/storageReliability';
import { createTask, getTasks, updateTask } from '@/services/tasks';
import { createHabit, setHabitCompletion, toggleHabitCompletion, getHabitLogs } from '@/services/habits';
import { getJeevyaDailyState } from '@/services/jeevyaIntegration';
import { getDailyPlan } from '@/services/dailyPlan';
import { getUnifiedGoals } from '@/services/goalsIntegration';
import { getJeevyaAnalytics } from '@/services/jeevyaAnalytics';
import { getLifeIntelligence } from '@/services/lifeIntelligence';
import { searchJeevya } from '@/services/unifiedSearch';
import { getLifeTimeline } from '@/services/lifeTimeline';
import { getDataQuality } from '@/services/dataQuality';
import { exportBackup, restoreBackup, serializeBackup } from '@/services/backup';

(globalThis as any).window = globalThis;
const memoryStore = new Map<string, string>();
AsyncStorage.getItem = async (key) => memoryStore.get(key) ?? null;
AsyncStorage.setItem = async (key, value) => { memoryStore.set(key, value); };
AsyncStorage.removeItem = async (key) => { memoryStore.delete(key); };
AsyncStorage.clear = async () => { memoryStore.clear(); };
AsyncStorage.multiGet = async (keys) => keys.map((key) => [key, memoryStore.get(key) ?? null] as [string, string | null]);
AsyncStorage.multiSet = async (entries) => { for (const [key, value] of entries) memoryStore.set(key, value); };
AsyncStorage.multiRemove = async (keys) => { for (const key of keys) memoryStore.delete(key); };
AsyncStorage.getAllKeys = async () => [...memoryStore.keys()];

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function clear() { await AsyncStorage.clear(); }

(async () => {
  let passed = 0;
  const check = async (name: string, fn: () => Promise<void> | void) => { await fn(); passed++; console.log(`PASS ${name}`); };

  await check('missing key is a valid empty state', async () => {
    await clear();
    const result = await readStorage('jeevya:tasks', []);
    assert(result.status === 'missing' && Array.isArray(result.value) && result.value.length === 0, 'missing key not empty');
  });

  await check('malformed JSON is contained and classified', async () => {
    await AsyncStorage.setItem('jeevya:tasks', '{bad-json');
    const result = await readStorage('jeevya:tasks', []);
    assert(result.status === 'malformed' && Array.isArray(result.value), 'malformed JSON not contained');
  });

  await check('valid empty and populated storage reads safely', async () => {
    await AsyncStorage.setItem('jeevya:tasks', '[]');
    assert((await readStorage('jeevya:tasks', [])).status === 'ok', 'empty read failed');
    await AsyncStorage.setItem('jeevya:tasks', JSON.stringify([{ id: 't1', title: 'Keep', completed: false }]));
    const result = await readStorage<{ id: string }[]>('jeevya:tasks', []);
    assert(result.status === 'ok' && result.value[0].id === 't1', 'populated read failed');
  });

  await check('individual malformed task records do not crash domain reads', async () => {
    await AsyncStorage.setItem('jeevya:tasks', JSON.stringify([null, 42, { id: 'good', title: 'Good' }]));
    const tasks = await getTasks();
    assert(tasks.length === 1 && tasks[0].id === 'good', 'task record isolation failed');
  });

  await check('read failure is surfaced by storage primitive', async () => {
    const original = AsyncStorage.getItem;
    AsyncStorage.getItem = async () => { throw new Error('read unavailable'); };
    try {
      const result = await readStorage('jeevya:tasks', []);
      assert(result.status === 'unavailable', 'read failure not classified');
    } finally { AsyncStorage.getItem = original; }
  });

  await check('write failure is surfaced and does not report success', async () => {
    const original = AsyncStorage.setItem;
    AsyncStorage.setItem = async () => { throw new Error('write unavailable'); };
    try {
      let failed = false;
      try { await updateStorage<{ id: string }[]>('jeevya:tasks', [], (items) => [...items, { id: 'x' }]); } catch { failed = true; }
      assert(failed, 'write failure was swallowed');
    } finally { AsyncStorage.setItem = original; }
  });

  await check('concurrent task creates preserve both mutations', async () => {
    await clear();
    const [a, b] = await Promise.all([
      createTask({ title: 'Concurrent A' }),
      createTask({ title: 'Concurrent B' }),
    ]);
    const tasks = await getTasks();
    assert(tasks.some((x) => x.id === a.id) && tasks.some((x) => x.id === b.id) && tasks.length === 2, 'task race lost a write');
  });

  await check('concurrent task updates preserve the latest serialized mutation', async () => {
    await clear();
    const task = await createTask({ title: 'Original' });
    await Promise.all([updateTask(task.id, { title: 'First' }), updateTask(task.id, { description: 'Second' })]);
    const current = (await getTasks()).find((x) => x.id === task.id)!;
    assert(current.title === 'First' && current.description === 'Second', 'task updates lost fields');
  });

  await check('concurrent habit creates preserve both mutations', async () => {
    await clear();
    const input = { icon: 'check', color: '#fff', frequency: 'daily' as const, days: [] };
    const [a, b] = await Promise.all([createHabit({ ...input, name: 'Habit A' }), createHabit({ ...input, name: 'Habit B' })]);
    const raw = await readStorage<any[]>('jeevya:habits', []);
    assert(raw.status === 'ok' && raw.value.length === 2 && raw.value.some(x => x.id === a.id) && raw.value.some(x => x.id === b.id), 'habit race lost a write');
  });

  await check('concurrent habit toggles are serialized without duplicate records', async () => {
    await clear();
    const habit = await createHabit({ name: 'Toggle', icon: 'check', color: '#fff', frequency: 'daily', days: [] });
    await Promise.all([toggleHabitCompletion(habit.id, '2026-09-14'), toggleHabitCompletion(habit.id, '2026-09-14')]);
    const logs = await getHabitLogs(habit.id);
    assert(logs.length === 1, 'duplicate habit log created');
  });

  await check('repeated explicit habit saves remain idempotent by date', async () => {
    await clear();
    const habit = await createHabit({ name: 'Repeat', icon: 'check', color: '#fff', frequency: 'daily', days: [] });
    const a = await setHabitCompletion(habit.id, '2026-09-14', true);
    const b = await setHabitCompletion(habit.id, '2026-09-14', false);
    const logs = await getHabitLogs(habit.id);
    assert(logs.length === 1 && logs[0].id === a.id && logs[0].id === b.id && logs[0].completed === false, 'repeated habit save duplicated');
  });

  await check('one malformed domain does not block integration', async () => {
    await clear();
    await AsyncStorage.setItem('jeevya:finance:accounts', '{bad-json');
    const state = await getJeevyaDailyState('2026-09-14');
    assert(state.tasks && state.habits && state.dataQuality?.degradedDomains.includes('finance'), 'finance failure was not isolated');
  });

  await check('multiple malformed domains remain isolated', async () => {
    await AsyncStorage.setItem('jeevya:nutrition:foods', '{bad-json');
    await AsyncStorage.setItem('jeevya:journal', '{bad-json');
    const state = await getJeevyaDailyState('2026-09-14');
    assert(state.dataQuality?.degradedDomains.includes('nutrition') && state.dataQuality?.degradedDomains.includes('journal'), 'multiple failures not reported');
  });

  await check('dependent projections regenerate after mutation', async () => {
    await clear();
    const task = await createTask({ title: 'Projection task', dueDate: '2026-09-14' });
    const state = await getJeevyaDailyState('2026-09-14');
    const plan = await getDailyPlan('2026-09-14');
    const goals = await getUnifiedGoals('2026-09-14');
    const analytics = await getJeevyaAnalytics(7, '2026-09-14');
    const intelligence = await getLifeIntelligence('2026-09-14');
    const search = await searchJeevya('Projection task');
    const timeline = await getLifeTimeline({ startDate: '2026-09-14', endDate: '2026-09-14' });
    assert(state.tasks.dueToday >= 1, 'Daily Pulse stale');
    assert(plan.items.some((x) => x.actionTargetId === task.id), 'Daily Plan stale');
    assert(Array.isArray(goals) && Array.isArray(analytics.points) && Array.isArray(intelligence.insights), 'projection reload failed');
    assert(search.results.some((x) => x.id === task.id), 'Unified Search stale');
    assert(timeline.events.some((x) => x.sourceId === task.id), 'Timeline stale');
  });

  await check('data quality reports storage corruption as degraded', async () => {
    await clear();
    await AsyncStorage.setItem('jeevya:tasks', '{bad-json');
    const quality = await getDataQuality('2026-09-14');
    assert(quality.overallStatus !== 'healthy' && quality.degradedDomains.includes('tasks'), 'corruption reported healthy');
  });

  await check('overlapping integration reads are deterministic', async () => {
    await clear();
    await createTask({ title: 'Stable' });
    const [a, b, c] = await Promise.all([
      getJeevyaDailyState('2026-09-14'),
      getJeevyaDailyState('2026-09-14'),
      getJeevyaDailyState('2026-09-14'),
    ]);
    assert(JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(b) === JSON.stringify(c), 'overlapping reads diverged');
  });

  await check('export during reads does not mutate domain data', async () => {
    await clear();
    await createTask({ title: 'Export read safety' });
    const before = await AsyncStorage.getItem('jeevya:tasks');
    await Promise.all([getJeevyaDailyState('2026-09-14'), getLifeTimeline(), exportBackup()]);
    const after = await AsyncStorage.getItem('jeevya:tasks');
    assert(before === after, 'export/read changed domain data');
  });

  await check('invalid restore preserves existing data', async () => {
    await clear();
    await createTask({ title: 'Keep me' });
    const before = await AsyncStorage.getItem('jeevya:tasks');
    const result = await restoreBackup('{not-json');
    assert(!result.success && (await AsyncStorage.getItem('jeevya:tasks')) === before, 'invalid restore mutated data');
  });

  await check('failed restore rolls back all touched keys', async () => {
    await clear();
    await createTask({ title: 'Original' });
    const backup = await exportBackup();
    const originalSet = AsyncStorage.multiSet;
    let calls = 0;
    AsyncStorage.multiSet = async (entries) => { calls++; if (calls === 1) throw new Error('restore write failed'); return originalSet.call(AsyncStorage, entries); };
    try {
      const result = await restoreBackup(serializeBackup(backup));
      const tasks = await getTasks();
      assert(!result.success && tasks.some((x) => x.title === 'Original'), 'restore rollback failed');
    } finally { AsyncStorage.multiSet = originalSet; }
  });

  await check('successful restore reloads immediately', async () => {
    await clear();
    const original = await createTask({ title: 'Restored' });
    const backup = await exportBackup();
    await createTask({ title: 'Extra' });
    const result = await restoreBackup(serializeBackup(backup));
    const tasks = await getTasks();
    assert(result.success && tasks.length === 1 && tasks[0].id === original.id, 'successful restore not reloadable');
    const state = await getJeevyaDailyState('2026-09-14');
    assert(state.tasks.total === 1, 'post-restore projection stale');
  });

  await check('corrupted domain remains recoverable without automatic wipe', async () => {
    await clear();
    await createTask({ title: 'Recoverable' });
    await AsyncStorage.setItem('jeevya:tasks', '{corrupt');
    const result = await getDataQuality('2026-09-14');
    assert(result.degradedDomains.includes('tasks'), 'corruption not diagnostic');
    const stored = await AsyncStorage.getItem('jeevya:tasks');
    assert(stored === '{corrupt', 'corrupted data was automatically wiped');
  });

  await check('same source state produces deterministic projections', async () => {
    await clear();
    await createTask({ title: 'Deterministic' });
    const a = await getLifeTimeline({ startDate: '2026-09-14', endDate: '2026-09-14' });
    const b = await getLifeTimeline({ startDate: '2026-09-14', endDate: '2026-09-14' });
    assert(JSON.stringify(a) === JSON.stringify(b), 'timeline projection is non-deterministic');
  });

  console.log(`JEEVYA 3Q OFFLINE RELIABILITY: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
