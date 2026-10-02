import { isValidCivilDate, inclusiveDateRange, todayCivilDate, type CivilDate } from '@/lib/date';
import { averageFinite, createFreshness, getStandardAnalyticsRange } from '@/services/analyticsCore';
import { ANALYTICS_SOURCE_KEYS, loadSharedAnalyticsData, type AnalyticsSourceData } from '@/services/sharedAnalyticsData';
import type { BookProgressEntry } from '@/types/books';
import type { FinanceTransaction } from '@/types/finance';
import type { FoodLogEntry } from '@/types/nutrition';
import type { WorkoutSession } from '@/types/workout';
import type {
  HistoricalAnalyticsDomain,
  HistoricalAnalyticsFilter,
  HistoricalAnalyticsPeriod,
  HistoricalAnalyticsQuery,
  HistoricalAnalyticsResult,
  HistoricalMetric,
  HistoricalInterpretation,
  HistoricalTrend,
} from '@/types/historicalAnalytics';

const KEYS = ANALYTICS_SOURCE_KEYS;

const DOMAIN_ORDER: HistoricalAnalyticsDomain[] = ['tasks', 'habits', 'workout', 'sleep', 'recovery', 'nutrition', 'finance', 'books', 'journal', 'goals'];
const FILTER_DOMAINS: Record<Exclude<HistoricalAnalyticsFilter, 'all'>, HistoricalAnalyticsDomain[]> = {
  tasks: ['tasks'], habits: ['habits'], health: ['workout', 'sleep', 'recovery'], nutrition: ['nutrition'], finance: ['finance'], books: ['books'], journal: ['journal'], goals: ['goals'],
};

