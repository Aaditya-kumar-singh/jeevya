// Jeevya 3L: deterministic daily planning and execution coverage.
// The plan is tested as a projection of the existing Jeevya daily state.
// @ts-nocheck
/* eslint-disable */
const fs = require('fs');
const path = require('path');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function routes() {
  const root = path.resolve(process.cwd(), 'src/app');
  const set = new Set();
  for (const file of walk(root)) {
    if (!file.endsWith('.tsx')) continue;
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (rel.startsWith('_')) continue;
    set.add(`/${rel.replace(/\.tsx$/, '').replace(/\/index$/, '').replace(/\[id\]/g, '[id]')}`);
  }
  for (const alias of ['/finance', '/health', '/tasks', '/more']) set.add(alias);
  return set;
}

function routeExists(target, routeSet) {
  if (!target) return true;
  const normalized = target.replace(/\$\{[^}]+\}/g, '[id]');
  if (routeSet.has(normalized)) return true;
  const a = normalized.split('/');
  return [...routeSet].some((candidate) => {
    const b = candidate.split('/');
    return a.length === b.length && b.every((segment, i) => segment === '[id]' || segment === a[i]);
  });
}

function baseState(overrides = {}) {
  return {
    date: '2026-09-14',
    dataQuality: { degradedDomains: [] },
    tasks: { total: 0, dueToday: 0, overdue: 0, completedToday: 0, active: 0, overdueTasks: [], incompleteDueTodayTasks: [] },
    habits: { activeToday: 0, completedToday: 0, completionRate: null, remainingToday: [] },
    health: { activeWorkout: false, activeWorkoutId: null, completedWorkoutsToday: 0, completedWorkoutMinutes: 0, sleep: null, recovery: null },
    nutrition: { summary: { totals: { calories: 0, protein: 0 }, loggedCount: 0 }, targets: null, energy: { status: 'balanced' } },
    finance: { accountCount: 0, currencyBreakdown: {}, transactionsToday: 0, incomeToday: 0, expenseToday: 0 },
    books: { currentlyReading: 0, readingBooks: [] },
    journal: { entryCountToday: 0, hasEntryToday: false, latestEntry: null },
    goals: [],
    ...overrides,
  };
}

