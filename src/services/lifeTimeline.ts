import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidCivilDate, isoTimestamp, todayCivilDate, type CivilDate } from '@/lib/date';
import type { Task } from '@/types/tasks';
import type { Habit, HabitLog } from '@/types/habit';
import type { Book, BookProgressEntry } from '@/types/books';
import type { JournalEntry } from '@/types/journal';
import type { FinanceTransaction, FinanceSavingsGoal } from '@/types/finance';
import type { EnergyActivity, FoodLogEntry } from '@/types/nutrition';
import type { WorkoutSession } from '@/types/workout';
import type { SleepEntry } from '@/services/sleep';
import type { BookGoal } from '@/types/book-goals';
import type {
  LifeTimelineDomain,
  LifeTimelineEvent,
  LifeTimelineFilter,
  LifeTimelineQuery,
  LifeTimelineResult,
} from '@/types/lifeTimeline';

const HABIT_LOGS_KEY = 'lifeos:habit-logs';
const DOMAIN_ORDER: LifeTimelineDomain[] = ['tasks', 'habits', 'workout', 'sleep', 'nutrition', 'finance', 'books', 'journal', 'goals'];
const FILTER_DOMAINS: Record<Exclude<LifeTimelineFilter, 'all'>, LifeTimelineDomain[]> = {
  tasks: ['tasks'], habits: ['habits'], 'health/workout': ['workout', 'sleep'], nutrition: ['nutrition'], finance: ['finance'], books: ['books'], journal: ['journal'], goals: ['goals'],
};

interface SourceData {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  books: Book[];
  progress: BookProgressEntry[];
  bookGoals: BookGoal[];
  journal: JournalEntry[];
  transactions: FinanceTransaction[];
  savingsGoals: FinanceSavingsGoal[];
  foodLogs: FoodLogEntry[];
  energyActivities: EnergyActivity[];
  workouts: WorkoutSession[];
  sleep: SleepEntry[];
}

