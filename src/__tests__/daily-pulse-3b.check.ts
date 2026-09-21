import { buildDailyPulse } from '@/services/dailyPulse';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function equal(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

const base = (): JeevyaDailyState => ({
  date: '2026-09-14',
  tasks: { total: 0, dueToday: 0, overdue: 0, completedToday: 0, active: 0 },
  habits: { activeToday: 0, completedToday: 0, completionRate: null },
  health: { activeWorkout: false, completedWorkoutsToday: 0, sleep: null, recovery: null },
  nutrition: {
    summary: {
      date: '2026-09-14', totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, micronutrients: {} },
      byMeal: [], loggedCount: 0, calculatedCount: 0, unavailableCount: 0, errorCount: 0,
    },
    targets: null,
    energy: { date: '2026-09-14', caloriesIn: 0, bmr: null, activityCalories: 0, caloriesOut: 0, netCalories: 0, calorieTarget: null, remainingCalories: null, status: 'maintenance' },
  },
  finance: { accountCount: 0, currencyBreakdown: {}, transactionsToday: 0, incomeToday: 0, expenseToday: 0 },
  books: { currentlyReading: 0, readingBooks: [] },
  journal: { entryCountToday: 0, hasEntryToday: false, latestEntry: null },
  goals: [],
});
const item = (state: JeevyaDailyState, id: string) => buildDailyPulse(state).items.find((entry) => entry.id === id);
const withState = (changes: Partial<JeevyaDailyState>): JeevyaDailyState => ({ ...base(), ...changes });

