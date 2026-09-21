// ─── Book Service (Phase 1A) ──────────────────────────────────────────────────
// Local-first AsyncStorage CRUD, mirroring the Tasks service architecture:
// same storage.ts helpers, same uid() IDs, same normalize-on-load pattern,
// plain JSON records (Supabase-row compatible). No network, no auth.

import { saveData, loadData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import {
  BOOK_STATUSES,
  getNowISO,
  type Book,
  type BookStatus,
  type CreateBookInput,
  type UpdateBookInput,
} from '@/types/books';

// ─── Storage Key ──────────────────────────────────────────────────────────────

const BOOKS_KEY = 'jeevya:books';

// ─── Migration / Backward Compatibility ───────────────────────────────────────

/**
 * Normalize a raw record into a fully-typed Book.
 * Missing keys get sensible defaults; malformed values degrade to null/defaults
 * instead of crashing. Unknown extra keys are dropped.
 */
function normalizeBook(raw: Record<string, unknown>): Book {
  const totalPages = toTotalPages(raw.totalPages);
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    author: String(raw.author ?? ''),
    description: String(raw.description ?? ''),
    coverUrl: String(raw.coverUrl ?? ''),
    isbn: String(raw.isbn ?? ''),
    status: isValidStatus(raw.status) ? raw.status : 'want_to_read',
    rating: toRating(raw.rating),
    totalPages,
    currentPage: toCurrentPage(raw.currentPage),
    category: String(raw.category ?? ''),
    notes: String(raw.notes ?? ''),
    startedAt: toOptionalISO(raw.startedAt),
    completedAt: toOptionalISO(raw.completedAt),
    createdAt: toISOWithFallback(raw.createdAt),
    updatedAt: toISOWithFallback(raw.updatedAt),
  };
}

function isValidStatus(value: unknown): value is BookStatus {
  return (
    typeof value === 'string' &&
    (BOOK_STATUSES as string[]).includes(value)
  );
}

/** 0–5 inclusive, or null. Coerces numeric strings; rejects NaN/Infinity/out-of-range. */
function toRating(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 5) return null;
  return n;
}

