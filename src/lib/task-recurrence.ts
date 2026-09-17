// ─── Task Recurrence Helpers (Phase 1E) ───────────────────────────────────────
// Pure functions — no storage access, no JSX, and no Date objects that cross
// timezones: all math is civil-date arithmetic on raw numbers, so the same
// input always produces the same output regardless of device timezone.

import {
  isValidDateString,
  isValidTimeString,
} from '@/lib/task-filters';
import { addDays as addCivilDays, daysInMonth, formatCivilDate, parseCivilDate, weekdayOf as canonicalWeekdayOf, shiftMonth } from '@/lib/date';
import { uid } from '@/lib/uid';
import { getNowISO, type Task, type TaskRecurrence } from '@/types/tasks';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekdayOption {
  /** 0 = Sunday … 6 = Saturday (matches Date.getDay()). */
  value: number;
  label: string;
  /** One-letter label for compact mobile selectors. */
  short: string;
}

/**
 * Weekly selector options, ordered Monday-first for display.
 */
export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'T' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'S' },
  { value: 0, label: 'Sunday', short: 'S' },
];

/**
 * Form-facing recurrence state. `type: 'none'` means "does not repeat";
 * this never gets persisted as-is (buildRecurrence converts it to null).
 */
export interface FormRecurrence {
  type: 'none' | TaskRecurrence['type'];
  interval: number;
  startDate: string;
  endDate: string;
  weekdays: number[];
}

/** Default form state — non-recurring. */
export function getDefaultFormRecurrence(): FormRecurrence {
  return { type: 'none', interval: 1, startDate: '', endDate: '', weekdays: [] };
}

// ─── Sanitization (legacy / malformed data can never crash the app) ──────────

const RECURRENCE_TYPES = ['daily', 'weekly', 'monthly'] as const;

function toValidDateOr(value: unknown, fallback: string | null): string | null {
  return typeof value === 'string' && isValidDateString(value) ? value : fallback;
}

/**
 * Defensively normalize an unknown value into a valid TaskRecurrence, or null.
 * Handles: missing data, wrong types, invalid cadences, impossible dates
 * (e.g. 2026-02-31), empty weekday lists, and non-positive intervals.
 */
export function sanitizeRecurrence(raw: unknown): TaskRecurrence | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.type !== 'string' || !RECURRENCE_TYPES.includes(r.type as never)) {
    return null;
  }

  const startDate = toValidDateOr(r.startDate, null);
  if (!startDate) return null; // a series without a valid anchor is meaningless

  const intervalRaw = Number(r.interval);
  const interval =
    Number.isFinite(intervalRaw) && intervalRaw >= 1 ? Math.floor(intervalRaw) : 1;

  let weekdays: number[] = [];
  if (r.type === 'weekly') {
    if (Array.isArray(r.weekdays)) {
      weekdays = [
        ...new Set(
          r.weekdays
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        ),
      ];
    }
    if (weekdays.length === 0) return null; // weekly with no days cannot recur
  }

  return {
    type: r.type as TaskRecurrence['type'],
    interval,
    startDate,
    endDate: toValidDateOr(r.endDate, null),
    weekdays,
  };
}

/** True when the task carries valid recurrence metadata. */
export function isRecurringTask(task: Task): boolean {
  return sanitizeRecurrence(task.recurrence) !== null;
}

/**
 * Convert form state into a persistable TaskRecurrence (or null for 'none').
 * Weekly with zero selected days degrades to null rather than a dead series.
 */
