import { getWorkoutHistory } from '@/services/workoutHistory';
import type {
  WorkoutExerciseProgression,
  WorkoutPerformanceSnapshot,
  WorkoutPR,
  WorkoutProgressionPoint,
  WorkoutSession,
  WorkoutSet,
  PRRecordType,
} from '@/types/workout';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function finitePositive(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function sessionDate(session: WorkoutSession): string {
  return (session.completedAt ?? session.startedAt ?? session.createdAt).slice(0, 10);
}

function weightKg(set: WorkoutSet): number | null {
  const value = set.weightKg ?? set.weight;
  return finitePositive(value) ? value : null;
}

function distanceKm(set: WorkoutSet): number | null {
  const value = set.distanceKm ?? set.distance;
  return finitePositive(value) ? value : null;
}

function completedSets(session: WorkoutSession, exerciseId: string): WorkoutSet[] {
  const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
  return exercise?.sets.filter((set) => set.completed) ?? [];
}

function sessionPoint(session: WorkoutSession, exerciseId: string): WorkoutProgressionPoint | null {
  const sets = completedSets(session, exerciseId);
  if (!sets.length) return null;
  const point: WorkoutProgressionPoint = {
    sessionId: session.id,
    date: sessionDate(session),
    sessionName: session.name,
  };
  const weights = sets.map(weightKg).filter((value): value is number => value !== null);
  const reps = sets.map((set) => finitePositive(set.reps) ? set.reps : null).filter((value): value is number => value !== null);
  const volumes = sets.map((set) => {
    const weight = weightKg(set);
    const repsValue = finitePositive(set.reps) ? set.reps : null;
    return weight !== null && repsValue !== null ? weight * repsValue : null;
  }).filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  const durations = sets.map((set) => finitePositive(set.durationSeconds) ? set.durationSeconds : null).filter((value): value is number => value !== null);
  const distances = sets.map(distanceKm).filter((value): value is number => value !== null);

  if (weights.length) point.bestWeightKg = Math.max(...weights);
  if (reps.length) point.bestReps = Math.max(...reps);
  if (volumes.length) point.bestVolume = Math.max(...volumes);
  if (durations.length) point.bestDurationSeconds = Math.max(...durations);
  if (distances.length) point.bestDistanceKm = Math.max(...distances);
  return point;
}

function estimatedForSets(sets: WorkoutSet[]): number | null {
  const values = sets.map((set) => {
    const weight = weightKg(set);
    const reps = finitePositive(set.reps) ? set.reps : null;
    return weight !== null && reps !== null ? calculateEstimatedOneRepMax(weight, reps) : null;
  }).filter((value): value is number => value !== null);
  return values.length ? Math.max(...values) : null;
}

function performanceFromPoint(point: WorkoutProgressionPoint, estimatedOneRepMax: number | null): WorkoutPerformanceSnapshot {
  return clone({ ...point, ...(estimatedOneRepMax !== null ? { estimatedOneRepMax } : {}) });
}

function chronologicalSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => session.status === 'completed').sort((a, b) => {
    const left = sessionDate(a).localeCompare(sessionDate(b));
    if (left) return left;
    const time = (a.completedAt ?? a.startedAt ?? a.createdAt).localeCompare(b.completedAt ?? b.startedAt ?? b.createdAt);
    return time || a.id.localeCompare(b.id);
  });
}

export async function getExerciseProgression(exerciseId: string): Promise<WorkoutExerciseProgression> {
  const id = exerciseId?.trim();
  if (!id) return emptyProgression(id);
  const sessions = chronologicalSessions((await getWorkoutHistory({ exerciseId: id, newestFirst: false, offset: 0 })).workouts);
  const points: WorkoutProgressionPoint[] = [];
  const performances: WorkoutPerformanceSnapshot[] = [];
  for (const session of sessions) {
    const point = sessionPoint(session, id);
    if (!point) continue;
    points.push(point);
    performances.push(performanceFromPoint(point, estimatedForSets(completedSets(session, id))));
  }
  const currentPerformance = performances.at(-1) ?? null;
  const previousPerformance = performances.length > 1 ? performances.at(-2)! : null;
  const currentEstimated = currentPerformance?.estimatedOneRepMax ?? null;
  const previousEstimated = previousPerformance?.estimatedOneRepMax ?? null;
  const bestEstimated = performances.reduce<number | null>((best, performance) => {
    const value = performance.estimatedOneRepMax;
    return value == null ? best : best == null ? value : Math.max(best, value);
  }, null);
  return {
    exerciseId: id,
    points: clone(points),
    currentPerformance: clone(currentPerformance),
    previousPerformance: clone(previousPerformance),
    weightChange: currentPerformance?.bestWeightKg != null && previousPerformance?.bestWeightKg != null ? currentPerformance.bestWeightKg - previousPerformance.bestWeightKg : null,
    repsChange: currentPerformance?.bestReps != null && previousPerformance?.bestReps != null ? currentPerformance.bestReps - previousPerformance.bestReps : null,
    volumeChange: currentPerformance?.bestVolume != null && previousPerformance?.bestVolume != null ? currentPerformance.bestVolume - previousPerformance.bestVolume : null,
    currentEstimatedOneRepMax: currentEstimated,
    previousEstimatedOneRepMax: previousEstimated,
    estimatedOneRepMaxChange: currentEstimated != null && previousEstimated != null ? currentEstimated - previousEstimated : null,
    bestEstimatedOneRepMax: bestEstimated,
  };
}

