export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  days: Weekday[];
  targetCount: number;
  reminderTime: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  value: number | null;
  createdAt: string;
  updatedAt: string;
}

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const ALL_WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export const WEEKDAY_FULL_NAMES: Record<Weekday, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const HABIT_ICONS = [
  { id: 'book', label: 'Book', name: 'Book' },
  { id: 'dumbbell', label: 'Dumbbell', name: 'Dumbbell' },
  { id: 'droplet', label: 'Droplet', name: 'Droplet' },
  { id: 'brain', label: 'Brain', name: 'Brain' },
  { id: 'heart', label: 'Heart', name: 'Heart' },
  { id: 'moon', label: 'Moon', name: 'Moon' },
  { id: 'check', label: 'Check', name: 'Check' },
  { id: 'target', label: 'Target', name: 'Target' },
  { id: 'walk', label: 'Walk', name: 'Walk' },
  { id: 'meditation', label: 'Meditation', name: 'Meditation' },
  { id: 'water', label: 'Water', name: 'Water' },
  { id: 'coffee', label: 'Coffee', name: 'Coffee' },
  { id: 'sun', label: 'Sun', name: 'Sun' },
  { id: 'moon-star', label: 'Moon Star', name: 'MoonStar' },
  { id: 'flame', label: 'Flame', name: 'Flame' },
  { id: 'star', label: 'Star', name: 'Star' },
] as const;

export const HABIT_COLORS = [
  { id: 'blue', label: 'Blue', value: '#3B82F6' },
  { id: 'green', label: 'Green', value: '#10B981' },
  { id: 'purple', label: 'Purple', value: '#8B5CF6' },
  { id: 'pink', label: 'Pink', value: '#EC4899' },
  { id: 'red', label: 'Red', value: '#EF4444' },
  { id: 'orange', label: 'Orange', value: '#F97316' },
  { id: 'yellow', label: 'Yellow', value: '#EAB308' },
  { id: 'teal', label: 'Teal', value: '#14B8A6' },
  { id: 'indigo', label: 'Indigo', value: '#6366F1' },
  { id: 'gray', label: 'Gray', value: '#6B7280' },
] as const;

export function isToday(dateString: string): boolean {
  const today = new Date();
  const date = new Date(dateString);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getISODateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function isSameDay(date1: string, date2: string): boolean {
  return date1.slice(0, 10) === date2.slice(0, 10);
}

export function isScheduledDay(habit: Habit, date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
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

  if (habit.frequency === 'daily') {
    return true;
  }

  if (habit.frequency === 'weekly') {
    return habit.days.includes(currentWeekday);
  }

  if (habit.frequency === 'custom') {
    return habit.days.includes(currentWeekday);
  }

  return false;
}

export function getStartOfDay(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function getEndOfDay(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function getDaysInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let current = new Date(start);

  while (current <= end) {
    dates.push(getISODateString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
