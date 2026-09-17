// LifeOS 3F: cross-module analytics aggregation tests.
import { summarizeLifeOSAnalytics } from '@/services/lifeosAnalytics';
import type { LifeOSAnalyticsPoint } from '@/types/lifeosAnalytics';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const points: LifeOSAnalyticsPoint[] = [
  {
    date: '2026-09-13', tasksDue: 4, tasksCompleted: 3, tasksOverdue: 1,
    habitCompletionRate: 80, workoutsCompleted: 1, workoutMinutes: 45, sleepMinutes: 420,
    readinessScore: 75, caloriesIn: 2100, proteinGrams: 120, financeTransactions: 2,
    financeIncome: 1000, financeExpense: 300, readingBooks: 1, journalEntries: 1,
    goalsCompleted: 0, goalsActive: 2, goalsBehind: 1,
  },
  {
    date: '2026-09-14', tasksDue: 2, tasksCompleted: 2, tasksOverdue: 0,
    habitCompletionRate: 100, workoutsCompleted: 1, workoutMinutes: 30, sleepMinutes: null,
    readinessScore: null, caloriesIn: 1900, proteinGrams: 100, financeTransactions: 1,
    financeIncome: 0, financeExpense: 200, readingBooks: 1, journalEntries: 0,
    goalsCompleted: 1, goalsActive: 1, goalsBehind: 0,
  },
];

const summary = summarizeLifeOSAnalytics(points);
assert(summary.days === 2, 'day count');
assert(summary.taskCompletionRate === 83.3, 'task completion rate');
assert(summary.totalTasksDue === 6 && summary.totalTasksCompleted === 5, 'task totals');
assert(summary.totalOverdueTaskDays === 1, 'overdue days');
assert(summary.averageHabitCompletionRate === 90, 'habit average');
assert(summary.totalWorkouts === 2 && summary.totalWorkoutMinutes === 75, 'workout totals');
assert(summary.averageSleepMinutes === 420, 'missing sleep excluded');
assert(summary.averageReadinessScore === 75, 'missing readiness excluded');
assert(summary.averageCaloriesIn === 2000 && summary.averageProteinGrams === 110, 'nutrition averages');
assert(summary.totalFinanceTransactions === 3 && summary.totalFinanceIncome === 1000 && summary.totalFinanceExpense === 500, 'finance totals');
assert(summary.totalJournalEntries === 1, 'journal total');
assert(summary.goalCompletionCount === 1 && summary.goalBehindDays === 1, 'goal observations');

const empty = summarizeLifeOSAnalytics([]);
assert(empty.days === 0 && empty.taskCompletionRate === null && empty.averageSleepMinutes === null, 'empty summary');

const deterministicA = JSON.stringify(summarizeLifeOSAnalytics(points));
const deterministicB = JSON.stringify(summarizeLifeOSAnalytics(points));
assert(deterministicA === deterministicB, 'aggregation must be deterministic');

console.log('LIFEOS 3F CROSS-MODULE ANALYTICS: 13 passed, 0 failed');
