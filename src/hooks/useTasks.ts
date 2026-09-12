import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreateLabelInput,
  CreateSubtaskInput,
  Label,
  Subtask,
  Task,
  CreateTaskInput,
  UpdateLabelInput,
  UpdateSubtaskInput,
  UpdateTaskInput,
} from '@/types/tasks';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  archiveTask,
  restoreTask,
  addSubtask as addSubtaskService,
  updateSubtask as updateSubtaskService,
  deleteSubtask as deleteSubtaskService,
} from '@/services/tasks';
import {
  getLabels,
  createLabel as createLabelService,
  renameLabel as renameLabelService,
  deleteLabel as deleteLabelService,
  addLabelToTask as addLabelToTaskService,
  removeLabelFromTask as removeLabelFromTaskService,
  setTaskLabels as setTaskLabelsService,
} from '@/services/labels';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadTasks = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const [tasksData, labelsData] = await Promise.all([getTasks(), getLabels()]);

      if (requestId !== requestIdRef.current) return;

      setTasks(tasksData);
      setLabels(labelsData);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadTasks();
  }, [loadTasks]);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    await loadTasks();
    busyRef.current = false;
  }, [loadTasks]);

  const addTask = useCallback(async (input: CreateTaskInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const newTask = await createTask(input);
      if (requestId !== requestIdRef.current) return;
      setTasks((prev) => [newTask, ...prev]);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const editTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateTask(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Task not found');
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeTask = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteTask(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  /**
   * Complete a task. For recurring tasks the service generates the next
   * occurrence (duplicate-safe); it is inserted into local state here.
   * Never throws on occurrence-generation failure — the completion stands
   * and the reason is surfaced via the returned `warning` string.
   */
  const complete = useCallback(
    async (id: string): Promise<{ warning: string | null }> => {
      const requestId = ++requestIdRef.current;
      try {
        const { task: updated, nextOccurrence, recurrenceWarning } = await completeTask(id);
        if (requestId !== requestIdRef.current) return { warning: recurrenceWarning };
        if (!updated) throw new Error('Task not found');
        setTasks((prev) => {
          let next = prev.map((t) => (t.id === id ? updated : t));
          if (
            nextOccurrence &&
            !next.some((t) => t.id === nextOccurrence.id)
          ) {
            next = [nextOccurrence, ...next];
          }
          return next;
        });
        return { warning: recurrenceWarning };
      } catch (e) {
        if (requestId !== requestIdRef.current) return { warning: null };
        throw e;
      }
    },
    [],
  );

  const uncomplete = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await uncompleteTask(id);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Task not found');
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const archive = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await archiveTask(id);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Task not found');
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const restore = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await restoreTask(id);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Task not found');
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  // ─── Subtasks (Phase 1G-A) ────────────────────────────────────────────────

  const applyParentUpdate = useCallback(
    (requestId: number, updated: Task | null, subtaskId?: string) => {
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error(subtaskId ? 'Subtask not found' : 'Task not found');
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    },
    [],
  );

  const addSubtask = useCallback(
    async (taskId: string, input: CreateSubtaskInput): Promise<Subtask> => {
      const requestId = ++requestIdRef.current;
      const created = await addSubtaskService(taskId, input);
      if (!created) throw new Error('Task not found');
      // Skip the local patch only when a newer request already superseded us.
      if (requestId === requestIdRef.current) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, subtasks: [...t.subtasks, created] } : t,
          ),
        );
      }
      return created;
    },
    [],
  );

  const editSubtask = useCallback(
    async (taskId: string, subtaskId: string, input: UpdateSubtaskInput) => {
      const requestId = ++requestIdRef.current;
      try {
        const updated = await updateSubtaskService(taskId, subtaskId, input);
        applyParentUpdate(requestId, updated, subtaskId);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [applyParentUpdate],
  );

  const toggleSubtask = useCallback(
    async (taskId: string, subtaskId: string, completed: boolean) => {
      const requestId = ++requestIdRef.current;
      try {
        const updated = await updateSubtaskService(taskId, subtaskId, { completed });
        applyParentUpdate(requestId, updated, subtaskId);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [applyParentUpdate],
  );

  const removeSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      const requestId = ++requestIdRef.current;
      try {
        const updated = await deleteSubtaskService(taskId, subtaskId);
        applyParentUpdate(requestId, updated, subtaskId);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [applyParentUpdate],
  );

  // ─── Labels (Phase 1G-B) ──────────────────────────────────────────────────

  const createLabel = useCallback(
    async (input: CreateLabelInput): Promise<Label> => {
      const requestId = ++requestIdRef.current;
      const created = await createLabelService(input);
      if (requestId === requestIdRef.current) {
        // Idempotent service may return an existing label — upsert locally.
        setLabels((prev) =>
          prev.some((l) => l.id === created.id)
            ? prev.map((l) => (l.id === created.id ? created : l))
            : [...prev, created],
        );
      }
      return created;
    },
    [],
  );

  const renameLabel = useCallback(async (id: string, input: UpdateLabelInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await renameLabelService(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Label not found');
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const deleteLabel = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const ok = await deleteLabelService(id);
      if (requestId !== requestIdRef.current) return;
      if (!ok) throw new Error('Label not found');
      // Entity gone + service stripped the ID from every task — mirror both.
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setTasks((prev) =>
        prev.map((t) =>
          t.labelIds.includes(id)
            ? { ...t, labelIds: t.labelIds.filter((lid) => lid !== id) }
            : t,
        ),
      );
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const applyTaskLabels = useCallback((requestId: number, updated: Task | null) => {
    if (requestId !== requestIdRef.current) return;
    if (!updated) throw new Error('Task not found');
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const addLabelToTask = useCallback(
    async (taskId: string, labelId: string) => {
      const requestId = ++requestIdRef.current;
      try {
        const updated = await addLabelToTaskService(taskId, labelId);
        applyTaskLabels(requestId, updated);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [applyTaskLabels],
  );

  const removeLabelFromTask = useCallback(
    async (taskId: string, labelId: string) => {
      const requestId = ++requestIdRef.current;
      try {
        const updated = await removeLabelFromTaskService(taskId, labelId);
        applyTaskLabels(requestId, updated);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [applyTaskLabels],
  );

  const setTaskLabels = useCallback(
    async (taskId: string, labelIds: string[]) => {
      const requestId = ++requestIdRef.current;
      try {
        const updated = await setTaskLabelsService(taskId, labelIds);
        applyTaskLabels(requestId, updated);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        throw e;
      }
    },
    [applyTaskLabels],
  );

  return {
    tasks,
    labels,
    loading,
    refreshing,
    error,
    refresh,
    addTask,
    editTask,
    removeTask,
    complete,
    uncomplete,
    archive,
    restore,
    addSubtask,
    editSubtask,
    toggleSubtask,
    removeSubtask,
    createLabel,
    renameLabel,
    deleteLabel,
    addLabelToTask,
    removeLabelFromTask,
    setTaskLabels,
  };
}
