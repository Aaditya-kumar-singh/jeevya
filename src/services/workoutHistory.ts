import { getWorkoutSessions, calculateWorkoutVolume } from '@/services/workouts';
import type {
  WorkoutHistoryExerciseEntry,
  WorkoutHistoryFilter,
  WorkoutHistoryResult,
  WorkoutHistorySummary,
  WorkoutSession,
  WorkoutSet,
} from '@/types/workout';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function datePart(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function sessionDate(session: WorkoutSession): string {
  return datePart(session.completedAt) ?? datePart(session.startedAt) ?? datePart(session.createdAt) ?? '';
}

function normalizeDateFilter(value: string | undefined): string | undefined {
  if (!value || !DAY_RE.test(value)) return undefined;
  return value;
}

function compareHistory(a: WorkoutSession, b: WorkoutSession, newestFirst: boolean): number {
  const aDate = sessionDate(a);
  const bDate = sessionDate(b);
  const primary = newestFirst ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
  if (primary !== 0) return primary;
  const aTime = a.completedAt ?? a.startedAt ?? a.createdAt;
  const bTime = b.completedAt ?? b.startedAt ?? b.createdAt;
  const secondary = newestFirst ? bTime.localeCompare(aTime) : aTime.localeCompare(bTime);
  return secondary || (newestFirst ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id));
}

function completedSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => session.status === 'completed').map(clone);
}

function matchesDate(session: WorkoutSession, fromDate?: string, toDate?: string): boolean {
  const date = sessionDate(session);
  if (!date) return false;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function matchesExercise(session: WorkoutSession, exerciseId?: string): boolean {
  return !exerciseId || session.exercises.some((exercise) => exercise.exerciseId === exerciseId);
}

function filterAndSort(sessions: WorkoutSession[], filter: WorkoutHistoryFilter = {}): WorkoutSession[] {
  const fromDate = normalizeDateFilter(filter.fromDate);
  const toDate = normalizeDateFilter(filter.toDate);
  if ((filter.fromDate && !fromDate) || (filter.toDate && !toDate) || (fromDate && toDate && fromDate > toDate)) return [];
  const newestFirst = filter.newestFirst !== false;
  return completedSessions(sessions)
    .filter((session) => matchesDate(session, fromDate, toDate) && matchesExercise(session, filter.exerciseId))
    .sort((a, b) => compareHistory(a, b, newestFirst));
}

export async function getWorkoutHistory(filter: WorkoutHistoryFilter = {}): Promise<WorkoutHistoryResult> {
  const filtered = filterAndSort(await getWorkoutSessions(), filter);
  const offset = Number.isInteger(filter.offset) && (filter.offset ?? 0) > 0 ? filter.offset! : 0;
  const limit = Number.isInteger(filter.limit) && (filter.limit ?? 0) >= 0 ? filter.limit! : undefined;
  const workouts = clone(limit == null ? filtered.slice(offset) : filtered.slice(offset, offset + limit));
  return { workouts, total: filtered.length, offset, ...(limit == null ? {} : { limit }) };
}

export async function getWorkoutHistoryByDate(date: string): Promise<WorkoutSession[]> {
  const normalized = normalizeDateFilter(date);
  if (!normalized) return [];
  return (await getWorkoutHistory({ fromDate: normalized, toDate: normalized })).workouts;
}

export async function getWorkoutHistoryByExercise(exerciseId: string): Promise<WorkoutSession[]> {
  if (!exerciseId?.trim()) return [];
  return (await getWorkoutHistory({ exerciseId: exerciseId.trim() })).workouts;
}

export async function getWorkoutHistorySummary(filter: WorkoutHistoryFilter = {}): Promise<WorkoutHistorySummary> {
  const workouts = (await getWorkoutHistory({ ...filter, limit: undefined, offset: 0 })).workouts;
  return workouts.reduce<WorkoutHistorySummary>((summary, workout) => {
    summary.completedWorkoutCount += 1;
    summary.totalCompletedSets += workout.exercises.reduce(
      (count, exercise) => count + exercise.sets.filter((set) => set.completed).length,
      0,
    );
    summary.totalExercisesPerformed += workout.exercises.length;
    summary.totalWorkoutDurationSeconds += workout.durationSeconds ?? 0;
    summary.totalVolume += calculateWorkoutVolume(workout);
    return summary;
  }, {
    completedWorkoutCount: 0,
    totalCompletedSets: 0,
    totalExercisesPerformed: 0,
    totalWorkoutDurationSeconds: 0,
    totalVolume: 0,
  });
}

export async function getExerciseHistory(exerciseId: string, filter: Omit<WorkoutHistoryFilter, 'exerciseId'> = {}): Promise<WorkoutHistoryExerciseEntry[]> {
  if (!exerciseId?.trim()) return [];
  const workouts = (await getWorkoutHistory({ ...filter, exerciseId: exerciseId.trim() })).workouts;
  const entries: WorkoutHistoryExerciseEntry[] = [];
  for (const workout of workouts) {
    const exercise = workout.exercises.find((item) => item.exerciseId === exerciseId.trim());
    if (!exercise) continue;
    for (const set of exercise.sets) {
      entries.push(toExerciseHistoryEntry(workout, set));
    }
  }
  return clone(entries);
}

function toExerciseHistoryEntry(session: WorkoutSession, set: WorkoutSet): WorkoutHistoryExerciseEntry {
  return {
    sessionId: session.id,
    sessionDate: sessionDate(session),
    sessionName: session.name,
    setNumber: set.setNumber,
    reps: set.reps,
    weightKg: set.weightKg ?? set.weight,
    durationSeconds: set.durationSeconds,
    distanceKm: set.distanceKm ?? set.distance,
    rpe: set.rpe,
    completed: set.completed,
  };
}

export async function getLatestCompletedWorkout(exerciseId?: string): Promise<WorkoutSession | null> {
  const result = await getWorkoutHistory({ exerciseId });
  return result.workouts[0] ? clone(result.workouts[0]) : null;
}

export async function getCompletedWorkoutCount(filter: WorkoutHistoryFilter = {}): Promise<number> {
  return (await getWorkoutHistory({ ...filter, limit: undefined, offset: 0 })).total;
}

export async function getWorkoutHistoryDateRange(filter: Omit<WorkoutHistoryFilter, 'fromDate' | 'toDate' | 'limit' | 'offset'> = {}): Promise<{ oldestDate: string | null; newestDate: string | null }> {
  const workouts = (await getWorkoutHistory({ ...filter, newestFirst: false })).workouts;
  if (workouts.length === 0) return { oldestDate: null, newestDate: null };
  return {
    oldestDate: sessionDate(workouts[0]) || null,
    newestDate: sessionDate(workouts[workouts.length - 1]) || null,
  };
}

export function getWorkoutHistorySessionDate(session: WorkoutSession): string {
  return sessionDate(session);
}
