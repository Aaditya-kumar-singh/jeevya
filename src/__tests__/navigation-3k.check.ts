// Jeevya 3K: cross-module navigation and action coverage audit tests.
// This test derives the route set from src/app instead of introducing a second route registry.
// @ts-nocheck
/* eslint-disable */
const fs = require('fs');
const path = require('path');
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

function routeFromFile(file: string, appRoot: string): string | null {
  if (!file.endsWith('.tsx')) return null;
  const rel = path.relative(appRoot, file).replace(/\\/g, '/');
  if (rel.startsWith('_') || rel === 'index.tsx') return rel === 'index.tsx' ? '/' : null;
  const route = rel
    .replace(/\.tsx$/, '')
    .replace(/\/index$/, '')
    .replace(/\[id\]/g, '[id]');
  return `/${route}`;
}

function loadRoutes(): Set<string> {
  const appRoot = path.resolve(process.cwd(), 'src/app');
  const routes = new Set(walkFiles(appRoot).map((file) => routeFromFile(file, appRoot)).filter((route): route is string => !!route));
  for (const tab of ['finance', 'health', 'more', 'tasks']) {
    routes.add(`/${tab}`);
    routes.add(`/(tabs)/${tab}`);
  }
  routes.add('/');
  routes.add('/(tabs)');
  return routes;
}

function normalizeDynamicRoute(route: string): string {
  return route.replace(/\$\{[^}]+\}/g, '[id]');
}

function resolveDynamicPattern(target: string, routes: Set<string>): boolean {
  if (routes.has(target)) return true;
  const targetSegments = target.split('/');
  return [...routes].some((candidate) => {
    const candidateSegments = candidate.split('/');
    return candidateSegments.length === targetSegments.length && candidateSegments.every((segment, index) => segment === '[id]' ? targetSegments[index].length > 0 : segment === targetSegments[index]);
  });
}

function resolveRouteTarget(target: string, routes: Set<string>): boolean {
  const normalized = normalizeDynamicRoute(target);
  return routes.has(normalized) || resolveDynamicPattern(target, routes);
}

