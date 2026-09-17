import { isValidCivilDate, todayCivilDate } from '@/lib/date';
import { getLifeOSDailyState } from '@/services/lifeosIntegration';
import type { DailyPlanModel } from '@/types/dailyPlan';
import type { DailyPulseModel } from '@/services/dailyPulse';
import type { LifeOSDailyState } from '@/types/lifeosIntegration';
import { readStorage } from '@/services/storageReliability';
import type { SyncConflict } from '@/types/sync';
import type {
  DataQualityDiagnostic,
  DataQualityDomain,
  DataQualityDomainStatus,
  DataQualityModel,
  DataQualitySeverity,
  DataQualityStatus,
} from '@/types/dataQuality';

const domains: DataQualityDomain[] = [
  'tasks', 'habits', 'health', 'sleep', 'recovery', 'nutrition', 'finance', 'books', 'journal', 'goals', 'integration',
];

const statusRank: Record<DataQualityStatus, number> = { unavailable: 0, degraded: 1, warning: 2, healthy: 3 };
const severityRank: Record<DataQualitySeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * 3K route contract expressed as validation patterns, not a route registry.
 * These are only the authoritative destinations already used by LifeOS.
 */
export function isValidNavigationTarget(target: string | undefined): boolean {
  if (!target || !target.startsWith('/')) return false;
  return [
    /^\/tasks(?:\/[^/]+)?$/,
    /^\/habits(?:\/[^/]+)?$/,
    /^\/health\/workout$/,
    /^\/health\/workout-session\/[^/]+$/,
    /^\/health\/sleep$/,
    /^\/health\/recovery$/,
    /^\/nutrition(?:\/targets)?$/,
    /^\/finance(?:\/budget)?$/,
    /^\/books$/,
    /^\/journal(?:\/new)?$/,
    /^\/goals$/,
    /^\/insights$/,
    /^\/search$/,
    /^\/analytics$/,
    /^\/weekly-review$/,
    /^\/settings$/,
    /^\/$/,
    /^\/data-quality$/,
  ].some((pattern) => pattern.test(target));
}

function addDiagnostic(items: DataQualityDiagnostic[], diagnostic: DataQualityDiagnostic): void {
  if (!items.some((item) => item.stableId === diagnostic.stableId)) items.push(diagnostic);
}

function failureDiagnostic(domain: DataQualityDomain): DataQualityDiagnostic {
  return {
    domain,
    status: 'unavailable',
    severity: 'critical',
    issue: 'Domain data could not be read',
    description: `The ${domain} data source reported a read failure. Existing LifeOS data was not modified.`,
    affectedArea: domain,
    actionable: true,
    route: domainRoute(domain),
    stableId: `data-quality:${domain}:read-failure`,
  };
}

function domainRoute(domain: DataQualityDomain): string | undefined {
  switch (domain) {
    case 'tasks': return '/tasks';
    case 'habits': return '/habits';
    case 'health':
    case 'sleep':
    case 'recovery': return domain === 'sleep' ? '/health/sleep' : domain === 'recovery' ? '/health/recovery' : '/health/workout';
    case 'nutrition': return '/nutrition';
    case 'finance': return '/finance';
    case 'books': return '/books';
    case 'journal': return '/journal';
    case 'goals': return '/goals';
    case 'integration': return '/';
  }
}

function validateRoute(items: DataQualityDiagnostic[], domain: DataQualityDomain, stableId: string, target: string | undefined, affectedArea: string): void {
  if (!target || isValidNavigationTarget(target)) return;
  addDiagnostic(items, {
    domain,
    status: 'degraded',
    severity: 'critical',
    issue: 'Unreachable navigation target',
    description: `The affected action points to an invalid LifeOS destination (${target}).`,
    affectedArea,
    actionable: false,
    stableId: `data-quality:${stableId}:route`,
  });
}

function validateTaskData(state: LifeOSDailyState, items: DataQualityDiagnostic[]): void {
  for (const task of [...(state.tasks.overdueTasks ?? []), ...(state.tasks.incompleteDueTodayTasks ?? [])]) {
    if (!task?.id || !task?.title?.trim()) {
      addDiagnostic(items, {
        domain: 'tasks', status: 'degraded', severity: 'warning',
        issue: 'Incomplete task reference', description: 'A task exposed by the integration snapshot is missing a required identifier or title.',
        affectedArea: 'Task actions', actionable: true, route: '/tasks', stableId: `data-quality:tasks:invalid-reference:${task?.id ?? 'missing'}`,
      });
      break;
    }
  }
}