function validId(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function validInstant(value: unknown): value is string { return typeof value === 'string' && isoTimestamp(value) !== null; }
function datePart(value: string): CivilDate | null { const date = value.slice(0, 10); return isValidCivilDate(date) ? date : null; }
function eventTimestamp(value: unknown): { timestamp: string; date: CivilDate } | null {
  if (!validInstant(value)) return null;
  const normalized = isoTimestamp(value);
  return normalized ? { timestamp: normalized, date: datePart(normalized) ?? todayCivilDate() } : null;
}

function eventTimestampForDate(value: unknown, date: unknown): { timestamp: string; date: CivilDate } | null {
  const at = eventTimestamp(value);
  if (!at) return null;
  return typeof date === 'string' && isValidCivilDate(date) ? { ...at, date } : at;
}
function makeEvent(
  id: string,
  domain: LifeTimelineDomain,
  type: LifeTimelineEvent['type'],
  title: string,
  sourceId: string,
  at: { timestamp: string; date: CivilDate },
  options: Omit<LifeTimelineEvent, 'id' | 'domain' | 'type' | 'title' | 'sourceId' | 'timestamp' | 'date'> = {},
): LifeTimelineEvent {
  return { id, domain, type, title, sourceId, timestamp: at.timestamp, date: at.date, ...options };
}

function taskEvents(task: Task): LifeTimelineEvent[] {
  if (!validId(task.id)) return [];
  const events: LifeTimelineEvent[] = [];
  const created = eventTimestamp(task.createdAt);
  if (created) events.push(makeEvent(`tasks:${task.id}:created`, 'tasks', 'created', `Task created: ${task.title || 'Untitled task'}`, task.id, created, { description: task.description || undefined, status: task.completed ? 'completed' : 'open', route: `/tasks/${task.id}` }));
  const completed = eventTimestamp(task.completedAt);
  if (task.completed && completed) events.push(makeEvent(`tasks:${task.id}:completed:${completed.timestamp}`, 'tasks', 'completed', `Task completed: ${task.title || 'Untitled task'}`, task.id, completed, { status: 'completed', route: `/tasks/${task.id}` }));
  const updated = eventTimestamp(task.updatedAt);
  if (updated && (!created || updated.timestamp !== created.timestamp) && (!completed || updated.timestamp !== completed.timestamp)) events.push(makeEvent(`tasks:${task.id}:updated:${updated.timestamp}`, 'tasks', 'updated', `Task updated: ${task.title || 'Untitled task'}`, task.id, updated, { description: task.description || undefined, status: task.completed ? 'completed' : 'open', route: `/tasks/${task.id}` }));
  return events;
}

function habitEvents(habit: Habit, logs: HabitLog[]): LifeTimelineEvent[] {
  if (!validId(habit.id)) return [];
  const events: LifeTimelineEvent[] = [];
  const created = eventTimestamp(habit.createdAt);
  if (created) events.push(makeEvent(`habits:${habit.id}:created`, 'habits', 'created', `Habit created: ${habit.name || 'Unnamed habit'}`, habit.id, created, { status: habit.isActive ? 'active' : 'inactive', route: `/habits/${habit.id}` }));
  const updated = eventTimestamp(habit.updatedAt);
  if (updated && (!created || updated.timestamp !== created.timestamp)) events.push(makeEvent(`habits:${habit.id}:updated:${updated.timestamp}`, 'habits', 'updated', `Habit updated: ${habit.name || 'Unnamed habit'}`, habit.id, updated, { status: habit.isActive ? 'active' : 'inactive', route: `/habits/${habit.id}` }));
  const habitLogs = logs.filter((log) => validId(log.id) && log.habitId === habit.id && log.completed && isValidCivilDate(log.date));
  for (const log of habitLogs) {
    const at = eventTimestampForDate(log.updatedAt, log.date) ?? eventTimestampForDate(log.createdAt, log.date);
    if (!at) continue;
    events.push(makeEvent(`habits:${habit.id}:completion:${log.id}`, 'habits', 'completed', `Habit completed: ${habit.name || 'Unnamed habit'}`, habit.id, at, { status: 'completed', route: `/habits/${habit.id}`, metadata: { logId: log.id, completionDate: log.date } }));
  }
  return events;
}

function bookEvents(book: Book, progress: BookProgressEntry[]): LifeTimelineEvent[] {
  if (!validId(book.id)) return [];
  const events: LifeTimelineEvent[] = [];
  const created = eventTimestamp(book.createdAt);
  if (created) events.push(makeEvent(`books:${book.id}:created`, 'books', 'created', `Book added: ${book.title || 'Untitled book'}`, book.id, created, { description: book.author ? `by ${book.author}` : undefined, status: book.status, route: `/books/${book.id}` }));
  const started = eventTimestamp(book.startedAt);
  if (started) events.push(makeEvent(`books:${book.id}:started:${started.timestamp}`, 'books', 'started', `Started reading: ${book.title || 'Untitled book'}`, book.id, started, { status: 'reading', route: `/books/${book.id}` }));
  const completed = eventTimestamp(book.completedAt);
  if (completed) events.push(makeEvent(`books:${book.id}:completed:${completed.timestamp}`, 'books', 'completed', `Finished reading: ${book.title || 'Untitled book'}`, book.id, completed, { status: 'completed', route: `/books/${book.id}` }));
  const updated = eventTimestamp(book.updatedAt);
  if (updated && (!created || updated.timestamp !== created.timestamp) && (!completed || updated.timestamp !== completed.timestamp) && (!started || updated.timestamp !== started.timestamp)) events.push(makeEvent(`books:${book.id}:updated:${updated.timestamp}`, 'books', 'updated', `Book updated: ${book.title || 'Untitled book'}`, book.id, updated, { status: book.status, route: `/books/${book.id}` }));
  for (const entry of progress.filter((item) => item.bookId === book.id && validId(item.id))) {
    const at = eventTimestamp(entry.recordedAt);
    if (!at) continue;
    events.push(makeEvent(`books:${book.id}:progress:${entry.id}`, 'books', 'progress', `Reading progress: ${book.title || 'Untitled book'}`, book.id, at, { description: `Reached page ${entry.page}`, status: book.status, route: `/books/${book.id}`, metadata: { page: entry.page } }));
  }
  return events;
}

function journalEvents(entry: JournalEntry): LifeTimelineEvent[] {
  if (!validId(entry.id) || !isValidCivilDate(entry.date)) return [];
  const at = eventTimestampForDate(entry.createdAt, entry.date);
  if (!at) return [];
  return [makeEvent(`journal:${entry.id}:entry`, 'journal', 'entry', entry.title ? `Journal: ${entry.title}` : 'Journal entry', entry.id, at, { description: entry.content ? entry.content.slice(0, 140) : undefined, route: `/journal/${entry.id}`, metadata: { entryDate: entry.date } })];
}

function financeEvents(transaction: FinanceTransaction): LifeTimelineEvent[] {
  if (!validId(transaction.id) || !isValidCivilDate(transaction.date)) return [];
  const at = eventTimestampForDate(transaction.createdAt, transaction.date);
  if (!at) return [];
  return [makeEvent(`finance:${transaction.id}:transaction`, 'finance', 'transaction', transaction.title || `${transaction.type} transaction`, transaction.id, at, { description: transaction.note || undefined, status: transaction.type, route: `/finance/${transaction.id}`, metadata: { amount: transaction.amount, transactionDate: transaction.date } })];
}

function savingsGoalEvents(goal: FinanceSavingsGoal): LifeTimelineEvent[] {
  if (!validId(goal.id)) return [];
  const events: LifeTimelineEvent[] = [];
  const created = eventTimestamp(goal.createdAt);
  if (created) events.push(makeEvent(`goals:savings:${goal.id}:created`, 'goals', 'created', `Savings goal created: ${goal.name || 'Unnamed goal'}`, goal.id, created, { status: 'goal', route: '/goals' }));
  const updated = eventTimestamp(goal.updatedAt);
  if (updated && (!created || updated.timestamp !== created.timestamp)) events.push(makeEvent(`goals:savings:${goal.id}:updated:${updated.timestamp}`, 'goals', 'updated', `Savings goal updated: ${goal.name || 'Unnamed goal'}`, goal.id, updated, { description: `Current saved amount: ${goal.currentAmount}`, status: 'goal', route: '/goals' }));
  return events;
}

function nutritionEvent(log: FoodLogEntry): LifeTimelineEvent[] {
  if (!validId(log.id) || !isValidCivilDate(log.date)) return [];
  const at = eventTimestampForDate(log.createdAt, log.date);
  if (!at) return [];
  return [makeEvent(`nutrition:${log.id}:logged`, 'nutrition', 'logged', `Nutrition logged: ${log.mealType}`, log.id, at, { description: `${log.quantity} ${log.unit}`, status: 'logged', route: '/health/nutrition', metadata: { foodId: log.foodId, logDate: log.date } })];
}

function energyActivityEvent(activity: EnergyActivity): LifeTimelineEvent[] {
  if (!validId(activity.id) || typeof activity.name !== 'string' || !isValidCivilDate(activity.date)) return [];
  const at = eventTimestampForDate(activity.createdAt, activity.date);
  if (!at) return [];
  return [makeEvent(`nutrition:activity:${activity.id}:logged`, 'nutrition', 'logged', `Activity logged: ${activity.name || 'Activity'}`, activity.id, at, { description: `${activity.durationMinutes ?? 0} minutes · ${activity.calories} kcal`, status: 'activity', route: '/health/nutrition', metadata: { activityDate: activity.date, calories: activity.calories } })];
}

function workoutEvents(session: WorkoutSession): LifeTimelineEvent[] {
  if (!validId(session.id)) return [];
  const events: LifeTimelineEvent[] = [];
  const started = eventTimestamp(session.startedAt);
  if (started) events.push(makeEvent(`workout:${session.id}:started`, 'workout', 'started', `Workout started: ${session.name || 'Workout'}`, session.id, started, { status: session.status, route: `/health/workout-history/${session.id}` }));
  const finished = eventTimestamp(session.completedAt);
  if (finished) events.push(makeEvent(`workout:${session.id}:finished`, 'workout', 'finished', `Workout finished: ${session.name || 'Workout'}`, session.id, finished, { status: 'completed', route: `/health/workout-history/${session.id}` }));
  return events;
}

function sleepEvent(entry: SleepEntry): LifeTimelineEvent[] {
  if (!validId(entry.id) || !isValidCivilDate(entry.date)) return [];
  const at = eventTimestamp(entry.sleepEnd) ?? eventTimestamp(entry.updatedAt) ?? eventTimestamp(entry.sleepStart);
  if (!at) return [];
  return [makeEvent(`sleep:${entry.id}:logged`, 'sleep', 'logged', `Sleep logged`, entry.id, at, { description: `${Math.round(entry.durationMinutes)} minutes · ${entry.quality}`, status: entry.quality, route: '/health/sleep', metadata: { sleepDate: entry.date, durationMinutes: entry.durationMinutes } })];
}

function goalEvents(bookGoals: BookGoal[], savingsGoals: FinanceSavingsGoal[]): LifeTimelineEvent[] {
  const events: LifeTimelineEvent[] = [];
  for (const goal of bookGoals) {
    if (!validId(goal.id)) continue;
    const created = eventTimestamp(goal.createdAt);
    if (created) events.push(makeEvent(`goals:book:${goal.id}:created`, 'goals', 'created', 'Reading goal created', goal.id, created, { description: `${goal.type === 'books' ? 'Books' : 'Pages'} · target ${goal.target}`, status: 'goal', route: '/goals' }));
    const updated = eventTimestamp(goal.updatedAt);
    if (updated && (!created || updated.timestamp !== created.timestamp)) events.push(makeEvent(`goals:book:${goal.id}:updated:${updated.timestamp}`, 'goals', 'updated', 'Reading goal updated', goal.id, updated, { description: `${goal.type === 'books' ? 'Books' : 'Pages'} · target ${goal.target}`, status: 'goal', route: '/goals' }));
  }
  events.push(...savingsGoals.flatMap(savingsGoalEvents));
  return events;
}

async function readArray<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`Invalid persisted JSON for ${key}`); }
  if (!Array.isArray(parsed)) throw new Error(`Invalid persisted payload for ${key}`);
  return parsed as T[];
}

