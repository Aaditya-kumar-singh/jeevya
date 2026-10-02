import { todayCivilDate } from '@/lib/date';
import { loadData, saveData } from '@/lib/storage';

export const HYDRATION_LOGS_KEY = 'jeevya:health:hydration-logs';
export const HYDRATION_GOAL_KEY = 'jeevya:health:hydration-goal';

export interface HydrationLog {
  id: string;
  date: string;
  amountMl: number;
  createdAt: string;
}

export interface HydrationSummary {
  date: string;
  amountMl: number;
  goalMl: number | null;
  loggedCount: number;
}

function uid(): string {
  return 'water_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function normalizeLogs(value: unknown): HydrationLog[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is HydrationLog => {
    if (!item || typeof item !== 'object') return false;
    const row = item as Record<string, unknown>;
    return typeof row.id === 'string' && typeof row.date === 'string' && Number.isFinite(row.amountMl) && Number(row.amountMl) > 0 && typeof row.createdAt === 'string';
  }).map((row) => ({ ...row, amountMl: Math.round(Number(row.amountMl)) }));
}

export async function getHydrationLogs(): Promise<HydrationLog[]> {
  return normalizeLogs(await loadData<unknown>(HYDRATION_LOGS_KEY, []));
}

export async function getHydrationGoal(): Promise<number | null> {
  const value = await loadData<unknown>(HYDRATION_GOAL_KEY, null);
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

export async function setHydrationGoal(goalMl: number | null): Promise<number | null> {
  const normalized = goalMl == null ? null : Math.round(goalMl);
  if (normalized !== null && (!Number.isFinite(normalized) || normalized <= 0 || normalized > 20000)) {
    throw new Error('Hydration goal must be between 1 and 20,000 ml');
  }
  await saveData(HYDRATION_GOAL_KEY, normalized);
  return normalized;
}

export async function addHydration(amountMl: number, date: string = todayCivilDate()): Promise<HydrationLog> {
  if (!Number.isFinite(amountMl) || amountMl <= 0 || amountMl > 5000) throw new Error('Hydration amount must be between 1 and 5,000 ml');
  const item: HydrationLog = { id: uid(), date, amountMl: Math.round(amountMl), createdAt: new Date().toISOString() };
  const logs = await getHydrationLogs();
  await saveData(HYDRATION_LOGS_KEY, [item, ...logs]);
  return item;
}

export async function deleteHydrationLog(id: string): Promise<boolean> {
  const logs = await getHydrationLogs();
  const next = logs.filter((item) => item.id !== id);
  if (next.length === logs.length) return false;
  await saveData(HYDRATION_LOGS_KEY, next);
  return true;
}

export async function getHydrationSummary(date: string = todayCivilDate()): Promise<HydrationSummary> {
  const [logs, goalMl] = await Promise.all([getHydrationLogs(), getHydrationGoal()]);
  const today = logs.filter((item) => item.date === date);
  return { date, amountMl: today.reduce((sum, item) => sum + item.amountMl, 0), goalMl, loggedCount: today.length };
}
