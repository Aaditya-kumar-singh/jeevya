import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWorkoutHistory,
  getWorkoutHistoryByDate,
  getWorkoutHistoryByExercise,
  getWorkoutHistorySummary,
  getExerciseHistory,
  getLatestCompletedWorkout,
  getCompletedWorkoutCount,
  getWorkoutHistoryDateRange,
} from '@/services/workoutHistory';
import {
  WORKOUTS_KEY,
  calculateWorkoutVolume,
  cancelWorkout,
  completeWorkout,
  createWorkout,
  getWorkout,
  getWorkoutSessions,
  startWorkout,
  updateWorkoutSet,
} from '@/services/workouts';
import {
  WORKOUT_TEMPLATES_KEY,
  WORKOUT_PROGRAMS_KEY,
  addScheduleEntry,
  activateProgram,
  createWorkoutSessionFromTemplate,
  createWorkoutTemplate,
  createProgram,
  getWorkoutTemplate,
  getScheduledWorkoutsForDate,
  startWorkoutFromTemplate,
  updateWorkoutTemplate,
} from '@/services/workoutTemplates';
import { loadData, saveData } from '@/lib/storage';
import type { WorkoutExerciseConfig } from '@/types/workout';

declare global {
  var __MOCK_STORE__: Map<string, string>;
}

