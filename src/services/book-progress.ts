// ─── Book Progress History Service (Phase 1D) ─────────────────────────────────
// Local/offline append-only log of saved page milestones, stored separately
// from books under `jeevya:book-progress`. Entries are never books and never
// influence book validation. Malformed records are dropped on load — never crash.

import { saveData, loadData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import { getNowISO, type BookProgressEntry } from '@/types/books';

// ─── Storage Key ──────────────────────────────────────────────────────────────

const PROGRESS_KEY = 'jeevya:book-progress';

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a raw record into a valid entry, or null when unusable.
 * Page must be a finite number >= 0 (floored to an integer); recordedAt must
 * be a parseable date. Anything else is dropped.
 */
function normalizeEntry(raw: Record<string, unknown>): BookProgressEntry | null {
  const id = String(raw.id ?? '');
  const bookId = String(raw.bookId ?? '');
  if (id === '' || bookId === '') return null;

  const pageRaw = typeof raw.page === 'number' ? raw.page : Number(raw.page);
  if (!Number.isFinite(pageRaw) || pageRaw < 0) return null;

  const recordedAt = String(raw.recordedAt ?? '');
  if (recordedAt === '' || Number.isNaN(Date.parse(recordedAt))) return null;

  return { id, bookId, page: Math.floor(pageRaw), recordedAt };
}

async function loadNormalized(): Promise<BookProgressEntry[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(PROGRESS_KEY, []);
    if (!Array.isArray(raw)) return [];
    const entries: BookProgressEntry[] = [];
    for (const record of raw) {
      const entry = normalizeEntry(record);
      if (entry) entries.push(entry);
    }
    return entries;
  } catch {
    return [];
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Get a book's history, newest first.
 */
export async function getProgressHistory(bookId: string): Promise<BookProgressEntry[]> {
  const entries = await loadNormalized();
  return entries
    .filter((e) => e.bookId === bookId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

/**
 * Record a page milestone. Only writes when the page differs from the latest
 * recorded page (duplicate saves are free) — returns the latest entry either
 * way. Throws on non-integer or negative pages.
 */
export async function recordProgress(
  bookId: string,
  page: number,
): Promise<BookProgressEntry> {
  if (!Number.isInteger(page) || page < 0) {
    throw new Error('Page must be a whole number (0 or more)');
  }
  if (!bookId) {
    throw new Error('Book ID is required');
  }

  const entries = await loadNormalized();
  const latest = entries
    .filter((e) => e.bookId === bookId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

  if (latest && latest.page === page) {
    return latest;
  }

  const entry: BookProgressEntry = {
    id: uid('bprog_'),
    bookId,
    page,
    recordedAt: getNowISO(),
  };
  await saveData(PROGRESS_KEY, [entry, ...entries]);
  return entry;
}

/**
 * Delete all history for a book (call when the book is deleted).
 * Returns the number of entries removed.
 */
export async function deleteProgressHistory(bookId: string): Promise<number> {
  const entries = await loadNormalized();
  const kept = entries.filter((e) => e.bookId !== bookId);
  if (kept.length === entries.length) return 0;
  await saveData(PROGRESS_KEY, kept);
  return entries.length - kept.length;
}
