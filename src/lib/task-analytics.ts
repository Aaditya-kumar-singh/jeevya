// ─── Task Productivity Analytics (Phase 1G-C) ─────────────────────────────────
// Pure functions — no storage access, no JSX. All date math is civil
// YYYY-MM-DD arithmetic via UTC-noon Dates (stable in every timezone),
// reusing isValidDateString / getTodayISO / getTaskDueStatus.
//
// Universes (documented so numbers stay explainable):
// - BACKLOG (non-archived tasks): snapshot metrics + priority/label breakdowns.
//   Archived tasks never distort the active backlog.
// - HISTORY (all tasks, including archived): flow metrics — created/completed
//   in period, on-time/late, daily trend, streak. Archiving a task never
//   rewrites history.
// Recurring occurrences are plain tasks and count normally. Subtasks are
// never counted (only top-level Task records are read).

import {
  getDueDate,
  getTaskDueStatus,
  isValidDateString,
} from '@/lib/task-filters';
import {
  getTodayISO,
  type Label,
  type Task,
  type TaskPriority,
} from '@/types/tasks';

// ─── Periods ──────────────────────────────────────────────────────────────────

export type AnalyticsPeriod = 7 | 30 | 90;

export const ANALYTICS_PERIODS: AnalyticsPeriod[] = [7, 30, 90];