async function collectSources(): Promise<{ data: SourceData; degradedDomains: LifeTimelineDomain[]; errors: Partial<Record<LifeTimelineDomain, string>> }> {
  const data: Partial<SourceData> = {};
  const degradedDomains: LifeTimelineDomain[] = [];
  const errors: Partial<Record<LifeTimelineDomain, string>> = {};
  const sources: [LifeTimelineDomain, () => Promise<unknown>][] = [
    ['tasks', () => readArray<Task>('lifeos:tasks')],
    ['habits', () => readArray<Habit>('lifeos:habits')],
    ['habits', () => readArray<HabitLog>(HABIT_LOGS_KEY)],
    ['workout', () => readArray<WorkoutSession>('lifeos:workouts:sessions')],
    ['sleep', () => readArray<SleepEntry>('lifeos:health:sleep')],
    ['nutrition', () => readArray<FoodLogEntry>('lifeos:nutrition:food-logs')],
    ['nutrition', () => readArray<EnergyActivity>('lifeos:nutrition:energy-activities')],
    ['finance', () => readArray<FinanceTransaction>('lifeos:finance:transactions')],
    ['books', () => readArray<Book>('lifeos:books')],
    ['books', () => readArray<BookProgressEntry>('lifeos:book-progress')],
    ['journal', () => readArray<JournalEntry>('lifeos:journal')],
    ['goals', async () => Promise.all([
      readArray<BookGoal>('lifeos:book-goals'),
      readArray<FinanceSavingsGoal>('lifeos:finance:savings-goals'),
    ])],
  ];
  const results = await Promise.allSettled(sources.map(([, loader]) => loader()));
  results.forEach((result, index) => {
    const domain = sources[index][0];
    if (result.status === 'rejected') {
      if (!degradedDomains.includes(domain)) degradedDomains.push(domain);
      if (!errors[domain]) errors[domain] = result.reason instanceof Error ? result.reason.message : 'Failed to load domain data';
      return;
    }
    if (index === 0) data.tasks = result.value as Task[];
    else if (index === 1) data.habits = result.value as Habit[];
    else if (index === 2) data.habitLogs = result.value as HabitLog[];
    else if (index === 3) data.workouts = result.value as WorkoutSession[];
    else if (index === 4) data.sleep = result.value as SleepEntry[];
    else if (index === 5) data.foodLogs = result.value as FoodLogEntry[];
    else if (index === 6) data.energyActivities = result.value as EnergyActivity[];
    else if (index === 7) data.transactions = result.value as FinanceTransaction[];
    else if (index === 8) data.books = result.value as Book[];
    else if (index === 9) data.progress = result.value as BookProgressEntry[];
    else if (index === 10) data.journal = result.value as JournalEntry[];
    else if (index === 11) { const pair = result.value as [BookGoal[], FinanceSavingsGoal[]]; data.bookGoals = pair[0]; data.savingsGoals = pair[1]; }
  });
  degradedDomains.sort((a, b) => DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b));
  return {
    data: {
      tasks: data.tasks ?? [], habits: data.habits ?? [], habitLogs: data.habitLogs ?? [], books: data.books ?? [], progress: data.progress ?? [], bookGoals: data.bookGoals ?? [], journal: data.journal ?? [], transactions: data.transactions ?? [], savingsGoals: data.savingsGoals ?? [], foodLogs: data.foodLogs ?? [], energyActivities: data.energyActivities ?? [], workouts: data.workouts ?? [], sleep: data.sleep ?? [],
    },
    degradedDomains,
    errors,
  };
}

