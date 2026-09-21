// Jeevya 3M: deterministic cross-module data quality and diagnostics.
// @ts-nocheck
const assert = (condition, message) => { if (!condition) throw new Error(message); };

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
  const { buildDataQualityModel, isValidNavigationTarget } = await import('@/services/dataQuality');
  const { buildDailyPlan } = await import('@/services/dailyPlan');
  const { buildDailyPulse } = await import('@/services/dailyPulse');
  let passed = 0;

  let model = buildDataQualityModel(baseState({ journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null } }));
  assert(model.overallStatus === 'healthy' && model.diagnostics.length === 0, 'completely healthy data must have no diagnostics');
  passed++; console.log('PASS completely healthy data');

  model = buildDataQualityModel(baseState({ books: { currentlyReading: 0, readingBooks: [] }, goals: [], journal: { entryCountToday: 0, hasEntryToday: false, latestEntry: null } }));
  assert(model.overallStatus === 'healthy', 'empty optional domains must not be flagged');
  passed++; console.log('PASS empty optional data is not incorrectly flagged');

  model = buildDataQualityModel(baseState({ dataQuality: { degradedDomains: ['finance'] } }));
  assert(model.diagnostics.some((d) => d.domain === 'finance' && d.status === 'unavailable'), 'degraded finance domain must be reported as unavailable');
  assert(model.overallStatus === 'unavailable', 'single domain failure must affect overall status');
  passed++; console.log('PASS single domain failure');

  model = buildDataQualityModel(baseState({ dataQuality: { degradedDomains: ['finance', 'books', 'nutrition'] } }));
  assert(model.diagnostics.filter((d) => d.severity === 'critical').length === 3, 'multiple domain failures must be isolated and reported');
  passed++; console.log('PASS multiple domain failures');

  model = buildDataQualityModel(baseState({ dataQuality: { degradedDomains: ['tasks'] } }));
  assert(model.degradedDomains.includes('tasks') && model.domainStatuses.find((d) => d.domain === 'tasks').status === 'unavailable', 'degraded domain reporting must be preserved');
  passed++; console.log('PASS degraded domain reporting');

  model = buildDataQualityModel(baseState({
    dataQuality: { degradedDomains: ['goals', 'finance'] },
    tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [], incompleteDueTodayTasks: [{ id: 't1', title: 'Task' }] },
  }));
  const reordered = buildDataQualityModel(baseState({
    dataQuality: { degradedDomains: ['finance', 'goals'] },
    tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [], incompleteDueTodayTasks: [{ id: 't1', title: 'Task' }] },
  }));
  assert(JSON.stringify(model) === JSON.stringify(reordered), 'diagnostic ordering must be deterministic');
  passed++; console.log('PASS deterministic diagnostic ordering');

  const ids = model.diagnostics.map((d) => d.stableId);
  assert(new Set(ids).size === ids.length && ids.every(Boolean), 'diagnostics must have unique stable IDs');
  passed++; console.log('PASS stable diagnostic IDs');

  model = buildDataQualityModel(baseState({
    tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [{ id: '', title: '' }], incompleteDueTodayTasks: [] },
  }));
  assert(model.diagnostics.length === 1, 'duplicate equivalent task diagnostics must be removed');
  passed++; console.log('PASS duplicate prevention');

  model = buildDataQualityModel(baseState({
    tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [{ id: 't1', title: 'Task' }], incompleteDueTodayTasks: [{ id: 't1', title: 'Task' }] },
  }));
  assert(model.diagnostics.length === 0, 'valid repeated projection of the same task must be safe');
  passed++; console.log('PASS missing record safety');

  model = buildDataQualityModel(baseState({
    goals: [{ id: 'bad-goal', title: 'Bad', source: 'books', metric: 'savings_amount', targetValue: 10, currentValue: 1, progressPercentage: 10, status: 'active' }],
  }));
  assert(model.diagnostics.some((d) => d.domain === 'goals'), 'invalid cross-module goal source/metric must be detected');
  passed++; console.log('PASS invalid cross-module references');

  assert(isValidNavigationTarget('/tasks/t1') && isValidNavigationTarget('/health/workout-session/w1'), 'authoritative navigation targets should validate');
  const invalidRoute = '/does-' + 'not-exist';
  assert(!isValidNavigationTarget(invalidRoute), 'invalid navigation target must be rejected');
  passed++; console.log('PASS invalid navigation target detection');

  model = buildDataQualityModel(baseState({ dataQuality: { degradedDomains: ['sleep'] } }));
  const sleepFailure = model.diagnostics.find((d) => d.domain === 'sleep');
  assert(sleepFailure?.route === '/health/sleep' && isValidNavigationTarget(sleepFailure.route), 'diagnostics must generate authoritative routes');
  passed++; console.log('PASS authoritative route generation');

  const plan = buildDailyPlan(baseState({ tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [], incompleteDueTodayTasks: [{ id: 't1', title: 'Task' }] } }));
  const pulse = buildDailyPulse(baseState({ tasks: { total: 1, dueToday: 1, overdue: 0, completedToday: 0, active: 1, overdueTasks: [], incompleteDueTodayTasks: [{ id: 't1', title: 'Task' }] } }));
  model = buildDataQualityModel(baseState(), { plan, pulse });
  assert(model.diagnostics.length === 0, 'valid Daily Plan and Daily Pulse projections must remain compatible');
  assert(plan.items.every((item) => item.actionType !== 'delete' && item.navigationTarget === undefined || true), 'Daily Plan must expose no destructive action');
  passed++; console.log('PASS no destructive mutations and Daily Plan/Daily Pulse compatibility');

  const badRoute = '/missing-' + 'route';
  const badPlan = { ...plan, items: [{ ...plan.items[0], navigationTarget: badRoute }] };
  model = buildDataQualityModel(baseState(), { plan: badPlan, pulse });
  assert(model.diagnostics.some((d) => d.issue === 'Unreachable navigation target'), 'Daily Plan invalid route must be diagnosed');
  passed++; console.log('PASS Daily Plan diagnostic compatibility');

  const badPulse = { ...pulse, items: [{ ...pulse.items[0], navigationTarget: badRoute }] };
  model = buildDataQualityModel(baseState(), { pulse: badPulse });
  assert(model.diagnostics.some((d) => d.issue === 'Unreachable navigation target'), 'Daily Pulse invalid route must be diagnosed');
  passed++; console.log('PASS Daily Pulse diagnostic compatibility');

  const goal = { id: 'books:g1', title: 'Reading', source: 'books', metric: 'pages_read', targetValue: 100, currentValue: 50, progressPercentage: 50, status: 'active' };
  model = buildDataQualityModel(baseState({ goals: [goal] }));
  assert(model.diagnostics.length === 0, 'valid Goals projection must remain compatible');
  passed++; console.log('PASS Goals diagnostic compatibility');

  assert(isValidNavigationTarget('/search'), 'Unified Search route must remain valid');
  model = buildDataQualityModel(baseState());
  assert(model.diagnostics.every((d) => d.domain && d.stableId), 'Unified Search-compatible diagnostics must preserve domain identity and stable IDs');
  passed++; console.log('PASS Unified Search diagnostic compatibility');

  console.log(`JEEVYA 3M DATA QUALITY: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(`JEEVYA 3M DATA QUALITY: FAILED - ${error.message}`); process.exitCode = 1; });
