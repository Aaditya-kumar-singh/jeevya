// Jeevya 3G: deterministic weekly review tests.
import { buildWeeklyReviewInsights } from '@/services/weeklyReview';
import type { JeevyaAnalyticsResult } from '@/types/jeevyaAnalytics';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const analytics: JeevyaAnalyticsResult = {
  period: 7,
  startDate: '2026-09-08',
  endDate: '2026-09-14',
  points: [
    { date: '2026-09-08', tasksDue: 4, tasksCompleted: 4, tasksOverdue: 0, habitCompletionRate: 90, workoutsCompleted: 1, workoutMinutes: 45, sleepMinutes: 480, readinessScore: 85, caloriesIn: 2000, proteinGrams: 120, financeTransactions: 2, financeIncome: 1000, financeExpense: 400, readingBooks: 1, journalEntries: 1, goalsCompleted: 0, goalsActive: 2, goalsBehind: 0 },
    { date: '2026-09-09', tasksDue: 3, tasksCompleted: 2, tasksOverdue: 1, habitCompletionRate: 70, workoutsCompleted: 0, workoutMinutes: 0, sleepMinutes: 390, readinessScore: 65, caloriesIn: 1900, proteinGrams: 100, financeTransactions: 1, financeIncome: 0, financeExpense: 200, readingBooks: 1, journalEntries: 0, goalsCompleted: 0, goalsActive: 2, goalsBehind: 1 },
  ],
  summary: {
    days: 2, taskCompletionRate: 85.7, totalTasksDue: 7, totalTasksCompleted: 6, totalOverdueTaskDays: 1,
    averageHabitCompletionRate: 80, totalWorkouts: 1, totalWorkoutMinutes: 45, averageSleepMinutes: 435,
    averageReadinessScore: 75, averageCaloriesIn: 1950, averageProteinGrams: 110, totalFinanceTransactions: 3,
    totalFinanceIncome: 1000, totalFinanceExpense: 600, totalJournalEntries: 1, goalCompletionCount: 0, goalBehindDays: 1,
  },
};

const insights = buildWeeklyReviewInsights(analytics);
assert(insights.length <= 8, 'review must be capped');
assert(insights.some((item) => item.id === 'tasks-strong'), 'strong tasks signal');
assert(insights.some((item) => item.id === 'sleep-good'), 'sleep signal');
assert(insights.some((item) => item.id === 'goals-behind'), 'goal attention signal');
assert(insights[0]?.tone === 'attention', 'attention should be prioritized');

const a = JSON.stringify(buildWeeklyReviewInsights(analytics));
const b = JSON.stringify(buildWeeklyReviewInsights(analytics));
assert(a === b, 'review must be deterministic');

console.log('JEEVYA 3G WEEKLY REVIEW: 6 passed, 0 failed');
