import { todayCivilDate } from '@/lib/date';
import { getLifeOSDailyState } from '@/services/lifeosIntegration';
import { buildDailyPulse } from '@/services/dailyPulse';
import { getDailyPlan } from '@/services/dailyPlan';
import { getLifeIntelligence } from '@/services/lifeIntelligence';
import { getBudgetSpending } from '@/services/finance';
import { readStorage, updateStorage } from '@/services/storageReliability';
import { canAccess } from '@/services/capabilities';
import type { AuthState } from '@/types/auth';
import type { DailyPlanModel } from '@/types/dailyPlan';
import type { LifeIntelligenceResult } from '@/types/lifeIntelligence';
import type { LifeOSDailyState } from '@/types/lifeosIntegration';
import {
  DEFAULT_WIDGET_CONFIGURATION,
  WIDGET_ACTIONS,
  WIDGET_CONFIG_STORAGE_KEY,
  canUseWidgetModule,
  sanitizeWidgetConfigurations,
  type WidgetConfiguration,
  type WidgetModule,
  type WidgetModuleSnapshot,
  type WidgetSnapshot,
} from '@/types/widgets';

function now(): string { return new Date().toISOString(); }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function selectValues(values: Record<string, number | string | boolean>, selectedMetrics: string[] | undefined): Record<string, number | string | boolean> {
  if (!selectedMetrics?.length) return values;
  const selected = new Set(selectedMetrics);
  return Object.fromEntries(Object.entries(values).filter(([key]) => selected.has(key)));
}

export async function getWidgetConfigurations(): Promise<WidgetConfiguration[]> {
  const stamp = now();
  const result = await readStorage<unknown>(WIDGET_CONFIG_STORAGE_KEY, []);
  const configs = sanitizeWidgetConfigurations(result.value, stamp);
  return configs.length ? configs : [{ ...DEFAULT_WIDGET_CONFIGURATION, createdAt: stamp, updatedAt: stamp }];
}

export async function saveWidgetConfigurations(configurations: WidgetConfiguration[]): Promise<WidgetConfiguration[]> {
  const stamp = now();
  const clean = sanitizeWidgetConfigurations(configurations, stamp);
  if (!clean.length) throw new Error('At least one valid widget configuration is required');
  await updateStorage<unknown>(WIDGET_CONFIG_STORAGE_KEY, [], () => clean);
  return clean;
}

export async function upsertWidgetConfiguration(configuration: WidgetConfiguration): Promise<WidgetConfiguration[]> {
  const current = await getWidgetConfigurations();
  const next = current.filter((item) => item.id !== configuration.id);
  const stamp = now();
  const normalized = sanitizeWidgetConfigurations([{ ...configuration, updatedAt: stamp }], stamp)[0];
  if (!normalized) throw new Error('Invalid widget configuration');
  return saveWidgetConfigurations([...next, normalized]);
}

export async function deleteWidgetConfiguration(id: string): Promise<WidgetConfiguration[]> {
  const current = await getWidgetConfigurations();
  const next = current.filter((item) => item.id !== id);
  if (!next.length) {
    const stamp = now();
    return saveWidgetConfigurations([{ ...DEFAULT_WIDGET_CONFIGURATION, createdAt: stamp, updatedAt: stamp }]);
  }
  return saveWidgetConfigurations(next);
}