function emptyProgression(exerciseId: string): WorkoutExerciseProgression {
  return {
    exerciseId,
    points: [], currentPerformance: null, previousPerformance: null,
    weightChange: null, repsChange: null, volumeChange: null,
    currentEstimatedOneRepMax: null, previousEstimatedOneRepMax: null,
    estimatedOneRepMaxChange: null, bestEstimatedOneRepMax: null,
  };
}

export function calculateEstimatedOneRepMax(weightKgValue: number, reps: number): number | null {
  if (!finitePositive(weightKgValue) || !finitePositive(reps)) return null;
  const result = weightKgValue * (1 + reps / 30);
  return Number.isFinite(result) && result > 0 ? result : null;
}

export async function getExercisePRs(exerciseId: string): Promise<WorkoutPR[]> {
  const id = exerciseId?.trim();
  if (!id) return [];
  const sessions = chronologicalSessions((await getWorkoutHistory({ exerciseId: id, newestFirst: false, offset: 0 })).workouts);
  const best = new Map<PRRecordType, WorkoutPR>();
  const consider = (type: PRRecordType, value: number, session: WorkoutSession, set: WorkoutSet) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const candidate: WorkoutPR = { exerciseId: id, recordType: type, value, sessionId: session.id, sessionDate: sessionDate(session), setId: set.id };
    const existing = best.get(type);
    const candidateTime = session.completedAt ?? session.startedAt ?? session.createdAt;
    const existingTime = existing ? (() => {
      const source = sessions.find((item) => item.id === existing.sessionId);
      return source?.completedAt ?? source?.startedAt ?? source?.createdAt ?? '';
    })() : '';
    if (!existing || value > existing.value || (value === existing.value && candidateTime > existingTime) || (value === existing.value && candidateTime === existingTime && candidate.sessionId > existing.sessionId)) {
      best.set(type, candidate);
    }
  };
  for (const session of sessions) {
    for (const set of completedSets(session, id)) {
      const weight = weightKg(set);
      const reps = finitePositive(set.reps) ? set.reps : null;
      if (weight !== null) consider('max_weight', weight, session, set);
      if (reps !== null) consider('max_reps', reps, session, set);
      if (weight !== null && reps !== null) consider('max_volume', weight * reps, session, set);
      if (finitePositive(set.durationSeconds)) consider('longest_duration', set.durationSeconds, session, set);
      const distance = distanceKm(set);
      if (distance !== null) consider('longest_distance', distance, session, set);
    }
  }
  return clone([...best.values()].sort((a, b) => a.recordType.localeCompare(b.recordType)));
}

export async function getAllExercisePRs(): Promise<Record<string, WorkoutPR[]>> {
  const sessions = chronologicalSessions((await getWorkoutHistory({ newestFirst: false, offset: 0 })).workouts);
  const ids = [...new Set(sessions.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId)))];
  const result: Record<string, WorkoutPR[]> = {};
  for (const id of ids) result[id] = await getExercisePRs(id);
  return clone(result);
}

export async function getLatestExercisePerformance(exerciseId: string): Promise<WorkoutPerformanceSnapshot | null> {
  const progression = await getExerciseProgression(exerciseId);
  return clone(progression.currentPerformance);
}

export async function getPreviousExercisePerformance(exerciseId: string): Promise<WorkoutPerformanceSnapshot | null> {
  const progression = await getExerciseProgression(exerciseId);
  return clone(progression.previousPerformance);
}

export async function getBestEstimatedOneRepMax(exerciseId: string): Promise<number | null> {
  return (await getExerciseProgression(exerciseId)).bestEstimatedOneRepMax;
}
