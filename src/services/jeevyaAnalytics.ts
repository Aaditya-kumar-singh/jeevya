import { isValidCivilDate, inclusiveDateRange, todayCivilDate, type CivilDate } from '@/lib/date';
import { getJeevyaDailyState } from '@/services/jeevyaIntegration';
import { getStandardAnalyticsRange, averageFinite } from '@/services/analyticsCore';
import { loadSharedAnalyticsData } from '@/services/sharedAnalyticsData';
import type { JeevyaAnalyticsPeriod, JeevyaAnalyticsPoint, JeevyaAnalyticsResult, JeevyaAnalyticsSummary } from '@/types/jeevyaAnalytics';

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function average(values: number[]): number | null {
  return averageFinite(values);
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

function dateOf(value: unknown): CivilDate | null {
  if (typeof value !== 'string') return null;
  const date = value.slice(0, 10);
  return isValidCivilDate(date) ? date : null;
}

export async function getJeevyaAnalytics(
  period: JeevyaAnalyticsPeriod = 7,
  endDate: CivilDate = todayCivilDate(),
): Promise<JeevyaAnalyticsResult> {
  if (!isValidCivilDate(endDate)) throw new Error('Invalid analytics end date');

  const { startDate } = getStandardAnalyticsRange(endDate, period);
  const dates = inclusiveDateRange(startDate, endDate);
  const { data } = await loadSharedAnalyticsData();

  // Shared persisted records are now the canonical source for tasks, habits,
  // workouts, sleep, finance, books and journal analytics. Daily state remains
  // only for fields whose historical source is not persisted yet.
  const dailyStates = await loadJeevyaDailyStates(dates);
  const stateByDate = new Map(dailyStates.map((state) => [state.date as CivilDate, state]));

  const tasks = data.tasks.filter((task) => typeof task.id === 'string' && task.id.trim());
  const habits = data.habits.filter((habit) => typeof habit.id === 'string' && habit.id.trim());
  const habitLogs = data.habitLogs.filter((log) => typeof log.id === 'string' && typeof log.habitId === 'string' && log.completed && isValidCivilDate(log.date));
  const workouts = data.workouts.filter((workout) => typeof workout.id === 'string' && workout.status === 'completed');
  const sleep = data.sleep.filter((entry) => typeof entry.id === 'string' && finite(entry.durationMinutes) && entry.durationMinutes > 0 && isValidCivilDate(entry.date));
  const transactions = data.transactions.filter((transaction) => typeof transaction.id === 'string' && finite(transaction.amount) && transaction.amount >= 0 && isValidCivilDate(transaction.date));
  const books = data.books.filter((book) => typeof book.id === 'string' && book.id.trim());
  const journal = data.journal.filter((entry) => typeof entry.id === 'string' && isValidCivilDate(entry.date));

  const points: JeevyaAnalyticsPoint[] = dates.map((date) => {
    const state = stateByDate.get(date);
    const tasksDue = tasks.filter((task) => dateOf(task.dueDate) === date).length;
    const tasksCompleted = tasks.filter((task) => task.completed && dateOf(task.completedAt) === date).length;
    const tasksOverdue = tasks.filter((task) => {
      const due = dateOf(task.dueDate);
      const completed = dateOf(task.completedAt);
      return due === date && (!completed || completed > due);
    }).length;

    const activeHabits = habits.filter((habit) =>
      habit.isActive && !habit.isArchived && habit.startDate <= date && (!habit.endDate || habit.endDate >= date),
    );
    const dayLogs = habitLogs.filter((log) => log.date === date);
    const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
    const scheduled = activeHabits.filter((habit) =>
      habit.frequency === 'daily' || habit.days.includes(weekday as never),
    ).length;
    const completedHabitLogs = dayLogs.filter((log) => activeHabits.some((habit) => habit.id === log.habitId)).length;
    const habitCompletionRate = scheduled > 0 ? Math.round((completedHabitLogs / scheduled) * 1000) / 10 : state?.habits.completionRate ?? null;

    const dayWorkouts = workouts.filter((workout) => dateOf(workout.completedAt ?? workout.startedAt) === date);
    const daySleep = sleep.filter((entry) => entry.date === date);
    const dayTransactions = transactions.filter((transaction) => transaction.date === date);
    const dayBooks = books.filter((book) => dateOf(book.completedAt) === date);
    const dayJournal = journal.filter((entry) => entry.date === date);

    return {
      date,
      tasksDue,
      tasksCompleted,
      tasksOverdue,
      habitCompletionRate,
      workoutsCompleted: dayWorkouts.length,
      workoutMinutes: dayWorkouts.reduce((sum, workout) => sum + (finite(workout.durationSeconds) && workout.durationSeconds > 0 ? workout.durationSeconds / 60 : 0), 0),
      sleepMinutes: daySleep.length ? average(daySleep.map((entry) => entry.durationMinutes)) : null,
      readinessScore: state?.health.recovery?.available ? state.health.recovery.readinessScore : null,
      caloriesIn: state?.nutrition.summary.totals.calories ?? 0,
      proteinGrams: state?.nutrition.summary.totals.protein ?? 0,
      financeTransactions: dayTransactions.length,
      financeIncome: dayTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0),
      financeExpense: dayTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0),
      readingBooks: dayBooks.length || state?.books.currentlyReading || 0,
      journalEntries: dayJournal.length,
      goalsCompleted: state?.goals.filter((goal) => goal.status === 'completed').length ?? 0,
      goalsActive: state?.goals.filter((goal) => goal.status === 'active').length ?? 0,
      goalsBehind: state?.goals.filter((goal) => goal.status === 'behind').length ?? 0,
    };
  });

  return { period, startDate, endDate, points, summary: summarizeJeevyaAnalytics(points) };
}