type SourceData = AnalyticsSourceData;

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function validId(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function validInstant(value: unknown): value is string { return typeof value === 'string' && !Number.isNaN(Date.parse(value)); }
function dateOf(value: unknown): CivilDate | null {
  if (typeof value !== 'string') return null;
  const date = value.slice(0, 10);
  return isValidCivilDate(date) ? date : null;
}
function inRange(date: CivilDate | null, start: CivilDate, end: CivilDate): boolean { return !!date && date >= start && date <= end; }

async function loadSources(generatedAt: string): Promise<{ data: SourceData; degradedDomains: HistoricalAnalyticsDomain[]; errors: Partial<Record<HistoricalAnalyticsDomain, string>>; freshness: Partial<Record<HistoricalAnalyticsDomain, ReturnType<typeof createFreshness>>> }> {
  const shared = await loadSharedAnalyticsData();
  const freshness = Object.fromEntries(
    DOMAIN_ORDER.map((domain) => [domain, createFreshness(shared.sourceUpdatedAt[domain], generatedAt)]),
  ) as Partial<Record<HistoricalAnalyticsDomain, ReturnType<typeof createFreshness>>>;
  return { data: shared.data, degradedDomains: shared.degradedDomains, errors: shared.errors, freshness };
}

function compareNumeric(id: string, domain: HistoricalAnalyticsDomain, label: string, current: number | null, previous: number | null, interpretation: HistoricalInterpretation, route?: string, unit?: string, rate = false, dataQuality: HistoricalMetric['dataQuality'] = 'complete'): HistoricalMetric {
  const hasBoth = current != null && previous != null;
  const absoluteChange = hasBoth ? current! - previous! : null;
  const percentageChange = hasBoth && previous !== 0 ? (absoluteChange! / Math.abs(previous!)) * 100 : null;
  const percentagePointChange = rate && hasBoth ? absoluteChange : undefined;
  const rawTrend: HistoricalTrend = !hasBoth ? 'insufficient_data' : Math.abs(absoluteChange!) < 0.0001 ? 'stable' : absoluteChange! > 0 ? 'up' : 'down';
  const status = !hasBoth ? 'insufficient_data' : rawTrend === 'stable' ? 'stable' : interpretation === 'informational' || interpretation === 'neutral' ? 'stable' : interpretation === 'positive' ? (rawTrend === 'up' ? 'improving' : 'declining') : (rawTrend === 'down' ? 'improving' : 'declining');
  return { id, domain, label, unit, currentValue: current, previousValue: previous, absoluteChange, percentageChange, percentagePointChange, rawTrend, trend: rawTrend, status, interpretation, dataQuality: !hasBoth ? 'insufficient_data' : dataQuality, route };
}

function filterMetric(metric: HistoricalMetric, filter: HistoricalAnalyticsFilter): boolean {
  return filter === 'all' || FILTER_DOMAINS[filter].includes(metric.domain);
}

function rangeFor(endDate: CivilDate, period: HistoricalAnalyticsPeriod) {
  return getStandardAnalyticsRange(endDate, period);
}



export async function getHistoricalAnalytics(query: HistoricalAnalyticsQuery = {}): Promise<HistoricalAnalyticsResult> {
  const period = query.period ?? 7;
  const endDate = query.endDate ?? todayCivilDate();
  const filter = query.filter ?? 'all';
  if (![7, 30, 90, 365].includes(period) || !isValidCivilDate(endDate)) throw new Error('Invalid historical analytics period or end date');
  const range = rangeFor(endDate, period);
  const { data, degradedDomains, errors, freshness } = await loadSources(`${endDate}T23:59:59.999Z`);
  const metric: HistoricalMetric[] = [];
  const inCurrent = (d: CivilDate | null) => inRange(d, range.startDate, range.endDate);
  const inPrevious = (d: CivilDate | null) => inRange(d, range.previousStartDate, range.previousEndDate);

  const validTasks = data.tasks.filter((t) => validId(t.id));
  const createdTasks = validTasks.filter((t) => inCurrent(dateOf(t.createdAt))).length;
  const prevCreatedTasks = validTasks.filter((t) => inPrevious(dateOf(t.createdAt))).length;
  const completedTasks = validTasks.filter((t) => t.completed && inCurrent(dateOf(t.completedAt))).length;
  const prevCompletedTasks = validTasks.filter((t) => t.completed && inPrevious(dateOf(t.completedAt))).length;
  const currentTaskDenom = validTasks.filter((t) => t.completed && inCurrent(dateOf(t.completedAt)) || inCurrent(dateOf(t.createdAt))).length;
  const prevTaskDenom = validTasks.filter((t) => t.completed && inPrevious(dateOf(t.completedAt)) || inPrevious(dateOf(t.createdAt))).length;
  const overdue = validTasks.filter((t) => { const due = dateOf(t.dueDate); const completed = dateOf(t.completedAt); return inCurrent(due) && (!completed || completed > due!); }).length;
  const prevOverdue = validTasks.filter((t) => { const due = dateOf(t.dueDate); const completed = dateOf(t.completedAt); return inPrevious(due) && (!completed || completed > due!); }).length;
  metric.push(compareNumeric('tasks:completed', 'tasks', 'Tasks completed', completedTasks, prevCompletedTasks, 'positive', '/tasks'));
  metric.push(compareNumeric('tasks:created', 'tasks', 'Tasks created', createdTasks, prevCreatedTasks, 'informational', '/tasks'));
  metric.push(compareNumeric('tasks:completion-rate', 'tasks', 'Task completion rate', currentTaskDenom ? completedTasks / currentTaskDenom * 100 : null, prevTaskDenom ? prevCompletedTasks / prevTaskDenom * 100 : null, 'positive', '/tasks', '%', true));
  metric.push(compareNumeric('tasks:overdue', 'tasks', 'Overdue tasks', overdue, prevOverdue, 'negative', '/tasks'));

  const validHabits = data.habits.filter((h) => validId(h.id));
  const logs = data.habitLogs.filter((l) => validId(l.id) && validId(l.habitId) && l.completed && isValidCivilDate(l.date));
  const currentLogs = logs.filter((l) => inCurrent(l.date as CivilDate));
  const previousLogs = logs.filter((l) => inPrevious(l.date as CivilDate));
  const activeCurrent = validHabits.filter((h) => h.isActive && !h.isArchived && (!h.endDate || h.endDate >= range.startDate) && h.startDate <= range.endDate).length;
  const activePrevious = validHabits.filter((h) => h.isActive && !h.isArchived && (!h.endDate || h.endDate >= range.previousStartDate) && h.startDate <= range.previousEndDate).length;
  const expectedCurrent = activeCurrent * period;
  const expectedPrevious = activePrevious * period;
  metric.push(compareNumeric('habits:completions', 'habits', 'Habit completions', currentLogs.length, previousLogs.length, 'positive', '/habits'));
  metric.push(compareNumeric('habits:completion-rate', 'habits', 'Habit completion rate', expectedCurrent ? currentLogs.length / expectedCurrent * 100 : null, expectedPrevious ? previousLogs.length / expectedPrevious * 100 : null, 'positive', '/habits', '%', true));
  metric.push(compareNumeric('habits:active-consistency', 'habits', 'Active habit consistency', activeCurrent ? currentLogs.length / Math.max(1, activeCurrent) : null, activePrevious ? previousLogs.length / Math.max(1, activePrevious) : null, 'positive', '/habits'));

  const workouts = data.workouts.filter((w) => validId(w.id) && w.status === 'completed');
  const currentWorkouts = workouts.filter((w) => inCurrent(dateOf(w.completedAt ?? w.startedAt)));
  const previousWorkouts = workouts.filter((w) => inPrevious(dateOf(w.completedAt ?? w.startedAt)));
  const workoutMinutes = (items: WorkoutSession[]) => items.reduce((sum, w) => sum + (finite(w.durationSeconds) && w.durationSeconds! > 0 ? w.durationSeconds! / 60 : 0), 0);
  const exerciseSets = (items: WorkoutSession[]) => items.reduce((sum, w) => sum + w.exercises.reduce((inner, ex) => inner + ex.sets.filter((s) => s.completed === true).length, 0), 0);
  metric.push(compareNumeric('workout:sessions', 'workout', 'Workouts completed', currentWorkouts.length, previousWorkouts.length, 'positive', '/health/workout-history'));
  metric.push(compareNumeric('workout:minutes', 'workout', 'Workout minutes', workoutMinutes(currentWorkouts), workoutMinutes(previousWorkouts), 'positive', '/health/workout-history', 'min'));
  metric.push(compareNumeric('workout:sets', 'workout', 'Completed exercise sets', exerciseSets(currentWorkouts), exerciseSets(previousWorkouts), 'positive', '/health/workout-history'));

  const validSleep = data.sleep.filter((s) => validId(s.id) && isValidCivilDate(s.date) && finite(s.durationMinutes) && s.durationMinutes > 0);
  const currentSleep = validSleep.filter((s) => inCurrent(s.date as CivilDate));
  const previousSleep = validSleep.filter((s) => inPrevious(s.date as CivilDate));
  metric.push(compareNumeric('sleep:average-duration', 'sleep', 'Average sleep duration', averageFinite(currentSleep.map((s) => s.durationMinutes)), averageFinite(previousSleep.map((s) => s.durationMinutes)), 'positive', '/health/sleep', 'min'));
  metric.push(compareNumeric('sleep:records', 'sleep', 'Sleep records', currentSleep.length, previousSleep.length, 'informational', '/health/sleep'));

  const foodLogs = data.foodLogs.filter((l) => validId(l.id) && isValidCivilDate(l.date) && finite(l.quantity) && l.quantity > 0);
  const currentFood = foodLogs.filter((l) => inCurrent(l.date as CivilDate));
  const previousFood = foodLogs.filter((l) => inPrevious(l.date as CivilDate));
  const distinctDays = (items: FoodLogEntry[]) => new Set(items.map((i) => i.date)).size;
  metric.push(compareNumeric('nutrition:logged-days', 'nutrition', 'Logged nutrition days', distinctDays(currentFood), distinctDays(previousFood), 'positive', '/health/nutrition', 'days'));
  metric.push(compareNumeric('nutrition:meals', 'nutrition', 'Meals logged', currentFood.length, previousFood.length, 'positive', '/health/nutrition'));

  const transactions = data.transactions.filter((t) => validId(t.id) && isValidCivilDate(t.date) && finite(t.amount) && t.amount >= 0);
  const currentTx = transactions.filter((t) => inCurrent(t.date as CivilDate));
  const previousTx = transactions.filter((t) => inPrevious(t.date as CivilDate));
  const sumType = (items: FinanceTransaction[], type: 'income' | 'expense') => items.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
  const income = sumType(currentTx, 'income'), prevIncome = sumType(previousTx, 'income');
  const expense = sumType(currentTx, 'expense'), prevExpense = sumType(previousTx, 'expense');
  metric.push(compareNumeric('finance:income', 'finance', 'Income', income, prevIncome, 'positive', '/finance', 'Ã¢â€šÂ¹'));
  metric.push(compareNumeric('finance:expenses', 'finance', 'Expenses', expense, prevExpense, 'negative', '/finance', 'Ã¢â€šÂ¹'));
  metric.push(compareNumeric('finance:net-flow', 'finance', 'Net cash flow', income - expense, prevIncome - prevExpense, 'positive', '/finance', 'Ã¢â€šÂ¹'));
  metric.push(compareNumeric('finance:transactions', 'finance', 'Transactions', currentTx.length, previousTx.length, 'informational', '/finance'));

  const books = data.books.filter((b) => validId(b.id));
  const completedBooks = books.filter((b) => validInstant(b.completedAt) && inCurrent(dateOf(b.completedAt))).length;
  const prevCompletedBooks = books.filter((b) => validInstant(b.completedAt) && inPrevious(dateOf(b.completedAt))).length;
  const progress = data.progress.filter((p) => validId(p.id) && validId(p.bookId) && finite(p.page) && p.page >= 0 && validInstant(p.recordedAt));
  const currentProgress = progress.filter((p) => inCurrent(dateOf(p.recordedAt)));
  const previousProgress = progress.filter((p) => inPrevious(dateOf(p.recordedAt)));
  const pagesRead = (items: BookProgressEntry[]) => { const byBook = new Map<string, BookProgressEntry[]>(); items.forEach((p) => byBook.set(p.bookId, [...(byBook.get(p.bookId) ?? []), p])); return [...byBook.values()].reduce((sum, entries) => { entries.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)); return sum + (entries.length ? Math.max(0, entries[entries.length - 1].page - entries[0].page) : 0); }, 0); };
  metric.push(compareNumeric('books:completed', 'books', 'Books completed', completedBooks, prevCompletedBooks, 'positive', '/books'));
  metric.push(compareNumeric('books:pages', 'books', 'Pages read', pagesRead(currentProgress), pagesRead(previousProgress), 'positive', '/books', 'pages'));
  metric.push(compareNumeric('books:activity', 'books', 'Reading activity', currentProgress.length, previousProgress.length, 'positive', '/books'));

  const journal = data.journal.filter((j) => validId(j.id) && isValidCivilDate(j.date));
  const currentJournal = journal.filter((j) => inCurrent(j.date as CivilDate));
  const previousJournal = journal.filter((j) => inPrevious(j.date as CivilDate));
  metric.push(compareNumeric('journal:entries', 'journal', 'Journal entries', currentJournal.length, previousJournal.length, 'positive', '/journal'));
  metric.push(compareNumeric('journal:active-days', 'journal', 'Journal active days', new Set(currentJournal.map((j) => j.date)).size, new Set(previousJournal.map((j) => j.date)).size, 'positive', '/journal', 'days'));

  const bookGoals = data.bookGoals.filter((g) => validId(g.id) && isValidCivilDate(g.endDate));
  const savingsGoals = data.savingsGoals.filter((g) => validId(g.id) && isValidCivilDate(g.deadline));
  // Book goal progress is derived from current Book records and savings-goal progress is current-state only.
  // Neither source stores historical completion/progress snapshots, so no historical goal values are fabricated.
  const hasGoalHistory = bookGoals.length > 0 || savingsGoals.length > 0;
  metric.push(compareNumeric('goals:completed', 'goals', 'Completed goals with recorded state', null, null, 'informational', '/goals', undefined, false, hasGoalHistory ? 'insufficient_data' : 'insufficient_data'));

  // Recovery is intentionally insufficient: the existing recovery service derives readiness from current source records and does not persist readiness history.
  metric.push(compareNumeric('recovery:history', 'recovery', 'Historical recovery/readiness', null, null, 'informational', '/health/recovery'));

  const selected = metric.filter((m) => filterMetric(m, filter));
  selected.sort((a, b) => { const domain = DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain); return domain || a.id.localeCompare(b.id); });
  return { period, range, filter, metrics: selected, degradedDomains, errors, freshness };
}

export async function getHistoricalAnalyticsFromToday(period: HistoricalAnalyticsPeriod = 7): Promise<HistoricalAnalyticsResult> {
  return getHistoricalAnalytics({ period, endDate: todayCivilDate() });
}

export { KEYS as HISTORICAL_ANALYTICS_STORAGE_KEYS, inclusiveDateRange };
