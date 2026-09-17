// LIFEOS 3P: cross-module historical analytics and period comparison coverage.
// @ts-nocheck
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key), clear: () => memory.clear(),
    get length() { return memory.size; }, key: (index) => Array.from(memory.keys())[index] ?? null,
  } } });
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const { saveData } = await import('@/lib/storage');
  const { getHistoricalAnalytics } = await import('@/services/historicalAnalytics');
  const { getLifeTimeline } = await import('@/services/lifeTimeline');

  await AsyncStorage.clear();
  let passed = 0;
  const check = async (name, fn) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; } };
  const iso = (date, hour = '12:00:00') => `${date}T${hour}.000Z`;
  const task = (id, created, completed = null, dueDate = created.slice(0, 10)) => ({ id, title: `Task ${id}`, description: '', completed: !!completed, priority: 'medium', dueDate, dueTime: null, createdAt: created, updatedAt: completed || created, completedAt: completed, archived: false, recurrence: null, seriesId: null, subtasks: [], labelIds: [] });

  await check('empty data', async () => {
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14' });
    assert(result.metrics.length > 0, 'expected stable metric model');
    assert(result.metrics.every((m) => m.currentValue === null || m.currentValue === 0), 'empty data fabricated values');
    assert(result.range.startDate === '2026-09-08' && result.range.previousStartDate === '2026-09-01', '7-day range incorrect');
  });

  await check('7-day comparison', async () => {
    await saveData('lifeos:tasks', [task('current', iso('2026-09-10'), iso('2026-09-11')), task('previous', iso('2026-09-02'), iso('2026-09-03'))]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'tasks' });
    const completed = result.metrics.find((m) => m.id === 'tasks:completed');
    assert(completed.currentValue === 1 && completed.previousValue === 1 && completed.absoluteChange === 0, '7-day comparison incorrect');
  });

  await check('30-day comparison', async () => {
    const result = await getHistoricalAnalytics({ period: 30, endDate: '2026-09-30', filter: 'tasks' });
    assert(result.range.startDate === '2026-09-01' && result.range.previousStartDate === '2026-08-02' && result.range.previousEndDate === '2026-08-31', '30-day range incorrect');
  });

  await check('90-day comparison and previous-period calculation', async () => {
    const result = await getHistoricalAnalytics({ period: 90, endDate: '2026-09-30', filter: 'tasks' });
    assert(result.range.startDate === '2026-07-03' && result.range.previousStartDate === '2026-04-04', '90-day range incorrect');
  });

  await check('task metrics and overdue behavior', async () => {
    await saveData('lifeos:tasks', [task('a', iso('2026-09-10'), iso('2026-09-11'), '2026-09-11'), task('b', iso('2026-09-12'), null, '2026-09-12'), task('c', iso('2026-09-02'), iso('2026-09-02'), '2026-09-02')]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'tasks' });
    const done = result.metrics.find((m) => m.id === 'tasks:completed'); const overdue = result.metrics.find((m) => m.id === 'tasks:overdue');
    assert(done.currentValue === 1 && overdue.currentValue === 1, 'task metrics incorrect');
  });

  await check('habit metrics', async () => {
    await saveData('lifeos:habits', [{ id: 'h1', name: 'Read', isActive: true, isArchived: false, startDate: '2026-08-01', endDate: null }]);
    await saveData('lifeos:habit-logs', [{ id: 'hl1', habitId: 'h1', date: '2026-09-10', completed: true, value: null, createdAt: iso('2026-09-10'), updatedAt: iso('2026-09-10') }, { id: 'hl2', habitId: 'h1', date: '2026-09-02', completed: true, value: null, createdAt: iso('2026-09-02'), updatedAt: iso('2026-09-02') }]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'habits' });
    assert(result.metrics.find((m) => m.id === 'habits:completions').currentValue === 1, 'habit completion count');
    assert(result.metrics.find((m) => m.id === 'habits:completion-rate').currentValue > 0, 'habit rate missing');
  });

  await check('workout history', async () => {
    await saveData('lifeos:workouts:sessions', [{ id: 'w1', name: 'Run', startedAt: iso('2026-09-10', '08:00:00'), completedAt: iso('2026-09-10', '09:00:00'), status: 'completed', durationSeconds: 3600, createdAt: iso('2026-09-10'), updatedAt: iso('2026-09-10'), exercises: [{ exerciseId: 'e', sets: [{ completed: true }, { completed: true }] }] }, { id: 'w2', name: 'Old', startedAt: iso('2026-09-02'), completedAt: iso('2026-09-02', '13:00:00'), status: 'completed', durationSeconds: 1800, createdAt: iso('2026-09-02'), updatedAt: iso('2026-09-02'), exercises: [{ exerciseId: 'e', sets: [{ completed: true }] }] }]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'health' });
    assert(result.metrics.find((m) => m.id === 'workout:sessions').currentValue === 1 && result.metrics.find((m) => m.id === 'workout:minutes').currentValue === 60, 'workout metrics');
  });

  await check('sleep history and insufficient data', async () => {
    await saveData('lifeos:health:sleep', [{ id: 's1', date: '2026-09-10', durationMinutes: 480, quality: 'good', sleepStart: iso('2026-09-09', '23:00:00'), sleepEnd: iso('2026-09-10', '07:00:00'), createdAt: iso('2026-09-10'), updatedAt: iso('2026-09-10') }]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'health' });
    const sleep = result.metrics.find((m) => m.id === 'sleep:average-duration');
    assert(sleep.currentValue === 480 && sleep.previousValue === null && sleep.status === 'insufficient_data', 'sleep insufficient data');
  });

  await check('nutrition history', async () => {
    await saveData('lifeos:nutrition:food-logs', [{ id: 'f1', foodId: 'food', quantity: 1, unit: 'serving', mealType: 'breakfast', date: '2026-09-10', createdAt: iso('2026-09-10'), updatedAt: iso('2026-09-10') }, { id: 'f2', foodId: 'food', quantity: 1, unit: 'serving', mealType: 'lunch', date: '2026-09-10', createdAt: iso('2026-09-10'), updatedAt: iso('2026-09-10') }]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'nutrition' });
    assert(result.metrics.find((m) => m.id === 'nutrition:meals').currentValue === 2 && result.metrics.find((m) => m.id === 'nutrition:logged-days').currentValue === 1, 'nutrition metrics');
  });

  await check('finance history', async () => {
    await saveData('lifeos:finance:transactions', [{ id: 'i', accountId: 'a', type: 'income', amount: 1000, categoryId: 'c', title: 'Salary', note: '', date: '2026-09-10', createdAt: iso('2026-09-10'), updatedAt: iso('2026-09-10') }, { id: 'e', accountId: 'a', type: 'expense', amount: 300, categoryId: 'c', title: 'Food', note: '', date: '2026-09-11', createdAt: iso('2026-09-11'), updatedAt: iso('2026-09-11') }]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'finance' });
    assert(result.metrics.find((m) => m.id === 'finance:income').currentValue === 1000 && result.metrics.find((m) => m.id === 'finance:expenses').currentValue === 300 && result.metrics.find((m) => m.id === 'finance:net-flow').currentValue === 700, 'finance metrics');
  });

  await check('book progress and reading activity', async () => {
    await saveData('lifeos:books', [{ id: 'b1', title: 'Book', author: 'A', status: 'reading', createdAt: iso('2026-09-01'), updatedAt: iso('2026-09-14'), startedAt: iso('2026-09-02'), completedAt: null }]);
    await saveData('lifeos:book-progress', [{ id: 'p1', bookId: 'b1', page: 10, recordedAt: iso('2026-09-10') }, { id: 'p2', bookId: 'b1', page: 40, recordedAt: iso('2026-09-12') }]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'books' });
    assert(result.metrics.find((m) => m.id === 'books:pages').currentValue === 30 && result.metrics.find((m) => m.id === 'books:activity').currentValue === 2, 'book metrics');
  });

  await check('journal and mood-safe history', async () => {
    await saveData('lifeos:journal', [{ id: 'j1', title: 'One', content: 'x', date: '2026-09-10', mood: 'good', tags: [], createdAt: iso('2026-09-10'), updatedAt: iso('2026-09-10') }, { id: 'j2', title: 'Two', content: 'y', date: '2026-09-10', mood: 'bad', tags: [], createdAt: iso('2026-09-10'), updatedAt: iso('2026-09-10') }]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'journal' });
    assert(result.metrics.find((m) => m.id === 'journal:entries').currentValue === 2 && result.metrics.find((m) => m.id === 'journal:active-days').currentValue === 1, 'journal metrics');
  });

  await check('goal metrics do not fabricate progress', async () => {
    await saveData('lifeos:book-goals', [{ id: 'g1', type: 'books', period: 'monthly', target: 5, startDate: '2026-09-01', endDate: '2026-09-30', createdAt: iso('2026-09-01'), updatedAt: iso('2026-09-14') }]);
    await saveData('lifeos:finance:savings-goals', [{ id: 'sg1', name: 'Trip', targetAmount: 10000, currentAmount: 7000, deadline: '2026-12-31', createdAt: iso('2026-09-01'), updatedAt: iso('2026-09-14') }]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'goals' });
    const goal = result.metrics.find((m) => m.id === 'goals:completed');
    assert(goal.currentValue === null && goal.status === 'insufficient_data', 'goal current state became fake completion');
    assert(!result.metrics.some((m) => /progress|70%|10%|20%|30%/.test(m.label)), 'fabricated goal history');
  });

  await check('percentage and percentage-point comparison', async () => {
    await saveData('lifeos:tasks', [task('a', iso('2026-09-10'), iso('2026-09-10')), task('b', iso('2026-09-11'), iso('2026-09-11')), task('c', iso('2026-09-02'), iso('2026-09-02')), task('d', iso('2026-09-03'), null)]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'tasks' });
    const rate = result.metrics.find((m) => m.id === 'tasks:completion-rate');
    assert(rate.currentValue === 100 && rate.previousValue === 50 && rate.percentagePointChange === 50 && rate.percentageChange === 100, 'rate comparison wrong');
  });

  await check('zero denominator handling', async () => {
    await saveData('lifeos:health:sleep', []);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'health' });
    const sleep = result.metrics.find((m) => m.id === 'sleep:average-duration');
    assert(sleep && sleep.currentValue === null && sleep.percentageChange === null, 'sleep zero denominator handling failed');
    const tasks = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'tasks' });
    const created = tasks.metrics.find((m) => m.id === 'tasks:created');
    assert(created.percentageChange === 0 || created.percentageChange === null, 'invalid zero denominator percentage');
  });

  await check('lower-is-better interpretation', async () => {
    await saveData('lifeos:tasks', [task('a', iso('2026-09-10'), null, '2026-09-10'), task('b', iso('2026-09-02'), iso('2026-09-02'), '2026-09-02')]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'tasks' });
    const overdue = result.metrics.find((m) => m.id === 'tasks:overdue');
    assert(overdue.interpretation === 'negative' && overdue.status === 'declining' && overdue.trend === 'up', 'lower-is-better interpretation incorrect');
  });

  await check('invalid record and invalid date handling', async () => {
    await saveData('lifeos:tasks', [{ id: '', title: 'bad', createdAt: 'bad' }, task('valid', iso('2026-09-10'), iso('2026-09-11')), task('invalid-date', '2026-02-30T00:00:00.000Z', null)]);
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'tasks' });
    assert(result.metrics.find((m) => m.id === 'tasks:completed').currentValue === 1, 'invalid records affected analytics');
  });

  await check('domain failure isolation and degraded reporting', async () => {
    const original = AsyncStorage.getItem;
    AsyncStorage.getItem = async (key) => { if (key === 'lifeos:health:sleep') throw new Error('sleep unavailable'); return original.call(AsyncStorage, key); };
    try {
      const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14' });
      assert(result.degradedDomains.includes('sleep'), 'sleep degradation not reported');
      assert(result.metrics.find((m) => m.id === 'finance:transactions'), 'healthy domain lost during failure');
      assert(result.metrics.find((m) => m.id === 'recovery:history').status === 'insufficient_data', 'recovery fabricated');
    } finally { AsyncStorage.getItem = original; }
  });

  await check('deterministic results and stable IDs', async () => {
    const a = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14' });
    const b = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14' });
    assert(JSON.stringify(a) === JSON.stringify(b), 'analytics not deterministic');
    assert(new Set(a.metrics.map((m) => m.id)).size === a.metrics.length, 'metric IDs duplicated');
  });

  await check('3O timeline compatibility and no timeline persistence', async () => {
    const before = await AsyncStorage.getItem('lifeos:timeline');
    const timeline = await getLifeTimeline({ startDate: '2026-09-08', endDate: '2026-09-14' });
    const analytics = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14', filter: 'tasks' });
    const timelineCompleted = timeline.events.filter((e) => e.domain === 'tasks' && e.type === 'completed').length;
    const analyticsCompleted = analytics.metrics.find((m) => m.id === 'tasks:completed').currentValue;
    assert(timelineCompleted === analyticsCompleted, '3O/task history mismatch');
    assert(await AsyncStorage.getItem('lifeos:timeline') === before, 'timeline persistence introduced');
  });

  await check('valid navigation targets', async () => {
    const result = await getHistoricalAnalytics({ period: 7, endDate: '2026-09-14' });
    const expected = new Set(['/tasks', '/habits', '/health/workout-history', '/health/sleep', '/health/nutrition', '/finance', '/books', '/journal', '/goals', '/health/recovery']);
    assert(result.metrics.filter((m) => m.route).every((m) => expected.has(m.route)), 'invalid analytics route');
  });

  console.log(`LIFEOS 3P HISTORICAL ANALYTICS: ${passed} passed, 0 failed`);
})().catch(() => { process.exitCode = 1; });
