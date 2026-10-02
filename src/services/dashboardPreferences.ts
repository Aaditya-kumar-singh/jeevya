import AsyncStorage from '@react-native-async-storage/async-storage';

export type DashboardCardId = 'pulse' | 'attention' | 'progress' | 'quickActions' | 'habits' | 'tasks' | 'health' | 'goals' | 'finance';

export interface DashboardPreferences {
  order: DashboardCardId[];
  hidden: DashboardCardId[];
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  order: ['pulse','attention','progress','quickActions','habits','tasks','health','goals','finance'],
  hidden: [],
};

const KEY = 'jeevya:dashboard:preferences';

export async function getDashboardPreferences(): Promise<DashboardPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_DASHBOARD_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<DashboardPreferences>;
    const valid = DEFAULT_DASHBOARD_PREFERENCES.order;
    const order = [...new Set([...(parsed.order ?? []), ...valid])].filter((id): id is DashboardCardId => valid.includes(id as DashboardCardId));
    const hidden = (parsed.hidden ?? []).filter((id): id is DashboardCardId => valid.includes(id as DashboardCardId));
    return { order, hidden };
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES;
  }
}

export async function saveDashboardPreferences(preferences: DashboardPreferences): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(preferences));
}
