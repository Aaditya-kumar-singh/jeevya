import { loadData, saveData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import type {
  PersonalRecord,
  Workout,
  WorkoutExercise,
  WorkoutExerciseConfig,
  WorkoutFinishResult,
  WorkoutSet,
  WorkoutStatus,
  NewWorkoutSetInput,
} from '@/types/workout';

const WORKOUTS_KEY = '@lifeos/workouts/v1';
const PRS_KEY = '@lifeos/prs/v1';

// ── helpers ────────────────────────────────────────────────────────────────

export function calculateSetVolume(set: Pick<WorkoutSet, 'weight' | 'reps'>): number {
  return (set.weight ?? 0) * (set.reps ?? 0);
}

export function calculateWorkoutVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce(
        (s, set) => s + (set.completed ? calculateSetVolume(set) : 0),
        0,
      ),
    0,
  );
}

export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 min';
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) return `${totalSeconds} sec`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes} min`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function elapsedBetween(startIso: string | null, endIso?: string): number {
  if (!startIso) return 0;
  const end = endIso ? Date.parse(endIso) : Date.now();
  return Math.max(0, Math.floor((end - Date.parse(startIso)) / 1000));
}

function makeSet(
  workoutExerciseId: string,
  setNumber: number,
  existing?: Partial<WorkoutSet>,
): WorkoutSet {
  return {
    id: uid('set_'),
    workoutExerciseId,
    setNumber,
    reps: existing?.reps ?? null,
    weight: existing?.weight ?? null,
    weightUnit: existing?.weightUnit ?? 'kg',
    durationSeconds: existing?.durationSeconds ?? null,
    distance: existing?.distance ?? null,
    distanceUnit: existing?.distanceUnit ?? null,
    rpe: existing?.rpe ?? null,
    completed: existing?.completed ?? false,
    completedAt: existing?.completedAt ?? null,
    createdAt: existing?.createdAt ?? nowIso(),
  };
}

function makeExercise(
  workoutId: string,
  config: WorkoutExerciseConfig,
  position: number,
): WorkoutExercise {
  return {
    id: uid('we_'),
    workoutId,
    exerciseId: config.exerciseId,
    position,
    setsTarget: config.setsTarget,
    repsTarget: config.repsTarget ?? null,
    weightTarget: config.weightTarget ?? null,
    restSeconds: config.restSeconds,
    notes: config.notes ?? null,
    createdAt: nowIso(),
    sets: [],
  };
}

function makeWorkout(
  partial?: { name?: string; exercises?: WorkoutExerciseConfig[] },
): Workout {
  const now = nowIso();
  const exercises = (partial?.exercises ?? []).map((config, index) =>
    makeExercise('', config, index),
  );
  return {
    id: uid('wo_'),
    name: partial?.name?.trim() || 'New Workout',
    status: 'planned' as WorkoutStatus,
    startedAt: null,
    completedAt: null,
    durationSeconds: null,
    notes: null,
    totalVolume: 0,
    createdAt: now,
    updatedAt: now,
    exercises,
  };
}

function withTouched(workout: Workout): Workout {
  return { ...workout, updatedAt: nowIso() };
}

// ── storage ────────────────────────────────────────────────────────────────

async function readAllWorkouts(): Promise<Workout[]> {
  return loadData<Workout[]>(WORKOUTS_KEY, []);
}

async function writeAllWorkouts(list: Workout[]): Promise<void> {
  await saveData(WORKOUTS_KEY, list);
}

async function readPRs(): Promise<PersonalRecord[]> {
  return loadData<PersonalRecord[]>(PRS_KEY, []);
}

async function writePRs(list: PersonalRecord[]): Promise<void> {
  await saveData(PRS_KEY, list);
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function listWorkouts(): Promise<Workout[]> {
  const list = await readAllWorkouts();
  return [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const list = await readAllWorkouts();
  return list.find((w) => w.id === id) ?? null;
}

export async function getActiveWorkout(): Promise<Workout | null> {
  const list = await readAllWorkouts();
  return list.find((w) => w.status === 'active') ?? null;
}

export async function createWorkout(input?: {
  name?: string;
  exercises?: WorkoutExerciseConfig[];
}): Promise<Workout> {
  const workout = makeWorkout(input);
  workout.exercises = workout.exercises.map((e) => ({ ...e, workoutId: workout.id }));
  const list = await readAllWorkouts();
  await writeAllWorkouts([workout, ...list]);
  return workout;
}

export async function saveWorkout(workout: Workout): Promise<Workout> {
  const list = await readAllWorkouts();
  const index = list.findIndex((w) => w.id === workout.id);
  const updated = withTouched(workout);
  if (index >= 0) {
    list[index] = updated;
  } else {
    list.unshift(updated);
  }
  await writeAllWorkouts(list);
  return updated;
}

export async function deleteWorkout(id: string): Promise<void> {
  const list = await readAllWorkouts();
  await writeAllWorkouts(list.filter((w) => w.id !== id));
  const prs = await readPRs();
  await writePRs(prs.filter((p) => p.workoutId !== id));
}

/** Removes planned drafts that were opened but never used (no exercises, default name). */
export async function deleteEmptyDrafts(): Promise<void> {
  const list = await readAllWorkouts();
  const kept = list.filter(
    (w) =>
      !(
        w.status === 'planned' &&
        w.exercises.length === 0 &&
        w.name === 'New Workout'
      ),
  );
  if (kept.length !== list.length) {
    await writeAllWorkouts(kept);
  }
}

export async function updateWorkoutName(id: string, name: string): Promise<Workout> {
  const workout = await getWorkout(id);
  if (!workout) throw new Error('Workout not found');
  return saveWorkout({ ...workout, name: name.trim() || workout.name });
}

export async function updateWorkoutNotes(id: string, notes: string | null): Promise<Workout> {
  const workout = await getWorkout(id);
  if (!workout) throw new Error('Workout not found');
  return saveWorkout({ ...workout, notes });
}

// ── builder: exercises ─────────────────────────────────────────────────────

export async function addExerciseToWorkout(
  workoutId: string,
  config: WorkoutExerciseConfig,
): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const exercise = makeExercise(workoutId, config, workout.exercises.length);
  return saveWorkout({ ...workout, exercises: [...workout.exercises, exercise] });
}

export async function removeWorkoutExercise(
  workoutId: string,
  workoutExerciseId: string,
): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const exercises = workout.exercises
    .filter((e) => e.id !== workoutExerciseId)
    .map((e, index) => ({ ...e, position: index }));
  return saveWorkout({ ...workout, exercises });
}

export async function duplicateWorkoutExercise(
  workoutId: string,
  workoutExerciseId: string,
): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const source = workout.exercises.find((e) => e.id === workoutExerciseId);
  if (!source) return workout;
  const copy = makeExercise(
    workoutId,
    {
      exerciseId: source.exerciseId,
      setsTarget: source.setsTarget,
      repsTarget: source.repsTarget,
      weightTarget: source.weightTarget,
      restSeconds: source.restSeconds,
      notes: source.notes,
    },
    workout.exercises.length,
  );
  return saveWorkout({ ...workout, exercises: [...workout.exercises, copy] });
}

export async function updateWorkoutExercise(
  workoutId: string,
  workoutExerciseId: string,
  patch: Partial<
    Pick<WorkoutExercise, 'setsTarget' | 'repsTarget' | 'weightTarget' | 'restSeconds' | 'notes'>
  >,
): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const exercises = workout.exercises.map((e) =>
    e.id === workoutExerciseId ? { ...e, ...patch } : e,
  );
  return saveWorkout({ ...workout, exercises });
}

export async function reorderWorkoutExercises(
  workoutId: string,
  orderedIds: string[],
): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const byId = new Map(workout.exercises.map((e) => [e.id, e]));
  const exercises = orderedIds
    .map((id) => byId.get(id))
    .filter((e): e is WorkoutExercise => Boolean(e))
    .map((e, index) => ({ ...e, position: index }));
  return saveWorkout({ ...workout, exercises });
}

export async function moveWorkoutExercise(
  workoutId: string,
  workoutExerciseId: string,
  direction: -1 | 1,
): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const order = workout.exercises.map((e) => e.id);
  const index = order.indexOf(workoutExerciseId);
  const swapWith = index + direction;
  if (index < 0 || swapWith < 0 || swapWith >= order.length) return workout;
  [order[index], order[swapWith]] = [order[swapWith], order[index]];
  return reorderWorkoutExercises(workoutId, order);
}

// ── session ────────────────────────────────────────────────────────────────

function updateSetInWorkout(
  workout: Workout,
  workoutExerciseId: string,
  setId: string,
  patch: Partial<WorkoutSet>,
): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((e) =>
      e.id === workoutExerciseId
        ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
        : e,
    ),
  };
}

function renumberSets(exercise: WorkoutExercise): WorkoutExercise {
  return {
    ...exercise,
    sets: exercise.sets.map((s, index) => ({ ...s, setNumber: index + 1 })),
  };
}

export async function startWorkout(workoutId: string): Promise<Workout> {
  let workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const exercises = workout.exercises.map((e) => {
    const sets =
      e.sets.length > 0
        ? e.sets
        : Array.from({ length: e.setsTarget }, (_, i) => makeSet(e.id, i + 1));
    return { ...e, sets };
  });
  workout = {
    ...workout,
    status: 'active' as WorkoutStatus,
    startedAt: workout.startedAt ?? nowIso(),
    exercises,
  };
  return saveWorkout(workout);
}

export async function updateWorkoutSet(
  workoutId: string,
  workoutExerciseId: string,
  setId: string,
  patch: NewWorkoutSetInput,
): Promise<Workout> {
  let workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  workout = updateSetInWorkout(workout, workoutExerciseId, setId, patch);
  workout = { ...workout, totalVolume: calculateWorkoutVolume(workout.exercises) };
  return saveWorkout(workout);
}

function detectPRs(
  prs: PersonalRecord[],
  workout: Workout,
  exerciseId: string,
  set: WorkoutSet,
): { list: PersonalRecord[]; added: PersonalRecord[] } {
  const candidates: { type: PersonalRecord['recordType']; value: number }[] = [];
  if ((set.weight ?? 0) > 0) candidates.push({ type: 'max_weight', value: set.weight ?? 0 });
  if ((set.reps ?? 0) > 0) candidates.push({ type: 'max_reps', value: set.reps ?? 0 });
  const volume = calculateSetVolume(set);
  if (volume > 0) candidates.push({ type: 'max_volume', value: volume });

  let list = prs;
  const added: PersonalRecord[] = [];
  for (const candidate of candidates) {
    const existing = list.find(
      (p) => p.exerciseId === exerciseId && p.recordType === candidate.type,
    );
    if (!existing || candidate.value > existing.value) {
      const record: PersonalRecord = {
        id: existing?.id ?? uid('pr_'),
        exerciseId,
        recordType: candidate.type,
        value: candidate.value,
        workoutId: workout.id,
        achievedAt: nowIso(),
      };
      list = list.filter(
        (p) => !(p.exerciseId === exerciseId && p.recordType === candidate.type),
      );
      list.push(record);
      added.push(record);
    }
  }
  return { list, added };
}

async function detectPRsForWorkout(workout: Workout): Promise<WorkoutFinishResult> {
  let prs = await readPRs();
  const added: PersonalRecord[] = [];
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (!set.completed) continue;
      const result = detectPRs(prs, workout, exercise.exerciseId, set);
      prs = result.list;
      for (const record of result.added) {
        if (!added.some((r) => r.id === record.id)) added.push(record);
      }
    }
  }
  await writePRs(prs);
  return { workout, newPersonalRecords: added };
}

export async function completeWorkoutSet(
  workoutId: string,
  workoutExerciseId: string,
  setId: string,
  patch: NewWorkoutSetInput = {},
): Promise<WorkoutFinishResult> {
  let workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const completing = patch.completed !== false;
  workout = updateSetInWorkout(workout, workoutExerciseId, setId, {
    ...patch,
    completed: completing,
    completedAt: completing ? nowIso() : null,
  });
  workout = { ...workout, totalVolume: calculateWorkoutVolume(workout.exercises) };
  await saveWorkout(workout);
  return detectPRsForWorkout(workout);
}

export async function addWorkoutSet(
  workoutId: string,
  workoutExerciseId: string,
): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const exercises = workout.exercises.map((e) => {
    if (e.id !== workoutExerciseId) return e;
    const nextSet = makeSet(e.id, e.sets.length + 1);
    return renumberSets({ ...e, sets: [...e.sets, nextSet] });
  });
  return saveWorkout({ ...workout, exercises });
}

export async function removeWorkoutSet(
  workoutId: string,
  workoutExerciseId: string,
  setId: string,
): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const exercises = workout.exercises.map((e) =>
    e.id === workoutExerciseId
      ? renumberSets({ ...e, sets: e.sets.filter((s) => s.id !== setId) })
      : e,
  );
  return saveWorkout({ ...workout, exercises });
}

export async function finishWorkout(
  workoutId: string,
  options: { pausedSeconds?: number } = {},
): Promise<WorkoutFinishResult> {
  let workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  const finishedAt = nowIso();
  const rawSeconds = elapsedBetween(workout.startedAt, finishedAt);
  const pausedSeconds = Math.max(0, Math.round(options.pausedSeconds ?? 0));
  workout = {
    ...workout,
    status: 'completed' as WorkoutStatus,
    completedAt: finishedAt,
    durationSeconds: Math.max(0, rawSeconds - pausedSeconds),
    totalVolume: calculateWorkoutVolume(workout.exercises),
  };
  await saveWorkout(workout);
  return detectPRsForWorkout(workout);
}

export async function discardWorkout(workoutId: string): Promise<Workout> {
  const workout = await getWorkout(workoutId);
  if (!workout) throw new Error('Workout not found');
  return saveWorkout({
    ...workout,
    status: 'cancelled' as WorkoutStatus,
    completedAt: nowIso(),
    durationSeconds: elapsedBetween(workout.startedAt, nowIso()),
  });
}

// ── history / PRs ──────────────────────────────────────────────────────────

export async function getWorkoutHistory(): Promise<Workout[]> {
  const list = await listWorkouts();
  return list.filter((w) => w.status === 'completed');
}

export async function getWorkoutDetails(id: string): Promise<Workout | null> {
  return getWorkout(id);
}

export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  return readPRs();
}

export async function getPrsForWorkout(workoutId: string): Promise<PersonalRecord[]> {
  const prs = await readPRs();
  return prs.filter((p) => p.workoutId === workoutId);
}

export async function getPreviousExercisePerformance(
  exerciseId: string,
): Promise<WorkoutSet[]> {
  const list = await readAllWorkouts();
  const latest = [...list]
    .filter((w) => w.status === 'completed')
    .sort(
      (a, b) =>
        Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt),
    )
    .find((w) => w.exercises.some((e) => e.exerciseId === exerciseId));
  if (!latest) return [];
  const exercise = latest.exercises.find((e) => e.exerciseId === exerciseId);
  return exercise ? exercise.sets.filter((s) => s.completed).slice(0, 5) : [];
}