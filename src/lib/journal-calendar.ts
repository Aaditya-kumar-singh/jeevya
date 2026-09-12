// ─── Journal Calendar Helpers (Phase 1D) ──────────────────────────────────────
// Pure functions — no storage, no JSX. All date math is civil YYYY-MM-DD
// arithmetic; weekday math uses UTC-noon Dates (stable in every timezone).
// Never `new Date("YYYY-MM-DD")` (UTC-midnight parsing shifts days in UTC+
// zones). Entry dates are matched with the existing Journal YYYY-MM-DD
// contract; service ordering/storage is never touched.

import type { JournalEntry } from '@/types/journal';

// ─── Civil Date Core ──────────────────────────────────────────────────────────

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return (
    [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      month - 1
    ] ?? 0
  );
}

/** True for well-formed, real calendar YYYY-MM-DD strings. */
export function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Weekday of a YYYY-MM-DD: 0 = Sunday … 6 = Saturday (UTC-noon, stable). */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** Today's date as YYYY-MM-DD (UTC date-part, LifeOS convention). */
export function todayDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Month Grid ───────────────────────────────────────────────────────────────

export interface JournalCalendarDay {
  /** YYYY-MM-DD */
  date: string;
  day: number;
  month: number; // 1-12
  year: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  isToday: boolean;
}

export const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Day cells for a month (no padding — callers render leading blanks from
 * `getFirstWeekday`). Leap years and month lengths handled civilly.
 * Returns [] for out-of-range input; never throws.
 */
export function getMonthDays(
  year: number,
  month: number,
  today: string = todayDay(),
): JournalCalendarDay[] {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }
  const count = daysInMonth(year, month);
  if (count <= 0) return [];
  const days: JournalCalendarDay[] = [];
  for (let d = 1; d <= count; d++) {
    const date = toISO(year, month, d);
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
  return weekdayOf(toISO(year, month, 1));
}

/** Shift a (year, month) pair by `delta` months; handles year transitions. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** "September 2026" — safe fallback for invalid input. */
export function formatMonthTitle(year: number, month: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 'Calendar';
  }
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** "Sat, Sep 13" style label; raw value on invalid input. */
export function formatCalendarDate(dateISO: string): string {
  if (!isValidDay(dateISO)) return dateISO;
  const [y, m, d] = dateISO.split('-').map(Number);
  const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekdayOf(dateISO)] ?? '';
  return `${short}, ${MONTH_NAMES[m - 1]?.slice(0, 3) ?? ''} ${d}, ${y}`;
}

/** Split a YYYY-MM-DD into {year, month}; null on invalid input. */
export function parseYearMonth(dateISO: string): { year: number; month: number } | null {
  if (!isValidDay(dateISO)) return null;
  const [y, m] = dateISO.split('-').map(Number);
  return { year: y, month: m };
}

// ─── Entry ↔ Date Mapping ─────────────────────────────────────────────────────

/** Entries whose journal date exactly equals `dateISO`. Invalid date → []. */
export function getEntriesForDate(entries: JournalEntry[], dateISO: string): JournalEntry[] {
  if (!isValidDay(dateISO)) return [];
  return entries.filter((e) => e.date === dateISO);
}

/**
 * Per-day entry counts for a month view. Only well-formed entry dates in the
 * requested month are counted; malformed legacy dates never match.
 */
export function getEntryCountsByDate(
  entries: JournalEntry[],
  year: number,
  month: number,
): Record<string, number> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return {};
  }
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const date = entry.date;
    if (!isValidDay(date) || !date.startsWith(prefix)) continue;
    counts[date] = (counts[date] ?? 0) + 1;
  }
  return counts;
}
