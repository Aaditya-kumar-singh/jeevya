// ─── Journal Types (Phase 1A) ─────────────────────────────────────────────────
// Local-first model. Records are plain JSON objects (no class instances) so the
// shape stays compatible with a future Supabase table row.

export type JournalMood = 'great' | 'good' | 'okay' | 'bad' | 'awful';

export const JOURNAL_MOODS: JournalMood[] = ['great', 'good', 'okay', 'bad', 'awful'];

export interface JournalEntry {
  id: string;
  title: string; // optional, max 200
  content: string; // required, max 50,000
  date: string; // YYYY-MM-DD entry date
  mood: JournalMood | null;
  tags: string[];
  createdAt: string; // full ISO datetime
  updatedAt: string; // full ISO datetime
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateJournalEntryInput {
  title?: string;
  content: string;
  date?: string; // defaults to today when omitted
  mood?: JournalMood | null;
  tags?: string[];
}

export interface UpdateJournalEntryInput {
  title?: string;
  content?: string;
  date?: string;
  mood?: JournalMood | null;
  tags?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the current full ISO datetime string.
 * (Mirrors the sibling helpers so Journal stays decoupled from other modules.)
 */
export function getNowISO(): string {
  return new Date().toISOString();
}

/**
 * Today's date as YYYY-MM-DD (same UTC date-part convention used across
 * LifeOS — consistent with task due dates and goal windows).
 */
export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Display labels for moods.
 */
export const JOURNAL_MOOD_LABELS: Record<JournalMood, string> = {
  great: 'Great',
  good: 'Good',
  okay: 'Okay',
  bad: 'Bad',
  awful: 'Awful',
};
