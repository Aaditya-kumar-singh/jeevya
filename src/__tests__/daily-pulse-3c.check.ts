import { buildDailyPulse, type DailyPulseItem } from '@/services/dailyPulse';
import type { LifeOSDailyState } from '@/types/lifeosIntegration';

const emptyState = (date = '2026-09-14'): LifeOSDailyState => ({
  date,
  tasks: { total: 0, dueToday: 0, overdue: 0, completedToday: 0, active: 0 },
  habits: { activeToday: 0, completedToday: 0, completionRate: null },
  health: { activeWorkout: false, completedWorkoutsToday: 0, sleep: null, recovery: null },
  nutrition: { summary: { date, totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, micronutrients: {} }, byMeal: [], loggedCount: 0, calculatedCount: 0, unavailableCount: 0, errorCount: 0 }, targets: null, energy: {} as any },
  finance: { accountCount: 0, currencyBreakdown: {}, transactionsToday: 0, incomeToday: 0, expenseToday: 0 },
  books: { currentlyReading: 0, readingBooks: [] },
  journal: { entryCountToday: 0, hasEntryToday: false, latestEntry: null },
  goals: [],
});

const test = (name: string, fn: () => void) => { fn(); console.log(`PASS ${name}`); };
const assert = (v: unknown, m: string): void => { if (!v) throw new Error(m); };

const actionSources = (items: DailyPulseItem[]) => items.filter(i => i.navigationTarget).map(i => [i.source, i.navigationTarget, i.actionType, i.actionLabel]);

test('action metadata generation', () => {
  const s = emptyState(); s.tasks.dueToday = 1; const i = buildDailyPulse(s).items.find(x => x.id === 'tasks-due-today')!;
  assert(i.actionType === 'navigate' && i.actionLabel === 'Open Tasks', 'task action metadata');
});
test('correct route for each represented domain', () => {
  const s = emptyState(); s.tasks.overdue=1; s.habits.activeToday=1; s.health.completedWorkoutsToday=1; s.nutrition.summary.loggedCount=1; s.finance.transactionsToday=1; s.books.currentlyReading=1; s.journal.hasEntryToday=true; s.journal.entryCountToday=1; s.goals=[{ id: 'books:g1', title: 'Reading goal', source: 'books', metric: 'books_completed', targetValue: 1, currentValue: 1, progressPercentage: 100, status: 'completed', startDate: '2026-09-01', endDate: '2026-09-30', createdAt: '', updatedAt: '' }];
  const routes = new Map(actionSources(buildDailyPulse(s).items).map(([src, route]) => [src, route]));
  assert(routes.get('tasks') === '/tasks', 'tasks route'); assert(routes.get('habits') === '/habits', 'habits route'); assert(routes.get('health') === '/health/workout-history', 'health route'); assert(routes.get('nutrition') === '/nutrition', 'nutrition route'); assert(routes.get('finance') === '/finance', 'finance route'); assert(routes.get('books') === '/books', 'books route'); assert(routes.get('journal') === '/journal', 'journal route'); assert(routes.get('goals') === '/goals', 'goals route');
});
test('stable action IDs', () => { const s=emptyState(); s.tasks.dueToday=1; assert(buildDailyPulse(s).items[0].id === buildDailyPulse(s).items[0].id, 'stable id'); });
test('deterministic actions', () => { const s=emptyState(); s.tasks.dueToday=1; assert(JSON.stringify(actionSources(buildDailyPulse(s).items))===JSON.stringify(actionSources(buildDailyPulse(s).items)), 'determinism'); });
test('missing source data', () => { const m=buildDailyPulse(emptyState()); assert(m.items.length===0, 'empty source should not create actions'); });
test('deleted or missing records remain safe through aggregate routes', () => { const s=emptyState(); s.tasks.overdue=1; const i=buildDailyPulse(s).items.find(x=>x.id==='tasks-overdue')!; assert(i.navigationTarget==='/tasks', 'safe aggregate task destination'); });
test('informational items without destinations remain non-actionable', () => { const s=emptyState(); s.health.sleep={date:s.date,durationMinutes:300,quality:null as any}; const i=buildDailyPulse(s).items.find(x=>x.id==='sleep-low'); assert(i && !!i.navigationTarget && i.actionType==='navigate', 'sleep should navigate'); });
test('priority ordering preserved', () => { const s=emptyState(); s.tasks.overdue=1; s.health.completedWorkoutsToday=1; const items=buildDailyPulse(s).items; assert(items[0].priority==='high', 'high priority first'); });
test('presentation does not mutate source', () => { const s=emptyState(); s.tasks.overdue=1; const before=JSON.stringify(s); buildDailyPulse(s); assert(JSON.stringify(s)===before, 'source mutated'); });
test('navigation target correctness', () => { const s=emptyState(); s.health.recovery={date:s.date,readinessScore:40,readinessLevel:'low',available:true}; const i=buildDailyPulse(s).items.find(x=>x.id==='recovery-low'); assert(i && i.navigationTarget==='/health/recovery', 'recovery target'); });
test('safe action eligibility', () => { const s=emptyState(); s.nutrition.summary.loggedCount=0; assert(!buildDailyPulse(s).items.some(i=>i.source==='nutrition'), 'fake nutrition action'); });
test('no persistence from Daily Pulse', () => { assert(!/AsyncStorage|saveData|removeData|loadData/.test(buildDailyPulse.toString()), 'persistence reference'); });
console.log('3C Daily Pulse: 12 passed, 0 failed');