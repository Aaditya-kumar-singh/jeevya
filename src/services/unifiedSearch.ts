import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getTasks } from '@/services/tasks';
import { getActiveHabits } from '@/services/habits';
import { getBooks } from '@/services/books';
import { getEntries } from '@/services/journal';
import { getTransactions } from '@/services/finance';
import { getUnifiedGoals } from '@/services/goalsIntegration';
import { getFoodLogs, getFoods } from '@/services/nutrition';
import { getWorkoutSessions } from '@/services/workouts';
import type { SearchDomain, SearchFilters, UnifiedSearchResponse, UnifiedSearchResult } from '@/types/unifiedSearch';
import { getUnifiedSearchIndexVersion, invalidateUnifiedSearchIndex } from '@/services/searchIndex';
import { getStorageVersion } from '@/lib/storageVersion';

export { invalidateUnifiedSearchIndex } from '@/services/searchIndex';

type SearchRecord = UnifiedSearchResult & { haystack: string; fields: string[] };

let indexedVersion = -1;
let indexedRecords: SearchRecord[] = [];
let indexedAt = 0;
let indexedStorageVersion = -1;

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKD').toLocaleLowerCase().trim() : '';
}

function tokenize(value: string): string[] {
  return value.split(/[^a-z0-9]+/i).map((token) => token.trim()).filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function fieldScore(query: string, value: string): number {
  const haystack = normalize(value);
  if (!haystack) return 0;
  if (haystack === query) return 100;
  if (haystack.startsWith(query)) return 85;
  if (haystack.includes(query)) return 65;
  const queryTokens = tokenize(query);
  const valueTokens = tokenize(haystack);
  let best = 0;
  for (const q of queryTokens) {
    for (const token of valueTokens) {
      const distance = levenshtein(q, token);
      const maxDistance = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
      if (distance <= maxDistance) best = Math.max(best, 45 - distance * 10);
    }
  }
  return best;
}

function rankRecord(query: string, record: SearchRecord): { score: number; fields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  record.fields.forEach((field, index) => {
    const value = record.haystack.split('\u0001')[index] ?? '';
    const fieldScoreValue = fieldScore(query, value);
    if (fieldScoreValue > 0) {
      score = Math.max(score, fieldScoreValue + Math.max(0, 10 - index));
      matchedFields.push(field);
    }
  });
  return { score, fields: matchedFields };
}

function allowed(domain: SearchDomain, filters?: SearchFilters): boolean {
  return !filters?.domains?.length || filters.domains.includes(domain);
}

function financeAllowed(result: SearchRecord, filters?: SearchFilters): boolean {
  if (result.domain !== 'finance' || !filters?.finance) return true;
  const data = result as SearchRecord & { finance?: { amount: number; date: string; source?: string; categoryId?: string; type: string } };
  const finance = data.finance;
  if (!finance) return true;
  const f = filters.finance;
  return (f.minAmount === undefined || finance.amount >= f.minAmount)
    && (f.maxAmount === undefined || finance.amount <= f.maxAmount)
    && (!f.startDate || finance.date >= f.startDate)
    && (!f.endDate || finance.date <= f.endDate)
    && (!f.source || finance.source === f.source)
    && (!f.categoryId || finance.categoryId === f.categoryId)
    && (!f.type || finance.type === f.type);
}

function makeRecord(
  base: Omit<SearchRecord, 'haystack' | 'fields'>,
  values: Array<[string, unknown]>,
): SearchRecord {
  const fields = values.map(([name]) => name);
  const haystackValues = values.map(([, value]) => normalize(value));
  return { ...base, fields, haystack: haystackValues.join('\u0001') };
}

async function buildIndex(): Promise<SearchRecord[]> {
  const [tasks, habits, books, entries, transactions, goals, foodLogs, foods, workouts] = await Promise.all([
    getTasks(), getActiveHabits(), getBooks(), getEntries(), getTransactions(), getUnifiedGoals(todayCivilDate()),
    getFoodLogs(), getFoods(), getWorkoutSessions(),
  ]);

  const records: SearchRecord[] = [];
  tasks.filter((task) => !task.archived).forEach((task) => records.push(makeRecord({
    id: task.id, domain: 'tasks', title: task.title, subtitle: task.completed ? 'Completed' : task.priority,
    route: `/tasks/${task.id}`, actions: [{ label: task.completed ? 'Open' : 'Open', route: `/tasks/${task.id}` }],
  }, [['title', task.title], ['description', task.description]])));

  habits.forEach((habit) => records.push(makeRecord({
    id: habit.id, domain: 'habits', title: habit.name, subtitle: 'Habit', route: `/habits/${habit.id}`,
    actions: [{ label: 'Open', route: `/habits/${habit.id}` }],
  }, [['name', habit.name], ['description', habit.description]])));

  books.forEach((book) => records.push(makeRecord({
    id: book.id, domain: 'books', title: book.title, subtitle: book.author || 'Book', route: `/books/${book.id}`,
    actions: [{ label: 'Open', route: `/books/${book.id}` }],
  }, [['title', book.title], ['author', book.author], ['description', book.description]])));

  entries.forEach((entry) => records.push(makeRecord({
    id: entry.id, domain: 'journal', title: entry.title, subtitle: entry.date, route: `/journal/${entry.id}`,
    actions: [{ label: 'Open', route: `/journal/${entry.id}` }, { label: 'Edit', route: `/journal/${entry.id}/edit` }],
  }, [['title', entry.title], ['content', entry.content]])));

  transactions.forEach((transaction) => {
    const record = makeRecord({
      id: transaction.id, domain: 'finance', title: transaction.title,
      subtitle: `${transaction.type} ${transaction.amount}`, route: `/finance/${transaction.id}`,
      actions: [{ label: 'Open', route: `/finance/${transaction.id}` }, { label: 'Transactions', route: '/finance/transactions' }],
    }, [['title', transaction.title], ['merchant', transaction.merchant], ['payee', transaction.payee], ['note', transaction.note], ['purpose', transaction.purpose], ['reference', transaction.referenceId]]);
    (record as SearchRecord & { finance?: unknown }).finance = {
      amount: transaction.amount, date: transaction.date, source: transaction.source,
      categoryId: transaction.categoryId, type: transaction.type,
    };
    records.push(record);
  });

  goals.forEach((goal) => records.push(makeRecord({
    id: goal.id, domain: 'goals', title: goal.title, subtitle: goal.status, route: '/goals',
    actions: [{ label: 'Open goals', route: '/goals' }],
  }, [['title', goal.title], ['description', goal.description], ['metric', goal.metric], ['status', goal.status]])));

  foods.forEach((food) => records.push(makeRecord({
    id: food.id, domain: 'nutrition', title: food.name, subtitle: food.category || 'Food', route: '/nutrition/log',
    actions: [{ label: 'Log food', route: '/nutrition/log' }],
  }, [['name', food.name], ['category', food.category], ['brand', food.brand], ['aliases', food.aliases?.join(' ')]])));

  foodLogs.forEach((log) => records.push(makeRecord({
    id: log.id, domain: 'nutrition', title: 'Food log', subtitle: log.mealType || log.date, route: '/nutrition/log',
    actions: [{ label: 'Open nutrition', route: '/nutrition/log' }],
  }, [['meal', log.mealType], ['food', log.foodId], ['date', log.date]])));

  workouts.forEach((workout) => records.push(makeRecord({
    id: workout.id, domain: 'workouts', title: workout.name || 'Workout', subtitle: workout.status,
    route: `/health/workout-session/${workout.id}`,
    actions: [{ label: 'Open workout', route: `/health/workout-session/${workout.id}` }],
  }, [['name', workout.name], ['status', workout.status]])));

  return records;
}

async function getIndex(): Promise<SearchRecord[]> {
  const indexVersion = getUnifiedSearchIndexVersion();
  if (indexedVersion === indexVersion && indexedStorageVersion === getStorageVersion() && indexedRecords.length && Date.now() - indexedAt < 30000) return indexedRecords;
  const records = await buildIndex();
  indexedRecords = records;
  indexedVersion = indexVersion;
  indexedStorageVersion = getStorageVersion();
  indexedAt = Date.now();
  return records;
}

export interface UnifiedSearchOptions {
  filters?: SearchFilters;
  limit?: number;
}

export async function searchJeevya(
  query: string,
  date: CivilDate = todayCivilDate(),
  options: UnifiedSearchOptions = {},
): Promise<UnifiedSearchResponse> {
  const normalized = normalize(query);
  if (!normalized) return { query: '', date, filters: options.filters, results: [], total: 0 };

  const records = await getIndex();
  const ranked = records
    .filter((record) => allowed(record.domain, options.filters) && financeAllowed(record, options.filters))
    .map((record) => {
      const rankedRecord = rankRecord(normalized, record);
      return rankedRecord.score > 0 ? { ...record, score: rankedRecord.score, matchedFields: rankedRecord.fields } : null;
    })
    .filter((record): record is SearchRecord & { score: number; matchedFields: string[] } => !!record)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, options.limit ?? 50);

  return {
    query: query.trim(),
    date,
    filters: options.filters,
    results: ranked.map(({ haystack: _haystack, fields: _fields, ...result }) => result),
    total: ranked.length,
  };
}