function snapshotForModule(module: WidgetModule, state: LifeOSDailyState, plan: DailyPlanModel | null, intelligence: LifeIntelligenceResult | null, budgets: Awaited<ReturnType<typeof getBudgetSpending>>): WidgetModuleSnapshot | null {
  const degraded = new Set(state.dataQuality?.degradedDomains ?? []);
  const action = WIDGET_ACTIONS[module];
  if (module === 'tasks') {
    if (degraded.has('tasks') || state.tasks.total <= 0) return null;
    return { module, available: true, values: { total: state.tasks.total, dueToday: state.tasks.dueToday, overdue: state.tasks.overdue, completedToday: state.tasks.completedToday }, action };
  }
  if (module === 'habits') {
    if (degraded.has('habits') || state.habits.activeToday <= 0) return null;
    return { module, available: true, values: { scheduled: state.habits.activeToday, completedToday: state.habits.completedToday, ...(state.habits.completionRate == null ? {} : { completionRate: state.habits.completionRate }) }, action };
  }
  if (module === 'workout') {
    if (degraded.has('health') || (!state.health.activeWorkout && state.health.completedWorkoutsToday <= 0)) return null;
    return { module, available: true, values: { active: state.health.activeWorkout, completedToday: state.health.completedWorkoutsToday, ...(finite(state.health.completedWorkoutMinutes) ? { completedMinutes: state.health.completedWorkoutMinutes } : {}) }, action };
  }
  if (module === 'sleep') {
    if (degraded.has('health') || !state.health.sleep) return null;
    return { module, available: true, values: { durationMinutes: state.health.sleep.durationMinutes, quality: state.health.sleep.quality }, action };
  }
  if (module === 'recovery') {
    if (degraded.has('health') || !state.health.recovery?.available || !finite(state.health.recovery.readinessScore)) return null;
    return { module, available: true, values: { readinessScore: state.health.recovery.readinessScore, ...(state.health.recovery.readinessLevel ? { readinessLevel: state.health.recovery.readinessLevel } : {}) }, action };
  }
  if (module === 'calories' || module === 'protein' || module === 'carbohydrates' || module === 'fat') {
    if (degraded.has('nutrition') || state.nutrition.summary.loggedCount <= 0) return null;
    const key = module === 'calories' ? 'calories' : module === 'protein' ? 'protein' : module === 'carbohydrates' ? 'carbohydrates' : 'fat';
    const value = state.nutrition.summary.totals[key];
    if (!finite(value)) return null;
    return { module, available: true, values: { [key]: value }, action };
  }
  if (module === 'water') return null;
  if (module === 'finance_spending') {
    if (degraded.has('finance') || state.finance.transactionsToday <= 0) return null;
    return { module, available: true, values: { expenseToday: state.finance.expenseToday, transactionsToday: state.finance.transactionsToday }, action };
  }
  if (module === 'finance_budget') {
    if (degraded.has('finance') || !budgets.length) return null;
    const totalBudget = budgets.reduce((sum, item) => sum + item.budgetAmount, 0);
    const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0);
    if (!finite(totalBudget) || totalBudget <= 0) return null;
    return { module, available: true, values: { totalBudget, totalSpent, remaining: Math.max(0, totalBudget - totalSpent), percentage: Math.round((totalSpent / totalBudget) * 100) }, action };
  }
  if (module === 'savings') {
    const goals = state.goals.filter((goal) => goal.source === 'finance');
    if (degraded.has('goals') || !goals.length) return null;
    const current = goals.reduce((sum, goal) => sum + (finite(goal.currentValue) ? goal.currentValue : 0), 0);
    const target = goals.reduce((sum, goal) => sum + (finite(goal.targetValue) ? goal.targetValue : 0), 0);
    if (!target) return null;
    return { module, available: true, values: { current, target, percentage: Math.round((current / target) * 100) }, action };
  }
  if (module === 'books') {
    if (degraded.has('books') || state.books.currentlyReading <= 0) return null;
    return { module, available: true, values: { currentlyReading: state.books.currentlyReading }, action };
  }
  if (module === 'goals') {
    if (degraded.has('goals') || !state.goals.length) return null;
    return { module, available: true, values: { total: state.goals.length, active: state.goals.filter((goal) => goal.status === 'active').length, completed: state.goals.filter((goal) => goal.status === 'completed').length, behind: state.goals.filter((goal) => goal.status === 'behind').length }, action };
  }
  if (module === 'daily_pulse') {
    if (degraded.size === 0 && state.tasks.total + state.habits.activeToday + state.books.currentlyReading === 0 && !state.health.sleep && !state.health.recovery) return null;
    const pulse = buildDailyPulse(state);
    return { module, available: true, values: { itemCount: pulse.items.length, focusCount: pulse.focus.length, progressCount: pulse.progress.length }, action };
  }
  if (module === 'daily_plan') {
    if (!plan || plan.items.length === 0) return null;
    return { module, available: true, values: { total: plan.summary.total, pending: plan.summary.pending, overdue: plan.summary.overdue, dueToday: plan.summary.dueToday, completed: plan.summary.completed }, action };
  }
  if (module === 'life_intelligence') {
    if (!intelligence || intelligence.insights.length === 0) return null;
    return { module, available: true, values: { insightCount: intelligence.insights.length, warningCount: intelligence.insights.filter((item) => item.severity === 'warning').length }, action };
  }
  return null;
}

export async function buildWidgetSnapshot(configuration: WidgetConfiguration, date: string = todayCivilDate(), context: { authState?: AuthState } = {}): Promise<WidgetSnapshot> {
  const authState = context.authState ?? 'guest';
  const state = await getLifeOSDailyState(date);
  let plan: DailyPlanModel | null = null;
  let intelligence: LifeIntelligenceResult | null = null;
  let budgets: Awaited<ReturnType<typeof getBudgetSpending>> = [];
  try { if (configuration.modules.includes('daily_plan') || configuration.modules.includes('daily_pulse')) plan = await getDailyPlan(date); } catch { plan = null; }
  try { if (configuration.modules.includes('life_intelligence')) intelligence = await getLifeIntelligence(date); } catch { intelligence = null; }
  try { if (configuration.modules.includes('finance_budget')) budgets = await getBudgetSpending(date.slice(0, 7)); } catch { budgets = []; }

  const modules = configuration.modules
    .filter((module) => canUseWidgetModule(module, authState) && canAccess(module === 'daily_pulse' ? 'dailyPulse' : module === 'daily_plan' ? 'dailyPlan' : module === 'life_intelligence' ? 'lifeIntelligence' : module === 'finance_spending' || module === 'finance_budget' || module === 'savings' ? 'finance' : module === 'workout' || module === 'sleep' || module === 'recovery' || module === 'calories' || module === 'protein' || module === 'carbohydrates' || module === 'fat' || module === 'water' ? 'nutrition' : module, authState))
    .map((module) => snapshotForModule(module, state, plan, intelligence, budgets))
    .filter((item): item is WidgetModuleSnapshot => item !== null)
    .map((item) => ({ ...item, values: selectValues(item.values, configuration.selectedMetrics) }))
    .filter((item) => Object.keys(item.values).length > 0);

  return {
    configurationId: configuration.id,
    date,
    generatedAt: now(),
    density: configuration.density,
    ...(configuration.title ? { title: configuration.title } : {}),
    modules,
    degradedDomains: [...new Set(state.dataQuality?.degradedDomains ?? [])].sort(),
  };
}

export async function getWidgetSnapshot(id: string, date: string = todayCivilDate(), context: { authState?: AuthState } = {}): Promise<WidgetSnapshot | null> {
  const configuration = (await getWidgetConfigurations()).find((item) => item.id === id);
  return configuration ? buildWidgetSnapshot(configuration, date, context) : null;
}




