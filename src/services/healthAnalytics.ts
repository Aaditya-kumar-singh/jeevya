import { getWorkoutHistory } from '@/services/workoutHistory';
import { calculateWorkoutVolume } from '@/services/workouts';
import { calculateEstimatedOneRepMax } from '@/services/workoutProgression';
import { listSleepEntries, type SleepEntry, type SleepQuality } from '@/services/sleep';
import { getRecoveryForDate, getReadinessLevel, type ReadinessLevel, type RecoveryResult } from '@/services/recovery';
import { isValidDay, todayDay } from '@/lib/journal-calendar';
import type { WorkoutSession, WorkoutSet } from '@/types/workout';

export type HealthAnalyticsPeriod = '7d' | '30d' | '90d' | '365d' | 'all';

export interface HealthAnalyticsDateRange {
  start: string | null;
  end: string | null;
}

export interface WorkoutAnalytics {
  completedWorkoutCount: number | null;
  totalCompletedSets: number | null;
  totalWorkoutDurationSeconds: number | null;
  totalWorkoutVolume: number | null;
  averageWorkoutDurationSeconds: number | null;
  averageVolumePerCompletedWorkout: number | null;
  activeWorkoutDays: number | null;
  averageWorkoutsPerWeek: number | null;
  exerciseMetrics: ExerciseAnalytics[];
}

export interface ExerciseAnalytics {
  exerciseId: string;
  exerciseSessionCount: number | null;
  totalSets: number | null;
  totalVolume: number | null;
  bestWeightKg: number | null;
  bestReps: number | null;
  bestEstimatedOneRepMax: number | null;
}

export interface SleepAnalytics {
  sleepDays: number | null;
  averageSleepDurationMinutes: number | null;
  minimumSleepDurationMinutes: number | null;
  maximumSleepDurationMinutes: number | null;
  totalSleepDurationMinutes: number | null;
  averageSleepQuality: number | null;
  qualityDistribution: Record<SleepQuality, number>;
  sleepConsistencyPercentage: number | null;
}

export interface RecoveryAnalytics {
  daysWithAvailableReadiness: number | null;
  averageReadiness: number | null;
  minimumReadiness: number | null;
  maximumReadiness: number | null;
  readinessLevelDistribution: Record<ReadinessLevel, number>;
  averageSleepContribution: number | null;
  averageTrainingLoadContribution: number | null;
  averageConsistencyContribution: number | null;
}

export interface HealthTrendPoint {
  date: string;
  workoutDurationSeconds?: number;
  workoutVolume?: number;
  sleepDurationMinutes?: number;
  readinessScore?: number;
}

export interface HealthAnalyticsResult {
  period: HealthAnalyticsPeriod;
  workout: WorkoutAnalytics;
  sleep: SleepAnalytics;
  recovery: RecoveryAnalytics;
  trend: HealthTrendPoint[];
  dateRange: HealthAnalyticsDateRange;
  dataAvailability: {
    hasWorkoutData: boolean;
    hasSleepData: boolean;
    hasRecoveryData: boolean;
  };
}

const PERIOD_DAYS: Record<Exclude<HealthAnalyticsPeriod, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

const QUALITY_SCORE: Record<SleepQuality, number> = {
  poor: 1,
  fair: 2,
  good: 3,
  excellent: 4,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function dayShift(day: string, delta: number): string | null {
  if (!isValidDay(day) || !Number.isInteger(delta)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date, 12));
  shifted.setUTCDate(shifted.getUTCDate() + delta);
  const result = shifted.toISOString().slice(0, 10);
  return isValidDay(result) ? result : null;
}

function daysInclusive(start: string, end: string): string[] {
  if (!isValidDay(start) || !isValidDay(end) || start > end) return [];
  const result: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    result.push(cursor);
    const next = dayShift(cursor, 1);
    if (!next) break;
    cursor = next;
  }
  return result;
}

function rangeForPeriod(period: HealthAnalyticsPeriod, endDate: string): HealthAnalyticsDateRange {
  if (!isValidDay(endDate)) return { start: null, end: null };
  if (period === 'all') return { start: null, end: endDate };
  const start = dayShift(endDate, -(PERIOD_DAYS[period] - 1));
  return { start, end: endDate };
}

function sessionDate(session: WorkoutSession): string | null {
  const candidates = [session.completedAt, session.startedAt, session.createdAt];
  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match && isValidDay(match[1])) return match[1];
  }
  return null;
}