/** Non-negative finite integer page count, or null when unknown/invalid. */
function toTotalPages(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Non-negative finite integer page, defaulting to 0. */
function toCurrentPage(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Keep plausible ISO strings, else null (malformed timestamps never crash). */
function toOptionalISO(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function toISOWithFallback(value: unknown): string {
  if (typeof value === 'string' && value !== '' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return getNowISO();
}

/**
 * Load all books from storage, normalizing any old/malformed records.
 * Never throws — returns empty array on error.
 */
async function loadNormalized(): Promise<Book[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(BOOKS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeBook).filter((b) => b.id !== '');
  } catch {
    return [];
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a candidate book shape (create or merged update). Throws with a
 * human-readable message on the first violation.
 */
function assertValidBook(candidate: {
  title: string;
  currentPage: number;
  totalPages: number | null;
  rating: number | null;
}): void {
  if (!candidate.title.trim()) {
    throw new Error('Book title is required');
  }
  if (!Number.isFinite(candidate.currentPage) || candidate.currentPage < 0) {
    throw new Error('Current page must be 0 or greater');
  }
  if (candidate.totalPages != null) {
    if (!Number.isFinite(candidate.totalPages) || candidate.totalPages < 0) {
      throw new Error('Total pages must be 0 or greater');
    }
    if (candidate.currentPage > candidate.totalPages) {
      throw new Error('Current page cannot exceed total pages');
    }
  }
  if (candidate.rating != null) {
    if (!Number.isFinite(candidate.rating) || candidate.rating < 0 || candidate.rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Get all books, newest first.
 */
export async function getBooks(): Promise<Book[]> {
  const books = await loadNormalized();
  return books.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Get a single book by ID.
 */
export async function getBookById(id: string): Promise<Book | null> {
  const books = await loadNormalized();
  return books.find((b) => b.id === id) ?? null;
}

/**
 * Create a new book.
 */
export async function createBook(input: CreateBookInput): Promise<Book> {
  const now = getNowISO();
  const candidate = {
    title: input.title.trim(),
    currentPage: input.currentPage ?? 0,
    totalPages: input.totalPages ?? null,
    rating: input.rating ?? null,
  };
  assertValidBook(candidate);

  if (input.status !== undefined && !isValidStatus(input.status)) {
    throw new Error('Invalid book status');
  }

  const books = await loadNormalized();
  const status = input.status ?? 'want_to_read';

  const book: Book = {
    id: uid('book_'),
    title: candidate.title,
    author: input.author?.trim() ?? '',
    description: input.description?.trim() ?? '',
    coverUrl: input.coverUrl?.trim() ?? '',
    isbn: input.isbn?.trim() ?? '',
    status,
    rating: candidate.rating,
    totalPages: candidate.totalPages,
    currentPage: candidate.currentPage,
    category: input.category?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    // Status timestamps: a book born reading/completed gets its stamps now
    // unless the caller supplied explicit values (future sync compat).
    startedAt:
      input.startedAt !== undefined
        ? toOptionalISO(input.startedAt)
        : status === 'reading' || status === 'completed'
          ? now
          : null,
    completedAt:
      input.completedAt !== undefined
        ? toOptionalISO(input.completedAt)
        : status === 'completed'
          ? now
          : null,
    createdAt: now,
    updatedAt: now,
  };

  await saveData(BOOKS_KEY, [book, ...books]);
  return book;
}

/**
 * Update an existing book by ID.
 *
 * Status timestamp rules (transition-based, explicit input always wins):
 * - entering `reading` → set startedAt when missing
 * - entering `completed` → set completedAt to now
 * - leaving `completed` → clear completedAt (mirrors task uncomplete)
 * - leaving `reading` → startedAt is kept as history
 */
export async function updateBook(
  id: string,
  input: UpdateBookInput,
): Promise<Book | null> {
  const books = await loadNormalized();
  const index = books.findIndex((b) => b.id === id);

  if (index === -1) return null;

  const book = books[index];
  const now = getNowISO();

  if (input.status !== undefined && !isValidStatus(input.status)) {
    throw new Error('Invalid book status');
  }

  const nextTitle = input.title !== undefined ? input.title.trim() : book.title;
  const nextTotalPages = input.totalPages !== undefined ? input.totalPages : book.totalPages;
  const nextCurrentPage = input.currentPage !== undefined ? input.currentPage : book.currentPage;
  const nextRating = input.rating !== undefined ? input.rating : book.rating;

  assertValidBook({
    title: nextTitle,
    currentPage: nextCurrentPage,
    totalPages: nextTotalPages,
    rating: nextRating,
  });

  const nextStatus = input.status !== undefined ? input.status : book.status;
  const statusChanged = nextStatus !== book.status;

  let startedAt = input.startedAt !== undefined ? toOptionalISO(input.startedAt) : book.startedAt;
  let completedAt =
    input.completedAt !== undefined ? toOptionalISO(input.completedAt) : book.completedAt;

  if (statusChanged) {
    if (nextStatus === 'reading' && !startedAt) {
      startedAt = now;
    }
    if (nextStatus === 'completed') {
      completedAt = now;
    }
    if (book.status === 'completed' && nextStatus !== 'completed' && input.completedAt === undefined) {
      completedAt = null;
    }
  }

  const updated: Book = {
    ...book,
    ...input,
    title: nextTitle,
    totalPages: nextTotalPages,
    currentPage: nextCurrentPage,
    rating: nextRating,
    status: nextStatus,
    startedAt,
    completedAt,
    updatedAt: now,
  };

  books[index] = updated;
  await saveData(BOOKS_KEY, books);
  return updated;
}

/**
 * Delete a book by ID.
 */
export async function deleteBook(id: string): Promise<boolean> {
  const books = await loadNormalized();
  const filtered = books.filter((b) => b.id !== id);

  if (filtered.length === books.length) return false;

  await saveData(BOOKS_KEY, filtered);
  return true;
}
