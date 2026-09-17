import type { SleepEntry } from '@/services/sleep';
import type { DailyNutritionSummary, NutritionTargets, DailyEnergySummary } from '@/types/nutrition';
import type { Book } from '@/types/books';
import type { JournalEntry } from '@/types/journal';
import type { UnifiedGoal } from '@/types/goalsIntegration';
import type { RecoveryResult } from '@/services/recovery';
import type { Task } from '@/types/tasks';
import type { Habit } from '@/types/habit';

export interface LifeOSDailyState {
  date: string;
  tasks: {
    total: number;
    dueToday: number;
    overdue: number;
    completedToday: number;
    active: number;
    overdueTasks?: Pick<Task, 'id' | 'title'>[];
    incompleteDueTodayTasks?: Pick<Task, 'id' | 'title'>[];
  };
  habits: {
    activeToday: number;
    completedToday: number;
    completionRate: number | null;
    remainingToday?: Pick<Habit, 'id' | 'name'>[];
  };
  health: {
    activeWorkout: boolean;
    activeWorkoutId?: string | null;
    completedWorkoutsToday: number;
    completedWorkoutMinutes?: number;
    sleep: Pick<SleepEntry, 'date' | 'durationMinutes' | 'quality'> | null;
    recovery: Pick<RecoveryResult, 'date' | 'readinessScore' | 'readinessLevel' | 'available'> | null;
  };
  nutrition: {
    summary: DailyNutritionSummary;
    targets: NutritionTargets | null;
    energy: DailyEnergySummary;
  };
  finance: {
    accountCount: number;
    currencyBreakdown: Record<string, number>;
    transactionsToday: number;
    incomeToday: number;
    expenseToday: number;
  };
  books: {
    currentlyReading: number;
    readingBooks: Pick<Book, 'id' | 'title' | 'currentPage' | 'totalPages'>[];
  };
  journal: {
    entryCountToday: number;
    hasEntryToday: boolean;
    latestEntry: Pick<JournalEntry, 'id' | 'title' | 'mood' | 'updatedAt'> | null;
  };
  goals: UnifiedGoal[];
  dataQuality?: {
    degradedDomains: string[];
  };
}


