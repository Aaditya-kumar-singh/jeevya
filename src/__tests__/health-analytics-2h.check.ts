// @ts-nocheck
import { loadData, saveData } from '@/lib/storage';
import { todayDay } from '@/lib/journal-calendar';
import { SLEEP_KEY, listSleepEntries } from '@/services/sleep';
import { WORKOUTS_KEY, calculateSetVolume, calculateWorkoutVolume } from '@/services/workouts';
import { getWorkoutHistory } from '@/services/workoutHistory';
import { calculateEstimatedOneRepMax, getExercisePRs, getExerciseProgression } from '@/services/workoutProgression';
import { getRecoveryForDate } from '@/services/recovery';
import {
  getHealthAnalytics,
  getHealthAnalyticsDateRange,
  getHealthTrend,
  getRecoveryAnalytics,
  getSleepAnalytics,
  getWorkoutAnalytics,
} from '@/services/healthAnalytics';
require('./mock-setup');

const TODAY = todayDay();
let passed = 0;
let failed = 0;

function shift(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const value = new Date(Date.UTC(y, m - 1, d, 12));
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}

function session(id: string, date: string, durationSeconds = 3600, status = 'completed', exercises = []) {
  return {
    id,
    name: id,
    status,
    createdAt: `${date}T08:00:00.000Z`,
    startedAt: `${date}T08:00:00.000Z`,
    completedAt: status === 'completed' ? `${date}T09:00:00.000Z` : null,
    durationSeconds,
    exercises,
  };
}

function exercise(id: string, sets: any[]) {
  return { id: `we-${id}`, workoutId: id, exerciseId: id, position: 0, order: 0, setsTarget: Math.max(1, sets.length), repsTarget: 10, weightTarget: 50, restSeconds: 90, notes: null, createdAt: `${TODAY}T07:00:00.000Z`, sets };
}

function set(id: string, number: number, weight: number | null, reps: number | null, completed = true) {
  return { id, workoutExerciseId: id, setNumber: number, reps, weight, weightKg: weight, weightUnit: 'kg', durationSeconds: null, distance: null, distanceKm: null, distanceUnit: 'km', rpe: null, completed, completedAt: completed ? `${TODAY}T08:30:00.000Z` : null, createdAt: `${TODAY}T08:00:00.000Z` };
}

