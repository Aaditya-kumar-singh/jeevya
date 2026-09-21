// Jeevya 3D: unified read-only Goals + Progress integration tests.
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function equal(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

(async () => {
  const memory = new Map<string, string>();
  if (!(globalThis as unknown as { window?: { localStorage?: unknown } }).window?.localStorage) {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => { memory.set(key, value); },
      removeItem: (key: string) => { memory.delete(key); },
      clear: () => { memory.clear(); },
      get length() { return memory.size; },
      key: (index: number) => Array.from(memory.keys())[index] ?? null,
    } } });
  }

  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  const { saveData, loadData } = await import('@/lib/storage');
  const { calculateGoalProgress, getUnifiedGoals } = await import('@/services/goalsIntegration');
  const { todayCivilDate } = await import('@/lib/date');

  const date = todayCivilDate();
  const monthStart = `${date.slice(0, 7)}-01`;
  const keys = [
    'jeevya:book-goals', 'jeevya:books', 'jeevya:finance:savings-goals',
  ];

  await AsyncStorage.clear();
  let passed = 0;
  const check = async (name: string, fn: () => Promise<void> | void) => { await fn(); passed += 1; console.log(`✓ ${name}`); };

  await check('0% progress', () => {
    const p = calculateGoalProgress(0, 10, { startDate: monthStart, endDate: date }, date);
    assert(p.progressPercentage === 0 && p.currentValue === 0, '0% calculation');
  });

  await check('partial progress', () => {
    const p = calculateGoalProgress(5, 10, { startDate: monthStart, endDate: date }, date);
    assert(p.progressPercentage === 50, 'partial calculation');
  });

  await check('100% and over-target progress are clamped', () => {
    const exact = calculateGoalProgress(10, 10, {}, date);
    const over = calculateGoalProgress(15, 10, {}, date);
    assert(exact.progressPercentage === 100 && exact.status === 'completed', 'exact completion');
    assert(over.progressPercentage === 100 && over.currentValue === 15 && over.status === 'completed', 'over target');
  });

  await check('invalid values are unavailable', () => {
    const p = calculateGoalProgress(Number.NaN, 10, {}, date);
    const q = calculateGoalProgress(2, 0, {}, date);
    assert(p.status === 'unavailable' && p.progressPercentage === null, 'invalid current');
    assert(q.status === 'unavailable' && q.progressPercentage === null, 'invalid target');
  });

  await check('date boundaries are deterministic', () => {
    const before = calculateGoalProgress(0, 10, { startDate: '2026-09-15', endDate: '2026-09-30' }, '2026-09-14');
    const start = calculateGoalProgress(1, 10, { startDate: '2026-09-15', endDate: '2026-09-30' }, '2026-09-15');
    const ended = calculateGoalProgress(0, 10, { startDate: '2026-09-01', endDate: '2026-09-10' }, '2026-09-11');
    assert(before.status === 'upcoming', 'before start');
    assert(start.status === 'active', 'at start');
    assert(ended.status === 'ended', 'after end');
  });

  const book = {
    id: 'book-3d', title: '3D Book', author: 'Test', description: '', coverUrl: '', isbn: '',
    status: 'completed', rating: null, totalPages: 200, currentPage: 200, category: '', notes: '',
    startedAt: `${monthStart}T08:00:00.000Z`, completedAt: `${date}T10:00:00.000Z`,
    createdAt: `${monthStart}T08:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z`,
  };
  const bookGoal = {
    id: 'book-goal-3d', type: 'books', period: 'monthly', target: 1,
    startDate: monthStart, endDate: date,
    createdAt: `${monthStart}T08:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z`,
  };
  const financeGoal = {
    id: 'finance-goal-3d', name: 'Laptop', targetAmount: 1000, currentAmount: 400,
    deadline: `${date.slice(0, 7)}-28`, createdAt: `${monthStart}T08:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z`,
  };

  await Promise.all([
    saveData('jeevya:books', [book]),
    saveData('jeevya:book-goals', [bookGoal]),
    saveData('jeevya:finance:savings-goals', [financeGoal]),
  ]);

  await check('Book Goals compatibility', async () => {
    const goals = await getUnifiedGoals(date);
    const g = goals.find((item) => item.id === 'books:book-goal-3d');
    assert(!!g && g.source === 'books' && g.metric === 'books_completed' && g.currentValue === 1 && g.progressPercentage === 100 && g.status === 'completed', 'book goal normalization');
  });

  await check('Finance savings goal adapter', async () => {
    const goals = await getUnifiedGoals(date);
    const g = goals.find((item) => item.id === 'finance:finance-goal-3d');
    assert(!!g && g.source === 'finance' && g.metric === 'savings_amount' && g.currentValue === 400 && g.targetValue === 1000 && g.progressPercentage === 40, 'finance goal');
  });

  await check('unsupported domains do not fabricate goals', async () => {
    const goals = await getUnifiedGoals(date);
    assert(goals.every((goal) => goal.source === 'books' || goal.source === 'finance'), 'unsupported goals fabricated');
  });

  await check('stable IDs and deterministic results', async () => {
    const a = await getUnifiedGoals(date);
    const b = await getUnifiedGoals(date);
    equal(a, b, 'unified results differ');
    assert(new Set(a.map((goal) => goal.id)).size === a.length, 'duplicate IDs');
  });

  await check('source data and persistence remain unchanged', async () => {
    const before = await AsyncStorage.multiGet(keys);
    const sourceBefore = JSON.stringify(await loadData('jeevya:books', []));
    await getUnifiedGoals(date);
    const after = await AsyncStorage.multiGet(keys);
    const sourceAfter = JSON.stringify(await loadData('jeevya:books', []));
    equal(after, before, 'integration changed storage');
    equal(sourceAfter, sourceBefore, 'book source changed');
  });

  await check('missing source data is safe', async () => {
    await saveData('jeevya:finance:savings-goals', []);
    const goals = await getUnifiedGoals(date);
    assert(goals.every((goal) => goal.source !== 'finance'), 'missing finance data fabricated goals');
  });

  await check('malformed goal values become unavailable', () => {
    const p = calculateGoalProgress(-1, 10, {}, date);
    assert(p.status === 'unavailable' && p.currentValue === null, 'negative current value accepted');
  });

  console.log(`JEEVYA 3D GOALS INTEGRATION: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
