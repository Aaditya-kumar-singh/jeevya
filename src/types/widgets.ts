import type { AuthState } from '@/types/auth';

export const WIDGET_CONFIG_STORAGE_KEY = 'lifeos:widgets:configurations';

export type WidgetPresetType = 'custom' | 'daily' | 'nutrition' | 'finance' | 'progress';
export type WidgetDensity = 'compact' | 'detailed';

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
  const preferences = raw.displayPreferences && typeof raw.displayPreferences === 'object' ? Object.fromEntries(
    Object.entries(raw.displayPreferences as Record<string, unknown>).filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item)) as [string, string | number | boolean][],
  ) : undefined;
  return {
    id: raw.id,
    ...(typeof raw.title === 'string' && raw.title.trim() ? { title: raw.title.trim().slice(0, 80) } : {}),
    preset,
    density,
    modules,
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