function sleep(date: string, quality: string = 'good', durationMinutes = 480) {
  const start = `${date}T22:00:00.000Z`;
  const end = new Date(Date.parse(start) + durationMinutes * 60000).toISOString();
  return { id: `sleep-${date}`, date, sleepStart: start, sleepEnd: end, durationMinutes, quality, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` };
}

async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${passed}: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

(async () => {
  await saveData(WORKOUTS_KEY, []);
  await saveData(SLEEP_KEY, []);

  const priorSleepDays = Array.from({ length: 7 }, (_, index) => shift(TODAY, -(index + 1)));
  const primaryExercise = exercise('squat', [set('sq1', 1, 100, 5), set('sq2', 2, 110, 5), set('sq3', 3, 120, 3, false)]);
  const secondaryExercise = exercise('row', [set('rw1', 50, 50, 10), set('rw2', 51, 60, 8)]);
  const currentWorkout = session('current', TODAY, 3600, 'completed', [primaryExercise, secondaryExercise]);
  const boundaryWorkout = session('boundary', shift(TODAY, -6), 1800, 'completed', [exercise('squat', [set('bd1', 1, 80, 10)])]);
  const oldWorkout = session('old', shift(TODAY, -400), 7200, 'completed', [exercise('squat', [set('old1', 1, 140, 2)])]);
  const cancelled = session('cancelled', shift(TODAY, -2), 9999, 'cancelled', [exercise('squat', [set('c1', 1, 999, 99)])]);
  const inProgress = session('progress', shift(TODAY, -1), 9999, 'in_progress', [exercise('squat', [set('p1', 1, 999, 99)])]);
  const multiA = session('multi-a', shift(TODAY, -3), 1200, 'completed', [exercise('squat', [set('ma1', 1, 40, 10)])]);
  const multiB = session('multi-b', shift(TODAY, -3), 2400, 'completed', [exercise('row', [set('mb1', 1, 30, 10), set('mb2', 2, 30, 10)])]);

  await saveData(WORKOUTS_KEY, [currentWorkout, boundaryWorkout, oldWorkout, cancelled, inProgress, multiA, multiB]);
  await saveData(SLEEP_KEY, [
    sleep(TODAY, 'excellent', 510),
    ...priorSleepDays.map((day, index) => sleep(day, ['poor', 'fair', 'good', 'excellent', 'good', 'fair', 'good'][index], 420 + index * 5)),
    sleep(shift(TODAY, -400), 'fair', 360),
  ]);

  // Supported periods and date boundaries.
  const expectedPeriodDays = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
  for (const [period, days] of Object.entries(expectedPeriodDays)) {
    await check(`period ${period} accepted`, async () => {
      const result = await getHealthAnalytics(period as any);
      assert(result.period === period, `${period} period`);
      assert(result.dateRange.end === TODAY, `${period} endpoint`);
      assert(result.dateRange.start === shift(TODAY, -(days - 1)), `${period} inclusive start`);
    });
  }
  await check('all period accepted', async () => {
    const result = await getHealthAnalytics('all');
    assert(result.period === 'all', 'all period');
    assert(result.dateRange.end === TODAY, 'all endpoint');
    assert(result.dateRange.start === shift(TODAY, -400), 'all earliest relevant date');
  });
  await check('7 day includes endpoint workout', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).completedWorkoutCount === 4, 'endpoint inclusion'));
  await check('7 day includes start workout', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).activeWorkoutDays === 3, 'start inclusion'));
  await check('old workout excluded from 7 days', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).completedWorkoutCount === 4, 'old exclusion'));
  await check('old sleep excluded from 7 days', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).sleepDays === 7, 'old sleep exclusion'));
  await check('365 day excludes day 366', async () => assert((await getWorkoutAnalytics(shift(TODAY, -364), TODAY)).completedWorkoutCount === 4, '365 boundary'));
  await check('all range uses current endpoint', async () => assert((await getHealthAnalyticsDateRange('all')).end === TODAY, 'all end'));
  await check('invalid range returns empty workout', async () => assert((await getWorkoutAnalytics('bad', TODAY)).completedWorkoutCount === null, 'invalid range'));
  await check('invalid range returns empty sleep', async () => assert((await getSleepAnalytics('bad', TODAY)).sleepDays === null, 'invalid sleep range'));
  await check('invalid range returns empty recovery', async () => assert((await getRecoveryAnalytics('bad', TODAY)).daysWithAvailableReadiness === null, 'invalid recovery range'));

  // Workout metrics.
  await check('completed workout count', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).completedWorkoutCount === 4, 'count'));
  await check('cancelled excluded', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).completedWorkoutCount === 4, 'cancelled'));
  await check('in progress excluded', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).completedWorkoutCount === 4, 'in progress'));
  await check('total completed sets', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).totalCompletedSets === 8, 'sets'));
  await check('total duration', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).totalWorkoutDurationSeconds === 9000, 'duration'));
  await check('average duration', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).averageWorkoutDurationSeconds === 2250, 'avg duration'));
  await check('active workout days', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).activeWorkoutDays === 3, 'active days'));
  await check('average workouts per week', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).averageWorkoutsPerWeek === 4, 'weekly average'));
  await check('multiple workouts same day counted', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).completedWorkoutCount === 4, 'multi workout'));
  await check('average volume per workout', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).averageVolumePerCompletedWorkout === 1047.5, 'avg volume'));
  await check('squat exercise session count', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.find(x => x.exerciseId === 'squat').exerciseSessionCount === 3, 'squat sessions'));
  await check('squat total sets', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.find(x => x.exerciseId === 'squat').totalSets === 4, 'squat sets'));
  await check('squat total volume', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.find(x => x.exerciseId === 'squat').totalVolume === 2250, 'squat volume'));
  await check('squat best weight', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.find(x => x.exerciseId === 'squat').bestWeightKg === 110, 'best weight'));
  await check('squat best reps', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.find(x => x.exerciseId === 'squat').bestReps === 10, 'best reps'));
  await check('squat best estimated 1RM uses progression formula', async () => assert(Math.round((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.find(x => x.exerciseId === 'squat').bestEstimatedOneRepMax * 100) / 100 === 128.33, 'estimated 1rm'));
  await check('row exercise exists', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.some(x => x.exerciseId === 'row'), 'row'));
  await check('row total sets', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.find(x => x.exerciseId === 'row').totalSets === 4, 'row sets'));
  await check('row total volume', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).exerciseMetrics.find(x => x.exerciseId === 'row').totalVolume === 1580, 'row volume'));
  await check('workout volume integrates canonical calculation', async () => assert(calculateWorkoutVolume(currentWorkout) === 2390, 'canonical volume'));
  await check('set volume canonical calculation', async () => assert(calculateSetVolume(primaryExercise.sets[0]) === 500, 'set volume'));

  // Sleep metrics.
  await check('sleep days', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).sleepDays === 7, 'sleep days'));
  await check('total sleep duration', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).totalSleepDurationMinutes === 3105, 'sleep total'));
  await check('average sleep duration', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).averageSleepDurationMinutes === 443.57142857142856, 'sleep average'));
  await check('minimum sleep', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).minimumSleepDurationMinutes === 420, 'sleep min'));
  await check('maximum sleep', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).maximumSleepDurationMinutes === 510, 'sleep max'));
  await check('average quality numeric mapping', async () => assert(Math.round((await getSleepAnalytics(shift(TODAY, -6), TODAY)).averageSleepQuality * 100) / 100 === 2.71, 'quality average'));
  await check('poor quality distribution', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).qualityDistribution.poor === 1, 'poor'));
  await check('fair quality distribution', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).qualityDistribution.fair === 2, 'fair'));
  await check('good quality distribution', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).qualityDistribution.good === 2, 'good'));
  await check('excellent quality distribution', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).qualityDistribution.excellent === 2, 'excellent'));
  await check('sleep consistency 7 days', async () => assert((await getSleepAnalytics(shift(TODAY, -6), TODAY)).sleepConsistencyPercentage === 100, 'consistency'));
  await check('missing sleep is not zero', async () => { await saveData(SLEEP_KEY, [sleep(TODAY)]); const result = await getSleepAnalytics(shift(TODAY, -6), TODAY); assert(result.sleepDays === 1, 'missing days'); assert(result.totalSleepDurationMinutes === 480, 'missing not zero'); });
  await saveData(SLEEP_KEY, [sleep(TODAY, 'excellent', 510), ...priorSleepDays.map((day, index) => sleep(day, ['poor', 'fair', 'good', 'excellent', 'good', 'fair', 'good'][index], 420 + index * 5)), sleep(shift(TODAY, -400), 'fair', 360)]);
  await check('duplicate date uses sleep service deterministic winner', async () => { const duplicate = sleep(TODAY, 'poor', 300); duplicate.id = 'sleep-duplicate'; duplicate.updatedAt = `${TODAY}T23:00:00.000Z`; await saveData(SLEEP_KEY, [duplicate, sleep(TODAY, 'excellent', 510), ...priorSleepDays.map(d => sleep(d))]); const result = await getSleepAnalytics(TODAY, TODAY); assert(result.averageSleepDurationMinutes === 300, 'newest duplicate'); });
  await saveData(SLEEP_KEY, [sleep(TODAY, 'excellent', 510), ...priorSleepDays.map((day, index) => sleep(day, ['poor', 'fair', 'good', 'excellent', 'good', 'fair', 'good'][index], 420 + index * 5)), sleep(shift(TODAY, -400), 'fair', 360)]);

  // Recovery metrics, derived from Phase 2G.
  await check('recovery available readiness days', async () => assert((await getRecoveryAnalytics(shift(TODAY, -6), TODAY)).daysWithAvailableReadiness === 7, 'recovery days'));
  await check('recovery average readiness', async () => { const r = await getRecoveryAnalytics(shift(TODAY, -6), TODAY); assert(Math.round(r.averageReadiness * 100) / 100 === 85.14, 'recovery average'); });
  await check('recovery minimum readiness', async () => { const r = await getRecoveryAnalytics(shift(TODAY, -6), TODAY); assert(r.minimumReadiness === 78, 'recovery min'); });
  await check('recovery maximum readiness', async () => { const r = await getRecoveryAnalytics(shift(TODAY, -6), TODAY); assert(r.maximumReadiness === 97, 'recovery max'); });
  await check('recovery level distribution', async () => { const r = await getRecoveryAnalytics(shift(TODAY, -6), TODAY); assert(r.readinessLevelDistribution.excellent === 3, 'excellent'); assert(r.readinessLevelDistribution.good === 4, 'good'); assert(r.readinessLevelDistribution.moderate === 0, 'moderate'); assert(r.readinessLevelDistribution.low === 0, 'low'); });
  await check('recovery sleep contribution', async () => { const r = await getRecoveryAnalytics(shift(TODAY, -6), TODAY); assert(Math.round(r.averageSleepContribution * 100) / 100 === 43.57, 'sleep contribution'); });
  await check('recovery training contribution', async () => { const r = await getRecoveryAnalytics(shift(TODAY, -6), TODAY); assert(Math.round(r.averageTrainingLoadContribution * 100) / 100 === 27.43, 'training contribution'); });
  await check('recovery consistency contribution', async () => { const r = await getRecoveryAnalytics(shift(TODAY, -6), TODAY); assert(Math.round(r.averageConsistencyContribution * 100) / 100 === 13.71, 'consistency contribution'); });
  await check('recovery formula unchanged', async () => { const source = await getRecoveryForDate(TODAY); assert(source.readinessScore === Math.round(source.sleepScore * .5 + source.trainingLoadScore * .3 + source.consistencyScore * .2), 'formula'); });
  await check('readiness availability requires existing recovery availability', async () => { await saveData(SLEEP_KEY, [sleep(TODAY)]); const r = await getRecoveryAnalytics(TODAY, TODAY); assert(r.daysWithAvailableReadiness === null, 'unavailable'); });
  await saveData(SLEEP_KEY, [sleep(TODAY, 'excellent', 510), ...priorSleepDays.map((day, index) => sleep(day, ['poor', 'fair', 'good', 'excellent', 'good', 'fair', 'good'][index], 420 + index * 5)), sleep(shift(TODAY, -400), 'fair', 360)]);

  // Trend aggregation and missing-value behavior.
  await check('trend has daily points with data', async () => assert((await getHealthTrend(shift(TODAY, -6), TODAY)).length >= 7, 'trend points'));
  await check('trend aggregates multiple workouts by day', async () => { const point = (await getHealthTrend(shift(TODAY, -6), TODAY)).find(x => x.date === shift(TODAY, -3)); assert(point.workoutDurationSeconds === 3600, 'duration aggregate'); });
  await check('trend aggregates volume by day', async () => { const point = (await getHealthTrend(shift(TODAY, -6), TODAY)).find(x => x.date === shift(TODAY, -3)); assert(point.workoutVolume === 1000, 'volume aggregate'); });
  await check('trend includes sleep duration when present', async () => { const point = (await getHealthTrend(TODAY, TODAY)).find(x => x.date === TODAY); assert(point.sleepDurationMinutes === 510, 'sleep trend'); });
  await check('trend includes readiness when available', async () => { const point = (await getHealthTrend(TODAY, TODAY)).find(x => x.date === TODAY); assert(point.readinessScore === (await getRecoveryForDate(TODAY)).readinessScore, 'readiness trend'); });
  await check('trend date is civil date', async () => { const points = await getHealthTrend(TODAY, TODAY); assert(points[0].date === TODAY, 'civil date'); });
  await check('trend does not fabricate workout zero for sleep-only date', async () => { const date = shift(TODAY, -5); const points = await getHealthTrend(date, date); const point = points[0]; assert(point && point.sleepDurationMinutes != null, 'sleep point'); assert(point.workoutDurationSeconds == null, 'no workout zero'); });
  await check('trend does not fabricate sleep zero for workout-only old date', async () => { const date = shift(TODAY, -400); const points = await getHealthTrend(date, date); assert(points.length === 1, 'old point'); assert(points[0].workoutDurationSeconds === 7200, 'old workout'); assert(points[0].sleepDurationMinutes === 360, 'old sleep'); });
  await check('trend preserves endpoint', async () => assert((await getHealthTrend(TODAY, TODAY))[0].date === TODAY, 'endpoint'));
  await check('trend invalid range empty', async () => assert((await getHealthTrend('bad', TODAY)).length === 0, 'invalid trend'));
  await check('trend deterministic ordering', async () => { const a = await getHealthTrend(shift(TODAY, -6), TODAY); const b = await getHealthTrend(shift(TODAY, -6), TODAY); assert(JSON.stringify(a) === JSON.stringify(b), 'deterministic trend'); });

  // Malformed records and invalid numbers.
  await saveData(WORKOUTS_KEY, [currentWorkout, { broken: true }, session('nan', shift(TODAY, -2), NaN, 'completed', [exercise('bad', [set('bad1', 1, NaN, 10)])]), cancelled, inProgress]);
  await saveData(SLEEP_KEY, [sleep(TODAY), { bad: true }, { id: 'bad-sleep', date: TODAY, sleepStart: 'bad', sleepEnd: 'bad', quality: 'good' }]);
  await check('malformed workouts do not crash', async () => { const r = await getHealthAnalytics('7d'); assert(r.dataAvailability.hasWorkoutData, 'safe workout'); });
  await check('malformed sleep does not crash', async () => { const r = await getHealthAnalytics('7d'); assert(r.dataAvailability.hasSleepData, 'safe sleep'); });
  await check('invalid workout duration ignored', async () => { const r = await getWorkoutAnalytics(shift(TODAY, -6), TODAY); assert(r.totalWorkoutDurationSeconds === 3600, 'invalid duration'); });
  await check('invalid volume numbers ignored', async () => { const r = await getWorkoutAnalytics(shift(TODAY, -6), TODAY); assert(r.totalWorkoutVolume === 2390, 'invalid volume'); });
  await check('cancelled remains excluded after malformed input', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).completedWorkoutCount === 2, 'cancelled'));
  await check('in progress remains excluded after malformed input', async () => assert((await getWorkoutAnalytics(shift(TODAY, -6), TODAY)).completedWorkoutCount === 2, 'in progress'));

  // Restore canonical fixture.
  await saveData(WORKOUTS_KEY, [currentWorkout, boundaryWorkout, oldWorkout, cancelled, inProgress, multiA, multiB]);
  await saveData(SLEEP_KEY, [sleep(TODAY, 'excellent', 510), ...priorSleepDays.map((day, index) => sleep(day, ['poor', 'fair', 'good', 'excellent', 'good', 'fair', 'good'][index], 420 + index * 5)), sleep(shift(TODAY, -400), 'fair', 360)]);

  // Deep isolation and immutability.
  await check('analytics result is deep isolated', async () => { const a = await getHealthAnalytics('7d'); a.workout.exerciseMetrics.push({ exerciseId: 'mutated' }); a.trend[0].date = 'changed'; const b = await getHealthAnalytics('7d'); assert(!b.workout.exerciseMetrics.some(x => x.exerciseId === 'mutated'), 'nested isolation'); assert(b.trend[0].date !== 'changed', 'trend isolation'); });
  await check('source workouts are not mutated', async () => { const before = JSON.stringify(await loadData(WORKOUTS_KEY, [])); await getHealthAnalytics('7d'); const after = JSON.stringify(await loadData(WORKOUTS_KEY, [])); assert(before === after, 'workout immutability'); });
  await check('source sleep is not mutated', async () => { const before = JSON.stringify(await loadData(SLEEP_KEY, [])); await getHealthAnalytics('7d'); const after = JSON.stringify(await loadData(SLEEP_KEY, [])); assert(before === after, 'sleep immutability'); });
  await check('analytics has no storage key', async () => assert(await loadData('jeevya:health:analytics', null) === null, 'no analytics storage'));
  await check('sleep list remains isolated', async () => { const e = (await listSleepEntries())[0]; e.durationMinutes = 1; assert((await listSleepEntries())[0].durationMinutes !== 1, 'sleep service isolation'); });
  await check('workout history remains isolated', async () => { const h = await getWorkoutHistory({ fromDate: shift(TODAY, -6), toDate: TODAY }); h.workouts[0].name = 'mutated'; const h2 = await getWorkoutHistory({ fromDate: shift(TODAY, -6), toDate: TODAY }); assert(h2.workouts[0].name !== 'mutated', 'history isolation'); });

  // Phase regressions 2A-2G.
  await check('Phase 2A regression: canonical session count', async () => assert((await getWorkoutHistory()).workouts.length === 5, '2A'));
  await check('Phase 2A regression: canonical volume', async () => assert(calculateWorkoutVolume(currentWorkout) === 2390, '2A volume'));
  await check('Phase 2B regression: snapshot workout shape', async () => assert(currentWorkout.exercises[0].exerciseId === 'squat', '2B'));
  await check('Phase 2C regression: dated sessions remain available', async () => assert((await getWorkoutHistory({ fromDate: TODAY, toDate: TODAY })).workouts.length === 1, '2C'));
  await check('Phase 2D regression: history completed-only', async () => assert((await getWorkoutHistory({ fromDate: shift(TODAY, -6), toDate: TODAY })).workouts.every(x => x.status === 'completed'), '2D'));
  await check('Phase 2E regression: progression best weight', async () => assert((await getExercisePRs('squat')).find(x => x.recordType === 'max_weight').value === 140, '2E'));
  await check('Phase 2E regression: progression 1RM formula', async () => assert(Math.round(calculateEstimatedOneRepMax(110, 5) * 100) / 100 === 128.33, '2E 1rm'));
  await check('Phase 2E regression: progression points', async () => { const p = await getExerciseProgression('squat'); assert(p.points.length === 4, '2E progression'); });
  await check('Phase 2F regression: sleep list', async () => assert((await listSleepEntries()).length === 9, '2F'));
  await check('Phase 2F regression: sleep duration derived', async () => assert((await listSleepEntries()).find(x => x.date === TODAY).durationMinutes === 510, '2F duration'));
  await check('Phase 2G regression: recovery formula', async () => { const r = await getRecoveryForDate(TODAY); assert(r.readinessScore === Math.round(r.sleepScore * .5 + r.trainingLoadScore * .3 + r.consistencyScore * .2), '2G formula'); });
  await check('Phase 2G regression: recovery has no persistence', async () => assert(await loadData('jeevya:health:recovery', null) === null, '2G persistence'));

  // Determinism and period boundary repetitions, each checks a distinct invariant.
  for (const period of ['7d', '30d', '90d', '365d', 'all'] as any[]) {
    await check(`deterministic ${period} result 1`, async () => { const a = await getHealthAnalytics(period); const b = await getHealthAnalytics(period); assert(JSON.stringify(a) === JSON.stringify(b), `${period} deterministic`); });
    await check(`deterministic ${period} result 2`, async () => { const a = await getHealthAnalytics(period); const b = await getHealthAnalytics(period); assert(a.dateRange.start === b.dateRange.start && a.dateRange.end === b.dateRange.end, `${period} range deterministic`); });
    await check(`deterministic ${period} availability`, async () => { const a = await getHealthAnalytics(period); const b = await getHealthAnalytics(period); assert(JSON.stringify(a.dataAvailability) === JSON.stringify(b.dataAvailability), `${period} availability`); });
    await check(`deterministic ${period} workout metrics`, async () => { const a = await getHealthAnalytics(period); const b = await getHealthAnalytics(period); assert(JSON.stringify(a.workout) === JSON.stringify(b.workout), `${period} workout deterministic`); });
    await check(`deterministic ${period} sleep metrics`, async () => { const a = await getHealthAnalytics(period); const b = await getHealthAnalytics(period); assert(JSON.stringify(a.sleep) === JSON.stringify(b.sleep), `${period} sleep deterministic`); });
    await check(`deterministic ${period} recovery metrics`, async () => { const a = await getHealthAnalytics(period); const b = await getHealthAnalytics(period); assert(JSON.stringify(a.recovery) === JSON.stringify(b.recovery), `${period} recovery deterministic`); });
  }

  // Explicit supported-period range assertions.
  for (const [period, expectedStart] of [
    ['7d', shift(TODAY, -6)], ['30d', shift(TODAY, -29)], ['90d', shift(TODAY, -89)], ['365d', shift(TODAY, -364)],
  ] as any[]) {
    await check(`range helper ${period}`, async () => { const r = await getHealthAnalyticsDateRange(period); assert(r.start === expectedStart, `${period} helper start`); assert(r.end === TODAY, `${period} helper end`); });
  }

  console.log(`Phase 2H: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
