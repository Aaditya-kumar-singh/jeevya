import type { CivilDate } from '@/lib/date';

/** Goal sources that currently expose an authoritative persisted goal model. */
export type GoalSource = 'books' | 'finance';

/** Metrics already represented by the source goal models. */
export type GoalMetric = 'books_completed' | 'pages_read' | 'savings_amount';

export type UnifiedGoalStatus =
  | 'upcoming'
  | 'active'
  | 'behind'
  | 'completed'
  | 'ended'
  | 'unavailable';

export interface UnifiedGoal {
  id: string;
  title: string;
  description?: string;
  source: GoalSource;
  metric: GoalMetric;
  targetValue: number | null;
  currentValue: number | null;
  progressPercentage: number | null;
  status: UnifiedGoalStatus;
  startDate?: CivilDate;
  endDate?: CivilDate;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalProgressResult {
  currentValue: number | null;
  targetValue: number | null;
  progressPercentage: number | null;
  status: UnifiedGoalStatus;
}
