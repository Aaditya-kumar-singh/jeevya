import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Circle,
  Pencil,
  Plus,
  Repeat,
  Save,
  Tag,
  Trash2,
  X,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { RecurrenceEditor } from '@/components/tasks/RecurrenceEditor';
import { LabelManager, LabelSelector } from '@/components/tasks/LabelSelector';
import { useTasks } from '@/hooks/useTasks';
import {
  formatDueTime,
  getTaskDueStatus,
  getDueDate,
} from '@/lib/task-filters';
import {
  buildRecurrence,
  describeRecurrence,
  formRecurrenceFromTask,
  getDefaultFormRecurrence,
  sanitizeRecurrence,
  validateFormRecurrence,
  type FormRecurrence,
} from '@/lib/task-recurrence';
import { getTodayISO, PRIORITY_LABELS, type Subtask, type TaskPriority } from '@/types/tasks';
import { getSubtaskProgress } from '@/lib/task-subtasks';

// ─── Priority Options ─────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateDate(value: string): boolean {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateTime(value: string): boolean {
  if (!value) return true;
  return /^\d{2}:\d{2}$/.test(value);
}

// ─── Not Found State ──────────────────────────────────────────────────────────

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Text size="3xl">🔍</Text>
      <Heading size="md" className="mt-3 text-center">
        Task not found
      </Heading>
      <Text size="sm" className="mt-1 text-center text-muted-foreground">
        This task may have been deleted.
      </Text>
      <Button variant="outline" className="mt-4" onPress={onBack}>
        <ButtonText>Go Back</ButtonText>
      </Button>
    </View>
  );
}

// ─── Subtasks Card (Phase 1G-A) ───────────────────────────────────────────────

