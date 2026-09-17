import {
  getHealthAnalytics,
  getHealthAnalyticsDateRange,
  getSleepAnalytics,
  getWorkoutAnalytics,
  getRecoveryAnalytics,
  getHealthTrend,
  type HealthAnalyticsPeriod,
  type HealthAnalyticsResult,
} from '@/services/healthAnalytics';
import { getRecoveryForDate } from '@/services/recovery';
import { getExerciseProgression, getExercisePRs } from '@/services/workoutProgression';
import type { WorkoutPR } from '@/types/workout';

export type HealthInsightSeverity = 'positive' | 'info' | 'warning';
export type HealthInsightType = 'sleep' | 'recovery' | 'training' | 'consistency' | 'progression' | 'balance' | 'missing_data';

export interface HealthInsightEvidence {
  metric: string;
  currentValue: number | string;
  comparisonValue?: number | string;
  period: string;
}

export interface HealthInsight {
  id: string;
  type: HealthInsightType;
  severity: HealthInsightSeverity;
  title: string;
  message: string;
  evidence: HealthInsightEvidence[];
  metric?: string;
  createdForDate: string;
  priority: number;
}

const SEVERITY_RANK: Record<HealthInsightSeverity, number> = { warning: 0, positive: 1, info: 2 };
const TYPE_RANK: Record<HealthInsightType, number> = {
  missing_data: 0, sleep: 1, recovery: 2, training: 3, consistency: 4, progression: 5, balance: 6,
};

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function hours(minutes: number | null): number | null { return minutes == null ? null : minutes / 60; }
function fmt(value: number | null, digits = 1): string { return value == null ? 'n/a' : value.toFixed(digits); }
function dayShift(day: string, delta: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match || !Number.isInteger(delta)) return null;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  shifted.setUTCDate(shifted.getUTCDate() + delta);
  return shifted.toISOString().slice(0, 10);
}
function daysBetweenInclusive(start: string, end: string): number {
  let count = 0;
  let cursor = start;
  while (cursor <= end && count < 10000) {
    count += 1;
    const next = dayShift(cursor, 1);
    if (!next) break;
    cursor = next;
  }
  return count;
}

function makeInsight(
  type: HealthInsightType, severity: HealthInsightSeverity, title: string, message: string,
  evidence: HealthInsightEvidence[], date: string, priority: number, metric?: string,
): HealthInsight {
  const id = `health-${date}-${type}-${priority}`;
  return { id, type, severity, title, message, evidence: clone(evidence), ...(metric ? { metric } : {}), createdForDate: date, priority };
}

function periodLabel(period: HealthAnalyticsPeriod): string { return period === 'all' ? 'all available data' : period; }

function addSleepInsights(result: HealthAnalyticsResult, date: string, insights: HealthInsight[]) {
  const sleep = result.sleep;
  if (sleep.sleepDays == null || sleep.sleepDays < 3 || sleep.averageSleepDurationMinutes == null || sleep.sleepConsistencyPercentage == null) return;
  const avg = sleep.averageSleepDurationMinutes;
  const consistency = sleep.sleepConsistencyPercentage;
  if (avg >= 480 && consistency >= 80) insights.push(makeInsight('sleep', 'positive', 'Strong sleep pattern', `Average sleep is ${fmt(hours(avg))}h with ${fmt(consistency, 0)}% sleep consistency.`, [
    { metric: 'average sleep (hours)', currentValue: Number(fmt(hours(avg))), period: periodLabel(result.period) },
    { metric: 'sleep consistency (%)', currentValue: Number(fmt(consistency, 0)), period: periodLabel(result.period) },
  ], date, 10, 'averageSleepDurationMinutes'));
  else if (avg < 360) insights.push(makeInsight('sleep', 'warning', 'Low average sleep', `Average sleep is ${fmt(hours(avg))}h across recorded sleep days.`, [{ metric: 'average sleep (hours)', currentValue: Number(fmt(hours(avg))), period: periodLabel(result.period) }], date, 5, 'averageSleepDurationMinutes'));
  else if (avg >= 360 && avg <= 420) insights.push(makeInsight('sleep', 'info', 'Moderate sleep duration', `Average sleep is ${fmt(hours(avg))}h across recorded sleep days.`, [{ metric: 'average sleep (hours)', currentValue: Number(fmt(hours(avg))), period: periodLabel(result.period) }], date, 20, 'averageSleepDurationMinutes'));
  if (consistency < 60) insights.push(makeInsight('consistency', 'info', 'Sleep consistency is low', `Sleep was recorded on ${fmt(consistency, 0)}% of days in the selected period.`, [{ metric: 'sleep consistency (%)', currentValue: Number(fmt(consistency, 0)), period: periodLabel(result.period) }], date, 30, 'sleepConsistencyPercentage'));
}

