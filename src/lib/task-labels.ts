// ─── Label Helpers (Phase 1G-B) ───────────────────────────────────────────────
// Pure functions — no storage access, no JSX.

import { uid } from '@/lib/uid';
import { getNowISO, type Label, type Task } from '@/types/tasks';

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Canonical form for duplicate detection: trimmed, single-spaced, lowercase.
 * "  Work  " and "work" are the same label.
 */
export function normalizeLabelName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Display form: trimmed with single spaces, original casing preserved. */
export function cleanLabelName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// ─── Sanitization (legacy / malformed data can never crash the app) ──────────

/** Defensively normalize an unknown value into a valid Label, or null. */
export function sanitizeLabel(raw: unknown): Label | null {
  if (raw == null || typeof raw !== 'object') return null;
  const l = raw as Record<string, unknown>;
  if (typeof l.id !== 'string' || l.id === '') return null;
  if (typeof l.name !== 'string' || cleanLabelName(l.name) === '') return null;
  return {
    id: l.id,
    name: cleanLabelName(l.name),
    createdAt: typeof l.createdAt === 'string' ? l.createdAt : getNowISO(),
  };
}

/** Normalize an unknown value into a Label array (non-arrays → []). */
export function sanitizeLabels(raw: unknown): Label[] {
  if (!Array.isArray(raw)) return [];
  const out: Label[] = [];
  for (const entry of raw) {
    const clean = sanitizeLabel(entry);
    if (clean) out.push(clean);
  }
  return out;
}

/**
 * Normalize a task's label-ID list: non-empty strings only, deduped,
 * order-preserving. Non-arrays (pre-1G-B records) → [].
 */
export function sanitizeLabelIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry === 'string' && entry !== '' && !seen.has(entry)) {
      seen.add(entry);
    }
  }
  return [...seen];
}

// ─── Construction ─────────────────────────────────────────────────────────────

/** Build a new label. Returns null when the name is blank. */
export function buildLabel(name: string): Label | null {
  const clean = cleanLabelName(name);
  if (!clean) return null;
  return { id: uid('label_'), name: clean, createdAt: getNowISO() };
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

/** Find a label by normalized name (duplicate prevention). */
export function findLabelByName(labels: Label[], name: string): Label | undefined {
  const needle = normalizeLabelName(name);
  if (!needle) return undefined;
  return labels.find((l) => normalizeLabelName(l.name) === needle);
}

/** id → Label map for O(1) display lookups. */
export function labelsById(labels: Label[]): Map<string, Label> {
  return new Map(labels.map((l) => [l.id, l]));
}

/** Resolve a task's labels in a stable order (label creation order). */
export function getTaskLabels(task: Task, labels: Label[]): Label[] {
  const ids = new Set(task.labelIds ?? []);
  return labels.filter((l) => ids.has(l.id));
}

/** True when the task carries at least one of the given label IDs. */
export function matchesLabels(task: Task, labelIds: string[]): boolean {
  if (labelIds.length === 0) return true;
  const ids = new Set(task.labelIds ?? []);
  return labelIds.some((id) => ids.has(id));
}