function validateHabitData(state: LifeOSDailyState, items: DataQualityDiagnostic[]): void {
  for (const habit of state.habits.remainingToday ?? []) {
    if (!habit?.id || !habit?.name?.trim()) {
      addDiagnostic(items, {
        domain: 'habits', status: 'degraded', severity: 'warning',
        issue: 'Incomplete habit reference', description: 'A scheduled habit exposed by the integration snapshot is missing a required identifier or name.',
        affectedArea: 'Habit actions', actionable: true, route: '/habits', stableId: `data-quality:habits:invalid-reference:${habit?.id ?? 'missing'}`,
      });
      break;
    }
  }
}

function validateHealthData(state: LifeOSDailyState, items: DataQualityDiagnostic[]): void {
  if (state.health.activeWorkout && state.health.activeWorkoutId !== null && state.health.activeWorkoutId !== undefined && !state.health.activeWorkoutId.trim()) {
    addDiagnostic(items, {
      domain: 'health', status: 'degraded', severity: 'warning',
      issue: 'Invalid active workout reference', description: 'An active workout is reported with an unusable session identifier.',
      affectedArea: 'Workout session', actionable: true, route: '/health/workout', stableId: 'data-quality:health:active-workout-reference',
    });
  }
  const sleep = state.health.sleep;
  if (sleep && (!isValidCivilDate(sleep.date) || sleep.durationMinutes < 0 || !Number.isFinite(sleep.durationMinutes))) {
    addDiagnostic(items, {
      domain: 'sleep', status: 'degraded', severity: 'warning', issue: 'Invalid sleep record',
      description: 'The recorded sleep snapshot contains an invalid date or duration.', affectedArea: 'Sleep', actionable: true, route: '/health/sleep', stableId: 'data-quality:sleep:invalid-record',
    });
  }
  const recovery = state.health.recovery;
  if (recovery && (!isValidCivilDate(recovery.date) || !Number.isFinite(recovery.readinessScore))) {
    addDiagnostic(items, {
      domain: 'recovery', status: 'degraded', severity: 'warning', issue: 'Invalid recovery record',
      description: 'The recorded recovery snapshot contains an invalid date or readiness score.', affectedArea: 'Recovery', actionable: true, route: '/health/recovery', stableId: 'data-quality:recovery:invalid-record',
    });
  }
}

function validateNutritionData(state: LifeOSDailyState, items: DataQualityDiagnostic[]): void {
  const { summary, targets } = state.nutrition;
  if (!summary || !summary.totals) return;
  const calories = summary.totals.calories;
  if (!Number.isFinite(calories) || calories < 0) {
    addDiagnostic(items, {
      domain: 'nutrition', status: 'degraded', severity: 'warning', issue: 'Invalid nutrition total',
      description: 'The nutrition integration exposed a non-finite or negative calorie total.', affectedArea: 'Daily nutrition', actionable: true, route: '/nutrition', stableId: 'data-quality:nutrition:invalid-calorie-total',
    });
  }
  if (targets && (!Number.isFinite(targets.targetCalories) || targets.targetCalories <= 0)) {
    addDiagnostic(items, {
      domain: 'nutrition', status: 'degraded', severity: 'warning', issue: 'Invalid nutrition target',
      description: 'The authoritative nutrition target is present but has an invalid calorie value.', affectedArea: 'Nutrition targets', actionable: true, route: '/nutrition/targets', stableId: 'data-quality:nutrition:invalid-target',
    });
  }
}

function validateFinanceData(state: LifeOSDailyState, items: DataQualityDiagnostic[]): void {
  if (state.finance.accountCount < 0 || state.finance.transactionsToday < 0 || state.finance.incomeToday < 0 || state.finance.expenseToday < 0) {
    addDiagnostic(items, {
      domain: 'finance', status: 'degraded', severity: 'warning', issue: 'Invalid finance summary',
      description: 'The finance integration exposed a negative count or amount in its derived summary.', affectedArea: 'Finance overview', actionable: true, route: '/finance', stableId: 'data-quality:finance:invalid-summary',
    });
  }
  for (const [currency, balance] of Object.entries(state.finance.currencyBreakdown)) {
    if (!currency.trim() || !Number.isFinite(balance)) {
      addDiagnostic(items, {
        domain: 'finance', status: 'degraded', severity: 'warning', issue: 'Invalid account summary',
        description: 'A finance account summary contains a missing currency or non-finite balance.', affectedArea: 'Accounts', actionable: true, route: '/finance', stableId: 'data-quality:finance:invalid-account-summary',
      });
      break;
    }
  }
}

