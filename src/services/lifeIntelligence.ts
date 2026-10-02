import { isValidCivilDate, todayCivilDate, type CivilDate } from '@/lib/date';
import { getJeevyaDailyState } from '@/services/jeevyaIntegration';
import type { LifeInsight, LifeIntelligenceResult, LifeInsightSourceRef } from '@/types/lifeIntelligence';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';

const severityRank = { warning: 0, positive: 1, info: 2 } as const;

function refs(state: JeevyaDailyState, domain: string): LifeInsightSourceRef[] {
  const ids = (() => {
    switch (domain) {
      case 'tasks': return [...(state.tasks.overdueTasks ?? []), ...(state.tasks.incompleteDueTodayTasks ?? [])].map((item) => item.id);
      case 'habits': return (state.habits.todayHabits ?? []).map((item) => item.id);
      case 'health': return [
        ...(state.health.completedWorkoutIds ?? []),
        ...(state.health.sleepRecordId ? [state.health.sleepRecordId] : []),
      ];
      case 'recovery': return state.health.recoveryRecordId ? [state.health.recoveryRecordId] : [];
      case 'nutrition': return state.nutrition.todayFoodLogIds ?? [];
      case 'finance': return state.finance.todayTransactionIds ?? [];
      case 'books': return state.books.readingBooks.map((item) => item.id);
      case 'journal': return state.journal.latestEntry?.id ? [state.journal.latestEntry.id] : [];
      case 'goals': return state.goals.map((goal) => goal.id);
      default: return [];
    }
  })().filter(Boolean);
  return ids.length ? [{ domain, recordIds: [...new Set(ids)] }] : [];
}

function insight(
  state: JeevyaDailyState,
  id: string,
  domain: LifeInsight['domain'],
  severity: LifeInsight['severity'],
  title: string,
  description: string,
  source: string,
  value?: number,
  unit?: string,
  sourceDomain = source,
): LifeInsight {
  return {
    id: `life-${id}`,
    domain,
    severity,
    title,
    description,
    source,
    ...(value == null ? {} : { value, unit }),
    sourceRefs: refs(state, sourceDomain),
  };
}

