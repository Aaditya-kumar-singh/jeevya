import type { CivilDate } from '@/lib/date';

export type GoalSource = 'books' | 'finance' | 'tasks' | 'habits' | 'health' | 'nutrition' | 'journal' | 'workouts' | 'custom';
export type GoalMetric =
  | 'books_completed' | 'pages_read' | 'savings_amount' | 'tasks_completed'
  | 'habit_completions' | 'workout_sessions' | 'workout_minutes' | 'nutrition_logged_days'
  | 'journal_entries' | 'custom';
export type UnifiedGoalStatus = 'upcoming'|'active'|'behind'|'completed'|'ended'|'unavailable';
export type GoalLinkDomain = Exclude<GoalSource,'custom'>;

export interface GoalMilestone { id:string; title:string; targetValue:number; completed:boolean; completedAt?:string|null; }
export interface GoalLink { id:string; goalId:string; domain:GoalLinkDomain; recordId:string; weight:number; createdAt:string; }
export interface UnifiedGoal {
  id:string; title:string; description?:string; source:GoalSource; metric:GoalMetric;
  targetValue:number|null; currentValue:number|null; progressPercentage:number|null; status:UnifiedGoalStatus;
  startDate?:CivilDate; endDate?:CivilDate; createdAt?:string; updatedAt?:string;
  parentGoalId?:string|null; milestones?:GoalMilestone[]; linkedRecordIds?:string[];
}
export interface GoalProgressResult { currentValue:number|null; targetValue:number|null; progressPercentage:number|null; status:UnifiedGoalStatus; }
export interface CreateGoalInput {
  title:string; description?:string; metric:GoalMetric; source?:GoalSource; targetValue:number;
  startDate?:CivilDate; endDate?:CivilDate; parentGoalId?:string|null;
}
