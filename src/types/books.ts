// ─── Book Types (Phase 1A) ────────────────────────────────────────────────────
// Local-first model. Records are plain JSON objects (no class instances) so the
// shape stays compatible with a future Supabase table row.

export type BookStatus = 'want_to_read' | 'reading' | 'completed';

export const BOOK_STATUSES: BookStatus[] = ['want_to_read', 'reading', 'completed'];

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  isbn: string;
  status: BookStatus;
  rating: number | null; // 0–5 inclusive, or null when unrated
  totalPages: number | null; // null when unknown
  currentPage: number; // always >= 0
  category: string;
  notes: string;
  startedAt: string | null; // full ISO datetime
  completedAt: string | null; // full ISO datetime
  createdAt: string; // full ISO datetime
  updatedAt: string; // full ISO datetime
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateBookInput {
  title: string;
  author?: string;
  description?: string;
  coverUrl?: string;
  isbn?: string;
  status?: BookStatus;
  rating?: number | null;
  totalPages?: number | null;
  currentPage?: number;
  category?: string;
  notes?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  description?: string;
  coverUrl?: string;
  isbn?: string;
  status?: BookStatus;
  rating?: number | null;
  totalPages?: number | null;
  currentPage?: number;
  category?: string;
  notes?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the current full ISO datetime string.
 * (Mirrors the Tasks helper so Books stays dependency-free of other modules.)
 */
export function getNowISO(): string {
  return new Date().toISOString();
}

/**
 * Display labels for reading statuses.
 */
export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  completed: 'Completed',
};

// ─── Reading Progress History (Phase 1D) ──────────────────────────────────────
// Separate from Book: one entry per saved page milestone. History entries are
// never books and never affect book validation.

export interface BookProgressEntry {
  id: string;
  bookId: string;
  page: number; // integer >= 0
  recordedAt: string; // full ISO datetime
}

/**
 * Reading progress as an integer percent (0–100), or null when totalPages is
 * unknown. Clamps out-of-range values so malformed records can never produce
 * NaN or overflow the progress bar.
 */
export function bookProgressPercent(book: {
  currentPage: number;
  totalPages: number | null;
}): number | null {
  const { currentPage, totalPages } = book;
  if (
    totalPages == null ||
    !Number.isFinite(totalPages) ||
    totalPages <= 0 ||
    !Number.isFinite(currentPage)
  ) {
    return null;
  }
  const pct = Math.round((Math.max(0, currentPage) / totalPages) * 100);
  return Math.min(100, Math.max(0, pct));
}