export function buildRecurrence(form: FormRecurrence): TaskRecurrence | null {
  if (form.type === 'none') return null;

  const base: TaskRecurrence = {
    type: form.type,
    interval: form.interval >= 1 ? Math.floor(form.interval) : 1,
    startDate: isValidDateString(form.startDate)
      ? form.startDate
      : // Caller should have validated; fall back to today so a series always has an anchor.
        new Date().toISOString().slice(0, 10),
    endDate: isValidDateString(form.endDate) ? form.endDate : null,
    weekdays: [],
  };

  if (form.type === 'weekly') {
    base.weekdays = [...new Set(form.weekdays.filter((d) => d >= 0 && d <= 6))].sort();
    if (base.weekdays.length === 0) return null;
  }

  return base;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function weekdayLabel(value: number): string {
  return WEEKDAY_OPTIONS.find((w) => w.value === value)?.label ?? `Day ${value}`;
}

/** Short UI description, e.g. "Weekly · Mon, Wed" or "Every 2 weeks · ends Mar 1". */
export function describeRecurrence(rec: TaskRecurrence): string {
  const clean = sanitizeRecurrence(rec);
  if (!clean) return 'Recurring';

  const unit =
    clean.interval > 1
      ? `${clean.interval} ${clean.type === 'daily' ? 'days' : clean.type === 'weekly' ? 'weeks' : 'months'}`
      : clean.type === 'daily'
        ? 'Daily'
        : clean.type === 'weekly'
          ? 'Weekly'
          : 'Monthly';

  let text = clean.interval > 1 ? `Every ${unit}` : unit;

  if (clean.type === 'weekly') {
    const days = [...clean.weekdays]
      .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // Monday-first
      .map((d) => weekdayLabel(d).slice(0, 3))
      .join(', ');
    text += ` · ${days}`;
  }

  if (clean.endDate) text += ` · ends ${clean.endDate}`;
  return text;
}

// ─── Civil-date arithmetic (raw numbers — no timezone shifts) ─────────────────

function parseISO(iso: string): { y: number; m: number; d: number } {
  const parsed = parseCivilDate(iso);
  if (!parsed) return { y: 0, m: 0, d: 0 };
  return { y: parsed.year, m: parsed.month, d: parsed.day };
}

function addDays(iso: string, days: number): string {
  return addCivilDays(iso, days) ?? iso;
}

export const weekdayOf = canonicalWeekdayOf;

/**
 * MONTHLY CLAMP RULE (deterministic, documented):
 * When the target month has fewer days than the anchor day-of-month, the
 * occurrence is clamped to the LAST day of that month.
 *   Jan 31 → Feb 28 (or 29 in leap years) → Mar 31 → Apr 30 …
 * The clamped occurrence never "drifts": the anchor day is always re-read from
 * the series start date, so short months do not permanently shift the series.
 */
function addMonthsClamped(fromISO: string, months: number, anchorDay: number): string {
  const { y, m } = parseISO(fromISO);
  const shifted = shiftMonth(y, m, months);
  if (!shifted) return fromISO;
  const day = Math.min(anchorDay, daysInMonth(shifted.year, shifted.month));
  return formatCivilDate(shifted.year, shifted.month, day) ?? fromISO;
}

// ─── Next-occurrence calculation ──────────────────────────────────────────────

/**
 * Calculate the next occurrence date strictly after `afterDateISO` for the
 * given series. Returns null when the series has ended (or data is invalid).
 *
 * Rules:
 * - daily:   due date + `interval` days
 * - weekly:  the next selected weekday after `afterDateISO` (interval > 1
 *            advances by whole weeks from the anchor week)
 * - monthly: same day-of-month, clamped to month end (see addMonthsClamped)
 */
export function calculateNextOccurrence(
  recurrence: TaskRecurrence,
  afterDateISO: string,
): string | null {
  const rec = sanitizeRecurrence(recurrence);
  if (!rec) return null;
  if (!isValidDateString(afterDateISO)) return null;

  // Never generate past the series end date.
  if (rec.endDate && afterDateISO >= rec.endDate) return null;

  let next: string | null = null;

  switch (rec.type) {
    case 'daily':
      next = addDays(afterDateISO, rec.interval);
      break;

    case 'weekly': {
      const from = weekdayOf(afterDateISO);
      // Selected weekdays strictly after the current one, this week…
      const laterThisWeek = rec.weekdays
        .filter((d) => d > from)
        .sort((a, b) => a - b);
      if (laterThisWeek.length > 0 && rec.interval === 1) {
        next = addDays(afterDateISO, laterThisWeek[0] - from);
      } else {
        // …otherwise the first selected weekday in the next `interval`-th week,
        // measured from the series start date's week (deterministic anchor).
        const startWeekday = weekdayOf(rec.startDate);
        const daysToFirstSelected =
          rec.weekdays.length > 0
            ? Math.min(
                ...rec.weekdays.map((d) => (d - startWeekday + 7) % 7),
              )
            : 0;
        const firstAnchorOccurrence = addDays(rec.startDate, daysToFirstSelected);
        const weekShift = rec.interval * 7;
        // Advance in 7-day steps until strictly past afterDateISO.
        let candidate = firstAnchorOccurrence;
        while (candidate <= afterDateISO) {
          candidate = addDays(candidate, weekShift);
        }
        next = candidate;
      }
      break;
    }

    case 'monthly': {
      const anchorDay = parseISO(rec.startDate).d;
      next = addMonthsClamped(afterDateISO, rec.interval, anchorDay);
      if (next <= afterDateISO) {
        // Clamped landing (e.g. Jan 31 + 1mo → Feb 28) can equal/precede the
        // current date only in pathological data; step one more month.
        next = addMonthsClamped(next, rec.interval, anchorDay);
      }
      break;
    }
  }

  if (!next) return null;
  if (rec.endDate && next > rec.endDate) return null;
  return next;
}

// ─── Occurrence creation (duplicate-safe) ─────────────────────────────────────

/**
 * Build the next occurrence Task from a just-completed recurring task.
 * Pure: returns the object; the service decides whether to persist it.
 */
export function createNextOccurrence(task: Task, nextDueDate: string): Task | null {
  const rec = sanitizeRecurrence(task.recurrence);
  if (!rec) return null;

  const now = getNowISO();
  return {
    id: uid('task_'),
    title: task.title,
    description: task.description,
    completed: false, // never inherit the completed state
    priority: task.priority,
    dueDate: nextDueDate,
    dueTime: isValidTimeString(task.dueTime) ? task.dueTime : null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archived: false,
    recurrence: rec,
    seriesId: task.seriesId ?? task.id, // first occurrence seeds the series id
    // Phase 1G-A: fresh occurrences start with no subtasks — subtasks are
    // never copied or inherited, so recurrence generation is unchanged.
    subtasks: [],
    // Phase 1G-B: occurrences reference the SAME label IDs — label entities
    // are never duplicated. Renames/deletes propagate via the shared entity.
    labelIds: [...task.labelIds],
  };
}

/**
 * Duplicate guard: does `tasks` already contain ANY occurrence of the same
 * series with the given due date? Deliberately matches completed and archived
 * occurrences too — re-completing an old occurrence must never spawn a copy
 * of an occurrence that already exists. One task may seed its own series via
 * the seriesId fallback, so the resolved series id must be passed in.
 */
export function seriesHasOccurrenceOn(
  tasks: Task[],
  seriesId: string | null,
  dueDate: string,
  excludeId?: string,
): boolean {
  if (!seriesId) return false;
  return tasks.some(
    (t) => t.id !== excludeId && t.seriesId === seriesId && t.dueDate === dueDate,
  );
}

// ─── Form helpers (used by the create/edit screens) ─────────────────────────

/** Build the editor's form state from a task (invalid data → non-recurring). */
export function formRecurrenceFromTask(task: Task): FormRecurrence {
  const rec = sanitizeRecurrence(task.recurrence);
  if (!rec) return getDefaultFormRecurrence();
  return {
    type: rec.type,
    interval: rec.interval,
    startDate: rec.startDate,
    endDate: rec.endDate ?? '',
    weekdays: [...rec.weekdays],
  };
}

export interface RecurrenceFormErrors {
  startDate?: string;
  endDate?: string;
  weekdays?: string;
}

/** Validate editor state; returns an empty object when the form is valid. */
export function validateFormRecurrence(
  form: FormRecurrence,
): RecurrenceFormErrors {
  if (form.type === 'none') return {};

  const errors: RecurrenceFormErrors = {};
  if (!isValidDateString(form.startDate)) {
    errors.startDate = 'Use format YYYY-MM-DD';
  }
  if (form.endDate) {
    if (!isValidDateString(form.endDate)) {
      errors.endDate = 'Use format YYYY-MM-DD';
    } else if (
      isValidDateString(form.startDate) &&
      form.endDate < form.startDate
    ) {
      errors.endDate = 'End date must be on or after the start date';
    }
  }
  if (form.type === 'weekly' && form.weekdays.length === 0) {
    errors.weekdays = 'Select at least one day';
  }
  return errors;
}
