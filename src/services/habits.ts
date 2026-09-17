import { saveData, loadData } from '@/lib/storage';
import { updateStorage } from '@/services/storageReliability';
import { uid } from '@/lib/uid';
import type { Habit, HabitLog, HabitFrequency, Weekday } from '@/types/habit';
import { getISODateString } from '@/types/habit';

const HABITS_KEY = 'lifeos:habits';
const HABIT_LOGS_KEY = 'lifeos:habit-logs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateHabitInput {
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  days: Weekday[];
  targetCount?: number;
  reminderTime?: string | null;
  startDate?: string;
}

export interface UpdateHabitInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency?: HabitFrequency;
  days?: Weekday[];
  targetCount?: number;
  reminderTime?: string | null;
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
  isArchived?: boolean;
}

// ─── Habits CRUD ──────────────────────────────────────────────────────────────

export async function getHabits(): Promise<Habit[]> {
  return loadData<Habit[]>(HABITS_KEY, []);
}

export async function getActiveHabits(): Promise<Habit[]> {
  const habits = await getHabits();
  return habits.filter((h) => h.isActive && !h.isArchived);
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const habits = await getHabits();
  return habits.find((h) => h.id === id) ?? null;
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const now = getISODateString();
  const habit: Habit = {
    id: uid('habit_'),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    icon: input.icon,
    color: input.color,
    frequency: input.frequency,
    days: input.days,
    targetCount: input.targetCount ?? 1,
    reminderTime: input.reminderTime ?? null,
    startDate: input.startDate ?? now,
    endDate: null,
    isActive: true,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  if (!habit.name) {
    throw new Error('Habit name is required');
  }

  if (habit.targetCount < 1) {
    throw new Error('Target count must be at least 1');
  }

  if (habit.frequency !== 'daily' && habit.days.length === 0) {
    throw new Error('Please select at least one day for weekly/custom habits');
  }

  await updateStorage<Habit[]>(HABITS_KEY, [], (current) => [habit, ...current]);
  return habit;
}

export async function updateHabit(
  id: string,
  input: UpdateHabitInput,
): Promise<Habit | null> {
  let updatedResult: Habit | null = null;
  await updateStorage<Habit[]>(HABITS_KEY, [], (habits) => {
  const index = habits.findIndex((h) => h.id === id);

  if (index === -1) return habits;

  const habit = habits[index];
  const now = getISODateString();

  const updated: Habit = {
    ...habit,
    ...input,
    updatedAt: now,
  };

  // Validation
  if (updated.name !== undefined && !updated.name.trim()) {
    throw new Error('Habit name is required');
  }

  if (updated.targetCount !== undefined && updated.targetCount < 1) {
    throw new Error('Target count must be at least 1');
  }

  if (
    updated.frequency !== undefined &&
    updated.days !== undefined &&
    updated.frequency !== 'daily' &&
    updated.days.length === 0
  ) {
    throw new Error('Please select at least one day for weekly/custom habits');
  }

  habits[index] = updated;
  updatedResult = updated;
  return habits;
  });

  return updatedResult;
}

export async function deleteHabit(id: string): Promise<boolean> {
  const habits = await getHabits();
  const filtered = habits.filter((h) => h.id !== id);

  if (filtered.length === habits.length) return false;

  await saveData(HABITS_KEY, filtered);

  // Also delete all logs for this habit
  const logs = await getHabitLogs(id);
  if (logs.length > 0) {
    const allLogs = await loadData<HabitLog[]>(HABIT_LOGS_KEY, []);
    const filteredLogs = allLogs.filter((log) => log.habitId !== id);
    await saveData(HABIT_LOGS_KEY, filteredLogs);
  }

  return true;
}

export async function archiveHabit(id: string): Promise<Habit | null> {
  return updateHabit(id, { isArchived: true });
}

export async function restoreHabit(id: string): Promise<Habit | null> {
  return updateHabit(id, { isArchived: false });
}

// ─── Habit Logs ───────────────────────────────────────────────────────────────

export async function getHabitLogs(habitId: string): Promise<HabitLog[]> {
  const logs = await loadData<HabitLog[]>(HABIT_LOGS_KEY, []);
  return logs.filter((log) => log.habitId === habitId);
}

export async function getHabitLog(
  habitId: string,
  date: string,
): Promise<HabitLog | null> {
  const logs = await getHabitLogs(habitId);
  return logs.find((log) => log.date === date) ?? null;
}

export async function setHabitCompletion(
  habitId: string,
  date: string,
  completed: boolean,
  value?: number | null,
): Promise<HabitLog> {
  let result!: HabitLog;
  await updateStorage<HabitLog[]>(HABIT_LOGS_KEY, [], (logs) => {
    const now = getISODateString();
    const existingIndex = logs.findIndex((log) => log.habitId === habitId && log.date === date);
    const log: HabitLog = {
      id: existingIndex >= 0 ? logs[existingIndex].id : uid('log_'),
      habitId,
      date,
      completed,
      value: value ?? null,
      createdAt: existingIndex >= 0 ? logs[existingIndex].createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) logs[existingIndex] = log;
    else logs.push(log);
    result = log;
    return logs;
  });
  return result;
}

export async function toggleHabitCompletion(
  habitId: string,
  date: string,
): Promise<HabitLog> {
  let result!: HabitLog;
  await updateStorage<HabitLog[]>(HABIT_LOGS_KEY, [], (logs) => {
    const existingIndex = logs.findIndex((log) => log.habitId === habitId && log.date === date);
    const now = getISODateString();
    const existing = existingIndex >= 0 ? logs[existingIndex] : null;
    const log: HabitLog = {
      id: existing?.id ?? uid('log_'),
      habitId,
      date,
      completed: existing ? !existing.completed : true,
      value: existing?.value ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) logs[existingIndex] = log;
    else logs.push(log);
    result = log;
    return logs;
  });
  return result;
}

// ─── Today's Habits ───────────────────────────────────────────────────────────

export async function getTodayHabits(): Promise<(Habit & { isCompleted: boolean })[]> {
  const habits = await getActiveHabits();
  const today = getISODateString();
  const todayLogs: Map<string, HabitLog> = new Map();

  // Load all logs for today in one batch
  const allLogs = await loadData<HabitLog[]>(HABIT_LOGS_KEY, []);
  for (const log of allLogs) {
    if (log.date === today) {
      todayLogs.set(log.habitId, log);
    }
  }

  return habits
    .filter((habit) => {
      // Filter to habits that are scheduled for today
      const dayOfWeek = new Date().getDay();
      const weekdayMap: Record<number, Weekday> = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday',
      };
      const currentWeekday = weekdayMap[dayOfWeek];

      if (habit.frequency === 'daily') return true;
      if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
        return habit.days.includes(currentWeekday);
      }
      return false;
    })
    .map((habit) => ({
      ...habit,
      isCompleted: todayLogs.has(habit.id) && todayLogs.get(habit.id)!.completed,
    }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getHabitWithLogs(
  habitId: string,
): Promise<{ habit: Habit | null; logs: HabitLog[] }> {
  const habit = await getHabitById(habitId);
  const logs = habit ? await getHabitLogs(habitId) : [];
  return { habit, logs };
}