function inRange(date: string | null, range: HealthAnalyticsDateRange): boolean {
  if (!date || !isValidDay(date)) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

function emptyWorkoutAnalytics(): WorkoutAnalytics {
  return {
    completedWorkoutCount: null,
    totalCompletedSets: null,
    totalWorkoutDurationSeconds: null,
    totalWorkoutVolume: null,
    averageWorkoutDurationSeconds: null,
    averageVolumePerCompletedWorkout: null,
    activeWorkoutDays: null,
    averageWorkoutsPerWeek: null,
    exerciseMetrics: [],
  };
}

function emptySleepAnalytics(): SleepAnalytics {
  return {
    sleepDays: null,
    averageSleepDurationMinutes: null,
    minimumSleepDurationMinutes: null,
    maximumSleepDurationMinutes: null,
    totalSleepDurationMinutes: null,
    averageSleepQuality: null,
    qualityDistribution: { poor: 0, fair: 0, good: 0, excellent: 0 },
    sleepConsistencyPercentage: null,
  };
}

function emptyRecoveryAnalytics(): RecoveryAnalytics {
  return {
    daysWithAvailableReadiness: null,
    averageReadiness: null,
    minimumReadiness: null,
    maximumReadiness: null,
    readinessLevelDistribution: { low: 0, moderate: 0, good: 0, excellent: 0 },
    averageSleepContribution: null,
    averageTrainingLoadContribution: null,
    averageConsistencyContribution: null,
  };
}

async function getCompletedSessions(range: HealthAnalyticsDateRange): Promise<WorkoutSession[]> {
  const result = await getWorkoutHistory({
    fromDate: range.start ?? undefined,
    toDate: range.end ?? undefined,
    newestFirst: false,
    offset: 0,
  });
  return result.workouts.filter((session) => session.status === 'completed').map(clone);
}

function completedSets(session: WorkoutSession): WorkoutSet[] {
  return session.exercises.flatMap((exercise) => exercise.sets.filter((set) => set.completed));
}

async function getSleepByDate(range: HealthAnalyticsDateRange): Promise<Map<string, SleepEntry>> {
  const entries = await listSleepEntries();
  const byDate = new Map<string, SleepEntry>();
  for (const entry of entries) {
    if (!inRange(entry.date, range) || !finitePositive(entry.durationMinutes) || !isValidDay(entry.date)) continue;
    const existing = byDate.get(entry.date);
    if (!existing || Date.parse(entry.updatedAt) > Date.parse(existing.updatedAt) || (Date.parse(entry.updatedAt) === Date.parse(existing.updatedAt) && entry.id > existing.id)) {
      byDate.set(entry.date, clone(entry));
    }
  }
  return byDate;
}

function buildExerciseIds(sessions: WorkoutSession[]): string[] {
  return [...new Set(sessions.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId).filter((id) => typeof id === 'string' && id.trim())))].sort();
}

function completedSetVolume(set: WorkoutSet): number {
  const weight = set.weightKg ?? set.weight;
  return finitePositive(weight) && finitePositive(set.reps) ? weight * set.reps : 0;
}