const store = globalThis.__MOCK_STORE__;
let passed = 0;
let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${passed}. ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}:`, error);
  }
}

const config = (exerciseId = 'bench'): WorkoutExerciseConfig => ({
  exerciseId,
  setsTarget: 2,
  repsTarget: 10,
  weightTarget: 20,
  restSeconds: 60,
});

async function completedWorkout(name: string, exerciseId = 'bench') {
  const draft = await createWorkout({ name, exercises: [config(exerciseId)] });
  const active = await startWorkout(draft.id);
  return completeWorkout(active.id);
}

async function main() {
  await AsyncStorage.clear();
  console.log('\n=== Phase 2D Workout History & Progression ===');

  await check('history starts empty', async () => {
    const result = await getWorkoutHistory();
    assert(result.total === 0 && result.workouts.length === 0, 'history should be empty');
  });
  await check('empty summary is zeroed', async () => {
    const summary = await getWorkoutHistorySummary();
    assert(summary.completedWorkoutCount === 0 && summary.totalCompletedSets === 0 && summary.totalExercisesPerformed === 0 && summary.totalWorkoutDurationSeconds === 0 && summary.totalVolume === 0, 'empty summary');
  });
  await check('empty exercise history is safe', async () => {
    assert((await getExerciseHistory('bench')).length === 0, 'empty exercise history');
  });
  await check('empty date lookup is safe', async () => {
    assert((await getWorkoutHistoryByDate('2026-09-13')).length === 0, 'empty date lookup');
  });
  await check('empty latest workout is null', async () => {
    assert((await getLatestCompletedWorkout()) === null, 'latest should be null');
  });
  await check('empty count is zero', async () => {
    assert((await getCompletedWorkoutCount()) === 0, 'count should be zero');
  });
  await check('empty date range is nulls', async () => {
    const range = await getWorkoutHistoryDateRange();
    assert(range.oldestDate === null && range.newestDate === null, 'empty range');
  });

  const first = await completedWorkout('First Push', 'bench');
  await check('completed session appears in history', async () => {
    const result = await getWorkoutHistory();
    assert(result.total === 1 && result.workouts[0].id === first.id, 'completed missing');
  });
  await check('history contains completed status only', async () => {
    assert((await getWorkoutHistory()).workouts.every((workout) => workout.status === 'completed'), 'non-completed leaked');
  });
  await check('completed workout count', async () => {
    assert((await getCompletedWorkoutCount()) === 1, 'count');
  });
  await check('latest completed workout', async () => {
    assert((await getLatestCompletedWorkout())?.id === first.id, 'latest');
  });
  await check('date is derived from completedAt', async () => {
    const history = await getWorkoutHistory();
    assert(history.workouts[0].completedAt?.slice(0, 10) === history.workouts[0].createdAt.slice(0, 10), 'date derivation');
  });
  await check('date lookup finds completed session', async () => {
    const date = first.completedAt!.slice(0, 10);
    assert((await getWorkoutHistoryByDate(date)).some((workout) => workout.id === first.id), 'date filter');
  });
  await check('exercise lookup finds matching session', async () => {
    assert((await getWorkoutHistoryByExercise('bench')).some((workout) => workout.id === first.id), 'exercise filter');
  });
  await check('unknown exercise lookup is empty', async () => {
    assert((await getWorkoutHistoryByExercise('unknown')).length === 0, 'unknown exercise');
  });

  const inProgressDraft = await createWorkout({ name: 'In Progress', exercises: [config('bench')] });
  const inProgress = await startWorkout(inProgressDraft.id);
  await check('in-progress session is excluded', async () => {
    assert(!(await getWorkoutHistory()).workouts.some((workout) => workout.id === inProgress.id), 'in-progress leaked');
  });
  await cancelWorkout(inProgress.id);
  await check('cancelled session is excluded', async () => {
    assert(!(await getWorkoutHistory()).workouts.some((workout) => workout.id === inProgress.id), 'cancelled leaked');
  });
  await check('core session storage still contains cancelled record', async () => {
    assert((await getWorkoutSessions()).some((workout) => workout.id === inProgress.id), 'cancelled historical record disappeared');
  });

  const second = await completedWorkout('Second Pull', 'row');
  const thirdDraft = await createWorkout({ name: 'Third Push', exercises: [config('bench')] });
  const thirdActive = await startWorkout(thirdDraft.id);
  const thirdSet = thirdActive.exercises[0].sets[0];
  await updateWorkoutSet(thirdActive.id, thirdActive.exercises[0].id, thirdSet.id, { reps: 8, weightKg: 25, durationSeconds: 30, distanceKm: 1, rpe: 8, completed: true });
  const third = await completeWorkout(thirdActive.id);
  await check('multiple completed sessions are returned', async () => {
    assert((await getWorkoutHistory()).total === 3, 'multiple sessions');
  });
  await check('newest ordering is default', async () => {
    const result = await getWorkoutHistory();
    assert(result.workouts[0].id === third.id && result.workouts[2].id === first.id, 'newest ordering');
  });
  await check('oldest ordering works', async () => {
    const result = await getWorkoutHistory({ newestFirst: false });
    assert(result.workouts[0].id === first.id && result.workouts[2].id === third.id, 'oldest ordering');
  });
  await check('pagination limit works', async () => {
    const result = await getWorkoutHistory({ limit: 2 });
    assert(result.workouts.length === 2 && result.total === 3 && result.limit === 2, 'limit');
  });
  await check('pagination offset works', async () => {
    const result = await getWorkoutHistory({ offset: 1, limit: 1 });
    assert(result.workouts.length === 1 && result.workouts[0].id === second.id, 'offset');
  });
  await check('date filtering excludes other dates', async () => {
    const date = first.completedAt!.slice(0, 10);
    const result = await getWorkoutHistory({ fromDate: date, toDate: date });
    assert(result.workouts.every((workout) => (workout.completedAt ?? workout.startedAt).startsWith(date)), 'date range');
  });
  await check('invalid date filter does not accidentally match', async () => {
    assert((await getWorkoutHistoryByDate('not-a-date')).length === 0, 'invalid date');
  });
  await check('date-only filter uses civil string matching', async () => {
    const date = third.completedAt!.slice(0, 10);
    const result = await getWorkoutHistory({ fromDate: date });
    assert(result.workouts.every((workout) => (workout.completedAt ?? workout.startedAt).slice(0, 10) >= date), 'civil date');
  });
  await check('exercise filtering returns only matching exercise', async () => {
    const result = await getWorkoutHistory({ exerciseId: 'bench' });
    assert(result.total === 2 && result.workouts.every((workout) => workout.exercises.some((exercise) => exercise.exerciseId === 'bench')), 'exercise filter');
  });
  await check('combined date and exercise filtering works', async () => {
    const date = third.completedAt!.slice(0, 10);
    const result = await getWorkoutHistory({ fromDate: date, toDate: date, exerciseId: 'bench' });
    assert(result.workouts.some((workout) => workout.id === third.id), 'combined filter');
  });

  const firstSessionSnapshot = JSON.stringify(await getWorkout(first.id));
  const firstHistory = (await getWorkoutHistory()).workouts.find((workout) => workout.id === first.id)!;
  await check('history result is a derived copy', async () => {
    assert(firstHistory !== await getWorkout(first.id), 'history shares root object');
    assert(firstHistory.exercises !== (await getWorkout(first.id))!.exercises, 'history shares exercise array');
  });
  firstHistory.name = 'Mutated History';
  firstHistory.exercises[0].sets[0].reps = 999;
  await check('mutating history does not mutate persisted session', async () => {
    assert(JSON.stringify(await getWorkout(first.id)) === firstSessionSnapshot, 'persisted session changed');
  });
  await check('reading history does not mutate persisted session', async () => {
    const before = JSON.stringify(await getWorkout(second.id));
    await getWorkoutHistory();
    await getWorkoutHistorySummary();
    await getExerciseHistory('row');
    assert(JSON.stringify(await getWorkout(second.id)) === before, 'read mutated session');
  });

  const exerciseHistory = await getExerciseHistory('bench');
  await check('exercise history includes same exercise across sessions', async () => {
    assert(exerciseHistory.length === 4 && new Set(exerciseHistory.map((entry) => entry.sessionId)).size === 2, 'exercise history count');
  });
  await check('exercise history preserves session ids', async () => {
    assert(exerciseHistory.every((entry) => entry.sessionId === first.id || entry.sessionId === third.id), 'session ids');
  });
  await check('exercise history preserves session names', async () => {
    assert(exerciseHistory.some((entry) => entry.sessionName === 'First Push') && exerciseHistory.some((entry) => entry.sessionName === 'Third Push'), 'session names');
  });
  await check('exercise history preserves set numbers', async () => {
    assert(exerciseHistory.every((entry) => entry.setNumber === 1 || entry.setNumber === 2), 'set numbers');
  });
  await check('exercise history preserves reps', async () => {
    assert(exerciseHistory.find((entry) => entry.sessionId === third.id && entry.setNumber === 1)?.reps === 8 && exerciseHistory.find((entry) => entry.sessionId === first.id && entry.setNumber === 1)?.reps === null, 'reps');
  });
  await check('exercise history preserves weightKg', async () => {
    assert(exerciseHistory.find((entry) => entry.sessionId === third.id && entry.setNumber === 1)?.weightKg === 25 && exerciseHistory.find((entry) => entry.sessionId === first.id && entry.setNumber === 1)?.weightKg === null, 'weight');
  });
  await check('exercise history preserves optional nulls', async () => {
    assert(exerciseHistory.find((entry) => entry.sessionId === third.id && entry.setNumber === 1)?.durationSeconds === 30 && exerciseHistory.find((entry) => entry.sessionId === first.id && entry.setNumber === 1)?.durationSeconds === null, 'optional fields invented');
  });
  await check('exercise history preserves completion state', async () => {
    assert(exerciseHistory.some((entry) => entry.sessionId === third.id && entry.completed) && exerciseHistory.some((entry) => entry.sessionId === first.id && !entry.completed), 'completion state');
  });
  await check('exercise history output is independently mutable', async () => {
    const entry = exerciseHistory[0];
    entry.reps = 999;
    assert((await getExerciseHistory('bench'))[0].reps === 8, 'derived entry shares mutable state');
  });

  await check('history reads existing completed session data', async () => {
    const session = (await getWorkoutHistory()).workouts.find((workout) => workout.id === third.id)!;
    assert(session.exercises[0].sets[0].reps === 8 && session.exercises[0].sets[0].weightKg === 25, 'history data');
  });
  await check('summary counts completed workouts', async () => {
    const summary = await getWorkoutHistorySummary();
    assert(summary.completedWorkoutCount === 3, 'summary workout count');
  });
  await check('summary counts completed sets only', async () => {
    const summary = await getWorkoutHistorySummary();
    assert(summary.totalCompletedSets === 1, 'completed set count');
  });
  await check('summary counts exercises performed', async () => {
    const summary = await getWorkoutHistorySummary();
    assert(summary.totalExercisesPerformed === 3, 'exercise count');
  });
  await check('summary includes available duration only', async () => {
    const summary = await getWorkoutHistorySummary();
    assert(summary.totalWorkoutDurationSeconds >= 0, 'duration total');
  });
  await check('summary integrates existing volume logic', async () => {
    const history = (await getWorkoutHistory()).workouts;
    const expected = history.reduce((sum, workout) => sum + calculateWorkoutVolume(workout), 0);
    assert((await getWorkoutHistorySummary()).totalVolume === expected, 'volume integration');
  });
  await check('history summary respects exercise filter', async () => {
    const summary = await getWorkoutHistorySummary({ exerciseId: 'bench' });
    assert(summary.completedWorkoutCount === 2, 'filtered summary');
  });
  await check('history summary respects date filter', async () => {
    const date = third.completedAt!.slice(0, 10);
    const summary = await getWorkoutHistorySummary({ fromDate: date, toDate: date });
    assert(summary.completedWorkoutCount >= 1, 'filtered date summary');
  });
  await check('date range reports oldest and newest', async () => {
    const range = await getWorkoutHistoryDateRange();
    assert(range.oldestDate !== null && range.newestDate !== null && range.oldestDate <= range.newestDate, 'date range');
  });
  await check('date range can be exercise scoped', async () => {
    const range = await getWorkoutHistoryDateRange({ exerciseId: 'row' });
    assert(range.oldestDate !== null && range.newestDate !== null, 'exercise range');
  });

  await saveData(WORKOUTS_KEY, [{ malformed: true }, ...(await loadData(WORKOUTS_KEY, []))]);
  await check('malformed workout records are safely ignored', async () => {
    assert((await getWorkoutHistory()).total === 3, 'malformed history record');
  });
  await check('history storage remains compatible with canonical key', async () => {
    assert(store.has(WORKOUTS_KEY), 'canonical workout key');
  });

  await saveData(WORKOUT_TEMPLATES_KEY, []);
  await saveData(WORKOUT_PROGRAMS_KEY, []);
  const template = await createWorkoutTemplate({ name: 'Phase 2B Template', exercises: [{ exerciseId: 'bench', sets: [{ targetReps: 8, targetWeightKg: 40 }] }] });
  const program = await createProgram({ name: 'Phase 2C Program' });
  await addScheduleEntry(program.id, { dayOfWeek: new Date().getDay(), templateId: template.id });
  await activateProgram(program.id);
  await check('Phase 2B template still resolves', async () => {
    assert((await getWorkoutTemplate(template.id))?.name === 'Phase 2B Template', 'template regression');
  });
  await check('Phase 2C scheduled entry still resolves', async () => {
    assert((await getScheduledWorkoutsForDate(new Date())).some((entry) => entry.templateId === template.id), 'program regression');
  });
  const pureSnapshot = createWorkoutSessionFromTemplate(template);
  await check('Phase 2B snapshot transformation remains intact', async () => {
    assert(pureSnapshot.status === 'in_progress' && pureSnapshot.exercises[0].sets[0].reps === 8, 'snapshot regression');
  });
  const programStarted = await startWorkoutFromTemplate(template.id);
  await completeWorkout(programStarted.id);
  await check('Phase 2C template start still creates canonical session', async () => {
    assert((await getWorkout(programStarted.id))?.status === 'completed', 'template start regression');
  });
  const templateBefore = await getWorkoutTemplate(template.id);
  await updateWorkoutTemplate(template.id, { name: 'Changed Template' });
  await check('historical session remains isolated from template changes', async () => {
    assert((await getWorkout(programStarted.id))?.name === templateBefore!.name, 'template changed history');
  });
  await check('Phase 2A history remains canonical session storage', async () => {
    assert((await getWorkoutSessions()).some((session) => session.id === programStarted.id && session.status === 'completed'), 'canonical history');
  });
  await check('history does not create duplicate historical records', async () => {
    const before = (await getWorkoutSessions()).length;
    await getWorkoutHistory();
    await getWorkoutHistorySummary();
    await getExerciseHistory('bench');
    assert((await getWorkoutSessions()).length === before, 'history created record');
  });

  // Additional meaningful assertions around missing references and optional fields.
  const missingTemplate = await createWorkoutTemplate({ name: 'Missing Ref Source', exercises: [{ exerciseId: 'missing-exercise', sets: [{}] }] });
  const missingProgram = await createProgram({ name: 'Missing Reference Program' });
  await addScheduleEntry(missingProgram.id, { dayOfWeek: new Date().getDay(), templateId: missingTemplate.id });
  await activateProgram(missingProgram.id);
  const missingSession = await startWorkoutFromTemplate(missingTemplate.id);
  await updateWorkoutSet(missingSession.id, missingSession.exercises[0].id, missingSession.exercises[0].sets[0].id, { completed: true, reps: null, weightKg: null });
  await completeWorkout(missingSession.id);
  await check('missing exercise references remain readable', async () => {
    const history = await getWorkoutHistoryByExercise('missing-exercise');
    assert(history.some((session) => session.id === missingSession.id), 'missing exercise history');
  });
  await check('missing optional values remain null', async () => {
    const entries = await getExerciseHistory('missing-exercise');
    assert(entries[0].reps === null && entries[0].weightKg === null && entries[0].durationSeconds === null && entries[0].distanceKm === null && entries[0].rpe === null, 'optional values changed');
  });
  await check('completed set state is retained in exercise history', async () => {
    assert((await getExerciseHistory('missing-exercise'))[0].completed === true, 'completed state lost');
  });
  await check('latest scoped workout resolves', async () => {
    assert((await getLatestCompletedWorkout('missing-exercise'))?.id === missingSession.id, 'latest scoped');
  });
  await check('scoped completed count resolves', async () => {
    assert((await getCompletedWorkoutCount({ exerciseId: 'missing-exercise' })) === 1, 'scoped count');
  });
  await check('scoped date range resolves', async () => {
    const range = await getWorkoutHistoryDateRange({ exerciseId: 'missing-exercise' });
    assert(range.oldestDate === range.newestDate, 'scoped date range');
  });

  await check('negative pagination offset is clamped', async () => {
    assert((await getWorkoutHistory({ offset: -5, limit: 1 })).workouts.length === 1, 'negative offset');
  });
  await check('zero pagination limit returns no rows', async () => {
    const result = await getWorkoutHistory({ limit: 0 });
    assert(result.workouts.length === 0 && result.total >= 3, 'zero limit');
  });
  await check('history result total is pre-pagination', async () => {
    const result = await getWorkoutHistory({ offset: 1, limit: 1 });
    assert(result.total >= result.workouts.length && result.offset === 1, 'pagination total');
  });
  await check('exercise history respects date filter', async () => {
    const date = third.completedAt!.slice(0, 10);
    const entries = await getExerciseHistory('bench', { fromDate: date, toDate: date });
    assert(entries.every((entry) => entry.sessionDate === date), 'exercise date filter');
  });
  await check('exercise history supports oldest ordering', async () => {
    const entries = await getExerciseHistory('bench', { newestFirst: false });
    assert(entries[0].sessionId === first.id, 'exercise ordering');
  });
  await check('latest exercise workout respects completed-only rule', async () => {
    assert((await getLatestCompletedWorkout('bench'))?.status === 'completed', 'latest status');
  });
  await check('history count supports date range', async () => {
    const date = first.completedAt!.slice(0, 10);
    assert((await getCompletedWorkoutCount({ fromDate: date, toDate: date })) >= 1, 'date count');
  });
  await check('history date range ordering is chronological', async () => {
    const range = await getWorkoutHistoryDateRange();
    assert(range.oldestDate! <= range.newestDate!, 'chronological range');
  });
  await check('history date range supports exercise filter', async () => {
    const range = await getWorkoutHistoryDateRange({ exerciseId: 'bench' });
    assert(range.oldestDate !== null && range.newestDate !== null, 'exercise date range');
  });
  await check('missing exercise filter is safe', async () => {
    assert((await getWorkoutHistory({ exerciseId: '' })).total >= 3, 'empty exercise filter');
  });
  await check('derived history keeps exercise objects separate', async () => {
    const result = await getWorkoutHistory();
    const session = result.workouts.find((workout) => workout.id === first.id)!;
    assert(session.exercises[0] !== (await getWorkout(first.id))!.exercises[0], 'exercise object shared');
  });
  await check('derived history keeps set objects separate', async () => {
    const result = await getWorkoutHistory();
    const session = result.workouts.find((workout) => workout.id === first.id)!;
    assert(session.exercises[0].sets[0] !== (await getWorkout(first.id))!.exercises[0].sets[0], 'set object shared');
  });
  await check('exercise history entries do not duplicate full set model', async () => {
    const entries = await getExerciseHistory('bench');
    assert(typeof entries[0].setNumber === 'number' && !('sets' in entries[0]), 'entry duplicated set model');
  });
  await check('history does not expose builder draft status', async () => {
    const draft = await createWorkout({ name: 'Draft Only', exercises: [config('bench')] });
    assert(!(await getWorkoutHistory()).workouts.some((workout) => workout.id === draft.id), 'draft leaked');
  });
  await check('historical history records expose completed status', async () => {
    const history = await getWorkoutHistory();
    assert(history.workouts.every((workout) => workout.status === 'completed'), 'history status');
  });
  await check('historical history records are safe to copy before display', async () => {
    const history = await getWorkoutHistory();
    const copy = JSON.parse(JSON.stringify(history.workouts[0]));
    copy.name = 'Display Mutation';
    assert((await getWorkout(history.workouts[0].id))?.name !== 'Display Mutation', 'display copy changed session');
  });
  await check('historical session remains after history filtering', async () => {
    const before = await getWorkout(first.id);
    await getWorkoutHistory({ exerciseId: 'row' });
    assert((await getWorkout(first.id))?.id === before?.id, 'filter changed history');
  });
  await check('historical session remains after summary derivation', async () => {
    const before = JSON.stringify(await getWorkout(third.id));
    await getWorkoutHistorySummary({ exerciseId: 'bench' });
    assert(JSON.stringify(await getWorkout(third.id)) === before, 'summary changed history');
  });
  await check('canonical workout storage is still the sole history source', async () => {
    assert(store.has(WORKOUTS_KEY) && !store.has('jeevya:workouts:history'), 'duplicate history storage found');
  });
  await check('Phase 2B template changes do not rewrite historical sessions', async () => {
    const before = JSON.stringify(await getWorkout(programStarted.id));
    await updateWorkoutTemplate(template.id, { name: 'Another Template Name' });
    assert(JSON.stringify(await getWorkout(programStarted.id)) === before, 'template rewrote session');
  });
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
