// ─── Task Filtering / Sorting / Due-Status Helpers (Phase 1D) ────────────────
// Pure functions — no storage access. UI screens import from here instead of
// duplicating filter logic in JSX.

import {
  getTodayISO,
  PRIORITY_WEIGHT,
  type Task,
  type TaskPriority,
} from '@/types/tasks';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Due-date filter buckets for the task list. */
export type DueFilter =
  | 'all'
  | 'today'
  | 'upcoming'
  | 'overdue'
  | 'noDate'
  | 'completed';

/** Priority filter values. */
export type PriorityFilter = 'all' | TaskPriority;

/** Where a task stands relative to today (YYYY-MM-DD string comparisons only — no timezone math). */
export type TaskDueStatus = 'overdue' | 'today' | 'upcoming' | 'none';

// ─── Date Parsing ─────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** True when `dueDate` is a well-formed, real calendar YYYY-MM-DD string. */
export function isValidDateString(value: string | null | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  // Validate the calendar date without UTC round-tripping (toISOString() would
  // shift local-midnight dates back a day in UTC+ timezones and reject valid dates).
  const [y, m, d] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Days in month, from raw numbers only (no Date/timezone involvement). */
export function daysInMonth(year: number, month: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

/** True when `dueTime` is a well-formed HH:MM (24-hour) string. */
export function isValidTimeString(value: string | null | undefined): value is string {
  return !!value && TIME_RE.test(value);
}

/**
 * Defensive accessor for a task's due date. Legacy rows may hold malformed
 * values (e.g. "not-a-date"); anything that fails validation is treated as null.
 */
export function getDueDate(task: Task): string | null {
  return isValidDateString(task.dueDate) ? task.dueDate : null;
}

/**
 * Defensive accessor for a task's due time. Legacy/malformed values are treated
 * as null. The raw HH:MM string is always preserved for display when valid.
 */
export function getDueTime(task: Task): string | null {
  return isValidTimeString(task.dueTime) ? task.dueTime : null;
}

// ─── Due Status ───────────────────────────────────────────────────────────────

/**
 * Get a task's due status via pure YYYY-MM-DD string comparison (no timezone math).
 * - overdue:  dueDate < today (callers exclude completed tasks themselves)
 * - today:    dueDate === today
 * - upcoming: dueDate > today
 * - none:     no (valid) due date
 */
export function getTaskDueStatus(task: Task, today?: string): TaskDueStatus {
  const due = getDueDate(task);
  if (!due) return 'none';

  const t = today ?? getTodayISO();
  if (due === t) return 'today';
  return due < t ? 'overdue' : 'upcoming';
}

/** Format a due date for compact display. Safe on malformed strings (returns raw value). */
export function formatDueDate(dueDate: string): string {
  if (!isValidDateString(dueDate)) return dueDate; // never crash on legacy junk
  const date = new Date(`${dueDate}T00:00:00`);
  const todayDate = new Date(`${getTodayISO()}T00:00:00`);
  const diffDays = Math.round(
    (date.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    if (weekday) return weekday;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format HH:MM to h:MM AM/PM for display. Returns the raw string untouched
 * when it isn't valid HH:MM, so malformed legacy values can never throw.
 */
export function formatDueTime(dueTime: string): string {
  if (!isValidTimeString(dueTime)) return dueTime;
  const [h, m] = dueTime.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Filtering ────────────────────────────────────────────────────────────────

export interface TaskFilterState {
  due: DueFilter;
  priority: PriorityFilter;
  search: string;
  /**
   * Phase 1G-B: selected label IDs (ANY match — a task passes when it carries
   * at least one). Optional so pre-1G-B call sites (calendar) keep compiling;
   * absent/empty means "no label filter".
   */
  labels?: string[];
}

/** Case-insensitive search over title + description. */
export function matchesSearch(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    task.title.toLowerCase().includes(q) ||
    task.description.toLowerCase().includes(q)
  );
}

/**
 * Apply due-bucket + priority + search + label filters against a list.
 * Completed tasks never appear in today/upcoming/overdue/noDate buckets.
 * Label filter is ANY-match and composes with all other filters.
 * `today` is injectable for testability.
 */
export function filterTasks(
  tasks: Task[],
  state: TaskFilterState,
  today: string = getTodayISO(),
): Task[] {
  const { due, priority, search, labels = [] } = state;

  return tasks.filter((task) => {
    // Priority filter first (cheap)
    if (priority !== 'all' && task.priority !== priority) return false;

    // Search (title + description, case-insensitive)
    if (!matchesSearch(task, search)) return false;

    // Labels (ANY match — composes with every other filter)
    if (labels.length > 0) {
      const ids = new Set(task.labelIds ?? []);
      if (!labels.some((id) => ids.has(id))) return false;
    }

    // Due-date bucket
    switch (due) {
      case 'completed':
        return task.completed;
      case 'noDate':
        return !task.completed && getDueDate(task) === null;
      case 'today':
        return !task.completed && getTaskDueStatus(task, today) === 'today';
      case 'upcoming':
        return !task.completed && getTaskDueStatus(task, today) === 'upcoming';
      case 'overdue':
        return !task.completed && getTaskDueStatus(task, today) === 'overdue';
      case 'all':
      default:
        return true;
    }
  });
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

const STATUS_RANK: Record<TaskDueStatus, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  none: 3,
};

/**
 * Sort active tasks: overdue → today → upcoming → no due date.
 * Within each bucket: high → medium → low priority;
 * then earliest due date/time first; newest createdAt as final fallback.
 * Completed tasks always sink to the bottom.
 */
export function sortTasks(tasks: Task[], today: string = getTodayISO()): Task[] {
  return [...tasks].sort((a, b) => {
    // Completed always last
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    const aStatus = getTaskDueStatus(a, today);
    const bStatus = getTaskDueStatus(b, today);
    if (aStatus !== bStatus) return STATUS_RANK[aStatus] - STATUS_RANK[bStatus];

    // Priority: high first
    const aP = PRIORITY_WEIGHT[a.priority] ?? 0;
    const bP = PRIORITY_WEIGHT[b.priority] ?? 0;
    if (aP !== bP) return bP - aP;

    // Earliest due date first within same priority
    const aDue = getDueDate(a) ?? '9999-12-31';
    const bDue = getDueDate(b) ?? '9999-12-31';
    if (aDue !== bDue) return aDue.localeCompare(bDue);

    // Earliest due time first when dates equal
    const aTime = getDueTime(a) ?? '99:99';
    const bTime = getDueTime(b) ?? '99:99';
    if (aTime !== bTime) return aTime.localeCompare(bTime);

    // Newest created task as fallback
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface TaskStats {
  totalActive: number;
  dueToday: number;
  overdue: number;
  completed: number;
}

/** Compute list-wide stats (archived tasks excluded entirely). */
export function computeStats(tasks: Task[], today: string = getTodayISO()): TaskStats {
  const notArchived = tasks.filter((t) => !t.archived);
  const active = notArchived.filter((t) => !t.completed);
  return {
    totalActive: active.length,
    dueToday: active.filter((t) => getTaskDueStatus(t, today) === 'today').length,
    overdue: active.filter((t) => getTaskDueStatus(t, today) === 'overdue').length,
    completed: notArchived.filter((t) => t.completed).length,
  };
}

/**
 * True when any filter deviates from defaults — used for the "Clear" affordance.
 */
export function hasActiveFilters(state: TaskFilterState): boolean {
  return (
    state.due !== 'all' ||
    state.priority !== 'all' ||
    state.search.trim() !== '' ||
    (state.labels?.length ?? 0) > 0
  );
}

/** Default filter state, shared by reset logic. */
export function getDefaultFilters(): TaskFilterState {
  return { due: 'all', priority: 'all', search: '', labels: [] };
}