/** Shift a YYYY-MM-DD by `delta` days (UTC-noon civil math). '' on invalid. */
export function shiftDate(iso: string, delta: number): string {
  if (!isValidDateString(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export interface PeriodBounds {
  start: string;
  end: string;
  /** Every day start..end inclusive, ascending. */
  days: string[];
}

/** Last `period` days ending today (inclusive). Invalid period → 30 days. */
export function getPeriodBounds(
  period: AnalyticsPeriod,
  today: string = getTodayISO(),
): PeriodBounds {
  const days = period === 7 || period === 90 ? period : 30;
  const end = isValidDateString(today) ? today : getTodayISO();
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = shiftDate(end, -i);
    if (d) list.push(d);
  }
  return { start: list[0] ?? end, end, days: list };
}

// ─── Day extraction ───────────────────────────────────────────────────────────

/**
 * Date part of a full ISO datetime (createdAt/completedAt). Null when the
 * value is missing or not a real calendar date — malformed legacy values are
 * skipped, never counted. Uses the same UTC date-part convention as
 * getTodayISO(), consistent with the rest of the task pipeline.
 */
export function toDay(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.length < 10) return null;
  const day = value.slice(0, 10);
  return isValidDateString(day) ? day : null;
}

/** Valid creation day of a task, or null. */
export function getCreatedDay(task: Task): string | null {
  return toDay(task.createdAt);
}

/** Valid completion day of a completed task, or null. */
export function getCompletedDay(task: Task): string | null {
  return task.completed ? toDay(task.completedAt) : null;
}

// ─── Safe math ────────────────────────────────────────────────────────────────

/** Integer percent, 0 when total <= 0 — NaN/Infinity impossible. */
export function safeRate(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 0;
  const pct = Math.round((Math.max(0, done) / total) * 100);
  return Math.min(100, Math.max(0, pct));
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface TaskAnalyticsSummary {
  period: AnalyticsPeriod;
  start: string;
  end: string;
  // Backlog (non-archived)
  totalActive: number;
  completed: number;
  completionRate: number;
  overdue: number;
  // History (all tasks, archived included)
  completedOnTime: number;
  completedLate: number;
  createdInPeriod: number;
  completedInPeriod: number;
  streak: number;
}

export function computeTaskAnalytics(
  tasks: Task[],
  period: AnalyticsPeriod,
  today: string = getTodayISO(),
): TaskAnalyticsSummary {
  const { start, end } = getPeriodBounds(period, today);

  const backlog = tasks.filter((t) => !t.archived);
  const active = backlog.filter((t) => !t.completed);
  const done = backlog.filter((t) => t.completed);

  const overdue = active.filter(
    (t) => getTaskDueStatus(t, today) === 'overdue',
  ).length;

  // History: every completed task with a usable completion day.
  // No due date (or malformed) + completed ⇒ on time (no deadline was missed).
  let completedOnTime = 0;
  let completedLate = 0;
  let completedInPeriod = 0;
  for (const task of tasks) {
    const day = getCompletedDay(task);
    if (!day) continue;
    if (day >= start && day <= end) completedInPeriod += 1;
    const due = getDueDate(task);
    if (!due || day <= due) completedOnTime += 1;
    else completedLate += 1;
  }

  let createdInPeriod = 0;
  for (const task of tasks) {
    const day = getCreatedDay(task);
    if (day && day >= start && day <= end) createdInPeriod += 1;
  }

  return {
    period,
    start,
    end,
    totalActive: active.length,
    completed: done.length,
    completionRate: safeRate(done.length, backlog.length),
    overdue,
    completedOnTime,
    completedLate,
    createdInPeriod,
    completedInPeriod,
    streak: productiveStreak(tasks, today),
  };
}

// ─── Breakdowns (backlog universe) ────────────────────────────────────────────

export interface PriorityBreakdown {
  priority: TaskPriority;
  total: number;
  completed: number;
  rate: number;
}

const PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];

/** Per-priority totals/completion over non-archived tasks. */
export function completionByPriority(tasks: Task[]): PriorityBreakdown[] {
  const backlog = tasks.filter((t) => !t.archived);
  return PRIORITIES.map((priority) => {
    const subset = backlog.filter((t) => t.priority === priority);
    const completed = subset.filter((t) => t.completed).length;
    return { priority, total: subset.length, completed, rate: safeRate(completed, subset.length) };
  });
}

export interface LabelBreakdown {
  labelId: string;
  name: string;
  total: number;
  completed: number;
  rate: number;
}

/**
 * Per-label totals/completion over non-archived tasks. A task counts under
 * each of its labels. Labels with zero tasks are omitted; sorted by total
 * desc. Unknown IDs (stale references) resolve to "(Deleted label)".
 */
export function completionByLabel(tasks: Task[], labels: Label[]): LabelBreakdown[] {
  const backlog = tasks.filter((t) => !t.archived);
  const names = new Map(labels.map((l) => [l.id, l.name]));
  const totals = new Map<string, { total: number; completed: number }>();

  for (const task of backlog) {
    for (const id of task.labelIds ?? []) {
      const entry = totals.get(id) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (task.completed) entry.completed += 1;
      totals.set(id, entry);
    }
  }

  return [...totals.entries()]
    .map(([labelId, { total, completed }]) => ({
      labelId,
      name: names.get(labelId) ?? '(Deleted label)',
      total,
      completed,
      rate: safeRate(completed, total),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

// ─── Daily trend (history universe) ───────────────────────────────────────────

export interface DailyPoint {
  date: string;
  /** Short "M/D" axis label. */
  label: string;
  created: number;
  completed: number;
}

/** Per-day created/completed counts for the period (archived included). */
export function dailyTrend(
  tasks: Task[],
  period: AnalyticsPeriod,
  today: string = getTodayISO(),
): DailyPoint[] {
  const { days } = getPeriodBounds(period, today);
  const created = new Map<string, number>();
  const completed = new Map<string, number>();

  for (const task of tasks) {
    const c = getCreatedDay(task);
    if (c) created.set(c, (created.get(c) ?? 0) + 1);
    const d = getCompletedDay(task);
    if (d) completed.set(d, (completed.get(d) ?? 0) + 1);
  }

  return days.map((date) => {
    const [, m, d] = date.split('-').map(Number);
    return {
      date,
      label: `${m}/${d}`,
      created: created.get(date) ?? 0,
      completed: completed.get(date) ?? 0,
    };
  });
}

// ─── Streak ───────────────────────────────────────────────────────────────────

/**
 * Current productive-day streak: consecutive days with ≥1 completion, ending
 * today — or yesterday when today has none yet (streak still alive). 0 when
 * neither today nor yesterday has a completion. Archived completions count.
 */
export function productiveStreak(
  tasks: Task[],
  today: string = getTodayISO(),
): number {
  const end = isValidDateString(today) ? today : getTodayISO();
  const days = new Set<string>();
  for (const task of tasks) {
    const day = getCompletedDay(task);
    if (day) days.add(day);
  }

  let cursor = end;
  if (!days.has(cursor)) {
    cursor = shiftDate(end, -1); // one grace day — streak alive until EOD
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}
