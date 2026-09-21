import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveData } from '@/lib/storage';
import { WORKOUTS_KEY, getWorkout } from '@/services/workouts';
import {
  calculateEstimatedOneRepMax,
  getAllExercisePRs,
  getBestEstimatedOneRepMax,
  getExercisePRs,
  getExerciseProgression,
  getLatestExercisePerformance,
  getPreviousExercisePerformance,
} from '@/services/workoutProgression';
import type { WorkoutSet } from '@/types/workout';

declare global { var __MOCK_STORE__: Map<string, string>; }
const store = globalThis.__MOCK_STORE__;
let passed = 0; let failed = 0;
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); passed += 1; console.log(`PASS ${passed}. ${name}`); } catch (error) { failed += 1; console.error(`FAIL ${name}:`, error); } }

function set(id: string, exerciseId: string, number: number, values: Partial<WorkoutSet> = {}): WorkoutSet {
  return { id, workoutExerciseId: `${exerciseId}-ex`, setNumber: number, reps: null, weight: null, weightKg: null, weightUnit: 'kg', durationSeconds: null, distance: null, distanceKm: null, distanceUnit: 'km', rpe: null, completed: true, completedAt: '2026-09-01T10:01:00.000Z', createdAt: '2026-09-01T10:00:00.000Z', ...values };
}
function session(id: string, date: string, exerciseId = 'bench', sets: WorkoutSet[] = [set(`${id}-s1`, exerciseId, 1, { reps: 10, weightKg: 50 })], status: 'completed' | 'cancelled' | 'in_progress' = 'completed') {
  const ex = { id: `${exerciseId}-ex-${id}`, workoutId: id, exerciseId, position: 0, order: 0, setsTarget: sets.length, repsTarget: 10, weightTarget: 50, restSeconds: 60, notes: null, createdAt: `${date}T10:00:00.000Z`, sets: sets.map((item) => ({ ...item, workoutExerciseId: `${exerciseId}-ex-${id}` })) };
  return { id, name: id, startedAt: `${date}T10:00:00.000Z`, completedAt: status === 'completed' ? `${date}T11:00:00.000Z` : undefined, status, exercises: [ex], durationSeconds: 3600, createdAt: `${date}T09:59:00.000Z`, updatedAt: `${date}T11:00:00.000Z` };
}
async function seed(sessions: unknown) { await saveData(WORKOUTS_KEY, sessions); }

