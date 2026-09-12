import type { Habit, HabitLog } from '@/types/habit';
import {
  getISODateString,
  isScheduledDay,
  getDaysInRange,
} from '@/types/habit';

export interface StreakInfo {
  current: number;
  best: number;
}

export interface CompletionRate {
  percentage: number;
  completed: number;
  total: number;
}

export interface WeeklyProgress {
  weekNumber: number;
  days: {
    date: string;
    completed: boolean;
    scheduled: boolean;
  }[];
  completedCount: number;
  scheduledCount: number;
  percentage: number;
}

export interface MonthlyHistory {
  year: number;
  month: number;
  days: {
    date: string;
    completed: boolean;
    scheduled: boolean;
  }[];
  completedCount: number;
  scheduledCount: number;
  percentage: number;
}

/**
 * Calculate current streak for a habit.
 * A streak is consecutive complete days (for scheduled days only).
 */
export function calculateCurrentStreak(
  habit: Habit,
  logs: HabitLog[],
): number {
  if (!habit.isActive || habit.isArchived) return 0;

  const completedDates = new Set(
    logs.filter((log) => log.completed).map((log) => log.date),
  );

  let streak = 0;
  const today = new Date();
  let checkDate = new Date(today);

  while (!isScheduledDay(habit, checkDate) && streak === 0) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (checkDate < new Date(habit.startDate)) {
      return 0;
    }
  }

  let dateToCheck = new Date(checkDate);

  while (true) {
    const dateStr = getISODateString(dateToCheck);

    if (dateToCheck < new Date(habit.startDate)) {
      break;
    }

    if (isScheduledDay(habit, dateToCheck)) {
      if (completedDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    dateToCheck.setDate(dateToCheck.getDate() - 1);

    if (streak > 365) break;
  }

  return streak;
}

/**
 * Calculate best streak for a habit from historical logs.
 */
export function calculateBestStreak(
  habit: Habit,
  logs: HabitLog[],
): number {
  if (!habit.isActive || habit.isArchived || logs.length === 0) return 0;

  const completedDates = new Set(
    logs.filter((log) => log.completed).map((log) => log.date),
  );

  const startDate = new Date(habit.startDate);
  const endDate = habit.endDate ? new Date(habit.endDate) : new Date();
  const allDates = getDaysInRange(
    getISODateString(startDate),
    getISODateString(endDate),
  );

  let bestStreak = 0;
  let currentStreak = 0;

  for (const dateStr of allDates) {
    const date = new Date(dateStr);

    if (isScheduledDay(habit, date)) {
      if (completedDates.has(dateStr)) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
  }

  return bestStreak;
}

/**
 * Calculate completion rate for a habit over a date range.
 */
export function calculateCompletionRate(
  habit: Habit,
  logs: HabitLog[],
  startDate: string,
  endDate: string,
): CompletionRate {
  const datesInRange = getDaysInRange(startDate, endDate);

  let scheduledCount = 0;
  let completedCount = 0;

  const completedSet = new Set(
    logs.filter((log) => log.completed).map((log) => log.date),
  );

  for (const dateStr of datesInRange) {
    const date = new Date(dateStr);

    if (isScheduledDay(habit, date)) {
      scheduledCount++;

      if (completedSet.has(dateStr)) {
        completedCount++;
      }
    }
  }

  const percentage =
    scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

  return {
    percentage,
    completed: completedCount,
    total: scheduledCount,
  };
}

/**
 * Get weekly progress for a habit.
 */
export function getWeeklyProgress(
  habit: Habit,
  logs: HabitLog[],
  referenceDate: Date = new Date(),
): WeeklyProgress {
  const dayOfWeek = referenceDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(referenceDate);
  monday.setDate(monday.getDate() + mondayOffset);

  const weekDays: WeeklyProgress['days'] = [];
  let completedCount = 0;
  let scheduledCount = 0;

  const completedSet = new Set(
    logs.filter((log) => log.completed).map((log) => log.date),
  );

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = getISODateString(date);
    const scheduled = isScheduledDay(habit, date);
    const completed = completedSet.has(dateStr);

    if (scheduled) {
      scheduledCount++;
      if (completed) completedCount++;
    }

    weekDays.push({
      date: dateStr,
      completed,
      scheduled,
    });
  }

  const percentage =
    scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

  return {
    weekNumber: getWeekNumber(referenceDate),
    days: weekDays,
    completedCount,
    scheduledCount,
    percentage,
  };
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get monthly history for a habit.
 */
export function getMonthlyHistory(
  habit: Habit,
  logs: HabitLog[],
  year: number,
  month: number,
): MonthlyHistory {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: MonthlyHistory['days'] = [];
  let completedCount = 0;
  let scheduledCount = 0;

  const completedSet = new Set(
    logs.filter((log) => log.completed).map((log) => log.date),
  );

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = getISODateString(date);
    const scheduled = isScheduledDay(habit, date);
    const completed = completedSet.has(dateStr);

    if (scheduled) {
      scheduledCount++;
      if (completed) completedCount++;
    }

    days.push({
      date: dateStr,
      completed,
      scheduled,
    });
  }

  const percentage =
    scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

  return {
    year,
    month,
    days,
    completedCount,
    scheduledCount,
    percentage,
  };
}

/**
 * Get total completions for a habit.
 */
export function getTotalCompletions(logs: HabitLog[]): number {
  return logs.filter((log) => log.completed).length;
}

/**
 * Get all stats for a habit.
 */
export function getHabitStats(
  habit: Habit,
  logs: HabitLog[],
): {
  currentStreak: number;
  bestStreak: number;
  completionRate: CompletionRate;
  weeklyProgress: WeeklyProgress;
  totalCompletions: number;
} {
  const now = new Date();
  const startOfYear = getISODateString(new Date(now.getFullYear(), 0, 1));
  const today = getISODateString(now);

  return {
    currentStreak: calculateCurrentStreak(habit, logs),
    bestStreak: calculateBestStreak(habit, logs),
    completionRate: calculateCompletionRate(habit, logs, startOfYear, today),
    weeklyProgress: getWeeklyProgress(habit, logs, now),
    totalCompletions: getTotalCompletions(logs),
  };
}