function SubtasksCard({
  taskId,
  subtasks,
  onAdd,
  onToggle,
  onRename,
  onDelete,
}: {
  taskId: string;
  subtasks: Subtask[];
  onAdd: (taskId: string, title: string) => Promise<unknown>;
  onToggle: (taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
  onRename: (taskId: string, subtaskId: string, title: string) => Promise<void>;
  onDelete: (taskId: string, subtaskId: string) => Promise<void>;
}) {
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const { total, done } = getSubtaskProgress(subtasks);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const run = async (fn: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update subtask');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () =>
    run(async () => {
      await onAdd(taskId, newTitle.trim());
      setNewTitle('');
    });

  const startEditing = (sub: Subtask) => {
    setEditingId(sub.id);
    setEditingTitle(sub.title);
  };

  const handleRename = () =>
    run(async () => {
      if (!editingId) return;
      await onRename(taskId, editingId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle('');
    });

  const handleDelete = (sub: Subtask) => {
    Alert.alert(
      'Delete Subtask',
      `Remove "${sub.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void run(() => onDelete(taskId, sub.id)),
        },
      ],
    );
  };

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between">
        <Text size="sm" className="font-medium">
          Subtasks
        </Text>
        <Text size="xs" className="text-muted-foreground">
          {total === 0 ? 'None yet' : `${done}/${total} completed`}
        </Text>
      </View>

      {total > 0 && (
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <View
            className="h-full rounded-full bg-green-500"
            style={{ width: `${pct}%` }}
          />
        </View>
      )}

      <View className="mt-3 gap-2">
        {subtasks.map((sub) => (
          <View
            key={sub.id}
            className="min-h-[56px] flex-row items-center gap-2 rounded-xl bg-muted px-3 py-2"
          >
            <Pressable
              onPress={() => void run(() => onToggle(taskId, sub.id, !sub.completed))}
              hitSlop={8}
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sub.completed }}
              accessibilityLabel={`Subtask: ${sub.title}`}
            >
              {sub.completed ? (
                <CheckCircle size={22} className="text-green-500" />
              ) : (
                <Circle size={22} className="text-muted-foreground" />
              )}
            </Pressable>

            {editingId === sub.id ? (
              <View className="flex-1 flex-row items-center gap-1">
                <View className="flex-1">
                  <Input className="bg-card">
                    <InputField
                      value={editingTitle}
                      onChangeText={setEditingTitle}
                      onSubmitEditing={() => void handleRename()}
                      returnKeyType="done"
                      autoFocus
                      maxLength={200}
                      accessibilityLabel="Edit subtask title"
                    />
                  </Input>
                </View>
                <Pressable
                  onPress={() => void handleRename()}
                  disabled={saving || editingTitle.trim().length === 0}
                  className="min-h-[44px] min-w-[44px] items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={`Save subtask ${sub.title}`}
                >
                  <Check size={18} className="text-green-500" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditingId(null);
                    setEditingTitle('');
                  }}
                  className="min-h-[44px] min-w-[44px] items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Cancel editing subtask"
                >
                  <X size={18} className="text-muted-foreground" />
                </Pressable>
              </View>
            ) : (
              <>
                <Text
                  size="sm"
                  className={`flex-1 ${sub.completed ? 'text-muted-foreground line-through' : ''}`}
                >
                  {sub.title}
                </Text>
                <Pressable
                  onPress={() => startEditing(sub)}
                  className="min-h-[44px] min-w-[44px] items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={`Edit subtask ${sub.title}`}
                >
                  <Pencil size={16} className="text-muted-foreground" />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(sub)}
                  className="min-h-[44px] min-w-[44px] items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={`Delete subtask ${sub.title}`}
                >
                  <Trash2 size={16} className="text-destructive" />
                </Pressable>
              </>
            )}
          </View>
        ))}

        {total === 0 && (
          <Text size="sm" className="text-muted-foreground">
            No subtasks yet. Break this task into smaller steps.
          </Text>
        )}
      </View>

      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <Input className="bg-card">
            <InputField
              placeholder="Add a subtask..."
              value={newTitle}
              onChangeText={setNewTitle}
              onSubmitEditing={() => void handleAdd()}
              returnKeyType="done"
              maxLength={200}
              accessibilityLabel="New subtask title"
            />
          </Input>
        </View>
        <Button
          variant="default"
          onPress={() => void handleAdd()}
          disabled={saving || newTitle.trim().length === 0}
        >
          <Plus size={16} className="text-primary-foreground" />
          <ButtonText>Add</ButtonText>
        </Button>
      </View>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    tasks,
    labels,
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
  } = useTasks();

  const task = tasks.find((t) => t.id === id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<FormRecurrence>(getDefaultFormRecurrence);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    dueDate?: string;
    dueTime?: string;
    recurrenceStart?: string;
    recurrenceEnd?: string;
    recurrenceWeekdays?: string;
  }>({});

  // Load task data into form (including existing recurrence settings)
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setDueDate(task.dueDate ?? '');
      setDueTime(task.dueTime ?? '');
      setLabelIds(task.labelIds ?? []);
      setRecurrence(formRecurrenceFromTask(task));
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title is too long (max 200 characters)';
    }

    if (dueDate && !validateDate(dueDate)) {
      newErrors.dueDate = 'Use format YYYY-MM-DD';
    }

    if (dueTime && !validateTime(dueTime)) {
      newErrors.dueTime = 'Use format HH:MM (24-hour)';
    }

    const recErrors = validateFormRecurrence(recurrence);
    if (recErrors.startDate) newErrors.recurrenceStart = recErrors.startDate;
    if (recErrors.endDate) newErrors.recurrenceEnd = recErrors.endDate;
    if (recErrors.weekdays) newErrors.recurrenceWeekdays = recErrors.weekdays;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, dueDate, dueTime, recurrence]);

  // Save edits
  const handleSave = useCallback(async () => {
    if (!task || !validate()) return;

    setSaving(true);
    try {
      await editTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate.trim() || null,
        dueTime: dueTime.trim() || null,
        // Editing recurrence affects THIS occurrence only — completed past
        // occurrences keep their own stored metadata (never rewritten here).
        recurrence: buildRecurrence(recurrence),
        labelIds,
      });
      router.back();
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to save task',
      );
    } finally {
      setSaving(false);
    }
  }, [task, title, description, priority, dueDate, dueTime, labelIds, recurrence, validate, editTask, router]);

  // Toggle completion
  const handleToggleComplete = useCallback(async () => {
    if (!task) return;
    try {
      if (task.completed) {
        await uncomplete(task.id);
      } else {
        await complete(task.id);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update task');
    }
  }, [task, complete, uncomplete]);

  // Archive / Restore
  const handleArchive = useCallback(async () => {
    if (!task) return;
    try {
      if (task.archived) {
        await restore(task.id);
      } else {
        await archive(task.id);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update task');
    }
  }, [task, archive, restore]);

  // Delete with confirmation
  const handleDelete = useCallback(() => {
    if (!task) return;
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTask(task.id);
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ],
    );
  }, [task, removeTask, router]);

  // Not found
  if (!task) {
    return <NotFoundState onBack={() => router.back()} />;
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-5 pt-14">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Tasks
            </Text>
            <Heading size="xl" className="mt-1">
              Edit Task
            </Heading>
          </View>
        </View>

        <View className="gap-4 px-5 pt-6">
          {/* Quick Actions Row */}
          <Card className="w-full p-4">
            <View className="flex-row gap-2">
              {/* Complete/Uncomplete */}
              <Pressable
                onPress={handleToggleComplete}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
                  task.completed
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-muted'
                }`}
              >
                {task.completed ? (
                  <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                ) : (
                  <Circle size={16} className="text-muted-foreground" />
                )}
                <Text
                  size="sm"
                  className={`font-medium ${
                    task.completed
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-foreground'
                  }`}
                >
                  {task.completed ? 'Done' : 'Complete'}
                </Text>
              </Pressable>

              {/* Archive/Restore */}
              <Pressable
                onPress={handleArchive}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-muted py-3"
              >
                {task.archived ? (
                  <ArchiveRestore size={16} className="text-muted-foreground" />
                ) : (
                  <Archive size={16} className="text-muted-foreground" />
                )}
                <Text size="sm" className="font-medium text-foreground">
                  {task.archived ? 'Restore' : 'Archive'}
                </Text>
              </Pressable>
            </View>
          </Card>

          {/* Title */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Title <Text className="text-destructive">*</Text>
            </Text>
            <Input>
              <InputField
                placeholder="Task title"
                value={title}
                onChangeText={(text: string) => {
                  setTitle(text);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                returnKeyType="next"
              />
            </Input>
            {errors.title && (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.title}
              </Text>
            )}
          </Card>

          {/* Description */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Description
            </Text>
            <Input className="min-h-[80px]">
              <InputField
                placeholder="Add notes or details..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </Input>
          </Card>

          {/* Priority */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-3 font-medium">
              Priority
            </Text>
            <View className="flex-row gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = priority === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPriority(opt.value)}
                    className={`flex-1 items-center rounded-xl py-3 ${
                      isSelected
                        ? opt.value === 'high'
                          ? 'border-2 border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/30'
                          : opt.value === 'medium'
                            ? 'border-2 border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/30'
                            : 'border-2 border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30'
                        : 'border-2 border-border bg-card'
                    }`}
                  >
                    <Text
                      size="sm"
                      className={`font-medium ${
                        isSelected
                          ? opt.value === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : opt.value === 'medium'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-blue-600 dark:text-blue-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Due Date */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Due Date
            </Text>
            <Input>
              <InputSlot>
                <Calendar size={16} className="ml-3 text-muted-foreground" />
              </InputSlot>
              <InputField
                placeholder="YYYY-MM-DD (optional)"
                value={dueDate}
                onChangeText={(text: string) => {
                  setDueDate(text);
                  if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </Input>
            {errors.dueDate && (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.dueDate}
              </Text>
            )}
            <Text size="xs" className="mt-1 text-muted-foreground">
              Format: YYYY-MM-DD (e.g. 2025-12-25)
            </Text>
          </Card>

          {/* Due Time */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Due Time
            </Text>
            <Input>
              <InputSlot>
                <Clock size={16} className="ml-3 text-muted-foreground" />
              </InputSlot>
              <InputField
                placeholder="HH:MM (optional)"
                value={dueTime}
                onChangeText={(text: string) => {
                  setDueTime(text);
                  if (errors.dueTime) setErrors((prev) => ({ ...prev, dueTime: undefined }));
                }}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </Input>
            {errors.dueTime && (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.dueTime}
              </Text>
            )}
            <Text size="xs" className="mt-1 text-muted-foreground">
              24-hour format (e.g. 14:30)
            </Text>
          </Card>

          {/* Subtasks (Phase 1G-A) — parent completion stays independent */}
          <SubtasksCard
            taskId={task.id}
            subtasks={task.subtasks ?? []}
            onAdd={(taskId, title) => addSubtask(taskId, { title })}
            onToggle={(taskId, subtaskId, completed) =>
              toggleSubtask(taskId, subtaskId, completed)
            }
            onRename={(taskId, subtaskId, title) =>
              editSubtask(taskId, subtaskId, { title })
            }
            onDelete={(taskId, subtaskId) => removeSubtask(taskId, subtaskId)}
          />

          {/* Labels (Phase 1G-B) — selection saves with the form below */}
          <Card className="w-full p-4">
            <View className="mb-3 flex-row items-center gap-1.5">
              <Tag size={14} className="text-muted-foreground" />
              <Text size="sm" className="font-medium">
                Labels
              </Text>
            </View>
            <LabelSelector
              labels={labels}
              selectedIds={labelIds}
              onChange={setLabelIds}
              onCreate={(name) => createLabel({ name })}
              disabled={saving}
            />
          </Card>

          {/* Manage labels (Phase 1G-B) — entity CRUD, applies immediately */}
          <Card className="w-full p-4">
            <View className="mb-3 flex-row items-center gap-1.5">
              <Tag size={14} className="text-muted-foreground" />
              <Text size="sm" className="font-medium">
                Manage Labels
              </Text>
            </View>
            <LabelManager
              labels={labels}
              onRename={(id, name) => renameLabel(id, { name })}
              onDelete={async (id) => {
                await deleteLabel(id);
                // Drop the deleted ID from the pending selection too.
                setLabelIds((prev) => prev.filter((lid) => lid !== id));
              }}
              disabled={saving}
            />
          </Card>

          {/* Metadata */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium text-muted-foreground">
              Details
            </Text>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text size="xs" className="text-muted-foreground">
                  Created
                </Text>
                <Text size="xs" className="text-foreground">
                  {new Date(task.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs" className="text-muted-foreground">
                  Updated
                </Text>
                <Text size="xs" className="text-foreground">
                  {new Date(task.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              {task.completedAt && (
                <View className="flex-row justify-between">
                  <Text size="xs" className="text-muted-foreground">
                    Completed
                  </Text>
                  <Text size="xs" className="text-green-600 dark:text-green-400">
                    {new Date(task.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between">
                <Text size="xs" className="text-muted-foreground">
                  Status
                </Text>
                <Text size="xs" className="text-foreground">
                  {task.archived
                    ? 'Archived'
                    : task.completed
                      ? 'Completed'
                      : 'Active'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="xs" className="text-muted-foreground">
                  Priority
                </Text>
                <Text
                  size="xs"
                  className={
                    task.priority === 'high'
                      ? 'text-red-600 dark:text-red-400'
                      : task.priority === 'medium'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-blue-600 dark:text-blue-400'
                  }
                >
                  {PRIORITY_LABELS[task.priority]}
                </Text>
              </View>
              {getDueDate(task) && (
                <View className="flex-row justify-between">
                  <Text size="xs" className="text-muted-foreground">
                    Due Date
                  </Text>
                  <Text size="xs" className="text-foreground">
                    {getDueDate(task)}
                    {getTaskDueStatus(task, getTodayISO()) === 'overdue' &&
                      !task.completed && (
                        <Text size="xs" className="text-red-600 dark:text-red-400">
                          {' '}
                          (Overdue)
                        </Text>
                      )}
                    {getTaskDueStatus(task, getTodayISO()) === 'today' &&
                      !task.completed && (
                        <Text size="xs" className="text-amber-600 dark:text-amber-400">
                          {' '}
                          (Today)
                        </Text>
                      )}
                  </Text>
                </View>
              )}
              {task.dueTime && (
                <View className="flex-row justify-between">
                  <Text size="xs" className="text-muted-foreground">
                    Due Time
                  </Text>
                  <Text size="xs" className="text-foreground">
                    {formatDueTime(task.dueTime)}
                  </Text>
                </View>
              )}
              {sanitizeRecurrence(task.recurrence) && (
                <View className="flex-row justify-between">
                  <Text size="xs" className="text-muted-foreground">
                    Repeat
                  </Text>
                  <Text size="xs" className="flex-1 text-right text-foreground">
                    {describeRecurrence(task.recurrence!)}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Recurrence editor */}
          <Card className="w-full p-4">
            <View className="mb-3 flex-row items-center gap-1.5">
              <Repeat size={14} className="text-muted-foreground" />
              <Text size="sm" className="font-medium">
                Repeat
              </Text>
            </View>
            <RecurrenceEditor
              value={recurrence}
              onChange={(next) => {
                setRecurrence(next);
                if (next.type === 'none') {
                  setErrors((prev) => ({
                    ...prev,
                    recurrenceStart: undefined,
                    recurrenceEnd: undefined,
                    recurrenceWeekdays: undefined,
                  }));
                }
              }}
              errors={{
                startDate: errors.recurrenceStart,
                endDate: errors.recurrenceEnd,
                weekdays: errors.recurrenceWeekdays,
              }}
            />
          </Card>

          {/* Actions */}
          <View className="flex-row gap-3 pt-2">
            <Button
              variant="destructive"
              className="flex-1"
              onPress={handleDelete}
              disabled={saving}
            >
              <Trash2 size={16} className="text-white" />
              <ButtonText>Delete</ButtonText>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => router.back()}
              disabled={saving}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" className="text-primary-foreground" />
              ) : (
                <>
                  <Save size={16} className="text-primary-foreground" />
                  <ButtonText>Save</ButtonText>
                </>
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
