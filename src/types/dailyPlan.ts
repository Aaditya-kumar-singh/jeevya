import type { PulsePriority } from '@/services/dailyPulse';

export type DailyPlanSource =
  | 'tasks'
  | 'habits'
  | 'workout'
  | 'sleep'
  | 'recovery'
  | 'nutrition'
  | 'finance'
  | 'books'
  | 'journal'
  | 'goals'
  | 'intelligence';

export type DailyPlanItemState =
  | 'pending'
  | 'due'
  | 'overdue'
  | 'completed'
  | 'recommended'
  | 'informational'
  | 'unavailable';

export type DailyPlanPriority = PulsePriority;
export type DailyPlanActionType = 'navigate' | 'complete_task' | 'complete_habit' | 'resume_workout';

export interface DailyPlanItem {
  id: string;
  source: DailyPlanSource;
  sourceRecordId?: string;
  title: string;
  description?: string;
  priority: DailyPlanPriority;
  status: DailyPlanItemState;
  navigationTarget?: string;
  actionType?: DailyPlanActionType;
  actionTargetId?: string;
  actionLabel?: string;
}

export interface DailyPlanSummary {
  total: number;
  pending: number;
  overdue: number;
  dueToday: number;
  completed: number;
  actionable: number;
}

export interface DailyPlanDataQuality {
  degradedDomains: string[];
}

export interface DailyPlanModel {
  date: string;
  items: DailyPlanItem[];
  summary: DailyPlanSummary;
  dataQuality?: DailyPlanDataQuality;
}
