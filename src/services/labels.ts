// ─── Label Service (Phase 1G-B) ───────────────────────────────────────────────
// Labels are shared entities stored under their own AsyncStorage key, using
// the same loadData/saveData architecture as tasks. Tasks reference labels
// by ID only — label entities are never duplicated (recurring occurrences
// reuse the same IDs; renames propagate automatically).

import { loadData, saveData } from '@/lib/storage';
import {
  buildLabel,
  cleanLabelName,
  findLabelByName,
  sanitizeLabelIds,
  sanitizeLabels,
} from '@/lib/task-labels';
import {
  type CreateLabelInput,
  type Label,
  type UpdateLabelInput,
} from '@/types/tasks';
import { getTasks, updateTask } from '@/services/tasks';

// ─── Storage Key ──────────────────────────────────────────────────────────────

const LABELS_KEY = 'jeevya:labels';

// ─── Normalization ────────────────────────────────────────────────────────────

async function loadNormalized(): Promise<Label[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(LABELS_KEY, []);
    return sanitizeLabels(raw).filter((l) => l.id !== '');
  } catch {
    return [];
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Get all labels, oldest first (creation order — stable for chip display). */
export async function getLabels(): Promise<Label[]> {
  const labels = await loadNormalized();
  return labels.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Create a label. Idempotent on normalized-name duplicates: returns the
 * existing label instead of creating a second entity. Throws on blank names.
 */
export async function createLabel(input: CreateLabelInput): Promise<Label> {
  const labels = await loadNormalized();
  const existing = findLabelByName(labels, input.name);
  if (existing) return existing;

  const built = buildLabel(input.name);
  if (!built) throw new Error('Label name is required');

  await saveData(LABELS_KEY, [...labels, built]);
  return built;
}

/**
 * Rename a label. Tasks reference IDs, so no task writes are needed.
 * Throws on blank names and on normalized-name collisions with another label.
 * Returns null when the label is missing.
 */
export async function renameLabel(
  id: string,
  input: UpdateLabelInput,
): Promise<Label | null> {
  const labels = await loadNormalized();
  const index = labels.findIndex((l) => l.id === id);
  if (index === -1) return null;

  if (input.name !== undefined) {
    const clean = cleanLabelName(input.name);
    if (!clean) throw new Error('Label name is required');
    const clash = findLabelByName(labels, clean);
    if (clash && clash.id !== id) {
      throw new Error(`A label named "${clash.name}" already exists`);
    }
    labels[index] = { ...labels[index], name: clean };
  }

  await saveData(LABELS_KEY, labels);
  return labels[index];
}

/**
 * Delete a label entity and strip its ID from every task that references it.
 * Returns false when the label is missing.
 */
export async function deleteLabel(id: string): Promise<boolean> {
  const labels = await loadNormalized();
  if (!labels.some((l) => l.id === id)) return false;

  await saveData(
    LABELS_KEY,
    labels.filter((l) => l.id !== id),
  );

  // Strip the deleted ID from all tasks (via the public task API so updatedAt
  // handling and normalization stay in one place).
  const tasks = await getTasks();
  for (const task of tasks) {
    if (task.labelIds.includes(id)) {
      await updateTask(task.id, {
        labelIds: task.labelIds.filter((lid) => lid !== id),
      });
    }
  }
  return true;
}

// ─── Task ↔ Label Assignment ──────────────────────────────────────────────────

/**
 * Attach a label to a task (idempotent). Throws when the task or label is missing.
 */
export async function addLabelToTask(taskId: string, labelId: string) {
  const labels = await loadNormalized();
  if (!labels.some((l) => l.id === labelId)) throw new Error('Label not found');

  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');
  if (task.labelIds.includes(labelId)) return task;

  const updated = await updateTask(taskId, {
    labelIds: sanitizeLabelIds([...task.labelIds, labelId]),
  });
  if (!updated) throw new Error('Task not found');
  return updated;
}

/**
 * Detach a label from a task (idempotent). Throws when the task is missing.
 */
export async function removeLabelFromTask(taskId: string, labelId: string) {
  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');
  if (!task.labelIds.includes(labelId)) return task;

  const updated = await updateTask(taskId, {
    labelIds: task.labelIds.filter((lid) => lid !== labelId),
  });
  if (!updated) throw new Error('Task not found');
  return updated;
}

/** Replace a task's full label set (used by multi-select editors). */
export async function setTaskLabels(taskId: string, labelIds: string[]) {
  const updated = await updateTask(taskId, { labelIds: sanitizeLabelIds(labelIds) });
  if (!updated) throw new Error('Task not found');
  return updated;
}
