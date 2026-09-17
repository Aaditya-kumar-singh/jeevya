// LifeOS 3E: record-level Daily Pulse action tests.
import { buildDailyPulse } from '@/services/dailyPulse';
import type { LifeOSDailyState } from '@/types/lifeosIntegration';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseState: LifeOSDailyState = {
  date: '2026-09-14',
  tasks: {
    total: 1, dueToday: 1, overdue: 1, completedToday: 0, active: 1,
    overdueTasks: [{ id: 'task-1', title: 'Pay bill' }],
    incompleteDueTodayTasks: [{ id: 'task-1', title: 'Pay bill' }],
  },
  habits: {
    activeToday: 1, completedToday: 0, completionRate: 0,
    remainingToday: [{ id: 'habit-1', name: 'Read' }],
  },
  health: { activeWorkout: true, activeWorkoutId: 'workout-1', completedWorkoutsToday: 0, sleep: null, recovery: null },
  nutrition: {
    summary: { date: '2026-09-14', totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, micronutrients: {} }, byMeal: [], loggedCount: 0, calculatedCount: 0, unavailableCount: 0, errorCount: 0 },
    targets: null,
    energy: { date: '2026-09-14', caloriesIn: 0, bmr: null, activityCalories: 0, caloriesOut: 0, netCalories: 0, calorieTarget: null, remainingCalories: null, status: 'maintenance' },
  },
  finance: { accountCount: 0, currencyBreakdown: {}, transactionsToday: 0, incomeToday: 0, expenseToday: 0 },
  books: { currentlyReading: 0, readingBooks: [] },
  journal: { entryCountToday: 0, hasEntryToday: false, latestEntry: null },
  goals: [],
};

const pulse = buildDailyPulse(baseState);
const overdue = pulse.items.find((item) => item.id === 'tasks-overdue');
const habits = pulse.items.find((item) => item.id === 'habits-remaining');
const workout = pulse.items.find((item) => item.id === 'workout-active');

assert(overdue?.actionType === 'complete_task', 'single overdue task should expose completion action');
assert(overdue?.actionTargetId === 'task-1', 'task action must use authoritative task ID');
assert(habits?.actionType === 'complete_habit', 'single remaining habit should expose completion action');
assert(habits?.actionTargetId === 'habit-1', 'habit action must use authoritative habit ID');
assert(workout?.actionType === 'resume_workout', 'active workout should expose resume action');
assert(workout?.actionTargetId === 'workout-1', 'workout action must use authoritative session ID');

const multiple = buildDailyPulse({
  ...baseState,
  tasks: {
    ...baseState.tasks,
    overdue: 2,
    overdueTasks: [{ id: 'task-1', title: 'Pay bill' }, { id: 'task-2', title: 'Call' }],
  },
  habits: {
    ...baseState.habits,
    activeToday: 2,
    remainingToday: [{ id: 'habit-1', name: 'Read' }, { id: 'habit-2', name: 'Walk' }],
  },
});
const multipleOverdue = multiple.items.find((item) => item.id === 'tasks-overdue');
const multipleHabits = multiple.items.find((item) => item.id === 'habits-remaining');
assert(multipleOverdue?.actionType === 'navigate' && !multipleOverdue.actionTargetId, 'multiple overdue tasks must remain navigation-first');
assert(multipleHabits?.actionType === 'navigate' && !multipleHabits.actionTargetId, 'multiple remaining habits must remain navigation-first');

console.log('LIFEOS 3E RECORD ACTIONS: 7 passed, 0 failed');
