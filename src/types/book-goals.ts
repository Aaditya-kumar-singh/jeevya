// ─── Book Goal Types (Phase 1F) ───────────────────────────────────────────────
// Local-first model. Records are plain JSON objects (no class instances).
// A goal covers one period window: monthly (a calendar month) or yearly
// (a calendar year). Progress is always derived from Book records — never stored.

export type BookGoalType = 'books' | 'pages';

export type BookGoalPeriod = 'monthly' | 'yearly';

export const BOOK_GOAL_TYPES: BookGoalType[] = ['books', 'pages'];

export const BOOK_GOAL_PERIODS: BookGoalPeriod[] = ['monthly', 'yearly'];

export interface BookGoal {
  id: string;
  type: BookGoalType;
  period: BookGoalPeriod;
  /** Positive integer. */
  target: number;
  /** Inclusive YYYY-MM-DD bounds of the goal window. */
  startDate: string;
  endDate: string;
  createdAt: string; // full ISO datetime
  updatedAt: string; // full ISO datetime
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateBookGoalInput {
  type: BookGoalType;
  period: BookGoalPeriod;
  target: number;
  startDate: string;
  endDate: string;
}

export interface UpdateBookGoalInput {
  type?: BookGoalType;
  period?: BookGoalPeriod;
  target?: number;
  startDate?: string;
  endDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the current full ISO datetime string.
 * (Mirrors the sibling helpers so goals stay decoupled from other modules.)
 */
export function getNowISO(): string {
  return new Date().toISOString();
}

export const BOOK_GOAL_TYPE_LABELS: Record<BookGoalType, string> = {
  books: 'Books',
  pages: 'Pages',
};

export const BOOK_GOAL_PERIOD_LABELS: Record<BookGoalPeriod, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};
