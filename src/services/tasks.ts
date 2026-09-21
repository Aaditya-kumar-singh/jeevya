import { saveData, loadData } from '@/lib/storage';
import { updateStorage } from '@/services/storageReliability';
import { taskRepository } from '@/services/repositories/tasks';
import { uid } from '@/lib/uid';
import {
  getNowISO,
  type CreateSubtaskInput,
  type Task,
  type CreateTaskInput,
  type UpdateSubtaskInput,
  type UpdateTaskInput,
} from '@/types/tasks';
import {
  calculateNextOccurrence,
  createNextOccurrence,
  sanitizeRecurrence,
  seriesHasOccurrenceOn,
} from '@/lib/task-recurrence';
import {
  buildSubtask,
  removeSubtask,
  renameSubtask,
  sanitizeSubtasks,
  toggleSubtask,
} from '@/lib/task-subtasks';
import { sanitizeLabelIds } from '@/lib/task-labels';
import { isValidDateString } from '@/lib/task-filters';
import { getTodayISO } from '@/types/tasks';

// â”€â”€â”€ Storage Key â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const TASKS_KEY = 'jeevya:tasks';
const LEGACY_TASKS_KEY = '@jeevya/tasks/v1';
const TASKS_MIGRATION_KEY = 'jeevya:tasks:migration:v1';
let migrationPromise: Promise<void> | null = null;

// â”€â”€â”€ Migration / Backward Compatibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Normalize a raw record into a fully-typed Task.
 * Handles old records that may be missing new fields by providing sensible defaults.
 */
function normalizeTask(raw: Record<string, unknown>): Task {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    completed: Boolean(raw.completed),
    priority: isValidPriority(raw.priority) ? raw.priority : 'medium',
    dueDate: raw.dueDate != null ? String(raw.dueDate) : null,
    dueTime: raw.dueTime != null ? String(raw.dueTime) : null,
    createdAt: String(raw.createdAt ?? getNowISO()),
    updatedAt: String(raw.updatedAt ?? getNowISO()),
    completedAt: raw.completedAt != null ? String(raw.completedAt) : null,
    archived: Boolean(raw.archived),
    // Pre-1E records (and malformed recurrence blobs) become non-recurring.
    recurrence: sanitizeRecurrence(raw.recurrence),
    seriesId: raw.seriesId != null && raw.seriesId !== '' ? String(raw.seriesId) : null,
    // Pre-1G-A records have no `subtasks` key â€” normalize to an empty list.
    subtasks: sanitizeSubtasks(raw.subtasks),
    // Pre-1G-B records have no `labelIds` key â€” normalize to an empty list.
    labelIds: sanitizeLabelIds(raw.labelIds),
  };
}

function isValidPriority(value: unknown): value is Task['priority'] {
  return value === 'low' || value === 'medium' || value === 'high';
}

/**
 * Migrate the old task store into the canonical task store.
 * Canonical records win on duplicate IDs. Legacy storage is left untouched so
 * a migration failure can never silently destroy the user's old data.
 * The migration marker is written only after the canonical write succeeds.
 */
export async function migrateLegacyTasks(): Promise<void> {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      const marker = await loadData<{ version?: number } | null>(TASKS_MIGRATION_KEY, null);
      if (marker?.version === 1) return;

      const legacyRaw = await loadData<unknown>(LEGACY_TASKS_KEY, null);
      if (!Array.isArray(legacyRaw)) {
        await saveData(TASKS_MIGRATION_KEY, { version: 1 });
        return;
      }

      const canonicalRaw: unknown = await taskRepository.get([]);
      const canonical = Array.isArray(canonicalRaw)
        ? canonicalRaw
            .filter((raw): raw is Record<string, unknown> => !!raw && typeof raw === 'object')
            .map(normalizeTask)
            .filter((task) => task.id !== '')
        : [];

      const canonicalIds = new Set(canonical.map((task) => task.id));
      const legacyById = new Map<string, Task>();
      for (const raw of legacyRaw) {
        if (!raw || typeof raw !== 'object') continue;
        const task = normalizeTask(raw as Record<string, unknown>);
        if (task.id !== '' && !canonicalIds.has(task.id) && !legacyById.has(task.id)) {
          legacyById.set(task.id, task);
        }
      }
      const imported = [...legacyById.values()];
      if (imported.length > 0) {
        await taskRepository.set([...imported, ...canonical]);
      }

      await saveData(TASKS_MIGRATION_KEY, { version: 1 });
    } catch {
      // Leave the marker unset so a later load can safely retry.
    }
  })();

  try {
    await migrationPromise;
  } finally {
    migrationPromise = null;
  }
}

/**
 * Load all tasks from the canonical store, normalizing any old records.
 * Legacy migration runs once before the canonical read.
 * Never throws â€” returns empty array on error.
 */
