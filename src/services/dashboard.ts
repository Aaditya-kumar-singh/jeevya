import type { DailyPlanModel } from '@/types/dailyPlan';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';
import { buildDailyPulse } from '@/services/dailyPulse';
import { buildXPProgress, type XPEvent } from '@/services/xp';
import type { DashboardAttentionItem, DashboardState } from '@/types/dashboard';
import type { BudgetSpending } from '@/services/finance';

const priorityRank: Record<DashboardAttentionItem['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function addAttention(items: DashboardAttentionItem[], item: DashboardAttentionItem): void {
  if (!items.some((existing) => existing.id === item.id)) items.push(item);
}

function buildGoalSnapshot(state: JeevyaDailyState) {
  const goals = state.goals;
  const completed = goals.filter((goal) => goal.status === 'completed').length;
  const behind = goals.filter((goal) => goal.status === 'behind').length;
  const active = goals.filter((goal) => goal.status === 'active').length;
  const upcoming = goals.filter((goal) => goal.status === 'upcoming').length;
  const percentages = goals
    .map((goal) => goal.progressPercentage)
    .filter((value): value is number => value !== null);
  const deadlines = goals
    .filter((goal) => goal.endDate && goal.status !== 'completed' && goal.status !== 'ended')
    .map((goal) => goal.endDate as string)
    .sort();

  return {
    total: goals.length,
    active,
    completed,
    behind,
    upcoming,
    averageProgressPercent: percentages.length > 0
      ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
      : null,
    closestDeadline: deadlines[0] ?? null,
  };
}
function buildAttention(state: JeevyaDailyState, dailyPlan: DailyPlanModel): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];

  for (const item of dailyPlan.items) {
    if (item.status !== 'overdue' && item.priority !== 'critical' && item.priority !== 'high') continue;
    addAttention(items, {
      id: `plan:${item.id}`,
      source: item.source,
      title: item.title,
      description: item.description ?? 'Needs attention',
      priority: item.priority,
      navigationTarget: item.navigationTarget,
    });
  }

  for (const goal of state.goals.filter((item) => item.status === 'behind')) {
    addAttention(items, {
      id: "goal:" + goal.id + ":behind",
      source: 'goals',
      title: goal.title + " is behind",
      description: goal.progressPercentage === null ? "Review the goal and update its progress." : String(goal.progressPercentage) + "% complete against the current target pace.",
      priority: 'high',
      navigationTarget: '/goals',
    });
  }

  if (state.health.sleep && state.health.sleep.durationMinutes < 420) {
    addAttention(items, {
      id: 'health:sleep',
      source: 'health',
      title: 'Sleep was below 7 hours',
      description: 'Review recovery and protect tonight’s sleep window.',
      priority: 'medium',
      navigationTarget: '/health',
    });
  }

  if (
    state.health.recovery?.available &&
    state.health.recovery.readinessScore !== null &&
    state.health.recovery.readinessScore < 50
  ) {
    addAttention(items, {
      id: 'health:recovery',
      source: 'health',
      title: 'Recovery is low',
      description: 'Consider a lighter training load today.',
      priority: 'high',
      navigationTarget: '/health',
    });
  }

  if (state.journal.entryCountToday === 0) {
    addAttention(items, {
      id: 'journal:today',
      source: 'journal',
      title: 'Journal is still open',
      description: 'Capture today’s reflection when you have a moment.',
      priority: 'low',
      navigationTarget: '/journal',
    });
  }

  items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id));
  return items;
}

