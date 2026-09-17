// ─── Task Calendar Helpers (Phase 1F) ─────────────────────────────────────────
// Pure functions — no storage, no JSX, no timezone-dependent Date math for
// civil-date computation. String comparisons on YYYY-MM-DD only; weekday math
// uses UTC-noon Dates (stable in every timezone).

import {
  getDueDate,
  getTaskDueStatus,
  isValidDateString,
} from '@/lib/task-filters';
import { daysInMonth, weekdayOf, shiftMonth as shiftCivilMonth, formatCivilDate } from '@/lib/date';
import { getTodayISO, type Task } from '@/types/tasks';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string;
  day: number;
  month: number; // 1-12
  year: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  isToday: boolean;
}

export interface DayTaskCounts {
  total: number;
  completed: number;
  overdue: number;
  active: number;
}

export const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ─── Month grid ───────────────────────────────────────────────────────────────



/**
 * Build the day cells for a month (no padding — callers render leading blanks
 * from `firstWeekday`). Handles month lengths + leap years via daysInMonth().
 * Returns [] for out-of-range input (never throws).
 */
export function getMonthDays(year: number, month: number, today: string = getTodayISO()): CalendarDay[] {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }
  const count = daysInMonth(year, month);
  if (count <= 0) return [];
  const days: CalendarDay[] = [];
  for (let d = 1; d <= count; d++) {
    const date = formatCivilDate(year, month, d)!;
    days.push({
      date,
      day: d,
      month,
      year,
      weekday: weekdayOf(date),
      isToday: date === today,
    });
  }
  return days;
}

/** Weekday (0-6) of the 1st of the month. -1 when input is invalid. */
export function getFirstWeekday(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return -1;
  }
  return weekdayOf(formatCivilDate(year, month, 1)!);
}

/** Shift a (year, month) pair by `delta` months; handles year boundaries. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  return shiftCivilMonth(year, month, delta) ?? { year, month };
}

/** "September 2026" — safe fallback for invalid input. */
export function formatMonthTitle(year: number, month: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 'Calendar';
  }
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** "Sat, Sep 13" style label for a YYYY-MM-DD string; raw value on invalid. */
export function formatCalendarDate(dateISO: string): string {
  if (!isValidDateString(dateISO)) return dateISO;
  const [y, m, d] = dateISO.split('-').map(Number);
  const weekday = weekdayOf(dateISO); // 0 = Sunday
  const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday] ?? '';
  const monthShort = MONTH_NAMES[m - 1]?.slice(0, 3) ?? '';
  return `${short}, ${monthShort} ${d}, ${y}`;
}

// ─── Task ↔ date mapping ──────────────────────────────────────────────────────

/** Non-archived tasks due exactly on `dateISO`. Invalid date → []. */
export function getTasksForDate(tasks: Task[], dateISO: string): Task[] {
  if (!isValidDateString(dateISO)) return [];
  return tasks.filter((t) => !t.archived && getDueDate(t) === dateISO);
}

/**
 * Per-day counts for a month view. Archived tasks excluded; tasks without a
 * (valid) due date never appear. `today` injectable for testability.
 */
export function getTaskCountsByDate(
  tasks: Task[],
  year: number,
  month: number,
  today: string = getTodayISO(),
): Record<string, DayTaskCounts> {
  const counts: Record<string, DayTaskCounts> = {};
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  for (const task of tasks) {
    if (task.archived) continue;
    const due = getDueDate(task);
    if (!due || !due.startsWith(prefix)) continue;
    const entry = (counts[due] ??= { total: 0, completed: 0, overdue: 0, active: 0 });
    entry.total += 1;
    if (task.completed) {
      entry.completed += 1;
    } else {
      entry.active += 1;
      if (getTaskDueStatus(task, today) === 'overdue') entry.overdue += 1;
    }
  }
  return counts;
}

/** Split a YYYY-MM-DD into {year, month}; null on invalid input. */
export function parseYearMonth(dateISO: string): { year: number; month: number } | null {
  if (!isValidDateString(dateISO)) return null;
  const [y, m] = dateISO.split('-').map(Number);
  return { year: y, month: m };
}
