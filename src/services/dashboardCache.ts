import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DashboardState } from '@/types/dashboard';

const TTL = 2 * 60 * 1000;
const key = (date: string) => `jeevya:dashboard:cache:${date}`;

export async function getDashboardCache(date: string): Promise<DashboardState | null> {
  try {
    const raw = await AsyncStorage.getItem(key(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: DashboardState };
    if (!parsed?.data || Date.now() - parsed.savedAt > TTL) return null;
    return parsed.data;
  } catch { return null; }
}

export async function setDashboardCache(date: string, data: DashboardState): Promise<void> {
  try { await AsyncStorage.setItem(key(date), JSON.stringify({ savedAt: Date.now(), data })); } catch {}
}
