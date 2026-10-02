import type { DailyPlanModel, DailyPlanSource } from '@/types/dailyPlan';
import type { DailyPulseModel } from '@/services/dailyPulse';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';
import type { XPProgress } from '@/services/xp';

export interface DashboardAttentionItem {
  id: string;
  source: DailyPlanSource | 'health' | 'goals' | 'xp';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  navigationTarget?: string;
}

export interface DashboardTaskState {
  total: number;
  active: number;
  completedToday: number;
  dueToday: number;
  overdue: number;
  completionPercent: number;
  overdueTasks: NonNullable<JeevyaDailyState['tasks']['overdueTasks']>;
  incompleteDueTodayTasks: NonNullable<JeevyaDailyState['tasks']['incompleteDueTodayTasks']>;
}

export interface DashboardHabitState {
  activeToday: number;
  completedToday: number;
  remainingToday: NonNullable<JeevyaDailyState['habits']['remainingToday']>;
  todayHabits: NonNullable<JeevyaDailyState['habits']['todayHabits']>;
  completionPercent: number | null;
}

export type DashboardHealthState = JeevyaDailyState['health'];
export type DashboardFinanceState = JeevyaDailyState['finance'];
export type DashboardBooksState = JeevyaDailyState['books'];
export type DashboardJournalState = JeevyaDailyState['journal'];

export interface DashboardGoalState {
  total: number;
  active: number;
  completed: number;
  behind: number;
  upcoming: number;
  averageProgressPercent: number | null;
  closestDeadline: string | null;
}

export interface DashboardState {
  date: string;
  tasks: DashboardTaskState;
  habits: DashboardHabitState;
  health: DashboardHealthState;
  nutrition: JeevyaDailyState['nutrition'];
  finance: DashboardFinanceState;
  books: DashboardBooksState;
  journal: DashboardJournalState;
  goals: JeevyaDailyState['goals'];
  goalSnapshot: DashboardGoalState;
  xp: XPProgress;
  dailyPlan: DailyPlanModel;
  dailyPulse: DailyPulseModel;
  todayProgress: {
    completed: number;
    total: number;
    percent: number;
  };
  healthSnapshot: {
    sleep: string;
    water: string;
    workout: string;
  };
  financeSnapshot: {
    spent: number;
    budgetRemaining: number;
    importedPaymentReviewCount: number;
  };
  weeklyMomentum: {
    currentXp: number;
    previousXp: number;
    changePercent: number | null;
  };
  attention: DashboardAttentionItem[];
  dataQuality: {
    degradedDomains: string[];
  };
}
