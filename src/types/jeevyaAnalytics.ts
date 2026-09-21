import type { CivilDate } from '@/lib/date';

export type JeevyaAnalyticsPeriod = 7 | 30 | 90;

export interface JeevyaAnalyticsPoint {
  date: CivilDate;
  tasksDue: number;
  tasksCompleted: number;
  tasksOverdue: number;
  habitCompletionRate: number | null;
  workoutsCompleted: number;
  workoutMinutes: number;
  sleepMinutes: number | null;
  readinessScore: number | null;
  caloriesIn: number;
  proteinGrams: number;
  financeTransactions: number;
  financeIncome: number;
  financeExpense: number;
  readingBooks: number;
  journalEntries: number;
  goalsCompleted: number;
  goalsActive: number;
  goalsBehind: number;
}

export interface JeevyaAnalyticsSummary {
  days: number;
  taskCompletionRate: number | null;
  totalTasksDue: number;
  totalTasksCompleted: number;
  totalOverdueTaskDays: number;
  averageHabitCompletionRate: number | null;
  totalWorkouts: number;
  totalWorkoutMinutes: number;
  averageSleepMinutes: number | null;
  averageReadinessScore: number | null;
  averageCaloriesIn: number | null;
  averageProteinGrams: number | null;
  totalFinanceTransactions: number;
  totalFinanceIncome: number;
  totalFinanceExpense: number;
  totalJournalEntries: number;
  goalCompletionCount: number;
  goalBehindDays: number;
}

export interface JeevyaAnalyticsResult {
  period: JeevyaAnalyticsPeriod;
  startDate: CivilDate;
  endDate: CivilDate;
  points: JeevyaAnalyticsPoint[];
  summary: JeevyaAnalyticsSummary;
}
