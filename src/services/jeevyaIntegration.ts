import { todayCivilDate, isValidCivilDate, parseCivilDate } from '@/lib/date';
import { getTasks } from '@/services/tasks';
import { getActiveHabits, getHabitLog } from '@/services/habits';
import { isScheduledDay } from '@/types/habit';
import { getActiveWorkout } from '@/services/workouts';
import { getWorkoutHistoryByDate } from '@/services/workoutHistory';
import { getSleepEntryByDate, type SleepQuality } from '@/services/sleep';
import { getRecoveryForDate } from '@/services/recovery';
import { getFoodLogs, getFoods, getRecipes, calculateDailyNutrition, getBodyProfile, calculateNutritionTargets, getEnergyActivities, calculateDailyEnergy } from '@/services/nutrition';
import { getAccounts, getTransactions } from '@/services/finance';
import { getBooks } from '@/services/books';
import { getEntries } from '@/services/journal';
import { getUnifiedGoals } from '@/services/goalsIntegration';
import { readStorage } from '@/services/storageReliability';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';

function emptyNutrition(date: string) {
  const summary = calculateDailyNutrition(date, [], [], []);
  const energy = calculateDailyEnergy(date, [], [], [], null, []);
  return { summary, targets: null, energy };
}

function emptyState(date: string): JeevyaDailyState {
  const nutrition = emptyNutrition(date);
  return {
    date,
    dataQuality: { degradedDomains: [] },
    tasks: { total: 0, dueToday: 0, overdue: 0, completedToday: 0, active: 0, overdueTasks: [], incompleteDueTodayTasks: [] },
    habits: { activeToday: 0, completedToday: 0, completionRate: null, remainingToday: [] },
    health: { activeWorkout: false, activeWorkoutId: null, completedWorkoutsToday: 0, completedWorkoutMinutes: 0, sleep: null, recovery: null },
    nutrition,
    finance: { accountCount: 0, currencyBreakdown: {}, transactionsToday: 0, incomeToday: 0, expenseToday: 0 },
    books: { currentlyReading: 0, readingBooks: [] },
    journal: { entryCountToday: 0, hasEntryToday: false, latestEntry: null },
    goals: [],
  };
}

