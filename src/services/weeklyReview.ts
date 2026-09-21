import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getJeevyaAnalytics } from '@/services/jeevyaAnalytics';
import type { WeeklyReviewInsight, WeeklyReviewResult } from '@/types/weeklyReview';

export function buildWeeklyReviewInsights(result: WeeklyReviewResult['analytics']): WeeklyReviewInsight[] {
  const { summary, points } = result;
  const insights: WeeklyReviewInsight[] = [];

  if (summary.taskCompletionRate !== null && summary.taskCompletionRate >= 80) {
    insights.push({ id: 'tasks-strong', tone: 'positive', title: 'Strong task follow-through', description: `${summary.taskCompletionRate}% of due-task volume was completed.` , value: summary.taskCompletionRate });
  } else if (summary.totalTasksDue > 0) {
    insights.push({ id: 'tasks-follow-through', tone: 'attention', title: 'Task follow-through needs attention', description: `${summary.totalTasksCompleted} of ${summary.totalTasksDue} due-task volume was completed.` , value: summary.taskCompletionRate ?? 0 });
  }

  if (summary.averageHabitCompletionRate !== null && summary.averageHabitCompletionRate >= 80) {
    insights.push({ id: 'habits-strong', tone: 'positive', title: 'Habit consistency is strong', description: `${summary.averageHabitCompletionRate}% average completion across scheduled habits.`, value: summary.averageHabitCompletionRate });
  } else if (summary.averageHabitCompletionRate !== null) {
    insights.push({ id: 'habits-low', tone: 'attention', title: 'Habit consistency has room to improve', description: `${summary.averageHabitCompletionRate}% average completion across scheduled habits.`, value: summary.averageHabitCompletionRate });
  }

  if (summary.totalWorkouts > 0) {
    insights.push({ id: 'workouts', tone: 'positive', title: 'Training completed', description: `${summary.totalWorkouts} workouts and ${summary.totalWorkoutMinutes} minutes recorded this week.`, value: summary.totalWorkouts });
  }

  if (summary.averageSleepMinutes !== null) {
    const hours = Math.round((summary.averageSleepMinutes / 60) * 10) / 10;
    insights.push(hours >= 7
      ? { id: 'sleep-good', tone: 'positive', title: 'Sleep average', description: `${hours} hours average across recorded nights.`, value: summary.averageSleepMinutes }
      : { id: 'sleep-low', tone: 'attention', title: 'Sleep average is low', description: `${hours} hours average across recorded nights.`, value: summary.averageSleepMinutes });
  }

  if (summary.averageReadinessScore !== null) {
    insights.push(summary.averageReadinessScore >= 75
      ? { id: 'readiness-good', tone: 'positive', title: 'Recovery readiness was solid', description: `${Math.round(summary.averageReadinessScore)} average readiness score.`, value: summary.averageReadinessScore }
      : { id: 'readiness-low', tone: 'attention', title: 'Recovery readiness was lower', description: `${Math.round(summary.averageReadinessScore)} average readiness score.`, value: summary.averageReadinessScore });
  }

  if (summary.totalJournalEntries > 0) {
    insights.push({ id: 'journal', tone: 'positive', title: 'Reflection recorded', description: `${summary.totalJournalEntries} journal entr${summary.totalJournalEntries === 1 ? 'y' : 'ies'} logged.` , value: summary.totalJournalEntries });
  }

  if (summary.totalFinanceTransactions > 0) {
    const net = summary.totalFinanceIncome - summary.totalFinanceExpense;
    insights.push({ id: 'finance', tone: 'neutral', title: 'Finance activity recorded', description: `₹${Math.round(summary.totalFinanceIncome).toLocaleString('en-IN')} income and ₹${Math.round(summary.totalFinanceExpense).toLocaleString('en-IN')} expense across ${summary.totalFinanceTransactions} transactions.`, value: net });
  }

  if (summary.goalBehindDays > 0) {
    insights.push({ id: 'goals-behind', tone: 'attention', title: 'Goals fell behind pace', description: `${summary.goalBehindDays} behind-goal observations were recorded.` , value: summary.goalBehindDays });
  } else if (summary.goalCompletionCount > 0) {
    insights.push({ id: 'goals-complete', tone: 'positive', title: 'Goal progress recorded', description: `${summary.goalCompletionCount} completed-goal observations were recorded.` , value: summary.goalCompletionCount });
  }

  const activeDays = points.filter((point) => point.workoutsCompleted > 0 || point.journalEntries > 0 || point.tasksCompleted > 0).length;
  if (activeDays >= 5) {
    insights.push({ id: 'consistency', tone: 'positive', title: 'Week had consistent activity', description: `${activeDays} of ${summary.days} days included tracked activity.`, value: activeDays });
  } else if (summary.days > 0 && activeDays > 0) {
    insights.push({ id: 'consistency-light', tone: 'neutral', title: 'Activity was intermittent', description: `${activeDays} of ${summary.days} days included tracked activity.`, value: activeDays });
  }

  const toneRank = { attention: 0, positive: 1, neutral: 2 } as const;
  return insights.sort((a, b) => toneRank[a.tone] - toneRank[b.tone] || a.id.localeCompare(b.id)).slice(0, 8);
}

export async function getWeeklyReview(endDate: CivilDate = todayCivilDate()): Promise<WeeklyReviewResult> {
  const analytics = await getJeevyaAnalytics(7, endDate);
  return { startDate: analytics.startDate, endDate: analytics.endDate, analytics, insights: buildWeeklyReviewInsights(analytics) };
}
