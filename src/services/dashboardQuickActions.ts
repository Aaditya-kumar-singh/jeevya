import { loadData, saveData } from '@/lib/storage';

export type QuickActionId = 'workout' | 'task' | 'expense' | 'journal';

export interface QuickActionConfig {
  id: QuickActionId;
  label: string;
  href: string;
  enabled: boolean;
}

const KEY = 'jeevya:dashboard:quick-actions:v1';

const DEFAULTS: QuickActionConfig[] = [
  { id: 'workout', label: 'Workout', href: '/health/workout-builder', enabled: true },
  { id: 'task', label: 'Add Task', href: '/(tabs)/tasks', enabled: true },
  { id: 'expense', label: 'Add Expense', href: '/finance/transactions', enabled: true },
  { id: 'journal', label: 'Journal', href: '/journal', enabled: true },
];

export async function getQuickActionConfigs(): Promise<QuickActionConfig[]> {
  const saved = await loadData<QuickActionConfig[]>(KEY, DEFAULTS);
  if (!Array.isArray(saved)) return DEFAULTS;
  const byId = new Map(saved.map((item) => [item.id, item]));
  return DEFAULTS.map((item) => ({ ...item, ...byId.get(item.id) }));
}

export async function saveQuickActionConfigs(configs: QuickActionConfig[]): Promise<void> {
  const allowed = new Set(DEFAULTS.map((item) => item.id));
  const normalized = configs.filter((item) => allowed.has(item.id)).map((item) => ({
    ...item,
    label: item.label.trim().slice(0, 28) || DEFAULTS.find((d) => d.id === item.id)?.label || item.id,
  }));
  await saveData(KEY, normalized);
}

export async function resetQuickActionConfigs(): Promise<QuickActionConfig[]> {
  await saveData(KEY, DEFAULTS);
  return DEFAULTS;
}