/** Assemble a read-only snapshot from existing domain services. No persistence or mutation. */
export async function getJeevyaDailyState(date: string = todayCivilDate()): Promise<JeevyaDailyState> {
  if (!isValidCivilDate(date)) return emptyState(date);

  const parsedDate = parseCivilDate(date);
  const habitDate = parsedDate ? new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day, 12, 0, 0, 0) : new Date();
  const degradedDomains: string[] = [];
  async function safe<T>(domain: string, operation: Promise<T>, fallback: T): Promise<T> {
    try {
      return await operation;
    } catch {
      if (!degradedDomains.includes(domain)) degradedDomains.push(domain);
      return fallback;
    }
  }
  const domainStorageKeys: Record<string, string[]> = {
    tasks: ['jeevya:tasks'],
    habits: ['jeevya:habits', 'jeevya:habit-logs'],
    nutrition: ['jeevya:nutrition:foods', 'jeevya:nutrition:food-logs', 'jeevya:nutrition:recipes', 'jeevya:nutrition:body-profile', 'jeevya:nutrition:energy-activities'],
    finance: ['jeevya:finance:accounts', 'jeevya:finance:transactions', 'jeevya:finance:categories', 'jeevya:finance:budgets', 'jeevya:finance:savings-goals'],
    books: ['jeevya:books', 'jeevya:book-goals', 'jeevya:book-progress'],
    journal: ['jeevya:journal'],
    health: ['jeevya:workouts:sessions', 'jeevya:health:sleep'],
  };
  if (typeof window !== 'undefined') {
    await Promise.all(Object.entries(domainStorageKeys).map(async ([domain, keys]) => {
      const results = await Promise.all(keys.map((key) => readStorage<unknown>(key, null)));
      if (results.some((result) => result.status === 'malformed' || result.status === 'unavailable')) {
        if (!degradedDomains.includes(domain)) degradedDomains.push(domain);
      }
    }));
  }
  const [tasks, activeHabits, activeWorkout, workoutsToday, sleep, recovery, foodLogs, foods, recipes, bodyProfile, activities, accounts, transactions, books, journalEntries, goals] = await Promise.all([
    safe('tasks', getTasks(), []),
    safe('habits', getActiveHabits(), []),
    safe('health', getActiveWorkout(), null),
    safe('health', getWorkoutHistoryByDate(date), []),
    safe('health', getSleepEntryByDate(date), null),
    safe('health', getRecoveryForDate(date), null),
    safe('nutrition', getFoodLogs(), []),
    safe('nutrition', getFoods(), []),
    safe('nutrition', getRecipes(), []),
    safe('nutrition', getBodyProfile(), null),
    safe('nutrition', getEnergyActivities(), []),
    safe('finance', getAccounts(), []),
    safe('finance', getTransactions(), []),
    safe('books', getBooks(), []),
    safe('journal', getEntries(), []),
    safe('goals', getUnifiedGoals(date), []),
  ]);
  const habits = await Promise.all(activeHabits.filter((habit) => isScheduledDay(habit, habitDate)).map(async (habit) => ({
    ...habit,
    isCompleted: (await safe('habits', getHabitLog(habit.id, date), null))?.completed === true,
  })));

  const nutritionSummary = calculateDailyNutrition(date, foodLogs, foods, recipes);
  const targets = bodyProfile ? calculateNutritionTargets(bodyProfile) : null;
  const energy = calculateDailyEnergy(date, foodLogs, foods, recipes, bodyProfile, activities);

  const activeTasks = tasks.filter((task) => !task.archived);
  const dueToday = activeTasks.filter((task) => task.dueDate === date);
  const overdue = activeTasks.filter((task) => !task.completed && !!task.dueDate && task.dueDate < date);
  const completedToday = tasks.filter((task) => task.completed && task.completedAt?.slice(0, 10) === date).length;

  const completedHabits = habits.filter((habit) => habit.isCompleted).length;
  const remainingToday = habits
    .filter((habit) => !habit.isCompleted)
    .map((habit) => ({ id: habit.id, name: habit.name }));
  const overdueTasks = overdue.map((task) => ({ id: task.id, title: task.title }));
  const incompleteDueTodayTasks = dueToday
    .filter((task) => !task.completed)
    .map((task) => ({ id: task.id, title: task.title }));

  const readingBooks = books.filter((book) => book.status === 'reading').map((book) => ({
    id: book.id, title: book.title, currentPage: book.currentPage, totalPages: book.totalPages,
  }));

  const todayTransactions = transactions.filter((transaction) => transaction.date === date);
  const currencyBreakdown: Record<string, number> = {};
  for (const account of accounts) currencyBreakdown[account.currency] = (currencyBreakdown[account.currency] ?? 0) + account.balance;
  const incomeToday = todayTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenseToday = todayTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const todayJournal = journalEntries.filter((entry) => entry.date === date).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latestJournal = todayJournal[0];

  return {
    date,
    dataQuality: { degradedDomains },
    tasks: {
      total: tasks.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      completedToday,
      active: activeTasks.length,
      overdueTasks,
      incompleteDueTodayTasks,
    },
    habits: {
      activeToday: habits.length,
      completedToday: completedHabits,
      completionRate: habits.length ? Math.round((completedHabits / habits.length) * 100) : null,
      remainingToday,
    },
    health: {
      activeWorkout: !!activeWorkout,
      activeWorkoutId: activeWorkout?.id ?? null,
      completedWorkoutsToday: workoutsToday.filter((workout) => workout.status === 'completed').length,
      completedWorkoutMinutes: Math.round(workoutsToday.filter((workout) => workout.status === 'completed').reduce((sum, workout) => sum + (workout.durationSeconds ?? 0), 0) / 60),
      sleep: sleep ? { date: sleep.date, durationMinutes: sleep.durationMinutes, quality: sleep.quality as SleepQuality } : null,
      recovery: recovery ? { date: recovery.date, readinessScore: recovery.readinessScore, readinessLevel: recovery.readinessLevel, available: recovery.available } : null,
    },
    nutrition: { summary: nutritionSummary, targets, energy },
    finance: { accountCount: accounts.length, currencyBreakdown, transactionsToday: todayTransactions.length, incomeToday, expenseToday },
    books: { currentlyReading: readingBooks.length, readingBooks },
    journal: { entryCountToday: todayJournal.length, hasEntryToday: todayJournal.length > 0, latestEntry: latestJournal ? { id: latestJournal.id, title: latestJournal.title, mood: latestJournal.mood, updatedAt: latestJournal.updatedAt } : null },
    goals,
  };
}
