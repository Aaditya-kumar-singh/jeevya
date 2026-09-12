// ─── Subtask Helpers (Phase 1G-A) ─────────────────────────────────────────────
// Pure functions — no storage access, no JSX. The parent task owns its
// subtasks; all ops return new arrays (never mutate).

import { uid } from '@/lib/uid';
import { getNowISO, type Subtask } from '@/types/tasks';

// ─── Sanitization (legacy / malformed data can never crash the app) ──────────

/**
 * Defensively normalize an unknown value into a valid Subtask, or null.
 * Handles: missing data, wrong types, blank titles.
 */
export function sanitizeSubtask(raw: unknown): Subtask | null {
  if (raw == null || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== 'string' || s.id === '') return null;
  if (typeof s.title !== 'string' || s.title.trim() === '') return null;
  return {
    id: s.id,
    title: s.title,
    completed: Boolean(s.completed),
    createdAt: typeof s.createdAt === 'string' ? s.createdAt : getNowISO(),
    completedAt: typeof s.completedAt === 'string' ? s.completedAt : null,
  };
}

/**
 * Normalize an unknown value into a Subtask array. Non-array input and
 * invalid entries become `[]` / are dropped — pre-1G-A tasks (no `subtasks`
 * key at all) normalize to `[]`.
 */
export function sanitizeSubtasks(raw: unknown): Subtask[] {
  if (!Array.isArray(raw)) return [];
  const out: Subtask[] = [];
  for (const entry of raw) {
    const clean = sanitizeSubtask(entry);
    if (clean) out.push(clean);
  }
  return out;
}

// ─── Construction ─────────────────────────────────────────────────────────────

/** Build a new (incomplete) subtask. Returns null when the title is blank. */
export function buildSubtask(title: string): Subtask | null {
  if (!title.trim()) return null;
  const now = getNowISO();
  return {
    id: uid('subtask_'),
    title: title.trim(),
    completed: false,
    createdAt: now,
    completedAt: null,
  };
}

// ─── Mutations (all return new arrays) ────────────────────────────────────────

/** Flip a subtask's completed flag (sets/clears completedAt). No-op when id missing. */
export function toggleSubtask(subtasks: Subtask[], id: string, now: string = getNowISO()): Subtask[] {
  return subtasks.map((s) =>
    s.id === id
      ? { ...s, completed: !s.completed, completedAt: !s.completed ? now : null }
      : s,
  );
}

/** Rename a subtask. Blank titles are ignored (original kept). */
export function renameSubtask(subtasks: Subtask[], id: string, title: string): Subtask[] {
  if (!title.trim()) return subtasks;
  return subtasks.map((s) => (s.id === id ? { ...s, title: title.trim() } : s));
}

/** Remove a subtask by id. */
export function removeSubtask(subtasks: Subtask[], id: string): Subtask[] {
  return subtasks.filter((s) => s.id !== id);
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export interface SubtaskProgress {
  total: number;
  done: number;
}

/** Count totals for "2/5 completed" style display. */
export function getSubtaskProgress(subtasks: Subtask[]): SubtaskProgress {
  const done = subtasks.reduce((n, s) => (s.completed ? n + 1 : n), 0);
  return { total: subtasks.length, done };
}