function extractQuotedRouteTargets(text: string): string[] {
  const results: string[] = [];
  const push = (value: string) => {
    if (value.startsWith('/') && !value.startsWith('//')) results.push(value);
  };

  const literalRegex = /(?:router\.(?:push|replace)|href\s*=|navigationTarget\s*:|Redirect\s+href=)\s*(?:\{\s*)?["'`]([^"'`]+)["'`]/g;
  for (const match of text.matchAll(literalRegex)) push(match[1]);

  const templateRegex = /(?:router\.(?:push|replace)|href\s*=|navigationTarget\s*:|workoutHref\s*=)\s*`([^`]+)`/g;
  for (const match of text.matchAll(templateRegex)) push(match[1]);

  const pathnameRegex = /pathname\s*:\s*["'`]([^"'`]+)["'`]/g;
  for (const match of text.matchAll(pathnameRegex)) push(match[1]);

  return [...new Set(results)];
}

function assertSourceNavigationTargetsResolve(routes: Set<string>): number {
  const sourceRoot = path.resolve(process.cwd(), 'src');
  const ignored = new Set([
    path.join(sourceRoot, '__tests__', 'navigation-3k.test.ts'),
  ]);
  const files = walkFiles(sourceRoot).filter((file) => /\.(ts|tsx)$/.test(file) && !ignored.has(file));
  const failures: string[] = [];
  let count = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const target of extractQuotedRouteTargets(text)) {
      count += 1;
      const normalized = normalizeDynamicRoute(target);
      if (normalized.startsWith('/../')) continue;
      if (!resolveRouteTarget(target, routes)) failures.push(`${path.relative(process.cwd(), file)} -> ${target}`);
    }
  }

  assert(failures.length === 0, `stale route references found:\n${failures.join('\n')}`);
  return count;
}

function testRequiredSurfaceRoutes(routes: Set<string>) {
  const required = [
    '/analytics',
    '/goals',
    '/insights',
    '/search',
    '/weekly-review',
    '/tasks',
    '/habits',
    '/books',
    '/journal',
    '/settings',
    '/finance',
    '/health',
    '/nutrition',
    '/health/recovery',
    '/health/workout',
    '/health/workout-builder',
    '/health/workout-history',
    '/health/workout-session/[id]',
    '/health/sleep',
    '/health/analytics',
  ];
  for (const route of required) assert(routes.has(route), `required route missing: ${route}`);
}

function testDynamicRoutes(routes: Set<string>) {
  const dynamic = [
    '/tasks/[id]',
    '/habits/[id]',
    '/habits/[id]/edit',
    '/books/[id]',
    '/books/[id]/edit',
    '/finance/[id]',
    '/finance/accounts/[id]',
    '/finance/savings-goals/[id]',
    '/finance/edit-budget/[id]',
    '/finance/edit-savings-goal/[id]',
    '/health/exercises/[id]',
    '/health/workout-history/[id]',
    '/health/workout-session/[id]',
    '/journal/[id]',
    '/journal/[id]/edit',
  ];
  for (const route of dynamic) assert(routes.has(route), `dynamic route missing: ${route}`);
}

async function setupStorage() {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => { memory.set(key, value); },
        removeItem: (key: string) => { memory.delete(key); },
        clear: () => memory.clear(),
        get length() { return memory.size; },
        key: (index: number) => Array.from(memory.keys())[index] ?? null,
      },
    },
  });
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  await AsyncStorage.clear();
  return AsyncStorage;
}

(async () => {
  const routes = loadRoutes();
  let passed = 0;

  testRequiredSurfaceRoutes(routes);
  console.log('PASS required 3K surfaces resolve');
  passed++;

  testDynamicRoutes(routes);
  console.log('PASS dynamic record routes resolve');
  passed++;

  const scannedTargets = assertSourceNavigationTargetsResolve(routes);
  console.log(`PASS all source navigation targets resolve (${scannedTargets} targets scanned)`);
  passed++;

  const AsyncStorage = await setupStorage();
  const { saveData } = await import('@/lib/storage');
  const { todayCivilDate } = await import('@/lib/date');
  const { buildDailyPulse } = await import('@/services/dailyPulse');
  const { searchJeevya } = await import('@/services/unifiedSearch');
  const date = todayCivilDate();

  const baseState = {
    date,
    tasks: {
      total: 2,
      dueToday: 1,
      overdue: 1,
      completedToday: 0,
      active: 2,
      overdueTasks: [{ id: 'task-3k', title: 'Pay bill' }],
      incompleteDueTodayTasks: [{ id: 'task-3k', title: 'Pay bill' }],
    },
    habits: {
      activeToday: 1,
      completedToday: 0,
      completionRate: 0,
      remainingToday: [{ id: 'habit-3k', name: 'Read' }],
    },
    health: {
      activeWorkout: true,
      activeWorkoutId: 'workout-3k',
      completedWorkoutsToday: 0,
      sleep: null,
      recovery: null,
    },
    nutrition: {
      summary: { date, totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, micronutrients: {} }, byMeal: [], loggedCount: 0, calculatedCount: 0, unavailableCount: 0, errorCount: 0 },
      targets: null,
      energy: { date, caloriesIn: 0, bmr: null, activityCalories: 0, caloriesOut: 0, netCalories: 0, calorieTarget: null, remainingCalories: null, status: 'maintenance' },
    },
    finance: { accountCount: 0, currencyBreakdown: {}, transactionsToday: 0, incomeToday: 0, expenseToday: 0 },
    books: { currentlyReading: 0, readingBooks: [] },
    journal: { entryCountToday: 0, hasEntryToday: false, latestEntry: null },
    goals: [],
  };

  const pulse = buildDailyPulse(baseState);
  const taskAction = pulse.items.find((item) => item.id === 'tasks-overdue');
  const habitAction = pulse.items.find((item) => item.id === 'habits-remaining');
  const workoutAction = pulse.items.find((item) => item.id === 'workout-active');
  assert(taskAction?.actionType === 'complete_task' && taskAction.actionTargetId === 'task-3k', 'Daily Pulse task action must use task ID');
  assert(habitAction?.actionType === 'complete_habit' && habitAction.actionTargetId === 'habit-3k', 'Daily Pulse habit action must use habit ID');
  assert(workoutAction?.actionType === 'resume_workout' && workoutAction.actionTargetId === 'workout-3k', 'Daily Pulse workout action must use workout ID');
  assert(resolveRouteTarget(taskAction?.navigationTarget ?? '/tasks', routes), 'Daily Pulse task route missing');
  assert(resolveRouteTarget(habitAction?.navigationTarget ?? '/habits', routes), 'Daily Pulse habit route missing');
  assert(resolveRouteTarget(workoutAction?.navigationTarget ?? '', routes), `Daily Pulse workout route missing: ${workoutAction?.navigationTarget ?? 'none'}`);
  console.log('PASS Daily Pulse action targets and record IDs');
  passed++;

  const multiPulse = buildDailyPulse({
    ...baseState,
    tasks: { ...baseState.tasks, overdue: 2, overdueTasks: [{ id: 'task-a', title: 'A' }, { id: 'task-b', title: 'B' }], incompleteDueTodayTasks: [{ id: 'task-a', title: 'A' }, { id: 'task-b', title: 'B' }] },
    habits: { ...baseState.habits, activeToday: 2, remainingToday: [{ id: 'habit-a', name: 'A' }, { id: 'habit-b', name: 'B' }] },
  });
  assert(multiPulse.items.find((item) => item.id === 'tasks-overdue')?.actionType === 'navigate', 'multiple task target should fall back to aggregate navigation');
  assert(multiPulse.items.find((item) => item.id === 'habits-remaining')?.actionType === 'navigate', 'multiple habit target should fall back to aggregate navigation');
  console.log('PASS Daily Pulse multi-record fallbacks');
  passed++;

  const task = { id: 'search-task-3k', title: 'Search target task', description: '', completed: false, priority: 'high', dueDate: date, dueTime: null, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z`, completedAt: null, archived: false, recurrence: null, seriesId: null, subtasks: [], labelIds: [] };
  const habit = { id: 'search-habit-3k', name: 'Search target habit', description: '', icon: 'check', color: 'blue', frequency: 'daily', days: [], targetCount: 1, reminderTime: null, startDate: date, endDate: null, isActive: true, isArchived: false, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` };
  const book = { id: 'search-book-3k', title: 'Search target book', author: 'Test', description: '', coverUrl: '', isbn: '', status: 'reading', rating: null, totalPages: 100, currentPage: 20, category: '', notes: '', startedAt: null, completedAt: null, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` };
  const journal = { id: 'search-journal-3k', title: 'Search target journal', content: 'target', date, mood: 'good', tags: [], createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` };
  const account = { id: 'search-account-3k', name: 'Cash', type: 'cash', balance: 1000, currency: 'INR', createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` };
  const transaction = { id: 'search-transaction-3k', accountId: account.id, type: 'expense', amount: 120, categoryId: 'cat-3k', title: 'Search target transaction', note: 'target', date, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` };

  await AsyncStorage.multiSet([
    ['jeevya:tasks', JSON.stringify([task])],
    ['jeevya:habits', JSON.stringify([habit])],
    ['jeevya:books', JSON.stringify([book])],
    ['jeevya:journal', JSON.stringify([journal])],
    ['jeevya:finance:accounts', JSON.stringify([account])],
    ['jeevya:finance:transactions', JSON.stringify([transaction])],
    ['jeevya:book-goals', '[]'],
    ['jeevya:nutrition:foods', '[]'],
    ['jeevya:nutrition:food-logs', '[]'],
    ['jeevya:nutrition:recipes', '[]'],
    ['jeevya:nutrition:body-profile', 'null'],
    ['jeevya:nutrition:energy-activities', '[]'],
  ]);

  const result = await searchJeevya('target', date);
  const expectedRoutes: Record<string, string> = {
    tasks: `/tasks/${task.id}`,
    habits: `/habits/${habit.id}`,
    books: `/books/${book.id}`,
    journal: `/journal/${journal.id}`,
    finance: `/finance/${transaction.id}`,
  };
  for (const domain of Object.keys(expectedRoutes)) {
    const found = result.results.find((item) => item.domain === domain && item.id === ({ tasks: task.id, habits: habit.id, books: book.id, journal: journal.id, finance: transaction.id } as Record<string, string>)[domain]);
    assert(found?.route === expectedRoutes[domain], `search route incorrect for ${domain}: ${found?.route}`);
    assert(resolveRouteTarget(found.route, routes), `search route missing for ${domain}: ${found.route}`);
  }
  console.log('PASS Unified Search result routes, including finance detail');
  passed++;

  await saveData('jeevya:tasks', []);
  await saveData('jeevya:habits', []);
  await saveData('jeevya:books', []);
  await saveData('jeevya:journal', []);
  await saveData('jeevya:finance:accounts', []);
  await saveData('jeevya:finance:transactions', []);
  const emptySearch = await searchJeevya('target', date);
  assert(emptySearch.results.length === 0, 'deleted records must disappear from search results');
  console.log('PASS deleted records fail safely through search');
  passed++;

  const safeDetailFiles = [
    ['tasks/[id].tsx', 'Task not found'],
    ['books/[id].tsx', 'Book not found'],
    ['books/[id]/edit.tsx', 'Book not found'],
    ['finance/[id].tsx', 'Transaction not found'],
    ['journal/[id].tsx', 'Entry not found'],
    ['journal/[id]/edit.tsx', 'Entry not found'],
    ['health/workout-history/[id].tsx', 'Workout not found'],
    ['health/workout-session/[id].tsx', "Couldn't load workout"],
  ];
  for (const [relative, marker] of safeDetailFiles) {
    const file = path.resolve(process.cwd(), 'src/app', relative);
    const text = fs.readFileSync(file, 'utf8');
    assert(text.includes(marker), `missing safe failure state in ${relative}`);
    assert(text.includes('router.back()') || text.includes('router.replace('), `missing recovery navigation in ${relative}`);
  }
  console.log('PASS missing/deleted record detail screens fail safely');
  passed++;

  const habitPreview = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/HabitPreview.tsx'), 'utf8');
  assert(habitPreview.includes('<Link href="/habits" asChild>'), 'Home habit overflow must navigate to the habit domain');
  console.log('PASS Home habit overflow preserves domain ownership');
  passed++;

  const financeSearchSource = fs.readFileSync(path.resolve(process.cwd(), 'src/services/unifiedSearch.ts'), 'utf8');
  assert(financeSearchSource.includes('route: `/finance/${transaction.id}`'), 'finance search must use authoritative transaction detail route');
  console.log('PASS finance search uses transaction detail destination');
  passed++;

  console.log(`JEEVYA 3K NAVIGATION: ${passed} passed, 0 failed`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