function addRecoveryInsights(result: HealthAnalyticsResult, date: string, insights: HealthInsight[]) {
  const recovery = result.recovery;
  if (recovery.averageReadiness == null || recovery.daysWithAvailableReadiness == null) return;
  const avg = recovery.averageReadiness;
  const days = recovery.daysWithAvailableReadiness;
  if (avg >= 85 && days >= 5) insights.push(makeInsight('recovery', 'positive', 'Strong readiness pattern', `Average readiness is ${fmt(avg, 0)} across ${days} available days.`, [{ metric: 'average readiness', currentValue: Number(fmt(avg, 0)), period: periodLabel(result.period) }], date, 10, 'averageReadiness'));
  else if (avg < 50 && days >= 3) insights.push(makeInsight('recovery', 'warning', 'Low readiness pattern', `Average readiness is ${fmt(avg, 0)} across ${days} available days.`, [{ metric: 'average readiness', currentValue: Number(fmt(avg, 0)), period: periodLabel(result.period) }], date, 5, 'averageReadiness'));
  else if (avg >= 50 && avg < 70) insights.push(makeInsight('recovery', 'info', 'Moderate readiness pattern', `Average readiness is ${fmt(avg, 0)} across ${days} available days.`, [{ metric: 'average readiness', currentValue: Number(fmt(avg, 0)), period: periodLabel(result.period) }], date, 20, 'averageReadiness'));
}

async function addTrainingInsights(result: HealthAnalyticsResult, date: string, insights: HealthInsight[]) {
  const workout = result.workout;
  if (workout.activeWorkoutDays == null || workout.completedWorkoutCount == null) return;
  if (workout.activeWorkoutDays >= 3) insights.push(makeInsight('training', 'positive', 'Consistent training', `${workout.activeWorkoutDays} distinct workout days were recorded in the selected period.`, [{ metric: 'active workout days', currentValue: workout.activeWorkoutDays, period: periodLabel(result.period) }], date, 10, 'activeWorkoutDays'));
  else if (workout.activeWorkoutDays > 0 && workout.activeWorkoutDays < 3) insights.push(makeInsight('training', 'info', 'Sparse training activity', `${workout.activeWorkoutDays} distinct workout days were recorded in the selected period.`, [{ metric: 'active workout days', currentValue: workout.activeWorkoutDays, period: periodLabel(result.period) }], date, 25, 'activeWorkoutDays'));
  const readinessDates = result.trend.filter((point) => point.readinessScore != null).map((point) => point.date);
  if (readinessDates.length >= 3) {
    const lowLoadResults = await Promise.all(readinessDates.map((day) => getRecoveryForDate(day)));
    const lowLoadDays = lowLoadResults.filter((recovery) => recovery.available && recovery.trainingLoadScore <= 55).length;
    if (lowLoadDays >= 3) {
      insights.push(makeInsight('training', 'warning', 'High recent training load pattern', 'Training-load scores have remained low across multiple available readiness days.', [{ metric: 'low training-load score days', currentValue: lowLoadDays, period: periodLabel(result.period) }], date, 15, 'trainingLoadScore'));
    }
  }
}

async function addProgressionInsights(result: HealthAnalyticsResult, date: string, insights: HealthInsight[]) {
  for (const exercise of result.workout.exerciseMetrics) {
    const progression = await getExerciseProgression(exercise.exerciseId);
    const points = progression.points.filter((point) => point.date >= (result.dateRange.start ?? point.date) && point.date <= (result.dateRange.end ?? date));
    if (points.length >= 2) {
      const current = points.at(-1)!;
      const previous = points.at(-2)!;
      const currentPerformance = progression.points.length === points.length ? progression.currentPerformance : null;
      const previousPerformance = progression.points.length === points.length ? progression.previousPerformance : null;
      const estimatedChange = currentPerformance?.estimatedOneRepMax != null && previousPerformance?.estimatedOneRepMax != null
        ? currentPerformance.estimatedOneRepMax - previousPerformance.estimatedOneRepMax
        : null;
      const weightChange = current.bestWeightKg != null && previous.bestWeightKg != null ? current.bestWeightKg - previous.bestWeightKg : null;
      if ((estimatedChange != null && estimatedChange > 0) || (weightChange != null && weightChange > 0)) {
        const metric = estimatedChange != null && estimatedChange > 0 ? 'estimated 1RM change' : 'best weight change';
        const value = metric === 'estimated 1RM change' ? estimatedChange! : weightChange!;
        insights.push(makeInsight('progression', 'positive', 'Progression detected', `${exercise.exerciseId} improved across multiple completed sessions in the selected period.`, [{ metric, currentValue: Number(fmt(value, 1)), period: periodLabel(result.period) }], date, 10, metric));
      }
    }
    const prs = await getExercisePRs(exercise.exerciseId);
    const inPeriod = prs.filter((pr: WorkoutPR) => pr.sessionDate >= (result.dateRange.start ?? pr.sessionDate) && pr.sessionDate <= (result.dateRange.end ?? date));
    if (inPeriod.length) insights.push(makeInsight('progression', 'positive', 'New best performance', `${exercise.exerciseId} has a best performance recorded in the selected period.`, inPeriod.slice(0, 1).map((pr) => ({ metric: pr.recordType, currentValue: pr.value, period: periodLabel(result.period) })), date, 15, inPeriod[0].recordType));
  }
}

