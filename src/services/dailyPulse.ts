import { daysBetweenInclusive, isValidCivilDate } from '@/lib/date';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';

export type PulsePriority = 'critical' | 'high' | 'medium' | 'low';
export type PulseCategory = 'today' | 'attention' | 'progress' | 'positive';
export type PulseSource = 'tasks' | 'habits' | 'health' | 'nutrition' | 'finance' | 'books' | 'journal' | 'goals';

export interface DailyPulseItem {
  id: string;
  category: PulseCategory;
  priority: PulsePriority;
  title: string;
  description: string;
  value?: number;
  navigationTarget?: string;
  source: PulseSource;
  actionLabel?: string;
  actionType?: 'navigate' | 'complete_task' | 'complete_habit' | 'resume_workout';
  actionTargetId?: string;
}

export interface DailyPulseSection {
  category: PulseCategory;
  title: string;
  items: DailyPulseItem[];
}

export interface DailyPulseModel {
  date: string;
  summary: string[];
  focus: DailyPulseItem[];
  progress: DailyPulseItem[];
  sections: DailyPulseSection[];
  items: DailyPulseItem[];
}

const priorityRank: Record<PulsePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const categoryRank: Record<PulseCategory, number> = {
  attention: 0,
  today: 1,
  progress: 2,
  positive: 3,
};

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function add(items: DailyPulseItem[], item: DailyPulseItem | null): void {
  if (item) items.push(item);
}

function nutritionItems(state: JeevyaDailyState): DailyPulseItem[] {
  const items: DailyPulseItem[] = [];
  const { summary, targets } = state.nutrition;
  const calories = summary.totals.calories;
  const protein = summary.totals.protein;

  if (targets && finite(calories) && finite(targets.targetCalories) && targets.targetCalories > 0) {
    const pct = Math.round((calories / targets.targetCalories) * 100);
    const deviation = Math.abs(calories - targets.targetCalories);
    const nearTarget = deviation <= targets.targetCalories * 0.1;
    add(items, {
      id: 'nutrition-target-calories',
      category: nearTarget ? 'positive' : 'attention',
      priority: 'medium',
      title: nearTarget ? 'Calories near target' : 'Calories differ from target',
      description: `${Math.round(calories)} of ${Math.round(targets.targetCalories)} kcal logged (${pct}%).`,
      value: pct,
      navigationTarget: '/nutrition/targets',
      source: 'nutrition',
    });
  } else if (summary.loggedCount > 0) {
    add(items, {
      id: 'nutrition-logged',
      category: 'today',
      priority: 'medium',
      title: 'Nutrition logged',
      description: `${summary.loggedCount} food entries logged today.`,
      value: summary.loggedCount,
      navigationTarget: '/nutrition',
      source: 'nutrition',
    });
  }

  if (targets && finite(protein) && finite(targets.protein) && targets.protein > 0) {
    const pct = Math.round((protein / targets.protein) * 100);
    if (pct < 80) {
      items.push({
        id: 'nutrition-protein-low',
        category: 'attention',
        priority: 'medium',
        title: 'Protein below target',
        description: `${Math.round(protein)} of ${Math.round(targets.protein)} g logged (${pct}%).`,
        value: pct,
        navigationTarget: '/nutrition',
        source: 'nutrition',
      });
    } else if (pct >= 100) {
      items.push({
        id: 'nutrition-protein-target',
        category: 'positive',
        priority: 'low',
        title: 'Protein target reached',
        description: `${Math.round(protein)} of ${Math.round(targets.protein)} g logged.`,
        value: pct,
        navigationTarget: '/nutrition',
        source: 'nutrition',
      });
    }
  }

  return items;
}

function withActionMetadata(item: DailyPulseItem): DailyPulseItem {
  if (!item.navigationTarget) return item;
  const labels: Record<PulseSource, string> = {
    tasks: 'Open Tasks', habits: 'Open Habits', health: 'Open Health', nutrition: 'Open Nutrition',
    finance: 'Open Finance', books: 'Open Books', journal: 'Open Journal', goals: 'Open Goals',
  };
  if (item.actionType && item.actionType !== 'navigate') return item;
  return { ...item, actionLabel: labels[item.source], actionType: 'navigate' };
}

function taskAction(id: string | undefined): Pick<DailyPulseItem, 'actionType' | 'actionTargetId' | 'actionLabel'> {
  return id
    ? { actionType: 'complete_task', actionTargetId: id, actionLabel: 'Complete task' }
    : { actionType: 'navigate', actionLabel: 'Open Tasks' };
}

function habitAction(id: string | undefined): Pick<DailyPulseItem, 'actionType' | 'actionTargetId' | 'actionLabel'> {
  return id
    ? { actionType: 'complete_habit', actionTargetId: id, actionLabel: 'Complete habit' }
    : { actionType: 'navigate', actionLabel: 'Open Habits' };
}

