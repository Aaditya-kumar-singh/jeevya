import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Archive,
  Calendar,
  CalendarOff,
  CheckCircle,
  Circle,
  Clock,
  Filter,
  Plus,
  Repeat,
  Search,
  Tag,
  Target,
  TrendingUp,
  AlertTriangle,
  X,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { useTasks } from '@/hooks/useTasks';
import {
  computeStats,
  filterTasks,
  formatDueDate,
  formatDueTime,
  getDefaultFilters,
  getTaskDueStatus,
  hasActiveFilters,
  sortTasks,
  type DueFilter,
  type PriorityFilter,
  type TaskFilterState,
} from '@/lib/task-filters';
import {
  describeRecurrence,
  isRecurringTask,
} from '@/lib/task-recurrence';
import { LabelChips } from '@/components/tasks/LabelSelector';
import { getTodayISO, PRIORITY_LABELS, type Label, type Task } from '@/types/tasks';

// ─── Filter Options ───────────────────────────────────────────────────────────

type FilterType = DueFilter;

interface FilterOption {
  key: FilterType;
  label: string;
}

const DUE_FILTERS: FilterOption[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'noDate', label: 'No Due Date' },
  { key: 'completed', label: 'Done' },
];

const PRIORITY_FILTERS: { key: PriorityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[36px] justify-center rounded-lg px-4 py-2 ${
        active ? 'bg-primary' : 'bg-muted'
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        size="sm"
        className={`font-medium ${
          active ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatsCard({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Completion percentage reflects completed vs. all non-archived tasks.
  const totalCount = stats.totalActive + stats.completed;
  const completionPercent =
    totalCount > 0 ? Math.round((stats.completed / totalCount) * 100) : 0;

  return (
    <Card className="w-full p-4">
      <Text size="sm" className="text-muted-foreground">
        {todayStr}
      </Text>
      <Heading size="lg" className="mt-1">
        My Tasks
      </Heading>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 items-center rounded-xl bg-muted p-3">
          <Target size={16} className="text-foreground" />
          <Text size="xl" className="mt-1 font-bold">
            {stats.totalActive}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            Active
          </Text>
        </View>

        <View className="flex-1 items-center rounded-xl bg-muted p-3">
          <Clock size={16} className="text-amber-500" />
          <Text
            size="xl"
            className={`mt-1 font-bold ${stats.dueToday > 0 ? 'text-amber-500' : 'text-foreground'}`}
          >
            {stats.dueToday}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            Due Today
          </Text>
        </View>

        <View className="flex-1 items-center rounded-xl bg-muted p-3">
          <AlertTriangle
            size={16}
            className={stats.overdue > 0 ? 'text-red-500' : 'text-muted-foreground'}
          />
          <Text
            size="xl"
            className={`mt-1 font-bold ${stats.overdue > 0 ? 'text-red-500' : 'text-foreground'}`}
          >
            {stats.overdue}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            Overdue
          </Text>
        </View>

        <View className="flex-1 items-center rounded-xl bg-muted p-3">
          <CheckCircle size={16} className="text-green-500" />
          <Text size="xl" className="mt-1 font-bold text-green-500">
            {stats.completed}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            Done
          </Text>
        </View>
      </View>

      {/* Progress bar — completion % behavior preserved */}
      {totalCount > 0 && (
        <View className="mt-3">
          <View className="flex-row items-center justify-between">
            <Text size="xs" className="text-muted-foreground">
              Progress
            </Text>
            <Text size="xs" className="font-medium">
              {completionPercent}%
            </Text>
          </View>
          <View className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-green-500"
              style={{ width: `${completionPercent}%` }}
            />
          </View>
        </View>
      )}
    </Card>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  labels,
  onToggle,
  onPress,
}: {
  task: Task;
  labels: Label[];
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
}) {
  const status = getTaskDueStatus(task);
  const overdue = !task.completed && status === 'overdue';
  const dueToday = !task.completed && status === 'today';

  return (
    <Pressable
      onPress={() => onPress(task.id)}
      className="min-h-[56px] flex-row items-center gap-3 rounded-xl bg-card px-4 py-3"
      accessibilityRole="button"
      accessibilityLabel={`Task: ${task.title}`}
    >
      {/* Checkbox (pressing stops propagation and toggles) */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        hitSlop={8}
        className="items-center justify-center"
      >
        {task.completed ? (
          <CheckCircle size={22} className="text-green-500" />
        ) : (
          <Circle
            size={22}
            className={
              overdue
                ? 'text-red-500'
                : dueToday
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
            }
          />
        )}
      </Pressable>

      {/* Content */}
      <View className="flex-1">
        <Text
          size="md"
          className={`font-medium ${task.completed ? 'text-muted-foreground line-through' : ''}`}
        >
          {task.title}
        </Text>

        <View className="mt-1 flex-row flex-wrap items-center gap-2">
          {/* Priority badge */}
          <View
            className={`rounded-sm px-1.5 py-0.5 ${
              task.priority === 'high'
                ? 'bg-red-100 dark:bg-red-900/30'
                : task.priority === 'medium'
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
            }`}
          >
            <Text
              size="xs"
              className={`font-medium ${
                task.priority === 'high'
                  ? 'text-red-600 dark:text-red-400'
                  : task.priority === 'medium'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {PRIORITY_LABELS[task.priority]}
            </Text>
          </View>

          {/* Due date w/ status color + icon */}
          {task.dueDate ? (
            <View
              className={`flex-row items-center gap-1 rounded-sm px-1.5 py-0.5 ${
                overdue
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : dueToday
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-muted'
              }`}
            >
              {overdue ? (
                <AlertTriangle size={10} className="text-red-500" />
              ) : (
                <Calendar
                  size={10}
                  className={
                    dueToday ? 'text-amber-500' : 'text-muted-foreground'
                  }
                />
              )}
              <Text
                size="xs"
                className={
                  overdue
                    ? 'text-red-600 dark:text-red-400'
                    : dueToday
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                }
              >
                {overdue ? 'Overdue' : formatDueDate(task.dueDate)}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5">
              <CalendarOff size={10} className="text-muted-foreground" />
              <Text size="xs" className="text-muted-foreground">
                No date
              </Text>
            </View>
          )}

          {/* Due time — preserved as-is (HH:MM converted for display only) */}
          {task.dueTime && (
            <View className="flex-row items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5">
              <Clock size={10} className="text-muted-foreground" />
              <Text size="xs" className="text-muted-foreground">
                {formatDueTime(task.dueTime)}
              </Text>
            </View>
          )}

          {/* Recurring indicator */}
          {isRecurringTask(task) && (
            <View className="flex-row items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5">
              <Repeat size={10} className="text-muted-foreground" />
              <Text size="xs" className="text-muted-foreground">
                {describeRecurrence(task.recurrence!)}
              </Text>
            </View>
          )}

          {/* Labels */}
          <LabelChips task={task} labels={labels} />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  filters,
  hasAnyTasks,
}: {
  filters: TaskFilterState;
  hasAnyTasks: boolean;
}) {
  let icon = '📋';
  let title = 'No tasks yet';
  let message = 'Tap + to create your first task';

  if (filters.search.trim()) {
    icon = '🔍';
    title = 'No results';
    message = `No tasks match "${filters.search.trim()}"`;
  } else if ((filters.labels?.length ?? 0) > 0) {
    icon = '🏷️';
    title = 'No tasks with those labels';
    message = 'Try different labels or clear filters';
  } else if (filters.priority !== 'all') {
    icon = '🎯';
    title = `No ${filters.priority} priority tasks`;
    message = 'Try a different priority or clear filters';
  } else {
    switch (filters.due) {
      case 'today':
        icon = '☀️';
        title = 'No tasks for today';
        message = 'Enjoy your free day or add new tasks';
        break;
      case 'upcoming':
        icon = '📅';
        title = 'No upcoming tasks';
        message = 'Nothing due in the future';
        break;
      case 'overdue':
        icon = '🎉';
        title = 'No overdue tasks';
        message = "You're all caught up!";
        break;
      case 'noDate':
        icon = '🗓️';
        title = 'No tasks without a due date';
        message = 'Every active task has a due date';
        break;
      case 'completed':
        icon = '✅';
        title = 'No completed tasks';
        message = 'Complete some tasks to see them here';
        break;
      default:
        if (hasAnyTasks) {
          title = 'No active tasks';
          message = 'All caught up — nothing active right now';
        }
    }
  }

  return (
    <View className="items-center px-6 py-12">
      <Text size="3xl">{icon}</Text>
      <Heading size="md" className="mt-3 text-center">
        {title}
      </Heading>
      <Text size="sm" className="mt-1 text-center text-muted-foreground">
        {message}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const router = useRouter();
  const {
    tasks,
    labels,
    loading,
    refreshing,
    error,
    refresh,
    complete,
    uncomplete,
  } = useTasks();

  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState<TaskFilterState>(getDefaultFilters);

  const today = getTodayISO();
  const filtersActive = hasActiveFilters(filters);

  const clearFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  // Filter and sort tasks
  const visibleTasks = useMemo(() => {
    if (showArchived) {
      return tasks
        .filter((t) => t.archived)
        .sort((a, b) =>
          (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
        );
    }

    const nonArchived = tasks.filter((t) => !t.archived);
    return sortTasks(filterTasks(nonArchived, filters, today), today);
  }, [tasks, filters, showArchived, today]);

  // Stats
  const stats = useMemo(() => computeStats(tasks, today), [tasks, today]);

  // Archived count for the archive hint / toggle label
  const archivedCount = useMemo(
    () => tasks.reduce((n, t) => (t.archived ? n + 1 : n), 0),
    [tasks],
  );

  // Handle toggle — recurring completions may carry a generation warning
  // (completion itself is always persisted before generation is attempted).
  const [recurrenceNotice, setRecurrenceNotice] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      try {
        if (task.completed) {
          await uncomplete(id);
          setRecurrenceNotice(null);
        } else {
          const { warning } = await complete(id);
          setRecurrenceNotice(warning);
        }
      } catch (e) {
        Alert.alert(
          'Error',
          e instanceof Error ? e.message : 'Failed to update task',
        );
      }
    },
    [tasks, complete, uncomplete],
  );

  // Handle row press -> navigate to detail
  const handleRowPress = useCallback(
    (id: string) => {
      router.push(`/tasks/${id}` as any);
    },
    [router],
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading tasks...
        </Text>
      </View>
    );
  }

  // Error state
  if (error && tasks.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">
          Failed to load tasks
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {error}
        </Text>
        <Button onPress={handleRefresh} variant="outline" className="mt-4">
          <ButtonText>Retry</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text size="sm" className="text-muted-foreground">
              Tasks
            </Text>
            <Heading size="xl" className="mt-1">
              My Tasks
            </Heading>
          </View>
          <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push('/tasks/calendar' as any)}
            className="min-h-[36px] flex-row items-center gap-1 rounded-lg bg-muted px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel="Open calendar view"
          >
            <Calendar size={14} className="text-muted-foreground" />
            <Text size="xs" className="text-muted-foreground">
              Calendar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/tasks/analytics' as any)}
            className="min-h-[36px] flex-row items-center gap-1 rounded-lg bg-muted px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel="Open productivity analytics"
          >
            <TrendingUp size={14} className="text-muted-foreground" />
            <Text size="xs" className="text-muted-foreground">
              Analytics
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowArchived(!showArchived)}
            className="min-h-[36px] flex-row items-center gap-1 rounded-lg bg-muted px-3 py-2"
          >
            <Archive size={14} className="text-muted-foreground" />
            <Text size="xs" className="text-muted-foreground">
              {showArchived ? 'Active' : 'Archived'}
            </Text>
          </Pressable>
          </View>
        </View>

        {/* Stats */}
        {!showArchived && <StatsCard stats={stats} />}

        {/* Search */}
        <Input className="bg-card">
          <InputSlot>
            <Search size={16} className="ml-3 text-muted-foreground" />
          </InputSlot>
          <InputField
            placeholder="Search tasks..."
            value={filters.search}
            onChangeText={(text: string) =>
              setFilters((prev) => ({ ...prev, search: text }))
            }
            returnKeyType="search"
          />
          {filters.search.length > 0 && (
            <Pressable
              onPress={() => setFilters((prev) => ({ ...prev, search: '' }))}
              className="px-3"
            >
              <X size={16} className="text-muted-foreground" />
            </Pressable>
          )}
        </Input>

        {/* Filters (active view only) */}
        {!showArchived && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {DUE_FILTERS.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  active={filters.due === f.key}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, due: f.key }))
                  }
                />
              ))}
            </ScrollView>

            <View className="flex-row items-center gap-2">
              <Filter size={14} className="shrink-0 text-muted-foreground" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                className="flex-1"
              >
                {PRIORITY_FILTERS.map((f) => (
                  <FilterChip
                    key={f.key}
                    label={f.label}
                    active={filters.priority === f.key}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, priority: f.key }))
                    }
                  />
                ))}
              </ScrollView>
            </View>

            {/* Label filters (multi-select, ANY match) */}
            {labels.length > 0 && (
              <View className="flex-row items-center gap-2">
                <Tag size={14} className="shrink-0 text-muted-foreground" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  className="flex-1"
                >
                  {labels.map((label) => {
                    const active = (filters.labels ?? []).includes(label.id);
                    return (
                      <FilterChip
                        key={label.id}
                        label={label.name}
                        active={active}
                        onPress={() =>
                          setFilters((prev) => {
                            const current = prev.labels ?? [];
                            return {
                              ...prev,
                              labels: active
                                ? current.filter((id) => id !== label.id)
                                : [...current, label.id],
                            };
                          })
                        }
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Active-filter summary + Clear */}
            {filtersActive && (
              <View className="flex-row items-center justify-between rounded-lg bg-muted px-3 py-2">
                <Text size="xs" className="flex-1 text-muted-foreground">
                  {[
                    filters.due !== 'all' &&
                      DUE_FILTERS.find((f) => f.key === filters.due)?.label,
                    filters.priority !== 'all' &&
                      `${PRIORITY_LABELS[filters.priority]} priority`,
                    filters.search.trim() && `"${filters.search.trim()}"`,
                    (filters.labels?.length ?? 0) > 0 &&
                      (filters.labels ?? [])
                        .map((id) => labels.find((l) => l.id === id)?.name)
                        .filter(Boolean)
                        .join(', '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Pressable
                  onPress={clearFilters}
                  className="ml-2 flex-row items-center gap-1"
                  accessibilityRole="button"
                  accessibilityLabel="Clear all filters"
                >
                  <X size={12} className="text-primary" />
                  <Text size="xs" className="font-medium text-primary">
                    Clear
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {/* Error banner */}
        {error && (
          <Card className="w-full border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">
                {error}
              </Text>
              <Pressable onPress={handleRefresh}>
                <Text size="xs" className="font-medium text-red-600 dark:text-red-400">
                  Retry
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Recurrence notice (completion succeeded, generation failed) */}
        {recurrenceNotice && (
          <Card className="w-full border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
            <View className="flex-row items-center gap-2">
              <Repeat size={14} className="text-amber-500" />
              <Text
                size="xs"
                className="flex-1 text-amber-600 dark:text-amber-400"
              >
                {recurrenceNotice}
              </Text>
              <Pressable onPress={() => setRecurrenceNotice(null)}>
                <X size={14} className="text-amber-600 dark:text-amber-400" />
              </Pressable>
            </View>
          </Card>
        )}

        {/* Task list */}
        {visibleTasks.length === 0 ? (
          <EmptyState
            filters={filters}
            hasAnyTasks={tasks.some((t) => !t.archived)}
          />
        ) : (
          <View className="gap-2">
            {visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                labels={labels}
                onToggle={handleToggle}
                onPress={handleRowPress}
              />
            ))}
          </View>
        )}

        {/* Quick archive hint */}
        {!showArchived && archivedCount > 0 && (
          <Pressable
            onPress={() => setShowArchived(true)}
            className="items-center py-2"
          >
            <Text size="xs" className="text-muted-foreground">
              {archivedCount} archived task(s)
            </Text>
          </Pressable>
        )}
      </View>

      {/* Floating Add Button */}
      <View className="absolute bottom-6 right-5">
        <Pressable
          onPress={() => router.push('/tasks/new' as any)}
          className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
          accessibilityLabel="Add Task"
        >
          <Plus size={24} className="text-primary-foreground" />
        </Pressable>
      </View>
    </ScrollView>
  );
}