export function buildLifeInsights(state: JeevyaDailyState): LifeInsight[] {
  const items: LifeInsight[] = [];
  const add = (item: LifeInsight) => {
    items.push(item);
  };

  if (state.tasks.overdue > 0) add(insight(state, 'tasks-overdue', 'productivity', 'warning', 'Overdue work needs attention', `${state.tasks.overdue} task${state.tasks.overdue === 1 ? '' : 's'} are overdue.`, 'tasks', state.tasks.overdue, 'tasks'));
  if (state.tasks.dueToday > 0 && state.tasks.completedToday >= state.tasks.dueToday) add(insight(state, 'tasks-complete', 'productivity', 'positive', 'Today’s planned tasks are complete', `${state.tasks.completedToday} task${state.tasks.completedToday === 1 ? '' : 's'} completed today.`, 'tasks', state.tasks.completedToday, 'tasks'));
  if (state.habits.activeToday > 0 && state.habits.completionRate != null && state.habits.completionRate >= 80) add(insight(state, 'habits-strong', 'consistency', 'positive', 'Habit consistency is strong', `${state.habits.completionRate}% of scheduled habits are complete.`, 'habits', state.habits.completionRate, '%', 'habits'));
  if (state.habits.activeToday > 0 && state.habits.completionRate != null && state.habits.completionRate < 50) add(insight(state, 'habits-low', 'consistency', 'warning', 'Habit follow-through is low', `${state.habits.completionRate}% of scheduled habits are complete.`, 'habits', state.habits.completionRate, '%', 'habits'));

  const sleepHours = state.health.sleep ? state.health.sleep.durationMinutes / 60 : null;
  if (sleepHours != null && sleepHours < 6) add(insight(state, 'sleep-low', 'health', 'warning', 'Sleep was short', `${sleepHours.toFixed(1)} hours were recorded last night.`, 'sleep', sleepHours, 'hours', 'health'));
  if (sleepHours != null && sleepHours >= 8) add(insight(state, 'sleep-good', 'health', 'positive', 'Sleep duration is solid', `${sleepHours.toFixed(1)} hours were recorded last night.`, 'sleep', sleepHours, 'hours', 'health'));
  if (state.health.recovery?.available && state.health.recovery.readinessScore != null && state.health.recovery.readinessScore >= 85) add(insight(state, 'readiness-high', 'health', 'positive', 'Readiness is high', `Readiness is ${state.health.recovery.readinessScore}.`, 'recovery', state.health.recovery.readinessScore, 'score', 'recovery'));
  if (state.health.recovery?.available && state.health.recovery.readinessScore != null && state.health.recovery.readinessScore < 50) add(insight(state, 'readiness-low', 'health', 'warning', 'Readiness is low', `Readiness is ${state.health.recovery.readinessScore}. Consider using the recovery information alongside how you feel.`, 'recovery', state.health.recovery.readinessScore, 'score', 'recovery'));

  const target = state.nutrition.targets?.targetCalories;
  const calories = state.nutrition.summary.totals.calories;
  if (target && target > 0 && calories > target * 1.1) add(insight(state, 'calories-high', 'nutrition', 'info', 'Calories are above target', 'Recorded intake is more than 10% above the current target.', 'nutrition', calories, 'kcal', 'nutrition'));
  if (target && target > 0 && calories > 0 && calories < target * 0.9) add(insight(state, 'calories-low', 'nutrition', 'info', 'Calories are below target', 'Recorded intake is more than 10% below the current target.', 'nutrition', calories, 'kcal', 'nutrition'));

  if (state.finance.transactionsToday > 0) add(insight(state, 'finance-active', 'finance', 'info', 'Money activity recorded', `${state.finance.transactionsToday} transaction${state.finance.transactionsToday === 1 ? '' : 's'} recorded today.`, 'finance', state.finance.transactionsToday, 'transactions', 'finance'));
  if (state.books.currentlyReading > 0) add(insight(state, 'reading-active', 'learning', 'positive', 'Reading is in progress', `${state.books.currentlyReading} book${state.books.currentlyReading === 1 ? '' : 's'} currently in progress.`, 'books', state.books.currentlyReading, 'books', 'books'));
  if (state.journal.hasEntryToday) add(insight(state, 'reflection-done', 'reflection', 'positive', 'Daily reflection recorded', 'A journal entry has been recorded today.', 'journal', undefined, undefined, 'journal'));

  const activeGoals = state.goals.filter((goal) => goal.status === 'active').length;
  const behindGoals = state.goals.filter((goal) => goal.status === 'behind').length;
  if (behindGoals > 0) add(insight(state, 'goals-behind', 'goals', 'warning', 'Some goals need attention', `${behindGoals} active goal${behindGoals === 1 ? '' : 's'} are behind.`, 'goals', behindGoals, 'goals', 'goals'));
  if (activeGoals > 0 && behindGoals === 0) add(insight(state, 'goals-on-track', 'goals', 'positive', 'Goals are currently on track', `${activeGoals} active goal${activeGoals === 1 ? '' : 's'} have no recorded behind status.`, 'goals', activeGoals, 'goals', 'goals'));

  return items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id)).slice(0, 8);
}

export async function getLifeIntelligence(date: CivilDate = todayCivilDate()): Promise<LifeIntelligenceResult> {
  if (!isValidCivilDate(date)) throw new Error('Invalid intelligence date');
  const state = await getJeevyaDailyState(date);
  const insights = buildLifeInsights(state);
  const warningCount = insights.filter((item) => item.severity === 'warning').length;
  const summary = warningCount > 0 ? `${warningCount} area${warningCount === 1 ? '' : 's'} may need attention today.` : insights.length ? 'Your Jeevya signals are mostly positive or informational today.' : 'Not enough data is available for a useful daily signal yet.';
  return { date, insights, summary };
}
