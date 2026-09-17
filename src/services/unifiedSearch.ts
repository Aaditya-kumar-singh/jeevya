import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getTasks } from '@/services/tasks';
import { getActiveHabits } from '@/services/habits';
import { getBooks } from '@/services/books';
import { getEntries } from '@/services/journal';
import { getTransactions } from '@/services/finance';
import { getUnifiedGoals } from '@/services/goalsIntegration';
import type { UnifiedSearchResponse, UnifiedSearchResult } from '@/types/unifiedSearch';

function matches(query: string, ...values: unknown[]) {
  const needle = query.trim().toLocaleLowerCase();
  return needle.length > 0 && values.some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(needle));
}

export async function searchLifeOS(query: string, date: CivilDate = todayCivilDate()): Promise<UnifiedSearchResponse> {
  const normalized = query.trim();
  if (!normalized) return { query: '', date, results: [] };
  const [tasks, habits, books, entries, transactions, goals] = await Promise.all([
    getTasks(), getActiveHabits(), getBooks(), getEntries(), getTransactions(), getUnifiedGoals(date),
  ]);
  const results: UnifiedSearchResult[] = [];
  tasks.filter((task) => !task.archived && matches(normalized, task.title, task.description)).forEach((task) => results.push({ id: task.id, domain: 'tasks', title: task.title, subtitle: task.completed ? 'Completed' : task.priority, route: `/tasks/${task.id}` }));
  habits.filter((habit) => matches(normalized, habit.name, habit.description)).forEach((habit) => results.push({ id: habit.id, domain: 'habits', title: habit.name, subtitle: 'Habit', route: `/habits/${habit.id}` }));
  books.filter((book) => matches(normalized, book.title, book.author, book.description)).forEach((book) => results.push({ id: book.id, domain: 'books', title: book.title, subtitle: book.author || 'Book', route: `/books/${book.id}` }));
  entries.filter((entry) => matches(normalized, entry.title, entry.content)).forEach((entry) => results.push({ id: entry.id, domain: 'journal', title: entry.title, subtitle: entry.date, route: `/journal/${entry.id}` }));
  transactions.filter((transaction) => matches(normalized, transaction.title, transaction.note)).forEach((transaction) => results.push({ id: transaction.id, domain: 'finance', title: transaction.title, subtitle: `${transaction.type} ${transaction.amount}`, route: `/finance/${transaction.id}` }));
  goals.filter((goal) => matches(normalized, goal.title, goal.description, goal.metric, goal.status)).forEach((goal) => results.push({ id: goal.id, domain: 'goals', title: goal.title, subtitle: goal.status, route: '/goals' }));
  return { query: normalized, date, results: results.slice(0, 50) };
}
