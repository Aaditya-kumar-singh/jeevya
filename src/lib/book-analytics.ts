// ─── Book Reading Analytics (Phase 1G) ────────────────────────────────────────
// Pure functions — no storage access, no JSX, no new dependencies.
//
// Universes:
// - BOOKS: top-level Book records only. Subtasks don't exist here and
//   progress-history entries are never counted as books.
// - DELTAS: page progress derived from consecutive progress-history entries
//   PER BOOK. The first entry per book has no previous point and contributes 0
//   (an initial absolute page is never "newly read"). Equal pages (duplicates)
//   and backward corrections contribute 0 — only positive forward movement
//   counts, attributed to the later entry's day.
//
// All date math is civil YYYY-MM-DD via UTC-noon Dates (stable in every
// timezone); day parts come from ISO slice(0, 10), the same convention used
// across the Books pipeline.

import type { Book, BookProgressEntry } from '@/types/books';

// ─── Periods ──────────────────────────────────────────────────────────────────

export type BookAnalyticsPeriod = 7 | 30 | 90 | 'all';

export const BOOK_ANALYTICS_PERIODS: BookAnalyticsPeriod[] = [7, 30, 90, 'all'];

// ─── Civil Date Helpers (local — no cross-module coupling) ────────────────────

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

export function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Shift a YYYY-MM-DD by `delta` days (UTC-noon civil math). '' on invalid. */
export function shiftDay(iso: string, delta: number): string {
  if (!isValidDay(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Today's UTC date part (matches getNowISO() convention). */
export function todayDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Day part of a full ISO datetime, or null when unusable. */
export function toDay(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.length < 10) return null;
  const day = value.slice(0, 10);
  return isValidDay(day) ? day : null;
}

// ─── Deltas ───────────────────────────────────────────────────────────────────

export interface PageDelta {
  bookId: string;
  /** Day the progress was recorded (later entry's day). */
  day: string;
  /** Positive pages read between the two entries. Always > 0. */
  pages: number;
}

/**
 * Derive per-book page deltas from history entries. Entries are grouped by
 * book, ordered oldest-first (recordedAt, id tiebreak), sanitized defensively
 * (non-integer/negative pages and bad dates dropped), then walked as
 * consecutive pairs. Only strictly positive forward movement counts.
 */
export function deriveDeltas(entries: BookProgressEntry[]): PageDelta[] {
  const clean = entries.filter(
    (e) =>
      typeof e.bookId === 'string' &&
      e.bookId !== '' &&
      Number.isInteger(e.page) &&
      e.page >= 0 &&
      toDay(e.recordedAt) !== null,
  );

  const byBook = new Map<string, typeof clean>();
  for (const entry of clean) {
    const list = byBook.get(entry.bookId) ?? [];
    list.push(entry);
    byBook.set(entry.bookId, list);
  }

  const deltas: PageDelta[] = [];
  for (const [bookId, list] of byBook) {
    list.sort((a, b) =>
      a.recordedAt.localeCompare(b.recordedAt) || a.id.localeCompare(b.id),
    );
    for (let i = 1; i < list.length; i++) {
      const gain = list[i].page - list[i - 1].page;
      if (gain <= 0) continue; // duplicates + backward corrections ignored
      const day = toDay(list[i].recordedAt);
      if (!day) continue;
      deltas.push({ bookId, day, pages: gain });
    }
  }
  return deltas;
}

/** Sum of deltas whose day falls in [start, end] (inclusive). */
export function sumDeltasInRange(
  deltas: PageDelta[],
  start: string | null,
  end: string,
): number {
  let total = 0;
  for (const d of deltas) {
    if (start && d.day < start) continue;
    if (d.day > end) continue;
    total += d.pages;
  }
  return total;
}

/** Distinct days with positive progress in [start, end]. */
export function activeDaysInRange(
  deltas: PageDelta[],
  start: string | null,
  end: string,
): Set<string> {
  const days = new Set<string>();
  for (const d of deltas) {
    if (start && d.day < start) continue;
    if (d.day > end) continue;
    days.add(d.day);
  }
  return days;
}

// ─── Period Bounds ────────────────────────────────────────────────────────────

export interface AnalyticsBounds {
  /** Null start = All Time (no lower bound). */
  start: string | null;
  end: string;
}

export function getBounds(period: BookAnalyticsPeriod, today: string): AnalyticsBounds {
  if (period === 'all' || !isValidDay(today)) {
    return { start: null, end: isValidDay(today) ? today : todayDay() };
  }
  return { start: shiftDay(today, -(period - 1)), end: today };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface BookAnalyticsSummary {
  period: BookAnalyticsPeriod;
  start: string | null;
  end: string;
  totalBooks: number;
  wantToRead: number;
  reading: number;
  completed: number;
  completionRate: number;
  /** Σ currentPage where a total is known (dashboard convention). */
  pagesReached: number;
  averageRating: number | null;
  completedInPeriod: number;
  pagesInPeriod: number;
  activeDays: number;
  /** Pages per active day, 1 decimal. 0 when no active days. */
  avgPagesPerActiveDay: number;
  streak: number;
}

function safeRate(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((Math.max(0, done) / total) * 100)));
}

export function computeBookAnalytics(
  books: Book[],
  entries: BookProgressEntry[],
  period: BookAnalyticsPeriod,
  today: string,
): BookAnalyticsSummary {
  const { start, end } = getBounds(period, today);

  const wantToRead = books.filter((b) => b.status === 'want_to_read').length;
  const reading = books.filter((b) => b.status === 'reading').length;
  const done = books.filter((b) => b.status === 'completed');

  let pagesReached = 0;
  for (const b of books) {
    if (b.totalPages != null && Number.isFinite(b.currentPage) && b.currentPage > 0) {
      pagesReached += Math.floor(b.currentPage);
    }
  }

  const ratings = books
    .map((b) => b.rating)
    .filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r >= 0 && r <= 5);
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((n, r) => n + r, 0) / ratings.length) * 10) / 10
      : null;

  let completedInPeriod = 0;
  for (const b of done) {
    const day = toDay(b.completedAt);
    if (!day || day > end) continue;
    if (start && day < start) continue;
    completedInPeriod += 1;
  }

  const deltas = deriveDeltas(entries);
  const pagesInPeriod = sumDeltasInRange(deltas, start, end);
  const activeDays = activeDaysInRange(deltas, start, end).size;

  return {
    period,
    start,
    end,
    totalBooks: books.length,
    wantToRead,
    reading,
    completed: done.length,
    completionRate: safeRate(done.length, books.length),
    pagesReached,
    averageRating,
    completedInPeriod,
    pagesInPeriod,
    activeDays,
    avgPagesPerActiveDay:
      activeDays > 0 ? Math.round((pagesInPeriod / activeDays) * 10) / 10 : 0,
    streak: readingStreak(deltas, end),
  };
}

