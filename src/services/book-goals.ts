// ─── Book Goals Service (Phase 1F) ────────────────────────────────────────────
// Local-first AsyncStorage CRUD, mirroring the Books service architecture:
// same storage.ts helpers, same uid() IDs, same normalize-on-load pattern,
// plain JSON records. Progress is derived from Book records on demand —
// subtasks and progress-history entries are never read here. No network.

import { saveData, loadData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import {
  BOOK_GOAL_PERIODS,
  BOOK_GOAL_TYPES,
  getNowISO,
  type BookGoal,
  type BookGoalPeriod,
  type BookGoalType,
  type CreateBookGoalInput,
  type UpdateBookGoalInput,
} from '@/types/book-goals';
import type { Book } from '@/types/books';

// ─── Storage Key ──────────────────────────────────────────────────────────────

const GOALS_KEY = 'jeevya:book-goals';

// ─── Date Helpers (civil YYYY-MM-DD only — no timezone math) ──────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/**
 * First and last day of a calendar month. Throws on out-of-range input —
 * callers validate year/month before reaching here.
 */
export function monthRange(year: number, month: number): { start: string; end: string } {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error('Month must be 1–12');
  }
  const mm = String(month).padStart(2, '0');
  // Day count comes from civil arithmetic, so leap Februaries are exact.
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${daysInMonth(year, month)}`,
  };
}

/** Full calendar year range. */
export function yearRange(year: number): { start: string; end: string } {
  if (!Number.isInteger(year)) {
    throw new Error('Year must be a whole number');
  }
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/** Short period label: "Mar 2026" / "2026". Falls back to the raw range. */
export function formatGoalPeriod(goal: Pick<BookGoal, 'period' | 'startDate'>): string {
  const [y, m] = goal.startDate.split('-').map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m)) return goal.startDate;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  if (goal.period === 'yearly') return `${y}`;
  return `${months[m - 1] ?? ''} ${y}`.trim();
}

// ─── Normalization ────────────────────────────────────────────────────────────

function isValidType(value: unknown): value is BookGoalType {
  return typeof value === 'string' && (BOOK_GOAL_TYPES as string[]).includes(value);
}

function isValidPeriod(value: unknown): value is BookGoalPeriod {
  return typeof value === 'string' && (BOOK_GOAL_PERIODS as string[]).includes(value);
}

function toTarget(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

/**
 * Normalize a raw record into a fully-typed BookGoal. Missing keys get safe
 * defaults; malformed values degrade instead of crashing. Records with an
 * empty id are dropped by the loader.
 */
function normalizeGoal(raw: Record<string, unknown>): BookGoal {
  return {
    id: String(raw.id ?? ''),
    type: isValidType(raw.type) ? raw.type : 'books',
    period: isValidPeriod(raw.period) ? raw.period : 'monthly',
    target: toTarget(raw.target),
    // Invalid ranges are kept as-is (loader never throws); progress
    // calculation treats an invalid range as zero achievement.
    startDate: String(raw.startDate ?? ''),
    endDate: String(raw.endDate ?? ''),
    createdAt: String(raw.createdAt ?? getNowISO()),
    updatedAt: String(raw.updatedAt ?? getNowISO()),
  };
}

async function loadNormalized(): Promise<BookGoal[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(GOALS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeGoal).filter((g) => g.id !== '');
  } catch {
    return [];
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function assertValidTarget(target: number): void {
  if (!Number.isInteger(target) || target < 1 || !Number.isFinite(target)) {
    throw new Error('Target must be a positive whole number');
  }
}

function assertValidRange(startDate: string, endDate: string): void {
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    throw new Error('Goal dates must be valid YYYY-MM-DD dates');
  }
  if (startDate > endDate) {
    throw new Error('Goal start date must be on or before the end date');
  }
}

/**
 * Reject a goal whose window overlaps another goal of the same type+period.
 * `excludeId` skips the goal being edited. Adjacent (touching but not
 * intersecting) windows are allowed.
 */
function assertNoOverlap(
  goals: BookGoal[],
  candidate: Pick<BookGoal, 'type' | 'period' | 'startDate' | 'endDate'>,
  excludeId?: string,
): void {
  const clash = goals.find(
    (g) =>
      g.id !== excludeId &&
      g.type === candidate.type &&
      g.period === candidate.period &&
      g.startDate <= candidate.endDate &&
      candidate.startDate <= g.endDate,
  );
  if (clash) {
    throw new Error(
      `A ${candidate.type} ${candidate.period} goal already covers ${clash.startDate} → ${clash.endDate}`,
    );
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Get all goals, newest window first (history stays readable after expiry).
 */
export async function getGoals(): Promise<BookGoal[]> {
  const goals = await loadNormalized();
  return goals.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function getGoalById(id: string): Promise<BookGoal | null> {
  const goals = await loadNormalized();
  return goals.find((g) => g.id === id) ?? null;
}

export async function createGoal(input: CreateBookGoalInput): Promise<BookGoal> {
  if (!isValidType(input.type)) throw new Error('Invalid goal type');
  if (!isValidPeriod(input.period)) throw new Error('Invalid goal period');
  assertValidTarget(input.target);
  assertValidRange(input.startDate, input.endDate);

  const goals = await loadNormalized();
  assertNoOverlap(goals, input);

  const now = getNowISO();
  const goal: BookGoal = {
    id: uid('bgoal_'),
    type: input.type,
    period: input.period,
    target: input.target,
    startDate: input.startDate,
    endDate: input.endDate,
    createdAt: now,
    updatedAt: now,
  };
  await saveData(GOALS_KEY, [goal, ...goals]);
  return goal;
}

export async function updateGoal(
  id: string,
  input: UpdateBookGoalInput,
): Promise<BookGoal | null> {
  const goals = await loadNormalized();
  const index = goals.findIndex((g) => g.id === id);
  if (index === -1) return null;

  const goal = goals[index];
  const next = {
    type: input.type !== undefined ? input.type : goal.type,
    period: input.period !== undefined ? input.period : goal.period,
    target: input.target !== undefined ? input.target : goal.target,
    startDate: input.startDate !== undefined ? input.startDate : goal.startDate,
    endDate: input.endDate !== undefined ? input.endDate : goal.endDate,
  };

  if (!isValidType(next.type)) throw new Error('Invalid goal type');
  if (!isValidPeriod(next.period)) throw new Error('Invalid goal period');
  assertValidTarget(next.target);
  assertValidRange(next.startDate, next.endDate);
  assertNoOverlap(goals, next, id);

  const updated: BookGoal = { ...goal, ...next, updatedAt: getNowISO() };
  goals[index] = updated;
  await saveData(GOALS_KEY, goals);
  return updated;
}

export async function deleteGoal(id: string): Promise<boolean> {
  const goals = await loadNormalized();
  const filtered = goals.filter((g) => g.id !== id);
  if (filtered.length === goals.length) return false;
  await saveData(GOALS_KEY, filtered);
  return true;
}

// ─── Progress (derived from Book records only) ────────────────────────────────

export interface BookGoalProgress {
  achieved: number;
  remaining: number;
  /** Integer 0–100, always finite. */
  percent: number;
  completed: boolean;
}

function completionDay(book: Book): string | null {
  if (book.status !== 'completed') return null;
  if (typeof book.completedAt !== 'string' || book.completedAt.length < 10) return null;
  const day = book.completedAt.slice(0, 10);
  return isValidDateString(day) ? day : null;
}

/**
 * Calculate a goal's progress from Book records:
 * - books: completed books whose completion day falls inside the window.
 *   Only completed books ever count; missing/malformed stamps contribute 0.
 * - pages: sum of valid currentPage snapshots (finite, >= 0, floored) across
 *   all books. currentPage carries no date, so pages goals are lifetime
 *   snapshots rather than period-attributed totals.
 * Percent is clamped 0–100; invalid windows yield zeros (never NaN).
 */
export function getGoalProgress(goal: BookGoal, books: Book[]): BookGoalProgress {
  if (
    !isValidDateString(goal.startDate) ||
    !isValidDateString(goal.endDate) ||
    goal.startDate > goal.endDate ||
    !(goal.target >= 1)
  ) {
    return { achieved: 0, remaining: goal.target >= 1 ? goal.target : 0, percent: 0, completed: false };
  }

  let achieved = 0;
  if (goal.type === 'books') {
    for (const book of books) {
      const day = completionDay(book);
      if (day && day >= goal.startDate && day <= goal.endDate) achieved += 1;
    }
  } else {
    for (const book of books) {
      const page = book.currentPage;
      if (Number.isFinite(page) && page > 0) achieved += Math.floor(page);
    }
  }

  const percent = Math.min(100, Math.max(0, Math.round((achieved / goal.target) * 100)));
  return {
    achieved,
    remaining: Math.max(0, goal.target - achieved),
    percent,
    completed: achieved >= goal.target,
  };
}

/** True when today falls inside the goal window (i.e. the goal is active). */
export function isGoalActive(
  goal: Pick<BookGoal, 'startDate' | 'endDate'>,
  today: string,
): boolean {
  if (!isValidDateString(today)) return false;
  return goal.startDate <= today && today <= goal.endDate;
}