export async function getLifeTimeline(query: LifeTimelineQuery = {}): Promise<LifeTimelineResult> {
  const { data, degradedDomains, errors } = await collectSources();
  const events: LifeTimelineEvent[] = [
    ...data.tasks.flatMap(taskEvents),
    ...data.habits.flatMap((habit) => habitEvents(habit, data.habitLogs)),
    ...data.workouts.flatMap(workoutEvents),
    ...data.sleep.flatMap(sleepEvent),
    ...data.foodLogs.flatMap(nutritionEvent),
    ...data.energyActivities.flatMap(energyActivityEvent),
    ...data.transactions.flatMap(financeEvents),
    ...data.books.flatMap((book) => bookEvents(book, data.progress)),
    ...data.journal.flatMap(journalEvents),
    ...goalEvents(data.bookGoals, data.savingsGoals),
  ];
  const allowedDomains = query.filter && query.filter !== 'all' ? new Set(FILTER_DOMAINS[query.filter].map(String)) : null;
  const normalizedSearch = query.search?.trim().toLocaleLowerCase() ?? '';
  const startDate = query.startDate && isValidCivilDate(query.startDate) ? query.startDate : undefined;
  const endDate = query.endDate && isValidCivilDate(query.endDate) ? query.endDate : undefined;
  const filtered = events.filter((event) => {
    if (allowedDomains && !allowedDomains.has(event.domain)) return false;
    if (startDate && event.date < startDate) return false;
    if (endDate && event.date > endDate) return false;
    if (normalizedSearch) {
      const haystack = [event.title, event.description ?? '', event.domain, event.type].join(' ').toLocaleLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });
  const newestFirst = query.newestFirst !== false;
  filtered.sort((a, b) => {
    const time = newestFirst ? b.timestamp.localeCompare(a.timestamp) : a.timestamp.localeCompare(b.timestamp);
    if (time) return time;
    const domain = DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain);
    if (domain) return domain;
    return newestFirst ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
  });
  const total = filtered.length;
  const offset = Number.isInteger(query.offset) && (query.offset ?? 0) > 0 ? query.offset! : 0;
  const limit = Number.isInteger(query.limit) && (query.limit ?? 0) >= 0 ? query.limit! : undefined;
  return { events: limit == null ? filtered.slice(offset) : filtered.slice(offset, offset + limit), total, degradedDomains, errors };
}

export async function getLifeTimelineToday(): Promise<LifeTimelineResult> {
  const today = todayCivilDate();
  return getLifeTimeline({ startDate: today, endDate: today });
}
