import type { AuthState } from '@/types/auth';

export const WIDGET_CONFIG_STORAGE_KEY = 'jeevya:widgets:configurations';

export type WidgetPresetType = 'custom' | 'daily' | 'nutrition' | 'finance' | 'progress';
export type WidgetDensity = 'compact' | 'detailed';
export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetLayout = 'stack' | 'split' | 'grid' | 'hero_list';

export interface WidgetTheme {
  backgroundColor: string;
  opacity: number;
  accentColor: string;
  textColor: string;
  radius: number;
}

export interface WidgetSlotConfig {
  slotId: string;
  module: WidgetModule;
  enabled: boolean;
  metricKeys?: string[];
  customTitle?: string;
}

export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  backgroundColor: '#FFFFFF',
  opacity: 1,
  accentColor: '#6366F1',
  textColor: '#0F0F19',
  radius: 18,
};

export type WidgetModule =
  | 'tasks' | 'habits' | 'workout' | 'sleep' | 'recovery'
  | 'calories' | 'protein' | 'carbohydrates' | 'fat' | 'water'
  | 'finance_spending' | 'finance_budget' | 'savings' | 'books' | 'goals'
  | 'daily_pulse' | 'daily_plan' | 'life_intelligence';

export interface WidgetConfiguration {
  id: string;
  title?: string;
  preset: WidgetPresetType;
  density: WidgetDensity;
  modules: WidgetModule[];
  slots?: WidgetSlotConfig[];
  size?: WidgetSize;
  layout?: WidgetLayout;
  theme?: WidgetTheme;
  selectedMetrics?: string[];
  displayPreferences?: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetAction {
  label: string;
  navigationTarget: string;
}

export interface WidgetModuleSnapshot {
  module: WidgetModule;
  available: boolean;
  values: Record<string, number | string | boolean>;
  action: WidgetAction;
}

export interface WidgetSnapshot {
  configurationId: string;
  date: string;
  generatedAt: string;
  density: WidgetDensity;
  size?: WidgetSize;
  layout?: WidgetLayout;
  theme?: WidgetTheme;
  title?: string;
  modules: WidgetModuleSnapshot[];
  degradedDomains: string[];
}

export interface WidgetConfigurationStoreResult {
  configurations: WidgetConfiguration[];
  status: 'ok' | 'missing' | 'malformed' | 'unavailable';
}

export interface WidgetProjectionContext {
  authState?: AuthState;
}

export const WIDGET_MODULE_LABELS: Record<WidgetModule, string> = {
  tasks: 'Tasks', habits: 'Habits', workout: 'Workout', sleep: 'Sleep', recovery: 'Recovery',
  calories: 'Calories', protein: 'Protein', carbohydrates: 'Carbohydrates', fat: 'Fat', water: 'Water',
  finance_spending: 'Spending', finance_budget: 'Budget', savings: 'Savings', books: 'Books', goals: 'Goals',
  daily_pulse: 'Daily Pulse', daily_plan: 'Daily Plan', life_intelligence: 'Life Intelligence',
};

export const WIDGET_MODULES: readonly WidgetModule[] = [
  'tasks', 'habits', 'workout', 'sleep', 'recovery',
  'calories', 'protein', 'carbohydrates', 'fat', 'water',
  'finance_spending', 'finance_budget', 'savings', 'books', 'goals',
  'daily_pulse', 'daily_plan', 'life_intelligence',
];

export const DEFAULT_WIDGET_CONFIGURATION: Omit<WidgetConfiguration, 'createdAt' | 'updatedAt'> = {
  id: 'widget_default',
  preset: 'daily',
  density: 'compact',
  modules: ['tasks', 'habits', 'daily_plan'],
  selectedMetrics: [],
};

export const WIDGET_ACTIONS: Record<WidgetModule, WidgetAction> = {
  tasks: { label: 'Open Tasks', navigationTarget: '/tasks' },
  habits: { label: 'Open Habits', navigationTarget: '/habits' },
  workout: { label: 'Open Workout', navigationTarget: '/health/workout' },
  sleep: { label: 'Open Sleep', navigationTarget: '/health/sleep' },
  recovery: { label: 'Open Recovery', navigationTarget: '/health/recovery' },
  calories: { label: 'Open Nutrition', navigationTarget: '/nutrition' },
  protein: { label: 'Open Nutrition', navigationTarget: '/nutrition' },
  carbohydrates: { label: 'Open Nutrition', navigationTarget: '/nutrition' },
  fat: { label: 'Open Nutrition', navigationTarget: '/nutrition' },
  water: { label: 'Open Health', navigationTarget: '/health' },
  finance_spending: { label: 'Open Finance', navigationTarget: '/finance' },
  finance_budget: { label: 'Open Budget', navigationTarget: '/finance/budget' },
  savings: { label: 'Open Savings', navigationTarget: '/finance/savings-goals' },
  books: { label: 'Open Books', navigationTarget: '/books' },
  goals: { label: 'Open Goals', navigationTarget: '/goals' },
  daily_pulse: { label: 'Open Daily Pulse', navigationTarget: '/' },
  daily_plan: { label: 'Open Daily Plan', navigationTarget: '/' },
  life_intelligence: { label: 'Open Life Intelligence', navigationTarget: '/insights' },
};

export function isWidgetModule(value: unknown): value is WidgetModule {
  return typeof value === 'string' && (WIDGET_MODULES as readonly string[]).includes(value);
}

export function normalizeWidgetConfiguration(value: unknown, now: string): WidgetConfiguration | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  const modules = Array.isArray(raw.modules) ? [...new Set(raw.modules.filter(isWidgetModule))] : [];
  if (!modules.length) return null;
  const preset: WidgetPresetType = raw.preset === 'daily' || raw.preset === 'nutrition' || raw.preset === 'finance' || raw.preset === 'progress' ? raw.preset : 'custom';
  const density: WidgetDensity = raw.density === 'detailed' ? 'detailed' : 'compact';
  const metrics = Array.isArray(raw.selectedMetrics) ? raw.selectedMetrics.filter((item): item is string => typeof item === 'string').slice(0, 50) : [];
  const size: WidgetSize = raw.size === 'small' || raw.size === 'large' ? raw.size : 'medium';
  const layout: WidgetLayout = raw.layout === 'split' || raw.layout === 'grid' || raw.layout === 'hero_list' ? raw.layout : 'stack';
  const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
  const slots: WidgetSlotConfig[] = rawSlots.reduce<WidgetSlotConfig[]>((result, slot, index) => {
    const item = slot as Record<string, unknown>;
    const module = isWidgetModule(item.module) ? item.module : modules[index];
    if (!module) return result;
    result.push({
      slotId: typeof item.slotId === 'string' && item.slotId ? item.slotId : 'slot_' + (index + 1),
      module,
      enabled: item.enabled !== false,
      ...(Array.isArray(item.metricKeys) ? { metricKeys: item.metricKeys.filter((value): value is string => typeof value === 'string').slice(0, 20) } : {}),
      ...(typeof item.customTitle === 'string' ? { customTitle: item.customTitle.slice(0, 50) } : {}),
    });
    return result;
  }, []).slice(0, 12);
  const themeRaw = raw.theme && typeof raw.theme === 'object' ? raw.theme as Record<string, unknown> : {};
  const theme: WidgetTheme = {
    backgroundColor: typeof themeRaw.backgroundColor === 'string' ? themeRaw.backgroundColor : DEFAULT_WIDGET_THEME.backgroundColor,
    opacity: typeof themeRaw.opacity === 'number' ? Math.max(0.35, Math.min(1, themeRaw.opacity)) : DEFAULT_WIDGET_THEME.opacity,
    accentColor: typeof themeRaw.accentColor === 'string' ? themeRaw.accentColor : DEFAULT_WIDGET_THEME.accentColor,
    textColor: typeof themeRaw.textColor === 'string' ? themeRaw.textColor : DEFAULT_WIDGET_THEME.textColor,
    radius: typeof themeRaw.radius === 'number' ? Math.max(8, Math.min(32, themeRaw.radius)) : DEFAULT_WIDGET_THEME.radius,
  };
  const preferences = raw.displayPreferences && typeof raw.displayPreferences === 'object' ? Object.fromEntries(
    Object.entries(raw.displayPreferences as Record<string, unknown>).filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item)) as [string, string | number | boolean][],
  ) : undefined;
  return {
    id: raw.id,
    ...(typeof raw.title === 'string' && raw.title.trim() ? { title: raw.title.trim().slice(0, 80) } : {}),
    preset,
    density,
    modules,
    slots: slots.length ? slots : modules.map((module, index) => ({ slotId: 'slot_' + (index + 1), module, enabled: true })),
    size,
    layout,
    theme,
    selectedMetrics: metrics,
    ...(preferences && Object.keys(preferences).length ? { displayPreferences: preferences } : {}),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  };
}

export function sanitizeWidgetConfigurations(value: unknown, now: string): WidgetConfiguration[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.map((item) => normalizeWidgetConfiguration(item, now)).filter((item): item is WidgetConfiguration => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function canUseWidgetModule(module: WidgetModule, authState: AuthState = 'guest'): boolean {
  if (authState === 'loading') return false;
  return module !== 'water';
}