(async () => {
  const { buildDailyPlan } = await import('@/services/dailyPlan');
  const routeSet = routes();
  let passed = 0;

  let plan = buildDailyPlan(baseState());
  assert(plan.items.length === 1, 'empty day should only expose the legitimate journal action');
  assert(plan.items[0].id === 'journal:today:create', 'empty day journal action should be stable');
  passed++; console.log('PASS empty day');

  plan = buildDailyPlan(baseState({
    tasks: {
      total: 3, dueToday: 2, overdue: 1, completedToday: 0, active: 3,
      overdueTasks: [{ id: 'task-overdue', title: 'Overdue' }],
      incompleteDueTodayTasks: [{ id: 'task-today', title: 'Today' }, { id: 'task-other', title: 'Other today' }],
    },
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: { id: 'j', title: 'Entry', mood: 'good', updatedAt: '2026-09-14T09:00:00Z' } },
  }));
  assert(plan.items[0].source === 'tasks' && plan.items[0].status === 'overdue', 'overdue task must be first and high priority');
  assert(plan.items.filter((item) => item.source === 'tasks').length === 3, 'overdue and due-today tasks must be included');
  assert(plan.items.find((item) => item.sourceRecordId === 'task-today').status === 'due', 'today task should be due');
  passed++; console.log('PASS overdue task prioritization and today task inclusion');

  plan = buildDailyPlan(baseState({
    tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 1, active: 1, overdueTasks: [], incompleteDueTodayTasks: [] },
    habits: { activeToday: 1, completedToday: 1, completionRate: 100, remainingToday: [] },
  }));
  assert(!plan.items.some((item) => item.source === 'tasks'), 'completed task must not become a pending plan item');
  assert(!plan.items.some((item) => item.source === 'habits'), 'completed habit must not become a pending plan item');
  passed++; console.log('PASS completed task and habit exclusion');

  plan = buildDailyPlan(baseState({
    habits: { activeToday: 2, completedToday: 1, completionRate: 50, remainingToday: [{ id: 'habit-1', name: 'Read' }] },
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null },
  }));
  const habit = plan.items.find((item) => item.source === 'habits');
  assert(habit && habit.actionType === 'complete_habit' && habit.actionTargetId === 'habit-1', 'remaining habit must delegate to habit completion');
  passed++; console.log('PASS incomplete habit action');

  plan = buildDailyPlan(baseState({
    health: { activeWorkout: true, activeWorkoutId: 'workout-1', completedWorkoutsToday: 0, completedWorkoutMinutes: 0, sleep: null, recovery: null },
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null },
  }));
  const workout = plan.items.find((item) => item.source === 'workout');
  assert(workout && workout.actionType === 'resume_workout' && workout.navigationTarget === '/health/workout-session/workout-1', 'active workout must expose resume destination');
  passed++; console.log('PASS active workout resume action');

  plan = buildDailyPlan(baseState({
    nutrition: { summary: { totals: { calories: 1200, protein: 30 }, loggedCount: 2 }, targets: { targetCalories: 2000, protein: 100 }, energy: { status: 'balanced' } },
    books: { currentlyReading: 1, readingBooks: [{ id: 'book-1', title: 'Book', currentPage: 30, totalPages: 100 }] },
    goals: [{ id: 'books:bgoal-1', title: 'Reading goal', status: 'behind', progressPercentage: 30, targetValue: 10 }],
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null },
  }));
  assert(plan.items.some((item) => item.source === 'nutrition'), 'nutrition target should appear when authoritative targets exist');
  assert(plan.items.some((item) => item.source === 'books'), 'active reading should appear');
  assert(plan.items.some((item) => item.source === 'goals' && item.status === 'due'), 'behind goal should appear');
  passed++; console.log('PASS nutrition, books, and unified goals integration');

  const budgets = [{ budgetId: 'budget-1', categoryId: 'food', budgetAmount: 1000, spent: 1200, remaining: -200, percentage: 120, isOverBudget: true, overBudgetAmount: 200 }];
  plan = buildDailyPlan(baseState({ journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null } }), budgets);
  const finance = plan.items.find((item) => item.source === 'finance');
  assert(finance && finance.navigationTarget === '/finance/budget' && finance.priority === 'high', 'over-budget finance information should navigate to budget');
  passed++; console.log('PASS authoritative finance budget integration');

  const degraded = baseState({
    dataQuality: { degradedDomains: ['finance', 'nutrition'] },
    tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [], incompleteDueTodayTasks: [{ id: 'task-1', title: 'Do it' }] },
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null },
  });
  plan = buildDailyPlan(degraded);
  assert(plan.items.some((item) => item.source === 'tasks'), 'healthy domains must survive degraded domains');
  assert(plan.dataQuality.degradedDomains.includes('finance') && plan.dataQuality.degradedDomains.includes('nutrition'), 'degraded domains must be reported');
  passed++; console.log('PASS domain failure isolation and degraded reporting');

  const state = baseState({
    tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [], incompleteDueTodayTasks: [{ id: 'task-1', title: 'Do it' }] },
    habits: { activeToday: 1, completedToday: 0, completionRate: 0, remainingToday: [{ id: 'habit-1', name: 'Read' }] },
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null },
  });
  const first = buildDailyPlan(state);
  const second = buildDailyPlan(JSON.parse(JSON.stringify(state)));
  assert(JSON.stringify(first) === JSON.stringify(second), 'plan output must be deterministic');
  assert(new Set(first.items.map((item) => item.id)).size === first.items.length, 'plan IDs must be unique');
  passed++; console.log('PASS deterministic ordering and stable IDs');

  const duplicateState = baseState({
    tasks: { total: 1, dueToday: 1, overdue: 1, completedToday: 0, active: 1, overdueTasks: [{ id: 'same', title: 'Same' }], incompleteDueTodayTasks: [{ id: 'same', title: 'Same' }] },
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null },
  });
  plan = buildDailyPlan(duplicateState);
  assert(plan.items.filter((item) => item.sourceRecordId === 'same').length === 1, 'same source record must not appear twice');
  passed++; console.log('PASS duplicate prevention');

  plan = buildDailyPlan(baseState({
    tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [], incompleteDueTodayTasks: [{ id: 'missing-task', title: 'Missing' }] },
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null },
  }));
  assert(plan.items[0].navigationTarget === '/tasks/missing-task', 'missing record keeps an authoritative safe detail destination');
  assert(plan.items[0].actionTargetId === 'missing-task', 'missing record action remains source-keyed');
  passed++; console.log('PASS missing/deleted record safety');

  for (const item of plan.items) {
    assert(routeExists(item.navigationTarget, routeSet), `invalid Daily Plan route: ${item.navigationTarget}`);
    if (item.actionType === 'complete_task') assert(item.actionTargetId && item.source === 'tasks', 'task mutation delegation must be source-safe');
    if (item.actionType === 'complete_habit') assert(item.actionTargetId && item.source === 'habits', 'habit mutation delegation must be source-safe');
    if (item.actionType === 'resume_workout') assert(item.source === 'workout', 'workout resume delegation must be source-safe');
  }
  passed++; console.log('PASS valid navigation destinations and safe action metadata');

  console.log(`JEEVYA 3L DAILY PLAN: ${passed} passed, 0 failed`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
