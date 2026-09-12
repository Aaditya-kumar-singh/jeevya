// ─── Journal Service (Phase 1A) ───────────────────────────────────────────────
// Local-first AsyncStorage CRUD, mirroring the Books/Tasks service
// architecture: same storage.ts helpers, same uid() IDs, same normalize-on-load
// pattern, plain JSON records (Supabase-row compatible). No network, no auth,
// no AI.

import { saveData, loadData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import {
  JOURNAL_MOODS,
  getNowISO,
  getTodayDate,
  type CreateJournalEntryInput,
  type JournalEntry,
  type JournalMood,
  type UpdateJournalEntryInput,
} from '@/types/journal';

// ─── Storage Key ──────────────────────────────────────────────────────────────

const JOURNAL_KEY = 'lifeos:journal';

// ─── Validation Limits ────────────────────────────────────────────────────────

export const JOURNAL_TITLE_MAX = 200;
export const JOURNAL_CONTENT_MAX = 50000;

// ─── Civil Date Handling (YYYY-MM-DD only — no locale parsing) ────────────────

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

/**
 * True for well-formed, real calendar YYYY-MM-DD strings. Pure civil
 * arithmetic on raw numbers — no Date objects, no locale parsing, no
 * timezone round-tripping.
 */
export function isValidJournalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

// ─── Tag Normalization ────────────────────────────────────────────────────────

/**
 * Normalize a tag list: keep strings only, trim, collapse internal whitespace,
 * drop empties, deduplicate case-insensitively while preserving the first
 * occurrence's display casing ("Work" wins over a later "work"). Non-array
 * input (pre-1A/malformed records) becomes [].
 */
export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const clean = item.trim().replace(/\s+/g, ' ');
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

// ─── Normalization ────────────────────────────────────────────────────────────

function isValidMood(value: unknown): value is JournalMood {
  return (
    typeof value === 'string' &&
    (JOURNAL_MOODS as string[]).includes(value)
  );
}

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
 * Normalize a raw record into a fully-typed JournalEntry. Missing keys get
 * sensible defaults; malformed values degrade instead of crashing. Unknown
 * extra keys are dropped. Records with an empty id are dropped by the loader.
 */
function normalizeEntry(raw: Record<string, unknown>): JournalEntry {
  // Invalid entry dates fall back to the record's own creation day, then
  // today — the entry always stays sortable and renderable, never crashes.
  const createdRaw = toISOWithFallback(raw.createdAt);
  const createdDay = createdRaw.slice(0, 10);
  const date =
    typeof raw.date === 'string' && isValidJournalDate(raw.date)
      ? raw.date
      : isValidJournalDate(createdDay)
        ? createdDay
        : getTodayDate();

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    content: String(raw.content ?? ''),
    date,
    mood: isValidMood(raw.mood) ? raw.mood : null,
    tags: normalizeTags(raw.tags),
    createdAt: createdRaw,
    updatedAt: toISOWithFallback(raw.updatedAt),
  };
}

/**
 * Load all entries from storage, normalizing any old/malformed records.
 * Empty, non-array, and corrupt payloads all become []. Never throws.
 */
async function loadNormalized(): Promise<JournalEntry[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(JOURNAL_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeEntry).filter((e) => e.id !== '');
  } catch {
    return [];
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a candidate entry shape (create or merged update). Throws with a
 * human-readable message on the first violation.
 */
function assertValidEntry(candidate: {
  title: string;
  content: string;
  date: string;
  mood: JournalMood | null;
}): void {
  if (candidate.title.length > JOURNAL_TITLE_MAX) {
    throw new Error(`Title must be ${JOURNAL_TITLE_MAX} characters or fewer`);
  }
  if (!candidate.content.trim()) {
    throw new Error('Journal content is required');
  }
  if (candidate.content.length > JOURNAL_CONTENT_MAX) {
    throw new Error(
      `Content must be ${JOURNAL_CONTENT_MAX.toLocaleString('en-US')} characters or fewer`,
    );
  }
  if (candidate.mood !== null && !isValidMood(candidate.mood)) {
    throw new Error('Invalid mood');
  }
  if (!isValidJournalDate(candidate.date)) {
    throw new Error('Date must be a valid YYYY-MM-DD date');
  }
}

// ─── Write Serialization ──────────────────────────────────────────────────────
// Mutations are read-modify-write cycles on one AsyncStorage key. Without
// ordering, two concurrent saves can each read the same list and the second
// write silently drops the first entry. This promise chain serializes creates,
// updates, and deletes (reads stay lock-free). Errors still propagate to the
// caller; the chain itself never stalls.

let writeQueue: Promise<void> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Get all entries, newest first (entry date desc, then creation time desc).
 */
export async function getEntries(): Promise<JournalEntry[]> {
  const entries = await loadNormalized();
  return entries.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

/**
 * Get a single entry by ID.
 */
export async function getEntryById(id: string): Promise<JournalEntry | null> {
  const entries = await loadNormalized();
  return entries.find((e) => e.id === id) ?? null;
}

/**
 * Create a new entry. Date defaults to today when omitted.
 */
export async function createEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
  return serialize(async () => {
    const candidate = {
      title: (input.title ?? '').trim(),
      content: input.content,
      date: input.date ?? getTodayDate(),
      mood: input.mood ?? null,
    };
    assertValidEntry(candidate);

    const entries = await loadNormalized();
    const now = getNowISO();

    const entry: JournalEntry = {
      id: uid('journal_'),
      title: candidate.title,
      content: input.content,
      date: candidate.date,
      mood: candidate.mood,
      tags: normalizeTags(input.tags),
      createdAt: now,
      updatedAt: now,
    };

    await saveData(JOURNAL_KEY, [entry, ...entries]);
    return entry;
  });
}

/**
 * Update an existing entry by ID. Like updateBook, validation runs against
 * the final merged entry (partial updates validate in full context).
 * Returns null when the entry is missing.
 */
export async function updateEntry(
  id: string,
  input: UpdateJournalEntryInput,
): Promise<JournalEntry | null> {
  return serialize(async () => {
    const entries = await loadNormalized();
    const index = entries.findIndex((e) => e.id === id);

    if (index === -1) return null;

    const entry = entries[index];

    const nextTitle = input.title !== undefined ? input.title.trim() : entry.title;
    const nextContent = input.content !== undefined ? input.content : entry.content;
    const nextDate = input.date !== undefined ? input.date : entry.date;
    const nextMood = input.mood !== undefined ? input.mood : entry.mood;
    const nextTags = input.tags !== undefined ? normalizeTags(input.tags) : entry.tags;

    assertValidEntry({
      title: nextTitle,
      content: nextContent,
      date: nextDate,
      mood: nextMood,
    });

    const updated: JournalEntry = {
      ...entry,
      title: nextTitle,
      content: nextContent,
      date: nextDate,
      mood: nextMood,
      tags: nextTags,
      updatedAt: getNowISO(),
    };

    entries[index] = updated;
    await saveData(JOURNAL_KEY, entries);
    return updated;
  });
}

/**
 * Delete an entry by ID. Returns false when the entry is missing.
 */
export async function deleteEntry(id: string): Promise<boolean> {
  return serialize(async () => {
    const entries = await loadNormalized();
    const filtered = entries.filter((e) => e.id !== id);

    if (filtered.length === entries.length) return false;

    await saveData(JOURNAL_KEY, filtered);
    return true;
  });
}
