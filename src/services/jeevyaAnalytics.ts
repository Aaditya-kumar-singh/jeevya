import { addDays, isValidCivilDate, inclusiveDateRange, todayCivilDate, type CivilDate } from '@/lib/date';
import { getJeevyaDailyState } from '@/services/jeevyaIntegration';
import type { JeevyaAnalyticsPeriod, JeevyaAnalyticsPoint, JeevyaAnalyticsResult, JeevyaAnalyticsSummary } from '@/types/jeevyaAnalytics';

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function average(values: number[]): number | null {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
}

export function summarizeJeevyaAnalytics(points: JeevyaAnalyticsPoint[]): JeevyaAnalyticsSummary {
  const sleep = points.flatMap((point) => finite(point.sleepMinutes) ? [point.sleepMinutes] : []);
  const readiness = points.flatMap((point) => finite(point.readinessScore) ? [point.readinessScore] : []);
  const calories = points.map((point) => point.caloriesIn).filter(finite);
  const protein = points.map((point) => point.proteinGrams).filter(finite);
  const habitRates = points.flatMap((point) => finite(point.habitCompletionRate) ? [point.habitCompletionRate] : []);
  const totalTasksDue = points.reduce((sum, point) => sum + point.tasksDue, 0);
  const totalTasksCompleted = points.reduce((sum, point) => sum + point.tasksCompleted, 0);

  return {
    days: points.length,
    taskCompletionRate: totalTasksDue > 0 ? Math.round((totalTasksCompleted / totalTasksDue) * 1000) / 10 : null,
    totalTasksDue,
    totalTasksCompleted,
    totalOverdueTaskDays: points.reduce((sum, point) => sum + point.tasksOverdue, 0),
    averageHabitCompletionRate: average(habitRates),
    totalWorkouts: points.reduce((sum, point) => sum + point.workoutsCompleted, 0),
    totalWorkoutMinutes: points.reduce((sum, point) => sum + point.workoutMinutes, 0),
    averageSleepMinutes: average(sleep),
    averageReadinessScore: average(readiness),
    averageCaloriesIn: average(calories),
    averageProteinGrams: average(protein),
    totalFinanceTransactions: points.reduce((sum, point) => sum + point.financeTransactions, 0),
    totalFinanceIncome: points.reduce((sum, point) => sum + point.financeIncome, 0),
    totalFinanceExpense: points.reduce((sum, point) => sum + point.financeExpense, 0),
    totalJournalEntries: points.reduce((sum, point) => sum + point.journalEntries, 0),
    goalCompletionCount: points.reduce((sum, point) => sum + point.goalsCompleted, 0),
    goalBehindDays: points.reduce((sum, point) => sum + point.goalsBehind, 0),
  };
}

const DAILY_STATE_BATCH_SIZE = 6;

export async function loadJeevyaDailyStates(dates: CivilDate[], batchSize = DAILY_STATE_BATCH_SIZE) {
  const safeBatchSize = Number.isInteger(batchSize) && batchSize > 0 ? batchSize : DAILY_STATE_BATCH_SIZE;
  const states = [] as Awaited<ReturnType<typeof getJeevyaDailyState>>[];
  for (let index = 0; index < dates.length; index += safeBatchSize) {
    const batch = dates.slice(index, index + safeBatchSize);
    states.push(...await Promise.all(batch.map((date) => getJeevyaDailyState(date))));
  }
  return states;
}

export async function getJeevyaAnalytics(
  period: JeevyaAnalyticsPeriod = 7,
  endDate: CivilDate = todayCivilDate(),
): Promise<JeevyaAnalyticsResult> {
  if (!isValidCivilDate(endDate)) throw new Error('Invalid analytics end date');
  const startDate = addDays(endDate, -(period - 1));
  if (!startDate) throw new Error('Unable to calculate analytics start date');
  const dates = inclusiveDateRange(startDate, endDate);
  const states = await loadJeevyaDailyStates(dates);
  const points: JeevyaAnalyticsPoint[] = states.map((state) => ({
    date: state.date as CivilDate,
    tasksDue: state.tasks.dueToday,
    tasksCompleted: state.tasks.completedToday,
    tasksOverdue: state.tasks.overdue,
    habitCompletionRate: state.habits.completionRate,
    workoutsCompleted: state.health.completedWorkoutsToday,
    workoutMinutes: state.health.completedWorkoutMinutes ?? 0,
    sleepMinutes: state.health.sleep?.durationMinutes ?? null,
    readinessScore: state.health.recovery?.available ? state.health.recovery.readinessScore : null,
    caloriesIn: state.nutrition.summary.totals.calories,
    proteinGrams: state.nutrition.summary.totals.protein,
    financeTransactions: state.finance.transactionsToday,
    financeIncome: state.finance.incomeToday,
    financeExpense: state.finance.expenseToday,
    readingBooks: state.books.currentlyReading,
    journalEntries: state.journal.entryCountToday,
    goalsCompleted: state.goals.filter((goal) => goal.status === 'completed').length,
    goalsActive: state.goals.filter((goal) => goal.status === 'active').length,
    goalsBehind: state.goals.filter((goal) => goal.status === 'behind').length,
  }));

  return { period, startDate, endDate, points, summary: summarizeJeevyaAnalytics(points) };
}