async function loadNormalized(): Promise<Task[]> {
  try {
    await migrateLegacyTasks();
    const raw = await taskRepository.get([]);
    return raw
      .filter((item): item is Task => !!item && typeof item === 'object')
      .map((item) => normalizeTask(item as unknown as Record<string, unknown>))
      .filter((t) => t.id !== '');
  } catch {
    return [];
  }
}

// â”€â”€â”€ CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Get all tasks, newest first.
 */
export async function getTasks(): Promise<Task[]> {
  const tasks = await loadNormalized();
  return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Get a single task by ID.
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const tasks = await loadNormalized();
  return tasks.find((t) => t.id === id) ?? null;
}

/**
 * Get tasks filtered by active/archived status.
 */
export async function getActiveTasks(): Promise<Task[]> {
  const tasks = await loadNormalized();
  return tasks
    .filter((t) => !t.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getArchivedTasks(): Promise<Task[]> {
  const tasks = await loadNormalized();
  return tasks
    .filter((t) => t.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Create a new task.
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  if (!input.title.trim()) {
    throw new Error('Task title is required');
  }

  const now = getNowISO();

  const task: Task = {
    id: uid('task_'),
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    completed: false,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ?? null,
    dueTime: input.dueTime ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archived: false,
    // A recurring series always starts life as its own series; the first
    // occurrence seeds the series id (resolved lazily at completion time).
    recurrence: sanitizeRecurrence(input.recurrence),
    seriesId: input.recurrence ? uid('series_') : null,
    subtasks: [],
    labelIds: sanitizeLabelIds(input.labelIds),
  };

  await updateStorage<Task[]>(TASKS_KEY, [], (current) => {
    const tasks = current
      .filter((item): item is Task => !!item && typeof item === 'object')
      .map((item) => normalizeTask(item as unknown as Record<string, unknown>))
      .filter((t) => t.id !== '');
    return [task, ...tasks];
  });
  return task;
}

/**
 * Update an existing task by ID.
 */
export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task | null> {
  let updatedResult: Task | null = null;
  await updateStorage<Task[]>(TASKS_KEY, [], (current) => {
    const tasks = current
      .filter((item): item is Task => !!item && typeof item === 'object')
      .map((item) => normalizeTask(item as unknown as Record<string, unknown>))
      .filter((t) => t.id !== '');
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return tasks;

    const task = tasks[index];
    const now = getNowISO();
    let completedAt = task.completedAt;
    if (input.completed !== undefined && input.completed !== task.completed) {
      completedAt = input.completed ? now : null;
    }

    const updated: Task = {
      ...task,
      ...input,
      completedAt,
      updatedAt: now,
      recurrence: 'recurrence' in input ? sanitizeRecurrence(input.recurrence) : task.recurrence,
      seriesId: 'recurrence' in input
        ? sanitizeRecurrence(input.recurrence)
          ? (input.recurrence ? task.seriesId ?? uid('series_') : null)
          : null
        : task.seriesId,
      labelIds: 'labelIds' in input ? sanitizeLabelIds(input.labelIds) : task.labelIds,
    };

    if (!updated.title.trim()) throw new Error('Task title is required');
    tasks[index] = updated;
    updatedResult = updated;
    return tasks;
  });
  return updatedResult;
}

/**
 * Delete a task by ID.
 */
export async function deleteTask(id: string): Promise<boolean> {
  let deleted = false;
  await updateStorage<Task[]>(TASKS_KEY, [], (current) => {
    const tasks = current
      .filter((item): item is Task => !!item && typeof item === 'object')
      .map((item) => normalizeTask(item as unknown as Record<string, unknown>))
      .filter((t) => t.id !== '');
    const filtered = tasks.filter((t) => t.id !== id);
    deleted = filtered.length !== tasks.length;
    return filtered;
  });
  return deleted;
}

/**
 * Mark a task as completed. For recurring tasks, this also generates exactly
 * one next occurrence (duplicate-safe). The completed state is persisted FIRST,
 * so a failed generation never leaves the user's completion lost.
 *
 * Returns the completed task, plus the created occurrence (if any) and a
 * `recurrenceWarning` when generation could not proceed.
 */
export async function completeTask(
  id: string,
): Promise<{
  task: Task | null;
  nextOccurrence: Task | null;
  recurrenceWarning: string | null;
}> {
  const completed = await updateTask(id, { completed: true });
  if (!completed) return { task: null, nextOccurrence: null, recurrenceWarning: null };

  const rec = sanitizeRecurrence(completed.recurrence);
  if (!rec) {
    // Normal (non-recurring) task â€” exactly the old behavior.
    return { task: completed, nextOccurrence: null, recurrenceWarning: null };
  }

  try {
    // Uncomplete â†’ re-complete is idempotent: the completed flag simply flips
    // back on, and the duplicate guard below prevents a second occurrence.
    const tasks = await loadNormalized();

    // From-date: the series must advance from the occurrence just completed.
    // Without a due date, advance from the LATER of today / series start, so
    // completing a not-yet-started series early anchors from its start date,
    // and completing late anchors from today (never generating in the past).
    const from =
      completed.dueDate && isValidDateString(completed.dueDate)
        ? completed.dueDate
        : getTodayISO() > rec.startDate
          ? getTodayISO()
          : rec.startDate;

    const nextDue = calculateNextOccurrence(rec, from);
    if (!nextDue) {
      // Series ended (end date reached) â€” completion stands, no new occurrence.
      return { task: completed, nextOccurrence: null, recurrenceWarning: null };
    }

    const seriesId = completed.seriesId ?? completed.id;

    // DUPLICATE SAFETY: check storage (not just local state) so two rapid
    // completions or a stale UI can never double-create the same occurrence.
    if (seriesHasOccurrenceOn(tasks, seriesId, nextDue, completed.id)) {
      return { task: completed, nextOccurrence: null, recurrenceWarning: null };
    }

    const next = createNextOccurrence(completed, nextDue);
    if (!next) {
      return {
        task: completed,
        nextOccurrence: null,
        recurrenceWarning: null,
      };
    }

    const withSeries: Task = { ...next, seriesId };
    await taskRepository.set([withSeries, ...tasks]);
    return { task: completed, nextOccurrence: withSeries, recurrenceWarning: null };
  } catch (e) {
    // Generation failed: the completion is already persisted â€” surface why.
    return {
      task: completed,
      nextOccurrence: null,
      recurrenceWarning:
        e instanceof Error ? e.message : 'Task completed, but the next occurrence could not be created',
    };
  }
}

/**
 * Mark a task as not completed.
 */
export async function uncompleteTask(id: string): Promise<Task | null> {
  return updateTask(id, { completed: false });
}

/**
 * Archive a task (soft-delete, hidden from active views).
 */
export async function archiveTask(id: string): Promise<Task | null> {
  return updateTask(id, { archived: true });
}

/**
 * Restore an archived task back to active.
 */
export async function restoreTask(id: string): Promise<Task | null> {
  return updateTask(id, { archived: false });
}

// â”€â”€â”€ Subtasks (Phase 1G-A) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Subtasks are owned by their parent task and persisted inline in the same
// AsyncStorage record â€” no new storage keys, no new architecture.

async function persistSubtaskList(
  taskId: string,
  next: ReturnType<typeof renameSubtask>,
): Promise<Task | null> {
  const tasks = await loadNormalized();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;
  const updated: Task = { ...tasks[index], subtasks: next, updatedAt: getNowISO() };
  tasks[index] = updated;
  await taskRepository.set(tasks);
  return updated;
}

/**
 * Add a subtask to a parent task. Returns the created subtask, or null when
 * the parent is missing. Throws on blank titles.
 */
export async function addSubtask(
  taskId: string,
  input: CreateSubtaskInput,
): Promise<import('@/types/tasks').Subtask | null> {
  const built = buildSubtask(input.title);
  if (!built) throw new Error('Subtask title is required');

  const tasks = await loadNormalized();
  const parent = tasks.find((t) => t.id === taskId);
  if (!parent) return null;

  const updated = await persistSubtaskList(taskId, [...parent.subtasks, built]);
  return updated ? built : null;
}

/**
 * Rename and/or complete/uncomplete a subtask. Parent completion is never
 * touched here â€” it stays fully independent. Returns the updated parent,
 * or null when parent/subtask is missing. Throws on blank titles.
 */
export async function updateSubtask(
  taskId: string,
  subtaskId: string,
  input: UpdateSubtaskInput,
): Promise<Task | null> {
  const tasks = await loadNormalized();
  const parent = tasks.find((t) => t.id === taskId);
  if (!parent) return null;
  const current = parent.subtasks.find((s) => s.id === subtaskId);
  if (!current) return null;

  if (input.title !== undefined && !input.title.trim()) {
    throw new Error('Subtask title is required');
  }

  let next = parent.subtasks;
  if (input.title !== undefined) {
    next = renameSubtask(next, subtaskId, input.title);
  }
  if (input.completed !== undefined && input.completed !== current.completed) {
    next = toggleSubtask(next, subtaskId);
  }
  return persistSubtaskList(taskId, next);
}

/**
 * Delete a subtask from its parent. Returns the updated parent,
 * or null when parent/subtask is missing.
 */
export async function deleteSubtask(
  taskId: string,
  subtaskId: string,
): Promise<Task | null> {
  const tasks = await loadNormalized();
  const parent = tasks.find((t) => t.id === taskId);
  if (!parent) return null;
  if (!parent.subtasks.some((s) => s.id === subtaskId)) return null;
  return persistSubtaskList(taskId, removeSubtask(parent.subtasks, subtaskId));
}




