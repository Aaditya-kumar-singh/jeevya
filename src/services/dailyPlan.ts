import { todayCivilDate, isValidCivilDate, type CivilDate } from '@/lib/date';
import { getJeevyaDailyState } from '@/services/jeevyaIntegration';
import { buildDailyPulse } from '@/services/dailyPulse';
import { getBudgetSpending, type BudgetSpending } from '@/services/finance';
import { buildLifeInsights } from '@/services/lifeIntelligence';
import type { DailyPlanItem, DailyPlanModel, DailyPlanPriority, DailyPlanItemState } from '@/types/dailyPlan';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';

const priorityRank: Record<DailyPlanPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const statusRank: Record<DailyPlanItemState, number> = {
  overdue: 0,
  due: 1,
  pending: 2,
  recommended: 3,
  informational: 4,
  unavailable: 5,
  completed: 6,
};

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function monthOf(date: CivilDate): string {
  return date.slice(0, 7);
}

function pulsePriorityForSource(state: JeevyaDailyState): Record<string, DailyPlanPriority> {
  const pulse = buildDailyPulse(state);
  const result: Record<string, DailyPlanPriority> = {};
  for (const item of pulse.items) {
    const source = item.source === 'health' ? 'health' : item.source;
    const current = result[source];
    if (!current || priorityRank[item.priority] < priorityRank[current]) result[source] = item.priority;
  }
  for (const insight of buildLifeInsights(state)) {
    if (insight.severity !== 'warning') continue;
    const source = insight.source === 'workout' ? 'workout' : insight.source;
    const current = result[source];
    if (!current || priorityRank.high < priorityRank[current]) result[source] = 'high';
  }
  return result;
}

function elevate(base: DailyPlanPriority, sourcePriority: DailyPlanPriority | undefined): DailyPlanPriority {
  if (!sourcePriority) return base;
  return priorityRank[sourcePriority] < priorityRank[base] ? sourcePriority : base;
}

function addUnique(items: DailyPlanItem[], item: DailyPlanItem): void {
  if (!items.some((existing) => existing.id === item.id)) items.push(item);
}

function taskItems(state: JeevyaDailyState, priorities: ReturnType<typeof pulsePriorityForSource>): DailyPlanItem[] {
  const items: DailyPlanItem[] = [];
  for (const task of state.tasks.overdueTasks ?? []) {
    addUnique(items, {
      id: `tasks:task:${task.id}:complete`,
      source: 'tasks', sourceRecordId: task.id, title: task.title,
      description: 'Overdue task', priority: elevate('high', priorities.tasks), status: 'overdue',
      navigationTarget: `/tasks/${task.id}`, actionType: 'complete_task', actionTargetId: task.id, actionLabel: 'Complete task',
    });
  }
  for (const task of state.tasks.incompleteDueTodayTasks ?? []) {
    addUnique(items, {
      id: `tasks:task:${task.id}:complete`,
      source: 'tasks', sourceRecordId: task.id, title: task.title,
      description: 'Due today', priority: elevate('medium', priorities.tasks), status: 'due',
      navigationTarget: `/tasks/${task.id}`, actionType: 'complete_task', actionTargetId: task.id, actionLabel: 'Complete task',
    });
  }
  return items;
}

function habitItems(state: JeevyaDailyState, priorities: ReturnType<typeof pulsePriorityForSource>): DailyPlanItem[] {
  return (state.habits.remainingToday ?? []).map((habit) => ({
    id: `habits:habit:${habit.id}:complete`, source: 'habits', sourceRecordId: habit.id,
    title: habit.name, description: 'Scheduled today', priority: elevate('medium', priorities.habits), status: 'pending',
    navigationTarget: `/habits/${habit.id}`, actionType: 'complete_habit', actionTargetId: habit.id, actionLabel: 'Complete habit',
  }));
}

function healthItems(state: JeevyaDailyState, priorities: ReturnType<typeof pulsePriorityForSource>): DailyPlanItem[] {
  const items: DailyPlanItem[] = [];
  if (state.health.activeWorkout) {
    const id = state.health.activeWorkoutId;
    addUnique(items, {
      id: `workout:${id ?? 'active'}:resume`, source: 'workout', ...(id ? { sourceRecordId: id } : {}),
      title: 'Resume workout', description: 'An active workout session is available.',
      priority: elevate('high', priorities.health), status: 'pending',
      navigationTarget: id ? `/health/workout-session/${id}` : '/health/workout',
      ...(id ? { actionType: 'resume_workout' as const, actionTargetId: id, actionLabel: 'Resume workout' } : {}),
    });
  }
  if (state.health.sleep && state.health.sleep.durationMinutes < 360) {
    addUnique(items, {
      id: 'sleep:today:review', source: 'sleep', title: 'Review low sleep',
      description: `${Math.round(state.health.sleep.durationMinutes / 60 * 10) / 10} hours recorded.`,
      priority: elevate('high', priorities.health), status: 'informational', navigationTarget: '/health/sleep',
    });
  }
  if (state.health.recovery && finite(state.health.recovery.readinessScore) && state.health.recovery.readinessScore < 50) {
    addUnique(items, {
      id: 'recovery:today:review', source: 'recovery', title: 'Review recovery readiness',
      description: `Readiness score ${Math.round(state.health.recovery.readinessScore)}.`,
      priority: elevate('high', priorities.health), status: 'informational', navigationTarget: '/health/recovery',
    });
  }
  return items;
}