// ─── Streak ───────────────────────────────────────────────────────────────────

/**
 * Current reading streak: consecutive days with positive page progress ending
 * today — or yesterday when today has none yet (one grace day, matching the
 * LifeOS task-streak convention; the streak is still alive until end of day).
 * Any inactive day breaks the chain. 0 when neither day is active.
 */
export function readingStreak(deltas: PageDelta[], today: string): number {
  const end = isValidDay(today) ? today : todayDay();
  const days = new Set(deltas.map((d) => d.day));

  let cursor = end;
  if (!days.has(cursor)) {
    cursor = shiftDay(end, -1); // grace day
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

// ─── Breakdowns ───────────────────────────────────────────────────────────────

export interface CategoryStat {
  category: string;
  books: number;
  pages: number;
}

/** Books per non-blank category (count desc), with snapshot pages each. */
export function booksByCategory(books: Book[], limit = 6): CategoryStat[] {
  const map = new Map<string, CategoryStat>();
  for (const b of books) {
    const category = b.category.trim();
    if (!category) continue;
    const entry = map.get(category) ?? { category, books: 0, pages: 0 };
    entry.books += 1;
    if (Number.isFinite(b.currentPage) && b.currentPage > 0) {
      entry.pages += Math.floor(b.currentPage);
    }
    map.set(category, entry);
  }
  return [...map.values()]
    .sort((a, b) => b.books - a.books || b.pages - a.pages)
    .slice(0, limit);
}

export interface AuthorStat {
  author: string;
  books: number;
  pages: number;
}

/** Books per non-blank author (count desc). Each book counts once. */
export function booksByAuthor(books: Book[], limit = 5): AuthorStat[] {
  const map = new Map<string, AuthorStat>();
  for (const b of books) {
    const author = b.author.trim();
    if (!author) continue;
    const entry = map.get(author) ?? { author, books: 0, pages: 0 };
    entry.books += 1;
    if (Number.isFinite(b.currentPage) && b.currentPage > 0) {
      entry.pages += Math.floor(b.currentPage);
    }
    map.set(author, entry);
  }
  return [...map.values()]
    .sort((a, b) => b.books - a.books || b.pages - a.pages)
    .slice(0, limit);
}

export interface RatingBucket {
  stars: number;
  count: number;
}

/** Ratings bucketed by rounded stars (5→0). Unrated books excluded. */
export function ratingDistribution(books: Book[]): RatingBucket[] {
  const counts = [0, 0, 0, 0, 0, 0]; // index = stars
  for (const b of books) {
    if (typeof b.rating !== 'number' || !Number.isFinite(b.rating)) continue;
    // Rating 0 is valid (0–5) and gets its own bucket — never folded into 1★.
    const stars = Math.min(5, Math.max(0, Math.round(b.rating)));
    counts[stars] += 1;
  }
  return [5, 4, 3, 2, 1, 0].map((stars) => ({ stars, count: counts[stars] }));
}

// ─── Activity Series ──────────────────────────────────────────────────────────

export interface ActivityPoint {
  label: string;
  pages: number;
  /** Representative day (bucket start) — used for best-day insights. */
  day: string;
}

/**
 * Pages read per bucket over the period. Daily buckets up to 92 days;
 * longer All-Time spans use weekly buckets (Monday-start not required —
 * fixed 7-day windows back from today) so charts stay readable.
 */
export function activitySeries(
  entries: BookProgressEntry[],
  period: BookAnalyticsPeriod,
  today: string,
): ActivityPoint[] {
  const end = isValidDay(today) ? today : todayDay();
  const deltas = deriveDeltas(entries);

  // All Time: span from the earliest delta day to today (no activity → [today]).
  let spanStart: string;
  if (period === 'all') {
    let earliest: string | null = null;
    for (const d of deltas) {
      if (!earliest || d.day < earliest) earliest = d.day;
    }
    spanStart = earliest ?? end;
  } else {
    spanStart = shiftDay(end, -(period - 1));
  }

  const perDay = new Map<string, number>();
  for (const d of deltas) {
    if (d.day < spanStart || d.day > end) continue;
    perDay.set(d.day, (perDay.get(d.day) ?? 0) + d.pages);
  }

  // Count span length to decide bucketing.
  let spanLen = 0;
  for (let c = spanStart; c <= end; c = shiftDay(c, 1)) {
    spanLen += 1;
    if (spanLen > 92) break;
  }

  const points: ActivityPoint[] = [];
  if (spanLen <= 92) {
    for (let c = spanStart; c <= end; c = shiftDay(c, 1)) {
      const [, m, d] = c.split('-').map(Number);
      points.push({ label: `${m}/${d}`, pages: perDay.get(c) ?? 0, day: c });
    }
    return points;
  }

  // Weekly buckets, oldest week first. Final bucket may be partial.
  const weeks: { start: string; pages: number }[] = [];
  let cursor = spanStart;
  while (cursor <= end) {
    const weekEnd = shiftDay(cursor, 6) > end ? end : shiftDay(cursor, 6);
    let pages = 0;
    for (let c = cursor; c <= weekEnd; c = shiftDay(c, 1)) {
      pages += perDay.get(c) ?? 0;
    }
    weeks.push({ start: cursor, pages });
    cursor = shiftDay(weekEnd, 1);
  }
  for (const w of weeks) {
    const [, m, d] = w.start.split('-').map(Number);
    points.push({ label: `${m}/${d}`, pages: w.pages, day: w.start });
  }
  return points;
}

/** Best bucket in a series (most pages), or null when all are zero. */
export function bestPoint(series: ActivityPoint[]): ActivityPoint | null {
  let best: ActivityPoint | null = null;
  for (const p of series) {
    if (p.pages > 0 && (!best || p.pages > best.pages)) best = p;
  }
  return best;
}
