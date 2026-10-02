import type { Task, TaskPriority } from '@/types/tasks';

export type TaskEnergy = 'low' | 'medium' | 'high';
export type TaskContext = 'anywhere' | 'home' | 'work' | 'computer' | 'phone' | 'errand';
export interface TaskDependency { taskId: string; type: 'blocks' | 'blocked_by'; createdAt: string; }
export interface TaskTemplate { id: string; name: string; title: string; description?: string; priority: TaskPriority; estimatedMinutes?: number; energy?: TaskEnergy; context?: TaskContext; recurrence?: Task['recurrence']; createdAt: string; updatedAt: string; }
export interface QuickTaskParse {
  title: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
  estimatedMinutes?: number;
  energy?: TaskEnergy;
  context?: TaskContext;
}
export interface RescheduleSuggestion { taskId: string; reason: string; suggestedDate: string; }
