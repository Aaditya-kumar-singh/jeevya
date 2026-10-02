import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '@/types/tasks';
import type { Habit, HabitLog } from '@/types/habit';
import type { Book, BookProgressEntry } from '@/types/books';
import type { JournalEntry } from '@/types/journal';
import type { FinanceTransaction, FinanceSavingsGoal } from '@/types/finance';
import type { FoodLogEntry } from '@/types/nutrition';
import type { WorkoutSession } from '@/types/workout';
import type { SleepEntry } from '@/services/sleep';
import type { BookGoal } from '@/types/book-goals';
import type { HistoricalAnalyticsDomain } from '@/types/historicalAnalytics';

export const ANALYTICS_SOURCE_KEYS = {
  tasks: 'jeevya:tasks',
  habits: 'jeevya:habits',
  habitLogs: 'jeevya:habit-logs',
  books: 'jeevya:books',
  progress: 'jeevya:book-progress',
  bookGoals: 'jeevya:book-goals',
  journal: 'jeevya:journal',
  transactions: 'jeevya:finance:transactions',
  savingsGoals: 'jeevya:finance:savings-goals',
  foodLogs: 'jeevya:nutrition:food-logs',
  workouts: 'jeevya:workouts:sessions',
  sleep: 'jeevya:health:sleep',
} as const;

export type AnalyticsSourceData = {
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
  workouts: WorkoutSession[];
  sleep: SleepEntry[];
};

export interface SharedAnalyticsData {
  data: AnalyticsSourceData;
  loadedAt: string;
  sourceUpdatedAt: Partial<Record<HistoricalAnalyticsDomain, string>>;
  degradedDomains: HistoricalAnalyticsDomain[];
  errors: Partial<Record<HistoricalAnalyticsDomain, string>>;
}

const TIMESTAMP_FIELDS = ['updatedAt', 'completedAt', 'finishedAt', 'recordedAt', 'createdAt', 'date'] as const;

function latestSourceTimestamp(values: unknown[]): string | undefined {
  let latest: string | undefined;
  for (const value of values) {
    if (!value || typeof value !== 'object') continue;
    for (const field of TIMESTAMP_FIELDS) {
      const candidate = (value as Record<string, unknown>)[field];
      if (typeof candidate !== 'string' || !candidate) continue;
      const time = Date.parse(candidate.length === 10 ? `${candidate}T23:59:59.999Z` : candidate);
      if (!Number.isFinite(time)) continue;
      if (!latest || time > Date.parse(latest)) latest = candidate;
      break;
    }
  }
  return latest;
}

async function readArray<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Invalid persisted payload for ${key}`);
  return parsed.filter((item) => item != null) as T[];
}

export async function loadSharedAnalyticsData(): Promise<SharedAnalyticsData> {
  const loaders: [HistoricalAnalyticsDomain, keyof AnalyticsSourceData, () => Promise<unknown>][] = [
    ['tasks', 'tasks', () => readArray<Task>(ANALYTICS_SOURCE_KEYS.tasks)],
    ['habits', 'habits', () => readArray<Habit>(ANALYTICS_SOURCE_KEYS.habits)],
    ['habits', 'habitLogs', () => readArray<HabitLog>(ANALYTICS_SOURCE_KEYS.habitLogs)],
    ['books', 'books', () => readArray<Book>(ANALYTICS_SOURCE_KEYS.books)],
    ['books', 'progress', () => readArray<BookProgressEntry>(ANALYTICS_SOURCE_KEYS.progress)],
    ['goals', 'bookGoals', () => readArray<BookGoal>(ANALYTICS_SOURCE_KEYS.bookGoals)],
    ['journal', 'journal', () => readArray<JournalEntry>(ANALYTICS_SOURCE_KEYS.journal)],
    ['finance', 'transactions', () => readArray<FinanceTransaction>(ANALYTICS_SOURCE_KEYS.transactions)],
    ['goals', 'savingsGoals', () => readArray<FinanceSavingsGoal>(ANALYTICS_SOURCE_KEYS.savingsGoals)],
    ['nutrition', 'foodLogs', () => readArray<FoodLogEntry>(ANALYTICS_SOURCE_KEYS.foodLogs)],
    ['workout', 'workouts', () => readArray<WorkoutSession>(ANALYTICS_SOURCE_KEYS.workouts)],
    ['sleep', 'sleep', () => readArray<SleepEntry>(ANALYTICS_SOURCE_KEYS.sleep)],
  ];

  const data: Partial<AnalyticsSourceData> = {};
  const degraded = new Set<HistoricalAnalyticsDomain>();
  const errors: Partial<Record<HistoricalAnalyticsDomain, string>> = {};
  const results = await Promise.allSettled(loaders.map(([, , loader]) => loader()));

  results.forEach((result, index) => {
    const [domain, key] = loaders[index];
    if (result.status === 'rejected') {
      degraded.add(domain);
      if (!errors[domain]) {
        errors[domain] = result.reason instanceof Error ? result.reason.message : 'Failed to load analytics source data';
      }
    } else {
      data[key] = result.value as never;
    }
  });

  const domainOrder: HistoricalAnalyticsDomain[] = ['tasks', 'habits', 'workout', 'sleep', 'recovery', 'nutrition', 'finance', 'books', 'journal', 'goals'];
  const domainSources: Record<HistoricalAnalyticsDomain, unknown[]> = {
    tasks: [...(data.tasks ?? [])],
    habits: [...(data.habits ?? []), ...(data.habitLogs ?? [])],
    workout: [...(data.workouts ?? [])],
    sleep: [...(data.sleep ?? [])],
    recovery: [],
    nutrition: [...(data.foodLogs ?? [])],
    finance: [...(data.transactions ?? [])],
    books: [...(data.books ?? []), ...(data.progress ?? [])],
    journal: [...(data.journal ?? [])],
    goals: [...(data.bookGoals ?? []), ...(data.savingsGoals ?? [])],
  };
  const sourceUpdatedAt = Object.fromEntries(
    domainOrder
      .map((domain) => [domain, latestSourceTimestamp(domainSources[domain])])
      .filter(([, timestamp]) => Boolean(timestamp)),
  ) as Partial<Record<HistoricalAnalyticsDomain, string>>;
  return {
    data: {
      tasks: data.tasks ?? [],
      habits: data.habits ?? [],
      habitLogs: data.habitLogs ?? [],
      books: data.books ?? [],
      progress: data.progress ?? [],
      bookGoals: data.bookGoals ?? [],
      journal: data.journal ?? [],
      transactions: data.transactions ?? [],
      savingsGoals: data.savingsGoals ?? [],
      foodLogs: data.foodLogs ?? [],
      workouts: data.workouts ?? [],
      sleep: data.sleep ?? [],
    },
    loadedAt: new Date().toISOString(),
    sourceUpdatedAt,
    degradedDomains: [...degraded].sort((a, b) => domainOrder.indexOf(a) - domainOrder.indexOf(b)),
    errors,
  };
}

