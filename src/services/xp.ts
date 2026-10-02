import { loadData, saveData } from '@/lib/storage';
import { uid } from '@/lib/uid';

export type XPCategory = 'mind' | 'body' | 'life' | 'money';
export type XPAction =
  | 'task_completed'
  | 'habit_completed'
  | 'workout_completed'
  | 'outdoor_workout_completed'
  | 'food_logged'
  | 'water_logged'
  | 'journal_entry'
  | 'book_progress'
  | 'daily_goal'
  | 'weekly_review';

export interface XPEvent {
  id: string;
  source: string;
  sourceId: string;
  category: XPCategory;
  action: XPAction;
  baseXp: number;
  bonusXp: number;
  totalXp: number;
  date: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface XPProgress {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  xpToNextLevel: number;
  rank: string;
  streakDays: number;
  todayXp: number;
  todayCap: number;
  categoryXp: Record<XPCategory, number>;
}

const XP_EVENTS_KEY = 'jeevya:xp-events';
export const DAILY_XP_CAP = 200;

export const XP_RULES: Record<XPAction, { baseXp: number; category: XPCategory; label: string }> = {
  task_completed: { baseXp: 10, category: 'life', label: 'Task completed' },
  habit_completed: { baseXp: 15, category: 'life', label: 'Habit completed' },
  workout_completed: { baseXp: 30, category: 'body', label: 'Workout completed' },
  outdoor_workout_completed: { baseXp: 40, category: 'body', label: 'Outdoor workout completed' },
  food_logged: { baseXp: 5, category: 'body', label: 'Food logged' },
  water_logged: { baseXp: 5, category: 'body', label: 'Water logged' },
  journal_entry: { baseXp: 10, category: 'mind', label: 'Journal entry' },
  book_progress: { baseXp: 10, category: 'mind', label: 'Reading progress' },
  daily_goal: { baseXp: 25, category: 'life', label: 'Daily goal completed' },
  weekly_review: { baseXp: 50, category: 'mind', label: 'Weekly review' },
};

const RANKS = [
  { min: 50, name: 'Transcendent' },
  { min: 40, name: 'Elite' },
  { min: 30, name: 'Master' },
  { min: 20, name: 'Achiever' },
  { min: 15, name: 'Disciplined' },
  { min: 10, name: 'Builder' },
  { min: 5, name: 'Explorer' },
  { min: 1, name: 'Starter' },
] as const;

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000] as const;

function levelStart(level: number): number {
  if (level <= 1) return 0;
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1];
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length) * 300;
}

export function getLevelForXp(totalXp: number): number {
  let level = 1;
  while (level < 1000 && levelStart(level + 1) <= totalXp) level += 1;
  return level;
}

export function getRankForLevel(level: number): string {
  return RANKS.find((rank) => level >= rank.min)?.name ?? 'Unranked';
}

export function buildXPProgress(events: XPEvent[]): XPProgress {
  const totalXp = events.reduce((sum, event) => sum + event.totalXp, 0);
  const level = getLevelForXp(totalXp);
  const start = levelStart(level);
  const next = levelStart(level + 1);
  const categoryXp: Record<XPCategory, number> = { mind: 0, body: 0, life: 0, money: 0 };
  for (const event of events) categoryXp[event.category] += event.totalXp;

  const dates = new Set(events.map((event) => event.date));
  let streakDays = 0;
  const cursor = new Date();
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayXp = events.filter((event) => event.date === today).reduce((sum, event) => sum + event.totalXp, 0);

  return {
    totalXp,
    level,
    currentLevelXp: Math.max(0, totalXp - start),
    nextLevelXp: Math.max(1, next - start),
    progressPercent: Math.min(100, Math.round(((totalXp - start) / Math.max(1, next - start)) * 100)),
    xpToNextLevel: Math.max(0, next - totalXp),
    rank: getRankForLevel(level),
    streakDays,
    todayXp,
    todayCap: DAILY_XP_CAP,
    categoryXp,
  };
}

export async function getXPEvents(): Promise<XPEvent[]> {
  const events = await loadData<XPEvent[]>(XP_EVENTS_KEY, []);
  return Array.isArray(events) ? events : [];
}

export async function awardXP(input: {
  source: string;
  sourceId: string;
  action: XPAction;
  date?: string;
  metadata?: XPEvent['metadata'];
}): Promise<XPEvent | null> {
  const rule = XP_RULES[input.action];
  if (!rule) return null;
  const events = await getXPEvents();
  const duplicate = events.find(
    (event) => event.source === input.source && event.sourceId === input.sourceId && event.action === input.action,
  );
  if (duplicate) return null;

  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const todayXp = events
    .filter((event) => event.date === date)
    .reduce((sum, event) => sum + event.totalXp, 0);
  const remaining = Math.max(0, DAILY_XP_CAP - todayXp);
  const totalXp = Math.min(rule.baseXp, remaining);
  if (totalXp <= 0) return null;

  const event: XPEvent = {
    id: uid('xp_'),
    source: input.source,
    sourceId: input.sourceId,
    category: rule.category,
    action: input.action,
    baseXp: rule.baseXp,
    bonusXp: 0,
    totalXp,
    date,
    createdAt: new Date().toISOString(),
    metadata: input.metadata,
  };
  await saveData(XP_EVENTS_KEY, [event, ...events]);
  return event;
}

export async function getXPProgress(): Promise<XPProgress> {
  return buildXPProgress(await getXPEvents());
}

export async function getRecentXPEvents(limit = 20): Promise<XPEvent[]> {
  return (await getXPEvents()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export { levelStart };