export async function getWorkoutAnalytics(startDate: string, endDate: string): Promise<WorkoutAnalytics> {
  const range = { start: startDate, end: endDate };
  const sessions = await getCompletedSessions(range);
  if (!sessions.length) return emptyWorkoutAnalytics();

  let totalSets = 0;
  let totalDuration = 0;
  let totalVolume = 0;
  const activeDays = new Set<string>();
  const exerciseMap = new Map<string, { sessions: Set<string>; sets: number; volume: number }>();

  for (const session of sessions) {
    const date = sessionDate(session);
    if (date) activeDays.add(date);
    totalSets += completedSets(session).length;
    if (finiteNonNegative(session.durationSeconds)) totalDuration += session.durationSeconds;
    totalVolume += calculateWorkoutVolume(session);

    for (const exercise of session.exercises) {
      if (!exercise.exerciseId?.trim()) continue;
      const current = exerciseMap.get(exercise.exerciseId) ?? { sessions: new Set<string>(), sets: 0, volume: 0 };
      current.sessions.add(session.id);
      const sets = exercise.sets.filter((set) => set.completed);
      current.sets += sets.length;
      current.volume += sets.reduce((sum, set) => sum + completedSetVolume(set), 0);
      exerciseMap.set(exercise.exerciseId, current);
    }
  }

  const workoutCount = sessions.length;
  const rangeDays = range.start && range.end ? Math.max(1, daysInclusive(range.start, range.end).length) : 1;
  const averageWeeks = rangeDays / 7;
  const exerciseMetrics: ExerciseAnalytics[] = [];
  for (const exerciseId of buildExerciseIds(sessions)) {
    const current = exerciseMap.get(exerciseId);
    if (!current) continue;
    const relevantSessions = sessions.filter((session) => inRange(sessionDate(session), range) && session.exercises.some((exercise) => exercise.exerciseId === exerciseId));
    const bestWeight: number[] = [];
    const bestReps: number[] = [];
    const estimated: number[] = [];
    for (const session of relevantSessions) {
      const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
      if (!exercise) continue;
      for (const set of exercise.sets.filter((item) => item.completed)) {
        const weight = set.weightKg ?? set.weight;
        if (finitePositive(weight)) bestWeight.push(weight);
        if (finitePositive(set.reps)) bestReps.push(set.reps);
        if (finitePositive(weight) && finitePositive(set.reps)) {
          const oneRepMax = calculateEstimatedOneRepMax(weight, set.reps);
          if (oneRepMax != null) estimated.push(oneRepMax);
        }
      }
    }

    exerciseMetrics.push({
      exerciseId,
      exerciseSessionCount: current.sessions.size,
      totalSets: current.sets,
      totalVolume: current.volume,
      bestWeightKg: bestWeight.length ? Math.max(...bestWeight) : null,
      bestReps: bestReps.length ? Math.max(...bestReps) : null,
      bestEstimatedOneRepMax: estimated.length ? Math.max(...estimated) : null,
    });
  }

  return clone({
    completedWorkoutCount: workoutCount,
    totalCompletedSets: totalSets,
    totalWorkoutDurationSeconds: totalDuration,
    totalWorkoutVolume: totalVolume,
    averageWorkoutDurationSeconds: totalDuration / workoutCount,
    averageVolumePerCompletedWorkout: totalVolume / workoutCount,
    activeWorkoutDays: activeDays.size,
    averageWorkoutsPerWeek: workoutCount / averageWeeks,
    exerciseMetrics,
  });
}

export async function getSleepAnalytics(startDate: string, endDate: string): Promise<SleepAnalytics> {
  const range = { start: startDate, end: endDate };
  const byDate = await getSleepByDate(range);
  if (!byDate.size) return emptySleepAnalytics();

  const entries = [...byDate.values()];
  const total = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const qualityDistribution = { poor: 0, fair: 0, good: 0, excellent: 0 } as Record<SleepQuality, number>;
  let qualityTotal = 0;
  for (const entry of entries) {
    qualityDistribution[entry.quality] += 1;
    qualityTotal += QUALITY_SCORE[entry.quality];
  }
  const rangeDays = Math.max(1, daysInclusive(startDate, endDate).length);

  return clone({
    sleepDays: entries.length,
    averageSleepDurationMinutes: total / entries.length,
    minimumSleepDurationMinutes: Math.min(...entries.map((entry) => entry.durationMinutes)),
    maximumSleepDurationMinutes: Math.max(...entries.map((entry) => entry.durationMinutes)),
    totalSleepDurationMinutes: total,
    averageSleepQuality: qualityTotal / entries.length,
    qualityDistribution,
    sleepConsistencyPercentage: (entries.length / rangeDays) * 100,
  });
}

export async function getRecoveryAnalytics(startDate: string, endDate: string): Promise<RecoveryAnalytics> {
  const dates = daysInclusive(startDate, endDate);
  if (!dates.length) return emptyRecoveryAnalytics();
  const results: RecoveryResult[] = [];
  for (const date of dates) {
    const result = await getRecoveryForDate(date);
    if (result.available && result.readinessScore != null) results.push(clone(result));
  }
  if (!results.length) return emptyRecoveryAnalytics();

  const distribution = { low: 0, moderate: 0, good: 0, excellent: 0 } as Record<ReadinessLevel, number>;
  let readiness = 0;
  let sleep = 0;
  let training = 0;
  let consistency = 0;
  let sleepCount = 0;
  let trainingCount = 0;
  let consistencyCount = 0;

  for (const result of results) {
    readiness += result.readinessScore!;
    const level = getReadinessLevel(result.readinessScore);
    if (level) distribution[level] += 1;
    if (result.sleepScore != null) { sleep += result.sleepScore * 0.5; sleepCount += 1; }
    if (result.trainingLoadScore != null) { training += result.trainingLoadScore * 0.3; trainingCount += 1; }
    if (result.consistencyScore != null) { consistency += result.consistencyScore * 0.2; consistencyCount += 1; }
  }

  return clone({
    daysWithAvailableReadiness: results.length,
    averageReadiness: readiness / results.length,
    minimumReadiness: Math.min(...results.map((result) => result.readinessScore!)),
    maximumReadiness: Math.max(...results.map((result) => result.readinessScore!)),
    readinessLevelDistribution: distribution,
    averageSleepContribution: sleepCount ? sleep / sleepCount : null,
    averageTrainingLoadContribution: trainingCount ? training / trainingCount : null,
    averageConsistencyContribution: consistencyCount ? consistency / consistencyCount : null,
  });
}