function nutritionItems(state: JeevyaDailyState): DailyPlanItem[] {
  const targets = state.nutrition.targets;
  const calories = state.nutrition.summary.totals.calories;
  if (!targets || !finite(calories) || !finite(targets.targetCalories) || targets.targetCalories <= 0) return [];
  const percentage = Math.round((calories / targets.targetCalories) * 100);
  const status: DailyPlanItemState = percentage >= 100 ? 'completed' : 'pending';
  return [{
    id: 'nutrition:today:target', source: 'nutrition', title: 'Nutrition target',
    description: `${Math.round(calories)} of ${Math.round(targets.targetCalories)} kcal logged (${percentage}%).`,
    priority: 'low', status, navigationTarget: '/nutrition/targets', actionType: 'navigate', actionLabel: 'Open Nutrition',
  }];
}

function financeItems(budgets: BudgetSpending[]): DailyPlanItem[] {
  return budgets
    .filter((budget) => budget.isOverBudget || (budget.percentage >= 80 && budget.percentage < 100))
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId))
    .map((budget) => ({
      id: `finance:budget:${budget.budgetId}:review`, source: 'finance', sourceRecordId: budget.budgetId,
      title: budget.isOverBudget ? 'Budget exceeded' : 'Budget nearing limit',
      description: budget.isOverBudget
        ? `${Math.round(budget.overBudgetAmount)} over budget.`
        : `${Math.round(budget.percentage)}% of budget used.`,
      priority: budget.isOverBudget ? 'high' : 'medium', status: 'informational', navigationTarget: '/finance/budget',
    }));
}

function bookItems(state: JeevyaDailyState): DailyPlanItem[] {
  if (state.books.currentlyReading <= 0) return [];
  return [{
    id: 'books:reading:progress', source: 'books', title: 'Continue reading',
    description: `${state.books.currentlyReading} book${state.books.currentlyReading === 1 ? '' : 's'} in progress.`,
    priority: 'low', status: 'recommended', navigationTarget: '/books', actionType: 'navigate', actionLabel: 'Open Books',
  }];
}

function journalItems(state: JeevyaDailyState): DailyPlanItem[] {
  if (state.journal.hasEntryToday) return [];
  return [{
    id: 'journal:today:create', source: 'journal', title: 'Write today’s journal',
    description: 'No journal entry has been recorded today.', priority: 'low', status: 'recommended',
    navigationTarget: '/journal/new', actionType: 'navigate', actionLabel: 'Write entry',
  }];
}

function goalItems(state: JeevyaDailyState): DailyPlanItem[] {
  return state.goals
    .filter((goal) => goal.status === 'behind' || goal.status === 'active')
    .filter((goal) => goal.status === 'behind' || (finite(goal.progressPercentage) && goal.progressPercentage < 100))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((goal) => ({
      id: `goals:${goal.id}:progress`, source: 'goals', sourceRecordId: goal.id,
      title: goal.status === 'behind' ? 'Goal needs attention' : 'Keep goal moving',
      description: `${goal.title}${goal.progressPercentage !== null ? ` at ${goal.progressPercentage}%` : ''}.`,
      priority: goal.status === 'behind' ? 'medium' : 'low', status: goal.status === 'behind' ? 'due' : 'recommended',
      navigationTarget: '/goals', actionType: 'navigate', actionLabel: 'Open Goals',
    }));
}

export function buildDailyPlan(
  state: JeevyaDailyState,
  budgetSpending: BudgetSpending[] = [],
): DailyPlanModel {
  const priorities = pulsePriorityForSource(state);
  const items: DailyPlanItem[] = [
    ...taskItems(state, priorities),
    ...habitItems(state, priorities),
    ...healthItems(state, priorities),
    ...nutritionItems(state),
    ...financeItems(budgetSpending),
    ...bookItems(state),
    ...journalItems(state),
    ...goalItems(state),
  ];

  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  deduped.sort((a, b) =>
    priorityRank[a.priority] - priorityRank[b.priority] ||
    statusRank[a.status] - statusRank[b.status] ||
    a.source.localeCompare(b.source) ||
    a.id.localeCompare(b.id),
  );

  const completed = deduped.filter((item) => item.status === 'completed').length;
  const overdue = deduped.filter((item) => item.status === 'overdue').length;
  const dueToday = deduped.filter((item) => item.status === 'due').length;
  const pending = deduped.filter((item) => item.status === 'pending' || item.status === 'recommended').length;
  const actionable = deduped.filter((item) => item.actionType === 'complete_task' || item.actionType === 'complete_habit' || item.actionType === 'resume_workout').length;

  return {
    date: state.date,
    items: deduped,
    summary: { total: deduped.length, pending, overdue, dueToday, completed, actionable },
    dataQuality: { degradedDomains: state.dataQuality?.degradedDomains ?? [] },
  };
}

export async function getDailyPlan(date: CivilDate = todayCivilDate()): Promise<DailyPlanModel> {
  if (!isValidCivilDate(date)) {
    return {
      date,
      items: [],
      summary: { total: 0, pending: 0, overdue: 0, dueToday: 0, completed: 0, actionable: 0 },
      dataQuality: { degradedDomains: ['date'] },
    };
  }

  const state = await getJeevyaDailyState(date);
  let budgets: BudgetSpending[] = [];
  let budgetDegraded = false;
  try {
    budgets = await getBudgetSpending(monthOf(date));
  } catch {
    budgetDegraded = true;
  }
  if (budgetDegraded) {
    return buildDailyPlan({
      ...state,
      dataQuality: {
        degradedDomains: [...new Set([...(state.dataQuality?.degradedDomains ?? []), 'finance'])],
      },
    }, budgets);
  }
  return buildDailyPlan(state, budgets);
}