async function main() {
  await AsyncStorage.clear();
  console.log('\n=== Phase 2E Workout PRs & Strength Progression ===');

  await check('empty PRs are safe', async () => assert((await getExercisePRs('bench')).length === 0, 'empty PRs'));
  await check('empty progression is safe', async () => assert((await getExerciseProgression('bench')).points.length === 0, 'empty progression'));
  await check('empty latest performance is null', async () => assert(await getLatestExercisePerformance('bench') === null, 'latest'));
  await check('empty previous performance is null', async () => assert(await getPreviousExercisePerformance('bench') === null, 'previous'));
  await check('empty best estimated 1RM is null', async () => assert(await getBestEstimatedOneRepMax('bench') === null, 'best 1RM'));
  await check('empty all PRs is empty', async () => assert(Object.keys(await getAllExercisePRs()).length === 0, 'all PRs'));

  const first = session('first', '2026-09-01', 'bench', [
    set('first-w', 'bench', 1, { reps: 8, weightKg: 80 }),
    set('first-r', 'bench', 2, { reps: 12, weightKg: 60 }),
    set('first-v', 'bench', 3, { reps: 10, weightKg: 70 }),
    set('first-d', 'bench', 4, { reps: null, weightKg: null, durationSeconds: 90 }),
    set('first-k', 'bench', 5, { reps: null, weightKg: null, distanceKm: 2.5 }),
  ]);
  const second = session('second', '2026-09-05', 'bench', [
    set('second-w', 'bench', 1, { reps: 10, weightKg: 90 }),
    set('second-v', 'bench', 2, { reps: 11, weightKg: 85 }),
    set('second-d', 'bench', 3, { durationSeconds: 120 }),
    set('second-k', 'bench', 4, { distanceKm: 3 }),
    set('second-incomplete', 'bench', 5, { reps: 100, weightKg: 200, completed: false, completedAt: null }),
  ]);
  const third = session('third', '2026-09-10', 'bench', [set('third-r', 'bench', 1, { reps: 15, weightKg: 50 })]);
  const cancelled = session('cancelled', '2026-09-11', 'bench', [set('cancelled-s', 'bench', 1, { reps: 999, weightKg: 999 })], 'cancelled');
  const active = session('active', '2026-09-12', 'bench', [set('active-s', 'bench', 1, { reps: 999, weightKg: 999 })], 'in_progress');
  const missing = session('missing', '2026-09-06', 'deleted-exercise', [set('missing-s', 'deleted-exercise', 1, { reps: 7, weightKg: 40 })]);
  await seed([third, active, second, cancelled, first, missing]);

  await check('max weight PR', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_weight'); assert(pr?.value === 90 && pr.sessionId === 'second' && pr.setId === 'second-w', 'max weight'); });
  await check('max reps PR', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_reps'); assert(pr?.value === 15 && pr.sessionId === 'third', 'max reps'); });
  await check('max volume PR', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_volume'); assert(pr?.value === 935 && pr.sessionId === 'second', 'max volume'); });
  await check('duration PR', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'longest_duration'); assert(pr?.value === 120 && pr.sessionId === 'second', 'duration'); });
  await check('distance PR', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'longest_distance'); assert(pr?.value === 3 && pr.sessionId === 'second', 'distance'); });
  await check('all PR categories are present', async () => assert((await getExercisePRs('bench')).length === 5, 'five PRs'));
  await check('only completed sets qualify', async () => assert(!(await getExercisePRs('bench')).some((x) => x.value === 200 || x.value === 999), 'incomplete set leaked'));
  await check('cancelled session excluded', async () => assert(!(await getExercisePRs('bench')).some((x) => x.sessionId === 'cancelled'), 'cancelled leaked'));
  await check('in-progress session excluded', async () => assert(!(await getExercisePRs('bench')).some((x) => x.sessionId === 'active'), 'active leaked'));
  await check('missing exercise reference remains usable', async () => assert((await getExercisePRs('deleted-exercise')).find((x) => x.value === 40)?.sessionId === 'missing', 'missing reference'));
  await check('PR session date is retained', async () => assert((await getExercisePRs('bench')).every((x) => /^2026-09-/.test(x.sessionDate)), 'date'));
  await check('PR set id is retained', async () => assert((await getExercisePRs('bench')).every((x) => x.setId.length > 0), 'set id'));

  await check('estimated 1RM Epley', () => assert(calculateEstimatedOneRepMax(90, 10) === 120, 'Epley'));
  await check('estimated 1RM rejects zero weight', () => assert(calculateEstimatedOneRepMax(0, 10) === null, 'zero weight'));
  await check('estimated 1RM rejects zero reps', () => assert(calculateEstimatedOneRepMax(90, 0) === null, 'zero reps'));
  await check('estimated 1RM rejects negative weight', () => assert(calculateEstimatedOneRepMax(-90, 10) === null, 'negative weight'));
  await check('estimated 1RM rejects negative reps', () => assert(calculateEstimatedOneRepMax(90, -1) === null, 'negative reps'));
  await check('estimated 1RM rejects NaN', () => assert(calculateEstimatedOneRepMax(Number.NaN, 10) === null, 'NaN'));
  await check('estimated 1RM rejects Infinity', () => assert(calculateEstimatedOneRepMax(Infinity, 10) === null, 'Infinity'));
  await check('estimated 1RM rejects invalid reps Infinity', () => assert(calculateEstimatedOneRepMax(90, Infinity) === null, 'rep Infinity'));
  await check('best estimated 1RM uses qualifying completed sets', async () => assert(await getBestEstimatedOneRepMax('bench') === 120, 'best 1RM'));
  await check('best estimated 1RM ignores incomplete set', async () => assert((await getBestEstimatedOneRepMax('bench'))! < calculateEstimatedOneRepMax(200, 100)!, 'incomplete 1RM'));

  const progression = await getExerciseProgression('bench');
  await check('progression is chronological', () => assert(progression.points.map((x) => x.sessionId).join(',') === 'first,second,third', 'chronology'));
  await check('progression has three completed sessions', () => assert(progression.points.length === 3, 'points'));
  await check('first point has best weight', () => assert(progression.points[0].bestWeightKg === 80, 'first weight'));
  await check('first point has best reps', () => assert(progression.points[0].bestReps === 12, 'first reps'));
  await check('first point has best volume', () => assert(progression.points[0].bestVolume === 720, 'first volume'));
  await check('first point has best duration', () => assert(progression.points[0].bestDurationSeconds === 90, 'first duration'));
  await check('first point has best distance', () => assert(progression.points[0].bestDistanceKm === 2.5, 'first distance'));
  await check('second point has best weight', () => assert(progression.points[1].bestWeightKg === 90, 'second weight'));
  await check('second point has best reps', () => assert(progression.points[1].bestReps === 11, 'second reps'));
  await check('second point has best volume', () => assert(progression.points[1].bestVolume === 935, 'second volume'));
  await check('second point has best duration', () => assert(progression.points[1].bestDurationSeconds === 120, 'second duration'));
  await check('second point has best distance', () => assert(progression.points[1].bestDistanceKm === 3, 'second distance'));
  await check('third point retains available metrics only', () => assert(progression.points[2].bestWeightKg === 50 && progression.points[2].bestReps === 15 && progression.points[2].bestDurationSeconds === undefined, 'missing metrics'));
  await check('current performance is latest session', () => assert(progression.currentPerformance?.sessionId === 'third', 'current'));
  await check('previous performance is prior session', () => assert(progression.previousPerformance?.sessionId === 'second', 'previous'));
  await check('weight change is null when latest lacks previous metric', () => assert(progression.weightChange === -40, 'weight change'));
  await check('reps change is calculated', () => assert(progression.repsChange === 4, 'reps change'));
  await check('volume change is null when latest volume exists', () => assert(progression.volumeChange === 750 - 935, 'volume change'));
  await check('current estimated 1RM exists', () => assert(progression.currentEstimatedOneRepMax === 75, 'current 1RM'));
  await check('previous estimated 1RM exists', () => assert(Math.abs((progression.previousEstimatedOneRepMax ?? 0) - 120) < 1e-10, 'previous 1RM'));
  await check('estimated 1RM change is derived', () => assert(Math.abs((progression.estimatedOneRepMaxChange ?? 0) - (75 - 120)) < 1e-10, '1RM change'));
  await check('best estimated 1RM is retained', () => assert(progression.bestEstimatedOneRepMax === 120, 'best progression 1RM'));

  await check('latest performance API matches progression', async () => assert((await getLatestExercisePerformance('bench'))?.sessionId === 'third', 'latest API'));
  await check('previous performance API matches progression', async () => assert((await getPreviousExercisePerformance('bench'))?.sessionId === 'second', 'previous API'));
  await check('first performance has no previous comparison', async () => { const p = await getExerciseProgression('deleted-exercise'); assert(p.currentPerformance?.sessionId === 'missing' && p.previousPerformance === null && p.weightChange === null, 'first performance'); });
  await check('missing optional duration is omitted', () => assert(!('bestDurationSeconds' in progression.points[2]), 'duration invented'));
  await check('missing optional distance is omitted', () => assert(!('bestDistanceKm' in progression.points[2]), 'distance invented'));
  await check('all exercise PRs includes both exercise ids', async () => { const all = await getAllExercisePRs(); assert(all.bench?.length === 5 && all['deleted-exercise']?.length === 3, 'all exercises'); });
  await check('all exercise PR output is independent', async () => { const all = await getAllExercisePRs(); all.bench[0].value = 9999; assert((await getExercisePRs('bench'))[0].value !== 9999, 'shared PR object'); });
  await check('progression output is independently mutable', async () => { const p = await getExerciseProgression('bench'); p.points[0].bestWeightKg = 9999; assert((await getExerciseProgression('bench')).points[0].bestWeightKg === 80, 'shared progression'); });
  await check('performance output is independently mutable', async () => { const p = await getLatestExercisePerformance('bench'); p!.bestReps = 9999; assert((await getLatestExercisePerformance('bench'))!.bestReps === 15, 'shared performance'); });
  await check('history storage is unchanged by PR reads', async () => { const before = JSON.stringify(await getWorkout('second')); await getExercisePRs('bench'); await getExerciseProgression('bench'); assert(JSON.stringify(await getWorkout('second')) === before, 'historical mutation'); });
  await check('canonical storage remains source', async () => assert(store.has(WORKOUTS_KEY) && !store.has('jeevya:workouts:progression'), 'duplicate progression storage'));
  await check('malformed root is safe', async () => { await seed({ malformed: true }); assert((await getExercisePRs('bench')).length === 0, 'malformed root'); });
  await check('invalid numeric values do not create PRs', async () => { await seed([session('invalid', '2026-09-13', 'bench', [set('nan', 'bench', 1, { reps: Number.NaN, weightKg: Number.NaN }), set('inf', 'bench', 2, { reps: Infinity, weightKg: Infinity }), set('neg', 'bench', 3, { reps: -4, weightKg: -5 }), set('zero', 'bench', 4, { reps: 0, weightKg: 0 })])]); assert((await getExercisePRs('bench')).length === 0, 'invalid PR'); });
  await check('ties prefer newest session', async () => { await seed([session('older', '2026-09-01', 'bench', [set('older-s', 'bench', 1, { reps: 10, weightKg: 100 })]), session('newer', '2026-09-12', 'bench', [set('newer-s', 'bench', 1, { reps: 10, weightKg: 100 })])]); const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_weight')!; assert(pr.sessionId === 'newer' && pr.setId === 'newer-s', 'tie break'); });
  await check('tie applies to reps', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_reps')!; assert(pr.sessionId === 'newer', 'rep tie'); });
  await check('tie applies to volume', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_volume')!; assert(pr.sessionId === 'newer', 'volume tie'); });
  await check('tie applies to duration', async () => { await seed([session('older-d', '2026-09-01', 'bench', [set('od', 'bench', 1, { durationSeconds: 100 })]), session('newer-d', '2026-09-12', 'bench', [set('nd', 'bench', 1, { durationSeconds: 100 })])]); const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'longest_duration')!; assert(pr.sessionId === 'newer-d', 'duration tie'); });
  await check('tie applies to distance', async () => { await seed([session('older-k', '2026-09-01', 'bench', [set('ok', 'bench', 1, { distanceKm: 5 })]), session('newer-k', '2026-09-12', 'bench', [set('nk', 'bench', 1, { distanceKm: 5 })])]); const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'longest_distance')!; assert(pr.sessionId === 'newer-k', 'distance tie'); });
  await check('PR results do not expose full set model', async () => assert(!('sets' in (await getExercisePRs('bench'))[0]), 'full model'));
  await check('PR result type is explicit', async () => assert((await getExercisePRs('bench')).every((x) => x.recordType), 'record type'));
  await check('PR value is finite', async () => assert((await getExercisePRs('bench')).every((x) => Number.isFinite(x.value)), 'finite PR'));
  await check('progression date is retained', async () => assert((await getExerciseProgression('bench')).points.every((x) => /^2026-09-/.test(x.date)), 'progression date'));
  await check('progression session names are retained', async () => assert((await getExerciseProgression('bench')).points.every((x) => x.sessionName.length > 0), 'session names'));
  await check('cancelled records remain persisted', async () => { await seed([cancelled]); assert((await getWorkout('cancelled'))?.status === 'cancelled', 'cancelled lost'); });
  await check('in-progress records remain persisted', async () => { await seed([active]); assert((await getWorkout('active'))?.status === 'in_progress', 'active lost'); });
  await check('no progression storage is created', async () => assert(!store.has('jeevya:workouts:progression'), 'progression storage'));
  await check('no PR storage is created', async () => assert(!store.has('jeevya:workouts:prs'), 'PR storage'));
  await check('first progression current 1RM is available when valid', async () => { await seed([session('one', '2026-09-01', 'bench', [set('one-s', 'bench', 1, { weightKg: 60, reps: 5 })])]); assert((await getExerciseProgression('bench')).currentEstimatedOneRepMax === 70, 'first 1RM'); });
  await check('previous is null for one session', async () => assert((await getExerciseProgression('bench')).previousEstimatedOneRepMax === null, 'one-session previous'));
  await check('change is null for one session', async () => { const p = await getExerciseProgression('bench'); assert(p.weightChange === null && p.repsChange === null && p.volumeChange === null && p.estimatedOneRepMaxChange === null, 'one-session change'); });
  await check('best estimated 1RM matches current for one session', async () => assert(await getBestEstimatedOneRepMax('bench') === 70, 'one-session best'));
  await check('empty exercise id is safe', async () => assert((await getExercisePRs(' ')).length === 0, 'empty id'));
  await check('empty progression id is safe', async () => assert((await getExerciseProgression(' ')).points.length === 0, 'empty progression id'));
  await check('all PRs ignores malformed exercise ids', async () => { await seed([session('valid', '2026-09-01', 'bench')]); const all = await getAllExercisePRs(); assert(Object.keys(all).length === 1 && all.bench.length === 3, 'all malformed ids'); });

  await check('max weight ignores missing weight', async () => { await seed([session('missing-weight', '2026-09-01', 'bench', [set('mw', 'bench', 1, { reps: 10, weightKg: null })])]); assert(!(await getExercisePRs('bench')).some((x) => x.recordType === 'max_weight'), 'missing weight'); });
  await check('max reps ignores missing reps', async () => { await seed([session('missing-reps', '2026-09-01', 'bench', [set('mr', 'bench', 1, { reps: null, weightKg: 50 })])]); assert(!(await getExercisePRs('bench')).some((x) => x.recordType === 'max_reps'), 'missing reps'); });
  await check('volume ignores missing weight', async () => { await seed([session('missing-vw', '2026-09-01', 'bench', [set('vw', 'bench', 1, { reps: 10, weightKg: null })])]); assert(!(await getExercisePRs('bench')).some((x) => x.recordType === 'max_volume'), 'missing volume weight'); });
  await check('volume ignores missing reps', async () => { await seed([session('missing-vr', '2026-09-01', 'bench', [set('vr', 'bench', 1, { reps: null, weightKg: 50 })])]); assert(!(await getExercisePRs('bench')).some((x) => x.recordType === 'max_volume'), 'missing volume reps'); });
  await check('duration ignores zero', async () => { await seed([session('zero-duration', '2026-09-01', 'bench', [set('zd', 'bench', 1, { durationSeconds: 0 })])]); assert(!(await getExercisePRs('bench')).some((x) => x.recordType === 'longest_duration'), 'zero duration'); });
  await check('distance ignores zero', async () => { await seed([session('zero-distance', '2026-09-01', 'bench', [set('zk', 'bench', 1, { distanceKm: 0 })])]); assert(!(await getExercisePRs('bench')).some((x) => x.recordType === 'longest_distance'), 'zero distance'); });
  await check('duration ignores negative', async () => { await seed([session('negative-duration', '2026-09-01', 'bench', [set('nd', 'bench', 1, { durationSeconds: -1 })])]); assert(!(await getExercisePRs('bench')).some((x) => x.recordType === 'longest_duration'), 'negative duration'); });
  await check('distance ignores negative', async () => { await seed([session('negative-distance', '2026-09-01', 'bench', [set('nk', 'bench', 1, { distanceKm: -1 })])]); assert(!(await getExercisePRs('bench')).some((x) => x.recordType === 'longest_distance'), 'negative distance'); });
  await check('weight fallback field is supported', async () => { await seed([session('weight-fallback', '2026-09-01', 'bench', [set('wf', 'bench', 1, { weightKg: null, weight: 55, reps: 5 })])]); assert((await getExercisePRs('bench')).find((x) => x.recordType === 'max_weight')?.value === 55, 'weight fallback'); });
  await check('distance fallback field is supported', async () => { await seed([session('distance-fallback', '2026-09-01', 'bench', [set('df', 'bench', 1, { distanceKm: null, distance: 4, reps: null, weightKg: null })])]); assert((await getExercisePRs('bench')).find((x) => x.recordType === 'longest_distance')?.value === 4, 'distance fallback'); });
  await check('progression ignores sessions with no completed sets', async () => { await seed([session('none', '2026-09-01', 'bench', [set('none-s', 'bench', 1, { completed: false, completedAt: null })])]); assert((await getExerciseProgression('bench')).points.length === 0, 'incomplete point'); });
  await check('progression supports multiple sets', async () => { await seed([session('multi', '2026-09-01', 'bench', [set('a', 'bench', 1, { weightKg: 40, reps: 5 }), set('b', 'bench', 2, { weightKg: 70, reps: 8 })])]); const p = await getExerciseProgression('bench'); assert(p.points[0].bestWeightKg === 70 && p.points[0].bestReps === 8, 'multiple sets'); });
  await check('progression best volume comes from valid sets', async () => { const p = await getExerciseProgression('bench'); assert(p.points[0].bestVolume === 560, 'best volume'); });
  await check('PR source session is completed', async () => { await seed([session('source', '2026-09-01', 'bench', [set('source-s', 'bench', 1, { weightKg: 75, reps: 5 })])]); const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_weight')!; assert(pr.sessionId === 'source', 'source session'); });
  await check('PR source set is exact', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_weight')!; assert(pr.setId === 'source-s', 'source set'); });
  await check('PR exercise id is exact', async () => { const pr = (await getExercisePRs('bench')).find((x) => x.recordType === 'max_weight')!; assert(pr.exerciseId === 'bench', 'exercise id'); });

  await check('PR values are finite', async () => assert((await getExercisePRs('bench')).every((x) => Number.isFinite(x.value)), 'finite PR'));
  await check('PR values are positive', async () => assert((await getExercisePRs('bench')).every((x) => x.value > 0), 'positive PR'));
  await check('progression points are derived copies', async () => { const p = await getExerciseProgression('bench'); p.points[0].sessionName = 'changed'; assert((await getExerciseProgression('bench')).points[0].sessionName !== 'changed', 'point sharing'); });
  await check('current performance is derived copy', async () => { const p = await getLatestExercisePerformance('bench'); if (p) p.sessionName = 'changed'; assert((await getLatestExercisePerformance('bench'))?.sessionName !== 'changed', 'current sharing'); });
  await check('previous performance is derived copy', async () => { await seed([session('old', '2026-09-01', 'bench', [set('old-s', 'bench', 1, { weightKg: 50, reps: 5 })]), session('new', '2026-09-02', 'bench', [set('new-s', 'bench', 1, { weightKg: 60, reps: 5 })])]); const p = await getPreviousExercisePerformance('bench'); if (p) p.bestWeightKg = 999; assert((await getPreviousExercisePerformance('bench'))?.bestWeightKg === 50, 'previous sharing'); });
  await check('latest performance date is newest', async () => assert((await getLatestExercisePerformance('bench'))?.date === '2026-09-02', 'latest date'));
  await check('previous performance date is prior', async () => assert((await getPreviousExercisePerformance('bench'))?.date === '2026-09-01', 'previous date'));
  await check('weight change compares best weights', async () => assert((await getExerciseProgression('bench')).weightChange === 10, 'weight delta'));
  await check('reps change compares best reps', async () => assert((await getExerciseProgression('bench')).repsChange === 0, 'rep delta'));
  await check('volume change compares best volumes', async () => assert((await getExerciseProgression('bench')).volumeChange === 50, 'volume delta'));
  await check('current 1RM uses latest best set', async () => assert((await getExerciseProgression('bench')).currentEstimatedOneRepMax === 70, 'latest 1RM'));
  await check('previous 1RM uses previous best set', async () => { const p = await getExerciseProgression('bench'); assert(Math.abs((p.previousEstimatedOneRepMax ?? 0) - 58.33333333333333) < 1e-10, 'previous 1RM'); });
  await check('best 1RM selects maximum', async () => assert((await getExerciseProgression('bench')).bestEstimatedOneRepMax === 70, 'best 1RM'));
  await check('progression does not mutate stored name', async () => { const before = JSON.stringify(await getWorkout('new')); await getExerciseProgression('bench'); assert(JSON.stringify(await getWorkout('new')) === before, 'name mutation'); });
  await check('progression does not mutate stored sets', async () => { const before = JSON.stringify(await getWorkout('new')); await getExerciseProgression('bench'); assert(JSON.stringify(await getWorkout('new')) === before, 'set mutation'); });
  await check('all PRs are grouped by exercise', async () => { await seed([session('b', '2026-09-01', 'bench', [set('bs', 'bench', 1, { weightKg: 50, reps: 5 })]), session('r', '2026-09-02', 'row', [set('rs', 'row', 1, { weightKg: 80, reps: 5 })])]); const all = await getAllExercisePRs(); assert(all.bench !== undefined && all.row !== undefined, 'grouping'); });
  await check('row PR is isolated', async () => assert((await getAllExercisePRs()).row[0].exerciseId === 'row', 'row isolation'));
  await check('bench PR is isolated', async () => assert((await getAllExercisePRs()).bench[0].exerciseId === 'bench', 'bench isolation'));
  await check('unknown progression is empty', async () => assert((await getExerciseProgression('unknown')).points.length === 0, 'unknown'));
  await check('unknown latest is null', async () => assert(await getLatestExercisePerformance('unknown') === null, 'unknown latest'));
  await check('unknown previous is null', async () => assert(await getPreviousExercisePerformance('unknown') === null, 'unknown previous'));
  await check('unknown best 1RM is null', async () => assert(await getBestEstimatedOneRepMax('unknown') === null, 'unknown best'));
  await check('historical session survives progression reads', async () => { const before = JSON.stringify(await getWorkout('b')); await getExercisePRs('bench'); await getExerciseProgression('bench'); assert(JSON.stringify(await getWorkout('b')) === before, 'overwrite'); });
  await check('no progression storage key exists', async () => assert(!store.has('jeevya:workouts:progression'), 'progression storage'));
  await check('no PR storage key exists', async () => assert(!store.has('jeevya:workouts:prs'), 'PR storage'));
  await check('first performance has no previous', async () => { await seed([session('one', '2026-09-01', 'bench', [set('one-s', 'bench', 1, { weightKg: 60, reps: 5 })])]); const p = await getExerciseProgression('bench'); assert(p.previousPerformance === null && p.weightChange === null && p.repsChange === null && p.volumeChange === null, 'first performance'); });
  await check('first performance 1RM is 70', async () => assert((await getExerciseProgression('bench')).currentEstimatedOneRepMax === 70, 'first current 1RM'));
  await check('first performance best 1RM is 70', async () => assert(await getBestEstimatedOneRepMax('bench') === 70, 'first best 1RM'));
  await check('empty exercise id PR is safe', async () => assert((await getExercisePRs(' ')).length === 0, 'empty id'));
  await check('empty exercise id progression is safe', async () => assert((await getExerciseProgression(' ')).points.length === 0, 'empty progression id'));
  await check('raw workout storage remains valid', async () => { const raw = store.get(WORKOUTS_KEY); assert(typeof raw === 'string' && JSON.parse(raw), 'raw storage'); });

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