function addConsistencyInsights(result: HealthAnalyticsResult, date: string, insights: HealthInsight[]) {
  if (result.recovery.daysWithAvailableReadiness != null && result.recovery.daysWithAvailableReadiness >= 5 && result.recovery.averageReadiness != null && result.recovery.averageReadiness >= 70) {
    insights.push(makeInsight('consistency', 'positive', 'Sustained readiness', `Readiness was available on ${result.recovery.daysWithAvailableReadiness} days with an average of ${fmt(result.recovery.averageReadiness, 0)}.`, [{ metric: 'readiness days', currentValue: result.recovery.daysWithAvailableReadiness, period: periodLabel(result.period) }, { metric: 'average readiness', currentValue: Number(fmt(result.recovery.averageReadiness, 0)), period: periodLabel(result.period) }], date, 15, 'averageReadiness'));
  }
  if (result.sleep.sleepConsistencyPercentage != null && result.sleep.sleepDays != null && result.sleep.sleepDays >= 3 && result.sleep.sleepConsistencyPercentage >= 80) {
    insights.push(makeInsight('consistency', 'positive', 'Consistent sleep recording', `Sleep was recorded on ${fmt(result.sleep.sleepConsistencyPercentage, 0)}% of days in the selected period.`, [{ metric: 'sleep consistency (%)', currentValue: Number(fmt(result.sleep.sleepConsistencyPercentage, 0)), period: periodLabel(result.period) }], date, 20, 'sleepConsistencyPercentage'));
  }
}

function addBalanceInsights(result: HealthAnalyticsResult, date: string, insights: HealthInsight[]) {
  const duration = result.workout.totalWorkoutDurationSeconds;
  const sleep = result.sleep.averageSleepDurationMinutes;
  if (duration == null || sleep == null || result.workout.completedWorkoutCount == null) return;
  const rangeDays = result.dateRange.start && result.dateRange.end ? Math.max(1, daysBetweenInclusive(result.dateRange.start, result.dateRange.end)) : 1;
  const weeklyMinutes = (duration / 60) / (rangeDays / 7);
  if (weeklyMinutes > 300 && sleep < 420) insights.push(makeInsight('balance', 'info', 'Training and sleep balance', 'Recent training volume is high while sleep duration is lower than your recent average.', [
    { metric: 'workout duration (minutes)', currentValue: Math.round(duration / 60), period: periodLabel(result.period) },
    { metric: 'average sleep (hours)', currentValue: Number(fmt(hours(sleep))), period: periodLabel(result.period) },
  ], date, 20));
}

function addMissingDataInsights(result: HealthAnalyticsResult, date: string, insights: HealthInsight[]) {
  if (!result.dataAvailability.hasSleepData) insights.push(makeInsight('missing_data', 'info', 'Sleep data is missing', 'No sleep records are available for the selected period.', [{ metric: 'sleep days', currentValue: 0, period: periodLabel(result.period) }], date, 5));
  if (!result.dataAvailability.hasWorkoutData) insights.push(makeInsight('missing_data', 'info', 'Workout data is missing', 'No completed workouts are available for the selected period.', [{ metric: 'completed workouts', currentValue: 0, period: periodLabel(result.period) }], date, 6));
  if (!result.dataAvailability.hasRecoveryData) insights.push(makeInsight('missing_data', 'info', 'Recovery data is insufficient', 'No available readiness measurements are present for the selected period.', [{ metric: 'readiness days', currentValue: 0, period: periodLabel(result.period) }], date, 7));
}

