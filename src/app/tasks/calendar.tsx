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
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarIcon,
  CalendarOff,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  List,
  Plus,
  Repeat,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useTasks } from '@/hooks/useTasks';
import {
  filterTasks,
  formatDueTime,
  getDueDate,
  getTaskDueStatus,
  sortTasks,
} from '@/lib/task-filters';
import {
  describeRecurrence,
  isRecurringTask,
} from '@/lib/task-recurrence';
import {
  formatCalendarDate,
  formatMonthTitle,
  getFirstWeekday,
  getMonthDays,
  getTaskCountsByDate,
  getTasksForDate,
  parseYearMonth,
  shiftMonth,
  WEEKDAY_HEADERS,
} from '@/lib/task-calendar';
import { getTodayISO, PRIORITY_LABELS, type Task } from '@/types/tasks';

// ─── Compact task row (mirrors /tasks list styling) ──────────────────────────

function CalendarTaskRow({
  task,
  today,
  onToggle,
  onPress,
}: {
  task: Task;
  today: string;
  onToggle: (id: string) => void;
  onPress: (id: string) => void;
}) {
  const status = getTaskDueStatus(task, today);
  const overdue = !task.completed && status === 'overdue';
  const dueToday = !task.completed && status === 'today';

  return (
    <Pressable
      onPress={() => onPress(task.id)}
      className="min-h-[56px] flex-row items-center gap-3 rounded-xl bg-card px-4 py-3"
      accessibilityRole="button"
      accessibilityLabel={`Task: ${task.title}${overdue ? ', overdue' : dueToday ? ', due today' : ''}${task.completed ? ', completed' : ''}`}
    >
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        hitSlop={8}
        className="min-h-[44px] min-w-[44px] items-center justify-center"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={task.completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
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

      <View className="flex-1">
        <Text
          size="md"
          className={`font-medium ${task.completed ? 'text-muted-foreground line-through' : ''}`}
        >
          {task.title}
        </Text>
        <View className="mt-1 flex-row flex-wrap items-center gap-2">
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

          {getDueDate(task) && (
            <View
              className={`rounded-sm px-1.5 py-0.5 ${
                overdue
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : dueToday
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-muted'
              }`}
            >
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
                {overdue ? 'Overdue' : status === 'today' ? 'Today' : formatCalendarDate(task.dueDate as string)}
              </Text>
            </View>
          )}

          {task.dueTime && (
            <View className="flex-row items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5">
              <Clock size={10} className="text-muted-foreground" />
              <Text size="xs" className="text-muted-foreground">
                {formatDueTime(task.dueTime)}
              </Text>
            </View>
          )}

          {isRecurringTask(task) && (
            <View className="flex-row items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5">
              <Repeat size={10} className="text-muted-foreground" />
              <Text size="xs" className="text-muted-foreground">
                {describeRecurrence(task.recurrence!)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TaskCalendarScreen() {
  const router = useRouter();
  const { tasks, loading, refreshing, error, refresh, complete, uncomplete } =
    useTasks();

  const today = getTodayISO();
  const todayYM = parseYearMonth(today) ?? { year: 2026, month: 1 };

  const [viewYear, setViewYear] = useState(todayYM.year);
  const [viewMonth, setViewMonth] = useState(todayYM.month);
  const [selectedDate, setSelectedDate] = useState(today);

  const days = useMemo(
    () => getMonthDays(viewYear, viewMonth, today),
    [viewYear, viewMonth, today],
  );
  const firstWeekday = useMemo(
    () => getFirstWeekday(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const counts = useMemo(
    () => getTaskCountsByDate(tasks, viewYear, viewMonth, today),
    [tasks, viewYear, viewMonth, today],
  );

  const selectedTasks = useMemo(
    () => sortTasks(getTasksForDate(tasks, selectedDate), today),
    [tasks, selectedDate, today],
  );

  const nonArchived = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);

  const overdueTasks = useMemo(
    () =>
      sortTasks(
        filterTasks(nonArchived, { due: 'overdue', priority: 'all', search: '' }, today),
        today,
      ).slice(0, 5),
    [nonArchived, today],
  );

  const upcomingTasks = useMemo(
    () =>
      sortTasks(
        filterTasks(nonArchived, { due: 'upcoming', priority: 'all', search: '' }, today),
        today,
      ).slice(0, 5),
    [nonArchived, today],
  );

  const goToMonth = useCallback(
    (delta: number) => {
      const next = shiftMonth(viewYear, viewMonth, delta);
      setViewYear(next.year);
      setViewMonth(next.month);
      // Keep the same day-of-month where possible, clamped to the new month's
      // length; this updates the selected date + selected-day list on every
      // month transition (including year boundaries + leap February).
      const day = Number(selectedDate.slice(8, 10));
      const clamped = Math.min(
        Number.isFinite(day) ? day : 1,
        getMonthDays(next.year, next.month).length || 28,
      );
      const mm = String(next.month).padStart(2, '0');
      const dd = String(clamped).padStart(2, '0');
      setSelectedDate(`${next.year}-${mm}-${dd}`);
    },
    [viewYear, viewMonth, selectedDate],
  );

  const goToToday = useCallback(() => {
    const ym = parseYearMonth(today);
    if (ym) {
      setViewYear(ym.year);
      setViewMonth(ym.month);
    }
    setSelectedDate(today);
  }, [today]);

  const handleToggle = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      try {
        if (task.completed) await uncomplete(id);
        else await complete(id);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update task');
      }
    },
    [tasks, complete, uncomplete],
  );

  const handleRowPress = useCallback(
    (id: string) => {
      router.push(`/tasks/${id}` as never);
    },
    [router],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading calendar...
        </Text>
      </View>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">
          Failed to load tasks
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {error}
        </Text>
        <Button onPress={() => void refresh()} variant="outline" className="mt-4">
          <ButtonText>Retry</ButtonText>
        </Button>
      </View>
    );
  }

  const blanks = firstWeekday >= 0 ? firstWeekday : 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Tasks
            </Text>
            <Heading size="xl" className="mt-1">
              Calendar
            </Heading>
          </View>
          <Pressable
            onPress={goToToday}
            className="min-h-[36px] items-center justify-center rounded-lg bg-muted px-4 py-2"
            accessibilityRole="button"
            accessibilityLabel="Go to today"
          >
            <Text size="sm" className="font-medium text-foreground">
              Today
            </Text>
          </Pressable>
        </View>

        {/* Month navigation */}
        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => goToMonth(-1)}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
              accessibilityRole="button"
              accessibilityLabel={`Previous month, ${formatMonthTitle(...monthOf(viewYear, viewMonth, -1))}`}
            >
              <ChevronLeft size={20} className="text-foreground" />
            </Pressable>
            <Heading size="md">{formatMonthTitle(viewYear, viewMonth)}</Heading>
            <Pressable
              onPress={() => goToMonth(1)}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
              accessibilityRole="button"
              accessibilityLabel={`Next month, ${formatMonthTitle(...monthOf(viewYear, viewMonth, 1))}`}
            >
              <ChevronRight size={20} className="text-foreground" />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View className="mt-3 flex-row">
            {WEEKDAY_HEADERS.map((d) => (
              <View key={d} className="flex-1 items-center py-1">
                <Text size="xs" className="font-medium text-muted-foreground">
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View className="flex-row flex-wrap">
            {Array.from({ length: blanks }).map((_, i) => (
              <View key={`blank-${i}`} className="w-[14.28%] p-0.5">
                <View className="min-h-[52px]" />
              </View>
            ))}
            {days.map((day) => {
              const c = counts[day.date];
              const selected = day.date === selectedDate;
              const a11yParts = [
                formatCalendarDate(day.date),
                c ? `${c.total} task${c.total === 1 ? '' : 's'}` : 'no tasks',
                c && c.overdue > 0 ? `${c.overdue} overdue` : null,
                day.isToday ? 'today' : null,
              ].filter(Boolean);
              return (
                <View key={day.date} className="w-[14.28%] p-0.5">
                  <Pressable
                    onPress={() => setSelectedDate(day.date)}
                    className={`min-h-[52px] items-center justify-center rounded-xl border py-1 ${
                      selected
                        ? 'border-primary bg-primary'
                        : day.isToday
                          ? 'border-primary bg-accent'
                          : 'border-transparent bg-card'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={a11yParts.join(', ')}
                    accessibilityState={{ selected }}
                  >
                    <Text
                      size="sm"
                      className={`font-medium ${
                        selected
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {day.day}
                    </Text>
                    {/* Indicators: red = overdue, amber = due-today active,
                        muted = upcoming/other, green = all done */}
                    {c ? (
                      <View className="mt-1 flex-row items-center justify-center gap-1">
                        {c.overdue > 0 && (
                          <View className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}
                        {c.active > c.overdue && day.date === today && (
                          <View className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        )}
                        {c.active > 0 && day.date !== today && (
                          <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        )}
                        {c.active === 0 && (
                          <View className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        )}
                        {c.total > 1 && (
                          <Text
                            size="xs"
                            className={
                              selected
                                ? 'text-primary-foreground'
                                : 'text-muted-foreground'
                            }
                          >
                            {c.total}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View className="mt-1 h-1.5" />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View className="mt-3 flex-row flex-wrap gap-4">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-red-500" />
              <Text size="xs" className="text-muted-foreground">
                Overdue
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-amber-500" />
              <Text size="xs" className="text-muted-foreground">
                Due today
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-muted-foreground" />
              <Text size="xs" className="text-muted-foreground">
                Due
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-green-500" />
              <Text size="xs" className="text-muted-foreground">
                Done
              </Text>
            </View>
          </View>
        </Card>

        {/* Selected day */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Heading size="md">{formatCalendarDate(selectedDate)}</Heading>
            <Text size="sm" className="text-muted-foreground">
              {selectedTasks.length === 0
                ? 'No tasks due'
                : `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} due`}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/tasks/new', params: { dueDate: selectedDate } } as never)
            }
            className="min-h-[44px] flex-row items-center gap-1 rounded-lg bg-primary px-4 py-2"
            accessibilityRole="button"
            accessibilityLabel={`Add task due ${formatCalendarDate(selectedDate)}`}
          >
            <Plus size={16} className="text-primary-foreground" />
            <Text size="sm" className="font-medium text-primary-foreground">
              Add Task
            </Text>
          </Pressable>
        </View>

        {selectedTasks.length === 0 ? (
          <Card className="w-full p-4">
            <View className="items-center py-4">
              <CalendarOff size={24} className="text-muted-foreground" />
              <Text size="sm" className="mt-2 text-muted-foreground">
                Nothing due on this date.
              </Text>
            </View>
          </Card>
        ) : (
          <View className="gap-2">
            {selectedTasks.map((task) => (
              <CalendarTaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={(id) => void handleToggle(id)}
                onPress={handleRowPress}
              />
            ))}
          </View>
        )}

        {/* Overdue */}
        <Card className="w-full p-4">
          <View className="flex-row items-center gap-1.5">
            <AlertTriangle size={14} className="text-red-500" />
            <Heading size="sm">Overdue ({overdueTasks.length >= 5 ? '5+' : overdueTasks.length})</Heading>
          </View>
          {overdueTasks.length === 0 ? (
            <Text size="sm" className="mt-2 text-muted-foreground">
              Nothing overdue. 🎉
            </Text>
          ) : (
            <View className="mt-2 gap-2">
              {overdueTasks.map((task) => (
                <CalendarTaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={(id) => void handleToggle(id)}
                  onPress={handleRowPress}
                />
              ))}
            </View>
          )}
        </Card>

        {/* Upcoming */}
        <Card className="w-full p-4">
          <View className="flex-row items-center gap-1.5">
            <CalendarIcon size={14} className="text-muted-foreground" />
            <Heading size="sm">Upcoming ({upcomingTasks.length >= 5 ? '5+' : upcomingTasks.length})</Heading>
          </View>
          {upcomingTasks.length === 0 ? (
            <Text size="sm" className="mt-2 text-muted-foreground">
              Nothing upcoming.
            </Text>
          ) : (
            <View className="mt-2 gap-2">
              {upcomingTasks.map((task) => (
                <CalendarTaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={(id) => void handleToggle(id)}
                  onPress={handleRowPress}
                />
              ))}
            </View>
          )}
        </Card>

        {/* Link back to full list (filters live there — calendar stays date-first) */}
        <Pressable
          onPress={() => router.push('/tasks' as never)}
          className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl bg-muted py-3"
          accessibilityRole="button"
          accessibilityLabel="Open full task list with search and filters"
        >
          <List size={16} className="text-muted-foreground" />
          <Text size="sm" className="font-medium text-foreground">
            Open task list (search & filters)
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function monthOf(year: number, month: number, delta: number): [number, number] {
  const next = shiftMonth(year, month, delta);
  return [next.year, next.month];
}