async function run(): Promise<void> {
  let passed = 0;
  const test = (name: string, fn: () => void) => { fn(); passed += 1; console.log(`PASS ${name}`); };

  test('empty day', () => { const p = buildDailyPulse(base()); equal(p.items, [], 'items'); equal(p.focus, [], 'focus'); });
  test('tasks only', () => { const s = withState({ tasks: { total: 4, dueToday: 2, overdue: 1, completedToday: 1, active: 4 } }); assert(item(s, 'tasks-due-today')?.value === 2, 'due today'); assert(item(s, 'tasks-overdue')?.priority === 'high', 'overdue priority'); assert(item(s, 'tasks-completed-today')?.category === 'positive', 'completed'); });
  test('habits only', () => { const s = withState({ habits: { activeToday: 3, completedToday: 1, completionRate: 33 } }); assert(item(s, 'habits-remaining')?.value === 2, 'remaining habits'); });
  test('health only', () => { const s = withState({ health: { activeWorkout: false, completedWorkoutsToday: 1, sleep: null, recovery: null } }); assert(item(s, 'workout-complete')?.category === 'positive', 'workout'); });
  test('nutrition only', () => { const s = withState({ nutrition: { ...base().nutrition, summary: { ...base().nutrition.summary, loggedCount: 2, totals: { ...base().nutrition.summary.totals, calories: 1500, protein: 70 } }, targets: { bmr: 1600, tdee: 2200, targetCalories: 2000, protein: 100, fat: 70, carbohydrates: 200, fiber: 30 } } }); assert(!!item(s, 'nutrition-target-calories'), 'calories'); assert(!!item(s, 'nutrition-protein-low'), 'protein'); });
  test('finance only', () => { const s = withState({ finance: { accountCount: 2, currencyBreakdown: { INR: 1000 }, transactionsToday: 3, incomeToday: 1000, expenseToday: 500 } }); assert(item(s, 'finance-today')?.value === 3, 'finance'); });
  test('books only', () => { const s = withState({ books: { currentlyReading: 1, readingBooks: [{ id: 'b1', title: 'Book', currentPage: 50, totalPages: 100 }] } }); assert(item(s, 'books-reading')?.value === 50, 'books'); });
  test('journal only', () => { const s = withState({ journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: { id: 'j1', title: 'Today', mood: null, updatedAt: '2026-09-14T10:00:00Z' } } }); assert(item(s, 'journal-entry')?.category === 'positive', 'journal'); });
  test('goals', () => { const s = withState({ goals: [{ id: 'books:g1', title: 'September reading goal', source: 'books', metric: 'books_completed', targetValue: 2, currentValue: 1, progressPercentage: 50, status: 'active', startDate: '2026-09-01', endDate: '2026-09-30', createdAt: '', updatedAt: '' }] }); assert(item(s, 'goal-progress:books:g1')?.category === 'progress', 'goals'); });
  test('completed goal signal', () => { const s = withState({ goals: [{ id: 'books:g2', title: 'Finished reading goal', source: 'books', metric: 'books_completed', targetValue: 2, currentValue: 2, progressPercentage: 100, status: 'completed', startDate: '2026-09-01', endDate: '2026-09-30', createdAt: '', updatedAt: '' }] }); const i = item(s, 'goal-completed:books:g2'); assert(i?.category === 'positive' && i.navigationTarget === '/goals', 'completed goal signal'); });
  test('behind goal signal', () => { const s = withState({ goals: [{ id: 'books:g3', title: 'Behind reading goal', source: 'books', metric: 'books_completed', targetValue: 10, currentValue: 1, progressPercentage: 10, status: 'behind', startDate: '2026-09-01', endDate: '2026-09-30', createdAt: '', updatedAt: '' }] }); const i = item(s, 'goal-behind:books:g3'); assert(i?.category === 'attention' && i.priority === 'medium', 'behind goal signal'); });
  test('deadline approaching signal', () => { const s = withState({ goals: [{ id: 'books:g4', title: 'Due soon reading goal', source: 'books', metric: 'books_completed', targetValue: 10, currentValue: 5, progressPercentage: 50, status: 'active', startDate: '2026-09-01', endDate: '2026-09-16', createdAt: '', updatedAt: '' }] }); const i = item(s, 'goal-deadline:books:g4'); assert(i?.category === 'attention' && i.priority === 'high', 'deadline signal'); });
  test('all domains together', () => { const s = withState({ tasks: { total: 1, dueToday: 1, overdue: 1, completedToday: 0, active: 1 }, habits: { activeToday: 1, completedToday: 0, completionRate: 0 }, health: { activeWorkout: true, completedWorkoutsToday: 0, sleep: { date: '2026-09-14', durationMinutes: 420, quality: 'good' }, recovery: { date: '2026-09-14', readinessScore: 90, readinessLevel: 'excellent', available: true } }, finance: { accountCount: 1, currencyBreakdown: { INR: 1000 }, transactionsToday: 1, incomeToday: 0, expenseToday: 100 }, books: { currentlyReading: 1, readingBooks: [{ id: 'b', title: 'B', currentPage: 10, totalPages: 20 }] }, journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: { id: 'j', title: 'J', mood: null, updatedAt: '' } } }); const sources = new Set(buildDailyPulse(s).items.map((e) => e.source)); equal([...sources].sort(), ['books', 'finance', 'habits', 'health', 'journal', 'tasks'], 'sources'); });
  test('overdue task priority', () => { assert(item(withState({ tasks: { total: 1, dueToday: 0, overdue: 1, completedToday: 0, active: 1 } }), 'tasks-overdue')?.priority === 'high', 'priority'); });
  test('low sleep priority', () => { const s = withState({ health: { ...base().health, sleep: { date: '2026-09-14', durationMinutes: 300, quality: 'poor' } } }); assert(item(s, 'sleep-low')?.priority === 'high', 'sleep'); });
  test('low recovery priority', () => { const s = withState({ health: { ...base().health, recovery: { date: '2026-09-14', readinessScore: 40, readinessLevel: 'low', available: true } } }); assert(item(s, 'recovery-low')?.priority === 'high', 'recovery'); });
  test('scheduled workout', () => { const s = withState({ health: { ...base().health, activeWorkout: true } }); assert(item(s, 'workout-active')?.priority === 'medium', 'workout'); });
  test('nutrition target status', () => { const s = withState({ nutrition: { ...base().nutrition, summary: { ...base().nutrition.summary, totals: { ...base().nutrition.summary.totals, calories: 1900 } }, targets: { bmr: 1600, tdee: 2200, targetCalories: 2000, protein: 80, fat: 70, carbohydrates: 200, fiber: 30 } } }); assert(item(s, 'nutrition-target-calories')?.value === 95, 'nutrition value'); });
  test('positive progress', () => { const s = withState({ tasks: { total: 1, dueToday: 0, overdue: 0, completedToday: 1, active: 1 }, habits: { activeToday: 1, completedToday: 1, completionRate: 100 } }); const ids = buildDailyPulse(s).progress.map((e) => e.id); assert(ids.includes('tasks-completed-today') && ids.includes('habits-complete'), 'positive items'); });
  test('priority ordering', () => { const s = withState({ tasks: { total: 1, dueToday: 1, overdue: 1, completedToday: 0, active: 1 }, health: { ...base().health, sleep: { date: '2026-09-14', durationMinutes: 300, quality: 'poor' } } }); const ids = buildDailyPulse(s).items.map((e) => e.id); assert(ids.indexOf('tasks-overdue') < ids.indexOf('tasks-due-today'), 'overdue first'); assert(ids.indexOf('sleep-low') < ids.indexOf('tasks-due-today'), 'sleep first'); });
  test('deterministic stable IDs', () => { const s = withState({ tasks: { total: 2, dueToday: 1, overdue: 1, completedToday: 1, active: 2 } }); equal(buildDailyPulse(s), buildDailyPulse(s), 'determinism'); assert(buildDailyPulse(s).items.every((e) => e.id.length > 0), 'stable IDs'); });
  test('missing domain data', () => { const s = base(); s.health.sleep = null; s.health.recovery = null; s.nutrition.targets = null; assert(!!buildDailyPulse(s), 'missing data'); });
  test('partial domain data', () => { const s = base(); s.books = { currentlyReading: 1, readingBooks: [{ id: 'b', title: 'B', currentPage: 0, totalPages: null }] }; assert(item(s, 'books-reading')?.value === undefined, 'no fabricated progress'); assert(!item(s, 'sleep-low'), 'no fake sleep'); });
  test('source data unchanged', () => { const s = withState({ tasks: { total: 1, dueToday: 1, overdue: 1, completedToday: 0, active: 1 } }); const before = JSON.stringify(s); buildDailyPulse(s); equal(JSON.stringify(s), before, 'source mutated'); });
  test('no persistence', () => { assert(!/AsyncStorage|saveData|loadData|removeData/.test(buildDailyPulse.toString()), 'persistence reference'); });
  test('invalid values do not fabricate output', () => { const s = base(); s.health.sleep = { date: '2026-09-14', durationMinutes: Number.NaN, quality: 'poor' }; s.health.recovery = { date: '2026-09-14', readinessScore: Number.NaN, readinessLevel: 'low', available: true }; const p = buildDailyPulse(s); assert(!p.items.some((e) => e.id === 'sleep-low' || e.id === 'recovery-low'), 'fake output'); });

  console.log(`3B Daily Pulse: ${passed} passed, 0 failed`);
}

void run();