function finalize(insights: HealthInsight[]): HealthInsight[] {
  const unique = [...new Map(insights.map((item) => [item.id, item])).values()];
  unique.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.priority - b.priority || TYPE_RANK[a.type] - TYPE_RANK[b.type] || a.id.localeCompare(b.id));
  return clone(unique.slice(0, 8));
}

async function analyticsForRange(start: string, end: string, period: HealthAnalyticsPeriod): Promise<HealthAnalyticsResult> {
  const [workout, sleep, recovery, trend] = await Promise.all([
    getWorkoutAnalytics(start, end),
    getSleepAnalytics(start, end),
    getRecoveryAnalytics(start, end),
    getHealthTrend(start, end),
  ]);
  return clone({ period, workout, sleep, recovery, trend, dateRange: { start, end }, dataAvailability: {
    hasWorkoutData: workout.completedWorkoutCount != null && workout.completedWorkoutCount > 0,
    hasSleepData: sleep.sleepDays != null && sleep.sleepDays > 0,
    hasRecoveryData: recovery.daysWithAvailableReadiness != null && recovery.daysWithAvailableReadiness > 0,
  }});
}

function rangeEndingAt(period: HealthAnalyticsPeriod, end: string): { start: string; end: string } | null {
  if (period === 'all') return null;
  const lengths: Record<Exclude<HealthAnalyticsPeriod, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  const start = dayShift(end, -(lengths[period] - 1));
  return start ? { start, end } : null;
}

async function analyticsForDate(period: HealthAnalyticsPeriod, end: string): Promise<HealthAnalyticsResult> {
  const range = rangeEndingAt(period, end);
  if (!range) return getHealthAnalytics(period);
  return analyticsForRange(range.start, range.end, period);
}

export async function getHealthInsights(period: HealthAnalyticsPeriod = '30d', asOfDate?: string): Promise<HealthInsight[]> {
  const date = asOfDate ?? (await getHealthAnalyticsDateRange(period)).end ?? new Date().toISOString().slice(0, 10);
  const result = await analyticsForDate(period, date);
  const insights: HealthInsight[] = [];
  addSleepInsights(result, date, insights);
  addRecoveryInsights(result, date, insights);
  await addTrainingInsights(result, date, insights);
  await addProgressionInsights(result, date, insights);
  addConsistencyInsights(result, date, insights);
  addBalanceInsights(result, date, insights);
  addMissingDataInsights(result, date, insights);

  if (period !== 'all' && result.dateRange.start && result.dateRange.end) {
    const length = daysBetweenInclusive(result.dateRange.start, result.dateRange.end);
    const previousEnd = dayShift(result.dateRange.start, -1);
    const previousStart = previousEnd ? dayShift(previousEnd, -(length - 1)) : null;
    if (previousStart && previousEnd) {
      const previous = await analyticsForRange(previousStart, previousEnd, period);
      if ((result.sleep.sleepDays ?? 0) >= 3 && (previous.sleep.sleepDays ?? 0) >= 3 && result.sleep.averageSleepDurationMinutes != null && previous.sleep.averageSleepDurationMinutes != null) {
        const delta = result.sleep.averageSleepDurationMinutes - previous.sleep.averageSleepDurationMinutes;
        if (Math.abs(delta) >= 30) insights.push(makeInsight('sleep', delta > 0 ? 'positive' : 'info', 'Sleep period comparison', `Average sleep is ${fmt(hours(result.sleep.averageSleepDurationMinutes))}h, ${delta > 0 ? 'higher' : 'lower'} than the previous equivalent period.`, [{ metric: 'average sleep (hours)', currentValue: Number(fmt(hours(result.sleep.averageSleepDurationMinutes))), comparisonValue: Number(fmt(hours(previous.sleep.averageSleepDurationMinutes))), period: periodLabel(period) }], date, 35, 'averageSleepDurationMinutes'));
      }
    }
  }
  return finalize(insights);
}

export async function getHealthInsightsForDate(date: string, period: HealthAnalyticsPeriod = '7d'): Promise<HealthInsight[]> {
  return getHealthInsights(period, date);
}

export async function getTopHealthInsights(period: HealthAnalyticsPeriod = '30d', limit = 5): Promise<HealthInsight[]> {
  return (await getHealthInsights(period)).slice(0, Math.max(0, Math.min(8, limit)));
}

export function getHealthInsightEvidence(insight: HealthInsight): HealthInsightEvidence[] { return clone(insight.evidence); }