export async function getHealthTrend(startDate: string, endDate: string): Promise<HealthTrendPoint[]> {
  const dates = daysInclusive(startDate, endDate);
  if (!dates.length) return [];
  const sessions = await getCompletedSessions({ start: startDate, end: endDate });
  const sleepByDate = await getSleepByDate({ start: startDate, end: endDate });
  const sessionByDate = new Map<string, { duration: number; volume: number }>();
  for (const session of sessions) {
    const date = sessionDate(session);
    if (!date) continue;
    const current = sessionByDate.get(date) ?? { duration: 0, volume: 0 };
    if (finiteNonNegative(session.durationSeconds)) current.duration += session.durationSeconds;
    current.volume += calculateWorkoutVolume(session);
    sessionByDate.set(date, current);
  }

  const points: HealthTrendPoint[] = [];
  for (const date of dates) {
    const point: HealthTrendPoint = { date };
    const workout = sessionByDate.get(date);
    if (workout) {
      point.workoutDurationSeconds = workout.duration;
      point.workoutVolume = workout.volume;
    }
    const sleep = sleepByDate.get(date);
    if (sleep) point.sleepDurationMinutes = sleep.durationMinutes;
    const recovery = await getRecoveryForDate(date);
    if (recovery.available && recovery.readinessScore != null) point.readinessScore = recovery.readinessScore;
    if (Object.keys(point).length > 1) points.push(point);
  }
  return clone(points);
}

export async function getHealthAnalyticsDateRange(period: HealthAnalyticsPeriod = 'all'): Promise<HealthAnalyticsDateRange> {
  const end = todayDay();
  if (period !== 'all') return rangeForPeriod(period, end);

  const [workoutRange, sleepEntries] = await Promise.all([
    getWorkoutHistoryDateRangeForAnalytics(),
    listSleepEntries(),
  ]);
  const dates = [workoutRange.start, ...sleepEntries.map((entry) => isValidDay(entry.date) ? entry.date : null)].filter((date): date is string => !!date);
  return { start: dates.length ? dates.sort()[0] : null, end };
}

async function getWorkoutHistoryDateRangeForAnalytics(): Promise<{ start: string | null; end: string | null }> {
  const result = await getWorkoutHistory({ newestFirst: false, offset: 0 });
  const dates = result.workouts.map(sessionDate).filter((date): date is string => !!date);
  return { start: dates.length ? dates.sort()[0] : null, end: dates.length ? dates.sort().at(-1)! : null };
}

export async function getHealthAnalytics(period: HealthAnalyticsPeriod = '7d'): Promise<HealthAnalyticsResult> {
  const requestedRange = await getHealthAnalyticsDateRange(period);
  if (!requestedRange.end || (period === 'all' && !requestedRange.start)) {
    return clone({
      period,
      workout: emptyWorkoutAnalytics(),
      sleep: emptySleepAnalytics(),
      recovery: emptyRecoveryAnalytics(),
      trend: [],
      dateRange: requestedRange,
      dataAvailability: { hasWorkoutData: false, hasSleepData: false, hasRecoveryData: false },
    });
  }

  const [workout, sleep, recovery, trend] = await Promise.all([
    getWorkoutAnalytics(requestedRange.start ?? requestedRange.end, requestedRange.end),
    getSleepAnalytics(requestedRange.start ?? requestedRange.end, requestedRange.end),
    getRecoveryAnalytics(requestedRange.start ?? requestedRange.end, requestedRange.end),
    getHealthTrend(requestedRange.start ?? requestedRange.end, requestedRange.end),
  ]);

  return clone({
    period,
    workout,
    sleep,
    recovery,
    trend,
    dateRange: requestedRange,
    dataAvailability: {
      hasWorkoutData: workout.completedWorkoutCount != null && workout.completedWorkoutCount > 0,
      hasSleepData: sleep.sleepDays != null && sleep.sleepDays > 0,
      hasRecoveryData: recovery.daysWithAvailableReadiness != null && recovery.daysWithAvailableReadiness > 0,
    },
  });
}
