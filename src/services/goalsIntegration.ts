import {
  daysBetweenInclusive,
  isValidCivilDate,
  todayCivilDate,
  type CivilDate,
} from '@/lib/date';
import { getSavingsGoals } from '@/services/finance';
import { getBooks } from '@/services/books';
import {
  formatGoalPeriod,
  getGoalProgress,
  getGoals as getBookGoals,
} from '@/services/book-goals';
import type {
  GoalProgressResult,
  GoalSource,
  UnifiedGoal,
  UnifiedGoalStatus,
} from '@/types/goalsIntegration';

interface GoalWindow {
  startDate?: CivilDate;
  endDate?: CivilDate;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validDate(value: unknown): value is CivilDate {
  return isValidCivilDate(value);
}

function normalizeTarget(value: unknown): number | null {
  return finiteNonNegative(value) && value > 0 ? value : null;
}

/**
 * Pure progress/status calculation shared by the unified goal adapters.
 * Progress is clamped to 0–100 while the current value remains intact, so
 * over-target progress is visible without inventing a larger percentage.
 */
export function calculateGoalProgress(
  currentValue: unknown,
  targetValue: unknown,
  window: GoalWindow = {},
  asOf: CivilDate = todayCivilDate(),
): GoalProgressResult {
  const target = normalizeTarget(targetValue);
  const current = finiteNonNegative(currentValue) ? currentValue : null;

  if (target === null || current === null || !validDate(asOf)) {
    return {
      currentValue: current,
      targetValue: target,
      progressPercentage: null,
      status: 'unavailable',
    };
  }

  const start = window.startDate;
  const end = window.endDate;
  if ((start !== undefined && !validDate(start)) || (end !== undefined && !validDate(end))) {
    return { currentValue: current, targetValue: target, progressPercentage: null, status: 'unavailable' };
  }
  if (start && end && start > end) {
    return { currentValue: current, targetValue: target, progressPercentage: null, status: 'unavailable' };
  }

  const progressPercentage = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  if (current >= target) {
    return { currentValue: current, targetValue: target, progressPercentage, status: 'completed' };
  }
  if (start && asOf < start) {
    return { currentValue: current, targetValue: target, progressPercentage, status: 'upcoming' };
  }
  if (end && asOf > end) {
    return { currentValue: current, targetValue: target, progressPercentage, status: 'ended' };
  }

  // A pace comparison is only meaningful when both boundaries are present.
  if (start && end && start < end) {
    const totalDays = daysBetweenInclusive(start, end);
    const elapsedDays = daysBetweenInclusive(start, asOf);
    if (totalDays > 1 && elapsedDays > 0) {
      const expectedPercentage = (elapsedDays / totalDays) * 100;
      if (progressPercentage < expectedPercentage) {
        return { currentValue: current, targetValue: target, progressPercentage, status: 'behind' };
      }
    }
  }

  return { currentValue: current, targetValue: target, progressPercentage, status: 'active' };
}

function dateFromTimestamp(value: unknown): CivilDate | undefined {
  if (typeof value !== 'string') return undefined;
  const day = value.slice(0, 10);
  return validDate(day) ? day : undefined;
}

function makeGoal(
  input: Omit<UnifiedGoal, 'currentValue' | 'targetValue' | 'progressPercentage' | 'status'> & {
    currentValue: unknown;
    targetValue: unknown;
    window?: GoalWindow;
  },
  asOf: CivilDate,
): UnifiedGoal | null {
  const target = normalizeTarget(input.targetValue);
  if (target === null) return null;

  const progress = calculateGoalProgress(input.currentValue, target, input.window, asOf);
  return {
    id: input.id,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    source: input.source,
    metric: input.metric,
    targetValue: progress.targetValue,
    currentValue: progress.currentValue,
    progressPercentage: progress.progressPercentage,
    status: progress.status,
    ...(input.window?.startDate ? { startDate: input.window.startDate } : {}),
    ...(input.window?.endDate ? { endDate: input.window.endDate } : {}),
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
  };
}

async function adaptBookGoals(asOf: CivilDate): Promise<UnifiedGoal[]> {
  const [goals, books] = await Promise.all([getBookGoals(), getBooks()]);
  const result: UnifiedGoal[] = [];

  for (const goal of goals) {
    const progress = getGoalProgress(goal, books);
    const normalized = makeGoal({
      id: `books:${goal.id}`,
      title: `${formatGoalPeriod(goal)} reading goal`,
      source: 'books',
      metric: goal.type === 'books' ? 'books_completed' : 'pages_read',
      currentValue: progress.achieved,
      targetValue: goal.target,
      window: {
        startDate: validDate(goal.startDate) ? goal.startDate : undefined,
        endDate: validDate(goal.endDate) ? goal.endDate : undefined,
      },
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    }, asOf);
    if (normalized) result.push(normalized);
  }

  return result;
}

async function adaptFinanceGoals(asOf: CivilDate): Promise<UnifiedGoal[]> {
  const goals = await getSavingsGoals();
  const result: UnifiedGoal[] = [];

  for (const goal of goals) {
    const normalized = makeGoal({
      id: `finance:${goal.id}`,
      title: goal.name,
      source: 'finance',
      metric: 'savings_amount',
      currentValue: goal.currentAmount,
      targetValue: goal.targetAmount,
      window: {
        startDate: dateFromTimestamp(goal.createdAt),
        endDate: validDate(goal.deadline) ? goal.deadline : undefined,
      },
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    }, asOf);
    if (normalized) result.push(normalized);
  }

  return result;
}

/**
 * Read-only cross-module goal projection. Only existing authoritative goal
 * models are represented. Domains without an actual goal configuration are
 * intentionally omitted rather than turning generic targets into new goals.
 */
export async function getUnifiedGoals(asOf: CivilDate = todayCivilDate()): Promise<UnifiedGoal[]> {
  if (!validDate(asOf)) return [];

  const [bookGoals, financeGoals] = await Promise.all([
    adaptBookGoals(asOf),
    adaptFinanceGoals(asOf),
  ]);

  return [...bookGoals, ...financeGoals].sort(
    (a, b) =>
      (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0) ||
      (b.progressPercentage ?? -1) - (a.progressPercentage ?? -1) ||
      a.id.localeCompare(b.id),
  );
}

export function getGoalStatusLabel(status: UnifiedGoalStatus): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'behind': return 'Behind';
    case 'upcoming': return 'Upcoming';
    case 'ended': return 'Ended';
    case 'unavailable': return 'Unavailable';
    default: return 'Active';
  }
}

export function getGoalSourceLabel(source: GoalSource): string {
  switch (source) {
    case 'books': return 'Books';
    case 'finance': return 'Finance';
  }
}
