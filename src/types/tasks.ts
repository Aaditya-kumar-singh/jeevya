// ─── Task Types ───────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high';

// ─── Recurrence (Phase 1E) ────────────────────────────────────────────────────

/** Recurrence cadence. 'none' is only used in form state — persisted recurrence
 *  objects always carry a real cadence; non-recurring tasks store `null`. */
export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface TaskRecurrence {
  type: RecurrenceType;
  /** Every N days/weeks/months. Always >= 1. */
  interval: number;
  /** Series anchor date, YYYY-MM-DD. */
  startDate: string;
  /** Optional series end date (inclusive), YYYY-MM-DD. */
  endDate: string | null;
  /** Weekly only: selected weekdays, 0 = Sunday … 6 = Saturday. */
  weekdays: number[];
}

// ─── Subtasks (Phase 1G-A) ────────────────────────────────────────────────────

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

// ─── Labels (Phase 1G-B) ──────────────────────────────────────────────────────

export interface Label {
  id: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate: string | null; // ISO date string (YYYY-MM-DD) or null
  dueTime: string | null; // HH:MM 24-hour string or null
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archived: boolean;
  /** Phase 1E: null = non-recurring (all pre-1E tasks normalize to this). */
  recurrence: TaskRecurrence | null;
  /** Stable identifier shared by all occurrences of one recurring series. */
  seriesId: string | null;
  /**
   * Phase 1G-A: subtasks owned by this parent task. Always an array —
   * pre-1G-A records normalize to `[]`. Parent completion is independent
   * of subtask completion.
   */
  subtasks: Subtask[];
  /**
   * Phase 1G-B: label IDs referencing shared label entities. Always an
   * array — pre-1G-B records normalize to `[]`. A task may carry many labels.
   */
  labelIds: string[];
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  dueTime?: string | null;
  recurrence?: TaskRecurrence | null;
  labelIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  dueTime?: string | null;
  completed?: boolean;
  archived?: boolean;
  /** Pass null to turn a recurring task into a normal task. */
  recurrence?: TaskRecurrence | null;
  labelIds?: string[];
}

// ─── Subtask Input Types (Phase 1G-A) ─────────────────────────────────────────

export interface CreateSubtaskInput {
  title: string;
}

export interface UpdateSubtaskInput {
  title?: string;
  completed?: boolean;
}

// ─── Label Input Types (Phase 1G-B) ───────────────────────────────────────────

export interface CreateLabelInput {
  name: string;
}

export interface UpdateLabelInput {
  name?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get today's date as ISO string (YYYY-MM-DD).
 */
import { nowISO, todayCivilDate } from '@/lib/date';

export function getTodayISO(): string {
  return todayCivilDate();
}

/**
 * Get the current full ISO datetime string.
 */
export function getNowISO(): string {
  return nowISO();
}

/**
 * Priority display labels and sort weights.
 */
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/**
 * Sort weight for priority ordering (higher = more important).
 */
export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
};