export function buildDailyPulse(state: JeevyaDailyState): DailyPulseModel {
  const items: DailyPulseItem[] = [];

  if (state.tasks.overdue > 0) {
    items.push({
      id: 'tasks-overdue', category: 'attention', priority: 'high', title: 'Overdue tasks',
      description: `${state.tasks.overdue} active task${state.tasks.overdue === 1 ? '' : 's'} past due.`,
      value: state.tasks.overdue, navigationTarget: '/tasks', source: 'tasks',
      ...((state.tasks.overdueTasks ?? []).length === 1 ? taskAction(state.tasks.overdueTasks?.[0]?.id) : {}),
    });
  }
  if (state.tasks.dueToday > 0) {
    items.push({
      id: 'tasks-due-today', category: 'today', priority: 'medium', title: 'Tasks due today',
      description: `${state.tasks.dueToday} task${state.tasks.dueToday === 1 ? '' : 's'} due today.`,
      value: state.tasks.dueToday, navigationTarget: '/tasks', source: 'tasks',
      ...((state.tasks.incompleteDueTodayTasks ?? []).length === 1 ? taskAction(state.tasks.incompleteDueTodayTasks?.[0]?.id) : {}),
    });
  }
  if (state.tasks.completedToday > 0) {
    items.push({
      id: 'tasks-completed-today', category: 'positive', priority: 'low', title: 'Tasks completed',
      description: `${state.tasks.completedToday} task${state.tasks.completedToday === 1 ? '' : 's'} completed today.`,
      value: state.tasks.completedToday, navigationTarget: '/tasks', source: 'tasks',
    });
  }

  if (state.habits.activeToday > 0 && state.habits.completedToday < state.habits.activeToday) {
    const remaining = state.habits.activeToday - state.habits.completedToday;
    items.push({
      id: 'habits-remaining', category: 'attention', priority: 'medium', title: 'Habits remaining',
      description: `${remaining} scheduled habit${remaining === 1 ? '' : 's'} not completed.`,
      value: remaining, navigationTarget: '/habits', source: 'habits',
      ...((state.habits.remainingToday ?? []).length === 1 ? habitAction(state.habits.remainingToday?.[0]?.id) : {}),
    });
  }
  if (state.habits.completionRate !== null && state.habits.completionRate >= 100) {
    items.push({
      id: 'habits-complete', category: 'positive', priority: 'low', title: 'Habits completed',
      description: 'All scheduled habits are complete today.', value: 100,
      navigationTarget: '/habits', source: 'habits',
    });
  }

  if (state.health.activeWorkout) {
    items.push({
      id: 'workout-active', category: 'today', priority: 'medium', title: 'Workout in progress',
      description: 'An active workout session is available to continue.',
      navigationTarget: state.health.activeWorkoutId ? `/health/workout-session/${state.health.activeWorkoutId}` : '/health/workout',
      source: 'health',
      ...(state.health.activeWorkoutId ? { actionType: 'resume_workout' as const, actionTargetId: state.health.activeWorkoutId, actionLabel: 'Resume workout' } : {}),
    });
  } else if (state.health.completedWorkoutsToday > 0) {
    items.push({
      id: 'workout-complete', category: 'positive', priority: 'low', title: 'Workout completed',
      description: `${state.health.completedWorkoutsToday} workout${state.health.completedWorkoutsToday === 1 ? '' : 's'} completed today.`,
      value: state.health.completedWorkoutsToday, navigationTarget: '/health/workout-history', source: 'health',
    });
  }

  const sleepMinutes = state.health.sleep?.durationMinutes;
  if (finite(sleepMinutes) && sleepMinutes < 6 * 60) {
    items.push({
      id: 'sleep-low', category: 'attention', priority: 'high', title: 'Low sleep duration',
      description: `${Math.round(sleepMinutes / 60 * 10) / 10} hours recorded.`,
      value: sleepMinutes, navigationTarget: '/health/sleep', source: 'health',
    });
  } else if (finite(sleepMinutes) && sleepMinutes >= 8 * 60) {
    items.push({
      id: 'sleep-good', category: 'positive', priority: 'low', title: 'Sleep duration recorded',
      description: `${Math.round(sleepMinutes / 60 * 10) / 10} hours recorded.`,
      value: sleepMinutes, navigationTarget: '/health/sleep', source: 'health',
    });
  }

  const readiness = state.health.recovery?.readinessScore;
  if (finite(readiness) && readiness < 50) {
    items.push({
      id: 'recovery-low', category: 'attention', priority: 'high', title: 'Low recovery readiness',
      description: `Readiness score ${Math.round(readiness)}.`, value: readiness,
      navigationTarget: '/health/recovery', source: 'health',
    });
  } else if (finite(readiness) && readiness >= 80) {
    items.push({
      id: 'recovery-good', category: 'positive', priority: 'low', title: 'Good recovery readiness',
      description: `Readiness score ${Math.round(readiness)}.`, value: readiness,
      navigationTarget: '/health/recovery', source: 'health',
    });
  }

  items.push(...nutritionItems(state));

  if (state.finance.transactionsToday > 0) {
    items.push({
      id: 'finance-today', category: 'today', priority: 'low', title: 'Finance activity',
      description: `${state.finance.transactionsToday} transaction${state.finance.transactionsToday === 1 ? '' : 's'} recorded today.`,
      value: state.finance.transactionsToday, navigationTarget: '/finance', source: 'finance',
    });
  }

  if (state.books.currentlyReading > 0) {
    const progress = state.books.readingBooks
      .map((book) => book.totalPages !== null && book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : null)
      .filter(finite);
    const average = progress.length ? Math.round(progress.reduce((sum, value) => sum + value, 0) / progress.length) : null;
    items.push({
      id: 'books-reading', category: 'progress', priority: 'low', title: 'Reading in progress',
      description: `${state.books.currentlyReading} book${state.books.currentlyReading === 1 ? '' : 's'} currently being read${average !== null ? `, ${average}% average progress` : ''}.`,
      ...(average !== null ? { value: average } : {}), navigationTarget: '/books', source: 'books',
    });
  }

  if (state.journal.hasEntryToday) {
    items.push({
      id: 'journal-entry', category: 'positive', priority: 'low', title: 'Journal updated',
      description: `${state.journal.entryCountToday} entr${state.journal.entryCountToday === 1 ? 'y' : 'ies'} recorded today.`,
      value: state.journal.entryCountToday, navigationTarget: '/journal', source: 'journal',
    });
  }

  for (const goal of state.goals) {
    const percentage = goal.progressPercentage;
    if (goal.status === 'completed') {
      items.push({
        id: `goal-completed:${goal.id}`,
        category: 'positive',
        priority: 'low',
        title: 'Goal completed',
        description: `${goal.title} reached ${goal.targetValue}.`,
        value: 100,
        navigationTarget: '/goals',
        source: 'goals',
      });
      continue;
    }

    if (goal.status === 'behind') {
      items.push({
        id: `goal-behind:${goal.id}`,
        category: 'attention',
        priority: 'medium',
        title: 'Goal behind pace',
        description: `${goal.title} is at ${percentage ?? 0}%.`,
        ...(percentage !== null ? { value: percentage } : {}),
        navigationTarget: '/goals',
        source: 'goals',
      });
      continue;
    }

    if (
      goal.status === 'active' &&
      goal.endDate &&
      isValidCivilDate(state.date) &&
      isValidCivilDate(goal.endDate) &&
      goal.endDate >= state.date
    ) {
      const daysRemaining = daysBetweenInclusive(state.date, goal.endDate);
      if (daysRemaining <= 3) {
        items.push({
          id: `goal-deadline:${goal.id}`,
          category: 'attention',
          priority: 'high',
          title: 'Goal deadline approaching',
          description: `${goal.title} ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
          ...(percentage !== null ? { value: percentage } : {}),
          navigationTarget: '/goals',
          source: 'goals',
        });
        continue;
      }
    }

    if (goal.status === 'active' && finite(percentage) && percentage > 0) {
      items.push({
        id: `goal-progress:${goal.id}`,
        category: 'progress',
        priority: 'low',
        title: 'Goal progressing',
        description: `${goal.title} is at ${percentage}%.`,
        value: percentage,
        navigationTarget: '/goals',
        source: 'goals',
      });
    }
  }

  const actionableItems = items.map(withActionMetadata);
  const sorted = [...actionableItems].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || categoryRank[a.category] - categoryRank[b.category] || a.id.localeCompare(b.id));
  const focus = sorted.filter((item) => item.category === 'attention').slice(0, 4);
  const progress = sorted.filter((item) => item.category === 'positive' || item.category === 'progress').slice(0, 4);

  const sections: DailyPulseSection[] = (['today', 'attention', 'progress', 'positive'] as PulseCategory[]).map((category) => ({
    category,
    title: category === 'today' ? 'Today' : category === 'attention' ? 'Focus' : category === 'progress' ? 'Progress' : 'Positive',
    items: sorted.filter((item) => item.category === category),
  })).filter((section) => section.items.length > 0);

  const summary = [
    `${state.tasks.dueToday} task${state.tasks.dueToday === 1 ? '' : 's'} due today`,
    `${state.habits.activeToday} habit${state.habits.activeToday === 1 ? '' : 's'} scheduled`,
  ];
  if (state.health.activeWorkout) summary.push('workout in progress');
  else if (state.health.completedWorkoutsToday > 0) summary.push(`${state.health.completedWorkoutsToday} workout${state.health.completedWorkoutsToday === 1 ? '' : 's'} completed`);
  if (state.health.sleep) summary.push(`${Math.round(state.health.sleep.durationMinutes / 60 * 10) / 10}h sleep`);
  if (state.health.recovery && finite(state.health.recovery.readinessScore)) summary.push(`recovery ${Math.round(state.health.recovery.readinessScore)}`);

  return { date: state.date, summary, focus, progress, sections, items: sorted };
}