export function buildDashboardState(
  state: JeevyaDailyState,
  dailyPlan: DailyPlanModel,
  xpEvents: XPEvent[] = [],
  importedPaymentReviewCount = 0,
  budgetSpending: BudgetSpending[] = [],
): DashboardState {
  const completedTasks = state.tasks.completedToday;
  const taskBase = Math.max(state.tasks.dueToday, state.tasks.active);
  const completionPercent = taskBase > 0
    ? Math.min(100, Math.round((completedTasks / taskBase) * 100))
    : 0;

  const taskTargets = Math.max(state.tasks.dueToday, state.tasks.completedToday);
  const habitTargets = state.habits.activeToday;
  const totalTargets = taskTargets + habitTargets;
  const completedTargets = Math.min(state.tasks.completedToday, taskTargets) + Math.min(state.habits.completedToday, habitTargets);
  const todayProgress = {
    completed: completedTargets,
    total: totalTargets,
    percent: totalTargets > 0 ? Math.min(100, Math.round((completedTargets / totalTargets) * 100)) : 0,
  };

  const sleep = state.health.sleep;
  const completedWorkouts = state.health.completedWorkoutsToday;
  const workoutMinutes = state.health.completedWorkoutMinutes ?? 0;
  const healthSnapshot = {
    sleep: sleep ? Math.floor(sleep.durationMinutes / 60) + 'h ' + (sleep.durationMinutes % 60) + 'm' : 'Not recorded',
    water: 'Not tracked',
    workout: completedWorkouts > 0 ? completedWorkouts + (completedWorkouts === 1 ? ' session - ' : ' sessions - ') + workoutMinutes + ' min' : 'No workout logged',
  };

  const financeSpending = dailyPlan.dataQuality?.degradedDomains?.includes('finance') ? [] : [];
  const financeSnapshot = {
    spent: budgetSpending.reduce((sum, item) => sum + item.spent, 0),
    budgetRemaining: budgetSpending.reduce((sum, item) => sum + item.remaining, 0),
    importedPaymentReviewCount,
  };

  const today = state.date;
  const currentWindowStart = new Date(today + 'T00:00:00Z').getTime() - 6 * 86400000;
  const previousWindowStart = currentWindowStart - 7 * 86400000;
  const currentXp = xpEvents.filter((event) => { const t = Date.parse(event.date + 'T00:00:00Z'); return t >= currentWindowStart && t <= Date.parse(today + 'T00:00:00Z'); }).reduce((sum, event) => sum + event.totalXp, 0);
  const previousXp = xpEvents.filter((event) => { const t = Date.parse(event.date + 'T00:00:00Z'); return t >= previousWindowStart && t < currentWindowStart; }).reduce((sum, event) => sum + event.totalXp, 0);
  const weeklyMomentum = { currentXp, previousXp, changePercent: previousXp > 0 ? Math.round(((currentXp - previousXp) / previousXp) * 100) : null };

  const degradedDomains = [...new Set([
    ...(state.dataQuality?.degradedDomains ?? []),
    ...(dailyPlan.dataQuality?.degradedDomains ?? []),
  ])];

  return {
    date: state.date,
    tasks: {
      total: state.tasks.total,
      active: state.tasks.active,
      completedToday: state.tasks.completedToday,
      dueToday: state.tasks.dueToday,
      overdue: state.tasks.overdue,
      completionPercent,
      overdueTasks: state.tasks.overdueTasks ?? [],
      incompleteDueTodayTasks: state.tasks.incompleteDueTodayTasks ?? [],
    },
    habits: {
      activeToday: state.habits.activeToday,
      completedToday: state.habits.completedToday,
      remainingToday: state.habits.remainingToday ?? [],
      todayHabits: state.habits.todayHabits ?? [],
      completionPercent: state.habits.completionRate,
    },
    health: state.health,
    nutrition: state.nutrition,
    finance: state.finance,
    books: state.books,
    journal: state.journal,
    goals: state.goals,
    goalSnapshot: buildGoalSnapshot(state),
    xp: buildXPProgress(xpEvents),
    dailyPlan,
    dailyPulse: buildDailyPulse(state),
    todayProgress,
    healthSnapshot,
    financeSnapshot,
    weeklyMomentum,
    attention: buildAttention(state, dailyPlan),
    dataQuality: { degradedDomains },
  };
}