function validateGoalsData(state: LifeOSDailyState, items: DataQualityDiagnostic[]): void {
  for (const goal of state.goals ?? []) {
    const sourceMetricValid = (goal.source === 'books' && (goal.metric === 'books_completed' || goal.metric === 'pages_read')) || (goal.source === 'finance' && goal.metric === 'savings_amount');
    const numericProgressValid = goal.progressPercentage === null || (Number.isFinite(goal.progressPercentage) && goal.progressPercentage >= 0 && goal.progressPercentage <= 100);
    const requiresValues = goal.status === 'active' || goal.status === 'behind' || goal.status === 'completed';
    if (!goal.id || !goal.title?.trim() || !sourceMetricValid || !numericProgressValid || (requiresValues && (goal.targetValue === null || goal.currentValue === null))) {
      addDiagnostic(items, {
        domain: 'goals', status: 'degraded', severity: 'warning', issue: 'Invalid unified goal projection',
        description: 'A unified goal has an invalid source, metric, progress value, or required progress data.', affectedArea: 'Goals & Progress', actionable: true, route: '/goals', stableId: `data-quality:goals:invalid-projection:${goal.id || 'missing'}`,
      });
    }
  }
}

function validateCoreState(state: LifeOSDailyState, items: DataQualityDiagnostic[]): void {
  if (!isValidCivilDate(state.date)) {
    addDiagnostic(items, {
      domain: 'integration', status: 'degraded', severity: 'critical', issue: 'Invalid integration date',
      description: 'The cross-module snapshot is using an invalid civil date.', affectedArea: 'LifeOS integration', actionable: false, stableId: 'data-quality:integration:invalid-date',
    });
  }
  if (!state.tasks || !state.habits || !state.health || !state.nutrition || !state.finance || !state.books || !state.journal || !Array.isArray(state.goals)) {
    addDiagnostic(items, {
      domain: 'integration', status: 'degraded', severity: 'critical', issue: 'Incomplete integration snapshot',
      description: 'A required section of the cross-module read model is missing.', affectedArea: 'LifeOS integration', actionable: false, stableId: 'data-quality:integration:incomplete-snapshot',
    });
  }
}

