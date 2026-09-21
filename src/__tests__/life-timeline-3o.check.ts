// JEEVYA 3O: deterministic cross-module historical timeline.
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
  const { saveData } = await import('@/lib/storage');
  const { getLifeTimeline } = await import('@/services/lifeTimeline');

  const clear = async () => { await AsyncStorage.clear(); };
  const iso = (day, hour = '10:00:00') => `${day}T${hour}.000Z`;
  const day = '2026-09-14';
  const old = '2026-09-10';
  let passed = 0;
  const check = async (name, fn) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; } };

  const task = { id: 'task-1', title: 'Finish report', description: 'Report body', completed: true, priority: 'high', dueDate: day, dueTime: null, createdAt: iso(old), updatedAt: iso(day, '11:00:00'), completedAt: iso(day, '12:00:00'), archived: false, recurrence: null, seriesId: null, subtasks: [], labelIds: [] };
  const habit = { id: 'habit-1', name: 'Read', description: '', icon: 'book', color: '#3B82F6', frequency: 'daily', days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], targetCount: 1, reminderTime: null, startDate: old, endDate: null, isActive: true, isArchived: false, createdAt: iso(old), updatedAt: iso(day) };
  const habitLog = { id: 'hlog-1', habitId: 'habit-1', date: day, completed: true, value: null, createdAt: iso(day, '08:00:00'), updatedAt: iso(day, '08:30:00') };
  const book = { id: 'book-1', title: 'Deep Work', author: 'Cal Newport', description: '', coverUrl: '', isbn: '', status: 'completed', rating: null, totalPages: 300, currentPage: 300, category: '', notes: '', startedAt: iso(old), completedAt: iso(day, '18:00:00'), createdAt: iso(old), updatedAt: iso(day, '18:00:00') };
  const progress = { id: 'progress-1', bookId: 'book-1', page: 250, recordedAt: iso(day, '17:00:00') };
  const bookGoal = { id: 'book-goal-1', type: 'books', period: 'monthly', target: 2, startDate: '2026-09-01', endDate: '2026-09-30', createdAt: iso(old), updatedAt: iso(day) };
  const journal = { id: 'journal-1', title: 'Reflection', content: 'A good day.', date: day, mood: 'good', tags: [], createdAt: iso(day, '20:00:00'), updatedAt: iso(day, '20:00:00') };
  const account = { id: 'account-1', name: 'Cash', type: 'cash', balance: 1000, currency: 'INR', createdAt: iso(old), updatedAt: iso(day) };
  const category = { id: 'category-1', name: 'Food', icon: 'utensils', type: 'expense', createdAt: iso(old) };
  const transaction = { id: 'txn-1', accountId: 'account-1', type: 'expense', amount: 250, categoryId: 'category-1', title: 'Lunch', note: 'Cafe', date: day, createdAt: iso(day, '13:00:00'), updatedAt: iso(day, '13:00:00') };
  const savingsGoal = { id: 'save-1', name: 'Emergency fund', targetAmount: 10000, currentAmount: 2500, deadline: '2026-12-31', createdAt: iso(old), updatedAt: iso(day) };
  const food = { id: 'food-1', name: 'Rice', brand: null, category: 'grain', description: null, source: 'custom', sourceDetail: null, preparation: 'cooked', serving: { amount: 100, unit: 'g' }, nutrition: { basis: 'per_100g', servingAmount: null, servingUnit: null, calories: 130, protein: 2.7, carbohydrates: 28, fat: 0.3, fiber: 0.4, sugar: 0, saturatedFat: 0, sodium: 1, micronutrients: {} }, createdAt: iso(old), updatedAt: iso(old) };
  const foodLog = { id: 'foodlog-1', foodId: 'food-1', quantity: 200, unit: 'g', mealType: 'lunch', date: day, itemType: 'food', createdAt: iso(day, '13:05:00'), updatedAt: iso(day, '13:05:00') };
  const workout = { id: 'workout-1', name: 'Strength', startedAt: iso(day, '07:00:00'), completedAt: iso(day, '07:45:00'), status: 'completed', exercises: [], durationSeconds: 2700, createdAt: iso(day, '07:00:00'), updatedAt: iso(day, '07:45:00') };
  const sleep = { id: 'sleep-1', date: day, sleepStart: iso('2026-09-13', '23:00:00'), sleepEnd: iso(day, '07:00:00'), durationMinutes: 480, quality: 'excellent', createdAt: iso(day, '07:00:00'), updatedAt: iso(day, '07:00:00') };

  await check('empty timeline', async () => { await clear(); const result = await getLifeTimeline(); assert(result.events.length === 0, 'empty timeline should have no events'); assert(result.degradedDomains.length === 0, 'empty data is not degraded'); });

  await check('read-only projection does not persist timeline events', async () => {
    await clear(); await saveData('jeevya:tasks', [task]);
    const before = (await AsyncStorage.getAllKeys()).slice().sort();
    await getLifeTimeline();
    const after = (await AsyncStorage.getAllKeys()).slice().sort();
    assert(JSON.stringify(before) === JSON.stringify(after), 'timeline created persistence keys');
    assert(!(after.some(key => key.includes('timeline'))), 'timeline event store was created');
  });

  await clear();
  await saveData('jeevya:tasks', [task]);
  await saveData('jeevya:habits', [habit]);
  await saveData('jeevya:habit-logs', [habitLog]);
  await saveData('jeevya:books', [book]);
  await saveData('jeevya:book-progress', [progress]);
  await saveData('jeevya:book-goals', [bookGoal]);
  await saveData('jeevya:journal', [journal]);
  await saveData('jeevya:finance:accounts', [account]);
  await saveData('jeevya:finance:categories', [category]);
  await saveData('jeevya:finance:transactions', [transaction]);
  await saveData('jeevya:finance:savings-goals', [savingsGoal]);
  await saveData('jeevya:nutrition:foods', [food]);
  await saveData('jeevya:nutrition:food-logs', [foodLog]);
  await saveData('jeevya:workouts:sessions', [workout]);
  await saveData('jeevya:health:sleep', [sleep]);

  await check('all authoritative domain event generation', async () => {
    const { events } = await getLifeTimeline();
    assert(events.some(e => e.domain === 'tasks' && e.type === 'completed'), 'task completion missing');
    assert(events.some(e => e.domain === 'habits' && e.type === 'completed' && e.sourceId === 'habit-1'), 'habit history missing');
    assert(events.some(e => e.domain === 'workout' && e.type === 'started') && events.some(e => e.domain === 'workout' && e.type === 'finished'), 'workout pair missing');
    assert(events.some(e => e.domain === 'sleep' && e.type === 'logged'), 'sleep missing');
    assert(events.some(e => e.domain === 'nutrition' && e.type === 'logged'), 'nutrition missing');
    assert(events.some(e => e.domain === 'finance' && e.type === 'transaction'), 'finance missing');
    assert(events.some(e => e.domain === 'books' && e.type === 'progress'), 'book progress missing');
    assert(events.some(e => e.domain === 'journal' && e.type === 'entry'), 'journal missing');
    assert(events.some(e => e.domain === 'goals' && e.sourceId === 'book-goal-1'), 'book goal history missing');
    assert(events.some(e => e.domain === 'goals' && e.sourceId === 'save-1'), 'savings goal history missing');
  });

  await check('deterministic newest-first ordering', async () => {
    const a = await getLifeTimeline(); const b = await getLifeTimeline();
    assert(JSON.stringify(a.events) === JSON.stringify(b.events), 'timeline changed between identical reads');
    for (let i = 1; i < a.events.length; i++) assert(a.events[i - 1].timestamp >= a.events[i].timestamp, 'not newest first');
  });

  await check('stable IDs and duplicate prevention', async () => {
    const result = await getLifeTimeline(); const ids = result.events.map(e => e.id);
    assert(new Set(ids).size === ids.length, 'duplicate event IDs');
    const again = await getLifeTimeline(); assert(JSON.stringify(ids) === JSON.stringify(again.events.map(e => e.id)), 'IDs changed');
    assert(result.events.filter(e => e.id.startsWith('finance:txn-1:transaction')).length === 1, 'transaction duplicated');
  });

  await check('filtering by domain', async () => {
    const finance = await getLifeTimeline({ filter: 'finance' });
    assert(finance.events.length === 1 && finance.events[0].domain === 'finance', 'finance filter failed');
    const health = await getLifeTimeline({ filter: 'health/workout' });
    assert(health.events.every(e => e.domain === 'workout' || e.domain === 'sleep'), 'health filter leaked domains');
  });

  await check('date range behavior', async () => {
    const today = await getLifeTimeline({ startDate: day, endDate: day });
    assert(today.events.length > 0 && today.events.every(e => e.date === day), 'today range failed');
    const oldOnly = await getLifeTimeline({ startDate: old, endDate: old });
    assert(oldOnly.events.every(e => e.date === old), 'old range leaked dates');
  });

  await check('search behavior', async () => {
    const result = await getLifeTimeline({ search: 'lunch' });
    assert(result.events.length === 2 && result.events.some(e => e.domain === 'finance') && result.events.some(e => e.domain === 'nutrition'), 'search failed');
    const typeSearch = await getLifeTimeline({ search: 'completed' });
    assert(typeSearch.events.some(e => e.type === 'completed'), 'event-type search failed');
  });

  await check('valid navigation targets are emitted', async () => {
    const { events } = await getLifeTimeline();
    const routes = new Set(events.map(e => e.route).filter(Boolean));
    assert(routes.has('/tasks/task-1') && routes.has('/habits/habit-1') && routes.has('/books/book-1'), 'core routes missing');
    assert(routes.has('/journal/journal-1') && routes.has('/finance/txn-1') && routes.has('/health/workout-history/workout-1'), 'detail routes missing');
    assert(routes.has('/health/sleep') && routes.has('/health/nutrition') && routes.has('/goals'), 'health/goal routes missing');
  });

  await check('missing and deleted records fail safely', async () => {
    await saveData('jeevya:habit-logs', [{ ...habitLog, habitId: 'deleted-habit' }]);
    await saveData('jeevya:book-progress', [{ ...progress, bookId: 'deleted-book' }]);
    const result = await getLifeTimeline();
    assert(!result.events.some(e => e.id === 'habits:habit-1:completion:hlog-1'), 'deleted habit record became an event');
    assert(!result.events.some(e => e.id === 'books:book-1:progress:progress-1'), 'deleted book progress became an event');
  });

  await check('invalid records are skipped', async () => {
    await saveData('jeevya:finance:transactions', [transaction, { id: '', createdAt: 'bad', date: 'not-a-date' }]);
    const result = await getLifeTimeline({ filter: 'finance' });
    assert(result.events.length === 1 && result.events[0].sourceId === 'txn-1', 'invalid finance record was not skipped');
  });

  await check('current-state-only values do not fabricate history', async () => {
    await clear();
    await saveData('jeevya:books', [{ ...book, id: 'current-only-book', title: 'Current only', currentPage: 210, completedAt: null, startedAt: null, createdAt: iso(day), updatedAt: iso(day) }]);
    await saveData('jeevya:book-progress', []);
    await saveData('jeevya:book-goals', [{ ...bookGoal, id: 'current-only-goal', updatedAt: iso(day), createdAt: iso(day) }]);
    const result = await getLifeTimeline();
    assert(!result.events.some(e => e.type === 'progress'), 'fake book progress history created');
    assert(!result.events.some(e => e.sourceId === 'current-only-goal' && e.type === 'milestone'), 'fake goal milestone created');
  });

  await check('ascending order is deterministic', async () => {
    const result = await getLifeTimeline({ newestFirst: false });
    for (let i = 1; i < result.events.length; i++) assert(result.events[i - 1].timestamp <= result.events[i].timestamp, 'ascending order failed');
  });

  await check('single-domain failure isolation and degraded reporting', async () => {
    await clear();
    await saveData('jeevya:tasks', [task]);
    await AsyncStorage.setItem('jeevya:finance:transactions', '{bad-json');
    const result = await getLifeTimeline();
    assert(result.events.some(e => e.domain === 'tasks'), 'healthy domain was lost');
    assert(result.degradedDomains.includes('finance'), 'finance degradation not reported');
  });

  await check('pagination is bounded after deterministic projection', async () => {
    await clear(); await saveData('jeevya:tasks', [task]);
    const result = await getLifeTimeline({ limit: 1, offset: 1 });
    assert(result.events.length <= 1 && result.total >= result.events.length, 'pagination failed');
  });

  console.log(`JEEVYA 3O TIMELINE: ${passed} passed, 0 failed`);
})().catch(() => process.exit(1));
