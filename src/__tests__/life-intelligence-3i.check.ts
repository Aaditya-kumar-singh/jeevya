import { todayCivilDate } from '@/lib/date';
import { buildLifeInsights } from '@/services/lifeIntelligence';
import type { LifeOSDailyState } from '@/types/lifeosIntegration';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function state(): LifeOSDailyState { return {
  date: todayCivilDate(),
  tasks: { total: 3, dueToday: 2, overdue: 1, completedToday: 2, active: 3, overdueTasks: [], incompleteDueTodayTasks: [] },
  habits: { activeToday: 2, completedToday: 2, completionRate: 100, remainingToday: [] },
  health: { activeWorkout: false, activeWorkoutId: null, completedWorkoutsToday: 1, completedWorkoutMinutes: 45, sleep: { date: todayCivilDate(), durationMinutes: 480, quality: 'good' }, recovery: { date: todayCivilDate(), readinessScore: 90, readinessLevel: 'excellent', available: true } },
  nutrition: { summary: { date: todayCivilDate(), totals: { calories: 1800, protein: 120, carbohydrates: 200, fat: 60, fiber: 20, sugar: 30, saturatedFat: 15, sodium: 500, micronutrients: {} }, byMeal: [], loggedCount: 2, calculatedCount: 2, unavailableCount: 0, errorCount: 0 }, targets: null, energy: { date: todayCivilDate(), caloriesIn: 1800, bmr: null, activityCalories: 300, caloriesOut: 300, netCalories: 1500, calorieTarget: null, remainingCalories: null, status: 'surplus' } },
  finance: { accountCount: 1, currencyBreakdown: { INR: 1000 }, transactionsToday: 1, incomeToday: 0, expenseToday: 100 },
  books: { currentlyReading: 1, readingBooks: [] }, journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: null }, goals: [],
}; }

(async () => {
  let passed = 0;
  const check = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`); };
  check('warnings rank before positive signals', () => { const items = buildLifeInsights(state()); assert(items[0]?.severity === 'warning', 'warning did not rank first'); });
  check('deterministic stable IDs', () => { const a = buildLifeInsights(state()); const b = buildLifeInsights(state()); assert(JSON.stringify(a) === JSON.stringify(b), 'results differ'); });
  check('maximum insight count is bounded', () => assert(buildLifeInsights(state()).length <= 8, 'too many insights'));
  check('source state remains unchanged', () => { const source = state(); const before = JSON.stringify(source); buildLifeInsights(source); assert(JSON.stringify(source) === before, 'source mutated'); });
  check('positive signals appear from healthy recorded data', () => { const items = buildLifeInsights(state()); assert(items.some((item) => item.id === 'life-habits-strong') && items.some((item) => item.id === 'life-reading-active'), 'positive signals missing'); });
  console.log(`LIFEOS 3I LIFE INTELLIGENCE: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