function validatePlanAndPulse(items: DataQualityDiagnostic[], plan?: DailyPlanModel, pulse?: DailyPulseModel): void {
  for (const item of plan?.items ?? []) {
    if (!item.id || !item.source || !item.title?.trim()) {
      addDiagnostic(items, {
        domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Invalid Daily Plan item',
        description: 'A Daily Plan item is missing required identity data.', affectedArea: 'Daily Plan', actionable: false, stableId: `data-quality:daily-plan:invalid-item:${item.id || 'missing'}`,
      });
    }
    validateRoute(items, 'integration', `daily-plan:${item.id}`, item.navigationTarget, 'Daily Plan');
    if (item.actionType === 'complete_task' && (!item.actionTargetId || item.source !== 'tasks')) {
      addDiagnostic(items, { domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Invalid Daily Plan task action', description: 'A Daily Plan task completion action does not carry a valid task target.', affectedArea: 'Daily Plan', actionable: false, stableId: `data-quality:daily-plan:task-action:${item.id}` });
    }
    if (item.actionType === 'complete_habit' && (!item.actionTargetId || item.source !== 'habits')) {
      addDiagnostic(items, { domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Invalid Daily Plan habit action', description: 'A Daily Plan habit completion action does not carry a valid habit target.', affectedArea: 'Daily Plan', actionable: false, stableId: `data-quality:daily-plan:habit-action:${item.id}` });
    }
  }
  for (const item of pulse?.items ?? []) validateRoute(items, item.source === 'health' ? 'health' : item.source, `daily-pulse:${item.id}`, item.navigationTarget, 'Daily Pulse');
}

const SYNC_CONFLICTS_KEY = 'lifeos:sync:conflicts';
const SYNC_DOMAINS = new Set(['tasks', 'habits', 'books', 'journal', 'finance', 'nutrition', 'workout', 'sleep']);

async function readSyncConflictDiagnostics(): Promise<{ conflicts: SyncConflict[]; malformed: number; duplicateIds: number; unsupportedDomains: number; invalidStatuses: number; stalePending: number }> {
  const result = await readStorage<unknown>(SYNC_CONFLICTS_KEY, []);
  if (result.status === 'missing') return { conflicts: [], malformed: 0, duplicateIds: 0, unsupportedDomains: 0, invalidStatuses: 0, stalePending: 0 };
  if (result.status !== 'ok' || !Array.isArray(result.value)) return { conflicts: [], malformed: 1, duplicateIds: 0, unsupportedDomains: 0, invalidStatuses: 0, stalePending: 0 };
  const seen = new Set<string>(); const conflicts: SyncConflict[] = []; let malformed = 0; let duplicateIds = 0; let unsupportedDomains = 0; let invalidStatuses = 0; let stalePending = 0;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const value of result.value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { malformed++; continue; }
    const item = value as Record<string, unknown>;
    if (typeof item.conflictId !== 'string' || seen.has(item.conflictId)) { if (typeof item.conflictId === 'string') duplicateIds++; else malformed++; }
    if (typeof item.conflictId === 'string') seen.add(item.conflictId);
    if (typeof item.domain !== 'string' || !SYNC_DOMAINS.has(item.domain)) unsupportedDomains++;
    if (!['pending', 'resolved_local', 'resolved_remote', 'resolved_merged'].includes(String(item.status))) invalidStatuses++;
    if (item.status === 'pending' && typeof item.detectedAt === 'string' && Number.isFinite(Date.parse(item.detectedAt)) && Date.parse(item.detectedAt) < cutoff) stalePending++;
    if (typeof item.conflictId === 'string' && typeof item.domain === 'string' && SYNC_DOMAINS.has(item.domain) && typeof item.storageKey === 'string' && typeof item.recordId === 'string' && typeof item.detectedAt === 'string' && ['pending', 'resolved_local', 'resolved_remote', 'resolved_merged'].includes(String(item.status))) conflicts.push(item as unknown as SyncConflict);
  }
  return { conflicts: conflicts.filter((item) => item.status === 'pending'), malformed, duplicateIds, unsupportedDomains, invalidStatuses, stalePending };
}

function validateSyncConflicts(items: DataQualityDiagnostic[], conflicts: SyncConflict[]): void {
  for (const conflict of conflicts) {
    if (!conflict.conflictId || !conflict.storageKey || !conflict.recordId) {
      addDiagnostic(items, { domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Malformed sync conflict', description: 'A pending cloud conflict is missing required identity data.', affectedArea: 'Local Sync', actionable: true, route: '/settings', stableId: `data-quality:sync-conflict:malformed:${conflict.conflictId || conflict.recordId || 'missing'}` });
    }
    if (conflict.status !== 'pending') {
      addDiagnostic(items, { domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Invalid pending conflict status', description: 'A conflict surfaced as pending but carries a non-pending status.', affectedArea: 'Local Sync', actionable: true, route: '/settings', stableId: `data-quality:sync-conflict:status:${conflict.conflictId}` });
    }
  }
}

export function buildDataQualityModel(
  state: LifeOSDailyState,
  options: { plan?: DailyPlanModel; pulse?: DailyPulseModel; syncConflicts?: SyncConflict[] } = {},
): DataQualityModel {
  const items: DataQualityDiagnostic[] = [];
  const degraded = new Set<DataQualityDomain>((state.dataQuality?.degradedDomains ?? []).filter((domain): domain is DataQualityDomain => domains.includes(domain as DataQualityDomain)));

  for (const domain of degraded) addDiagnostic(items, failureDiagnostic(domain));
  validateCoreState(state, items);
  validateTaskData(state, items);
  validateHabitData(state, items);
  validateHealthData(state, items);
  validateNutritionData(state, items);
  validateFinanceData(state, items);
  validateGoalsData(state, items);
  validatePlanAndPulse(items, options.plan, options.pulse);
  validateSyncConflicts(items, options.syncConflicts ?? []);

  const sorted = [...items].sort((a, b) =>
    severityRank[a.severity] - severityRank[b.severity] ||
    a.domain.localeCompare(b.domain) ||
    a.stableId.localeCompare(b.stableId),
  );

  const domainStatuses: DataQualityDomainStatus[] = domains.map((domain) => {
    const domainItems = sorted.filter((item) => item.domain === domain);
    const status = domainItems.length ? domainItems.reduce<DataQualityStatus>((current, item) => statusRank[item.status] < statusRank[current] ? item.status : current, 'healthy') : 'healthy';
    return { domain, status, diagnosticCount: domainItems.length };
  });

  const overallStatus = domainStatuses.reduce<DataQualityStatus>((current, item) => statusRank[item.status] < statusRank[current] ? item.status : current, 'healthy');
  return {
    date: state.date,
    overallStatus,
    diagnostics: sorted,
    domainStatuses,
    degradedDomains: domainStatuses.filter((item) => item.status !== 'healthy').map((item) => item.domain),
  };
}

export async function getDataQuality(date: string = todayCivilDate()): Promise<DataQualityModel> {
  try {
    const state = await getLifeOSDailyState(date);
    const syncDiagnostics = await readSyncConflictDiagnostics();
    const model = buildDataQualityModel(state, { syncConflicts: syncDiagnostics.conflicts });
    const syncIssues: DataQualityDiagnostic[] = [];
    if (syncDiagnostics.malformed > 0) addDiagnostic(syncIssues, { domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Malformed sync conflict metadata', description: `${syncDiagnostics.malformed} sync conflict entr${syncDiagnostics.malformed === 1 ? 'y is' : 'ies are'} malformed and was not used for resolution.`, affectedArea: 'Local Sync', actionable: true, route: '/settings', stableId: 'data-quality:sync-conflicts:malformed' });
    if (syncDiagnostics.duplicateIds > 0) addDiagnostic(syncIssues, { domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Duplicate sync conflict IDs', description: 'Duplicate conflict identities were detected in local sync metadata.', affectedArea: 'Local Sync', actionable: true, route: '/settings', stableId: 'data-quality:sync-conflicts:duplicates' });
    if (syncDiagnostics.unsupportedDomains > 0) addDiagnostic(syncIssues, { domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Unsupported sync conflict domain', description: 'A sync conflict references a domain outside the authoritative sync registry.', affectedArea: 'Local Sync', actionable: true, route: '/settings', stableId: 'data-quality:sync-conflicts:domain' });
    if (syncDiagnostics.invalidStatuses > 0) addDiagnostic(syncIssues, { domain: 'integration', status: 'degraded', severity: 'warning', issue: 'Invalid sync conflict status', description: 'A sync conflict has an unsupported resolution status.', affectedArea: 'Local Sync', actionable: true, route: '/settings', stableId: 'data-quality:sync-conflicts:status' });
    if (syncDiagnostics.stalePending > 0) addDiagnostic(syncIssues, { domain: 'integration', status: 'warning', severity: 'info', issue: 'Stale unresolved sync conflict', description: `${syncDiagnostics.stalePending} pending cloud conflict${syncDiagnostics.stalePending === 1 ? '' : 's'} is older than 30 days.`, affectedArea: 'Local Sync', actionable: true, route: '/settings', stableId: 'data-quality:sync-conflicts:stale' });
    if (!syncIssues.length) return model;
    const diagnostics = [...model.diagnostics, ...syncIssues].sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.domain.localeCompare(b.domain) || a.stableId.localeCompare(b.stableId));
    const domainStatuses = model.domainStatuses.map((item) => item.domain === 'integration' ? { ...item, status: 'degraded' as const, diagnosticCount: item.diagnosticCount + syncIssues.length } : item);
    return { ...model, overallStatus: statusRank['degraded'] < statusRank[model.overallStatus] ? 'degraded' : model.overallStatus, diagnostics, domainStatuses, degradedDomains: domainStatuses.filter((item) => item.status !== 'healthy').map((item) => item.domain) };
  } catch {
    const safeDate = isValidCivilDate(date) ? date : todayCivilDate();
    const diagnostic = failureDiagnostic('integration');
    const domainStatuses = domains.map((domain) => ({
      domain,
      status: domain === 'integration' ? 'unavailable' as const : 'healthy' as const,
      diagnosticCount: domain === 'integration' ? 1 : 0,
    }));
    return {
      date: safeDate,
      overallStatus: 'unavailable',
      diagnostics: [diagnostic],
      domainStatuses,
      degradedDomains: ['integration'],
    };
  }
}

export function getDataQualityStatusLabel(status: DataQualityStatus): string {
  switch (status) {
    case 'healthy': return 'Healthy';
    case 'warning': return 'Needs attention';
    case 'degraded': return 'Degraded';
    case 'unavailable': return 'Unavailable';
  }
}
