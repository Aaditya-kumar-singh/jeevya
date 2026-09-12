import { saveData, loadData } from '@/lib/storage';
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

// ─── Storage Key ──────────────────────────────────────────────────────────────

const TASKS_KEY = 'lifeos:tasks';

// ─── Migration / Backward Compatibility ───────────────────────────────────────

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
    // Pre-1G-A records have no `subtasks` key — normalize to an empty list.
    subtasks: sanitizeSubtasks(raw.subtasks),
    // Pre-1G-B records have no `labelIds` key — normalize to an empty list.
    labelIds: sanitizeLabelIds(raw.labelIds),
  };
}

function isValidPriority(value: unknown): value is Task['priority'] {
  return value === 'low' || value === 'medium' || value === 'high';
}

/**
 * Load all tasks from storage, normalizing any old records.
 * Never throws — returns empty array on error.
 */
async function loadNormalized(): Promise<Task[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(TASKS_KEY, []);
    return raw.map(normalizeTask).filter((t) => t.id !== '');
  } catch {
    return [];
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

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

  const tasks = await loadNormalized();
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

  await saveData(TASKS_KEY, [task, ...tasks]);
  return task;
}

/**
 * Update an existing task by ID.
 */
export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<Task | null> {
  const tasks = await loadNormalized();
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) return null;

  const task = tasks[index];
  const now = getNowISO();

  // If toggling completed, set/clear completedAt
  let completedAt = task.completedAt;
  if (input.completed !== undefined && input.completed !== task.completed) {
    completedAt = input.completed ? now : null;
  }

  const updated: Task = {
    ...task,
    ...input,
    completedAt,
    updatedAt: now,
    // Edits may add/change/remove recurrence. When turning a normal task into
    // a recurring one, seed its series id. When removing recurrence, the
    // seriesId is cleared too so stale metadata never lingers.
    recurrence: 'recurrence' in input ? sanitizeRecurrence(input.recurrence) : task.recurrence,
    seriesId: 'recurrence' in input
      ? sanitizeRecurrence(input.recurrence)
        ? (input.recurrence ? task.seriesId ?? uid('series_') : null)
        : null
      : task.seriesId,
    // Label IDs are always re-sanitized on write (dedupe + drop junk).
    labelIds: 'labelIds' in input ? sanitizeLabelIds(input.labelIds) : task.labelIds,
  };

  // Validation
  if (updated.title !== undefined && !updated.title.trim()) {
    throw new Error('Task title is required');
  }

  tasks[index] = updated;
  await saveData(TASKS_KEY, tasks);
  return updated;
}

/**
 * Delete a task by ID.
 */
export async function deleteTask(id: string): Promise<boolean> {
  const tasks = await loadNormalized();
  const filtered = tasks.filter((t) => t.id !== id);

  if (filtered.length === tasks.length) return false;

  await saveData(TASKS_KEY, filtered);
  return true;
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
    // Normal (non-recurring) task — exactly the old behavior.
    return { task: completed, nextOccurrence: null, recurrenceWarning: null };
  }

  try {
    // Uncomplete → re-complete is idempotent: the completed flag simply flips
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
      // Series ended (end date reached) — completion stands, no new occurrence.
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
    await saveData(TASKS_KEY, [withSeries, ...tasks]);
    return { task: completed, nextOccurrence: withSeries, recurrenceWarning: null };
  } catch (e) {
    // Generation failed: the completion is already persisted — surface why.
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

// ─── Subtasks (Phase 1G-A) ────────────────────────────────────────────────────
// Subtasks are owned by their parent task and persisted inline in the same
// AsyncStorage record — no new storage keys, no new architecture.

async function persistSubtaskList(
  taskId: string,
  next: ReturnType<typeof renameSubtask>,
): Promise<Task | null> {
  const tasks = await loadNormalized();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;
  const updated: Task = { ...tasks[index], subtasks: next, updatedAt: getNowISO() };
  tasks[index] = updated;
  await saveData(TASKS_KEY, tasks);
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
 * touched here — it stays fully independent. Returns the updated parent,
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
