import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadData, saveData } from '@/lib/storage';
import { SLEEP_KEY, createSleepEntry, deleteSleepEntry, getSleepEntry, getSleepEntryByDate, getSleepEntriesByDateRange, listSleepEntries, updateSleepEntry } from '@/services/sleep';
import { getWorkoutSessions } from '@/services/workouts';
import { getExercisePRs } from '@/services/workoutProgression';
import { getWorkoutHistory } from '@/services/workoutHistory';
import { getWorkoutTemplates, listPrograms } from '@/services/workoutTemplates';
import type { CreateSleepEntryInput, SleepEntry } from '@/services/sleep';

declare global { var __MOCK_STORE__: Map<string, string>; }
const store = globalThis.__MOCK_STORE__;
let passed = 0;
let failed = 0;
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
async function check(name: string, fn: () => Promise<void> | void) {
  try { await fn(); passed += 1; console.log(`PASS ${passed}. ${name}`); }
  catch (error) { failed += 1; console.error(`FAIL ${name}:`, error); }
}
function input(date = '2026-09-12', overrides: Partial<Omit<CreateSleepEntryInput, 'date'>> = {}): CreateSleepEntryInput {
  return {
    date,
    bedtime: '2026-09-12T23:00:00.000Z',
    sleepStart: '2026-09-12T23:30:00.000Z',
    wakeTime: '2026-09-13T07:15:00.000Z',
    sleepEnd: '2026-09-13T07:00:00.000Z',
    quality: 'good' as const,
    notes: 'Quiet night',
    ...overrides,
  };
}
function rawEntry(id: string, date: string, overrides: Partial<SleepEntry> = {}): SleepEntry {
  const base = input(date);
  return {
    id, date, bedtime: base.bedtime ?? undefined, sleepStart: base.sleepStart, wakeTime: base.wakeTime ?? undefined,
    sleepEnd: base.sleepEnd, durationMinutes: 450, quality: 'good', notes: base.notes ?? undefined,
    createdAt: '2026-09-12T08:00:00.000Z', updatedAt: '2026-09-12T08:01:00.000Z', ...overrides,
  };
}

async function main() {
  await AsyncStorage.clear();
  console.log('\n=== Phase 2F Sleep Tracking ===');

  await check('empty history is safe', async () => assert((await listSleepEntries()).length === 0, 'empty'));
  await check('empty date lookup is null', async () => assert(await getSleepEntryByDate('2026-09-12') === null, 'date lookup'));
  await check('empty id lookup is null', async () => assert(await getSleepEntry('missing') === null, 'id lookup'));
  await check('empty range is safe', async () => assert((await getSleepEntriesByDateRange('2026-09-01', '2026-09-30')).length === 0, 'range'));

  const created = await createSleepEntry(input());
  await check('create returns id', () => assert(created.id.startsWith('sleep_'), 'id'));
  await check('create preserves date', () => assert(created.date === '2026-09-12', 'date'));
  await check('create preserves sleepStart', () => assert(created.sleepStart === input().sleepStart, 'start'));
  await check('create preserves sleepEnd', () => assert(created.sleepEnd === input().sleepEnd, 'end'));
  await check('create preserves bedtime', () => assert(created.bedtime === input().bedtime, 'bedtime'));
  await check('create preserves wakeTime', () => assert(created.wakeTime === input().wakeTime, 'wake'));
  await check('create preserves quality', () => assert(created.quality === 'good', 'quality'));
  await check('create preserves notes', () => assert(created.notes === 'Quiet night', 'notes'));
  await check('duration is calculated', () => assert(created.durationMinutes === 450, 'duration'));
  await check('createdAt exists', () => assert(Number.isFinite(Date.parse(created.createdAt)), 'createdAt'));
  await check('updatedAt exists', () => assert(Number.isFinite(Date.parse(created.updatedAt)), 'updatedAt'));
  await check('storage key is used', async () => assert(store.has(SLEEP_KEY), 'storage key'));
  await check('persistence survives read', async () => assert((await listSleepEntries()).length === 1, 'persist'));

  const read = await getSleepEntry(created.id);
  await check('read returns created entry', () => assert(read?.id === created.id, 'read'));
  await check('date lookup returns entry', async () => assert((await getSleepEntryByDate('2026-09-12'))?.id === created.id, 'date'));
  await check('list returns entry', async () => assert((await listSleepEntries())[0].id === created.id, 'list'));
  await check('returned object is isolated', async () => { const item = await getSleepEntry(created.id); item!.notes = 'changed'; assert((await getSleepEntry(created.id))!.notes === 'Quiet night', 'isolation'); });
  await check('list result is isolated', async () => { const items = await listSleepEntries(); items[0].durationMinutes = 1; assert((await getSleepEntry(created.id))!.durationMinutes === 450, 'list isolation'); });

  await check('duplicate date is rejected', async () => { let rejected = false; try { await createSleepEntry(input()); } catch { rejected = true; } assert(rejected, 'duplicate'); });
  await check('duplicate date leaves one record', async () => assert((await listSleepEntries()).length === 1, 'duplicate persisted'));
  await check('invalid date is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-02-30')); } catch { rejected = true; } assert(rejected, 'invalid date'); });
  await check('empty date is rejected', async () => { let rejected = false; try { await createSleepEntry(input('')); } catch { rejected = true; } assert(rejected, 'empty date'); });
  await check('date-only sleepStart is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { sleepStart: '2026-09-11' })); } catch { rejected = true; } assert(rejected, 'date-only start'); });
  await check('invalid sleepStart is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { sleepStart: 'bad' })); } catch { rejected = true; } assert(rejected, 'start'); });
  await check('invalid sleepEnd is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { sleepEnd: 'bad' })); } catch { rejected = true; } assert(rejected, 'end'); });
  await check('end before start is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { sleepEnd: '2026-09-12T22:00:00.000Z' })); } catch { rejected = true; } assert(rejected, 'order'); });
  await check('zero interval is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { sleepEnd: input().sleepStart })); } catch { rejected = true; } assert(rejected, 'zero'); });
  await check('negative duration is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { durationMinutes: -1 })); } catch { rejected = true; } assert(rejected, 'negative duration'); });
  await check('NaN duration is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { durationMinutes: Number.NaN })); } catch { rejected = true; } assert(rejected, 'NaN duration'); });
  await check('Infinity duration is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { durationMinutes: Infinity })); } catch { rejected = true; } assert(rejected, 'Infinity duration'); });
  await check('inconsistent duration is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { durationMinutes: 451 })); } catch { rejected = true; } assert(rejected, 'inconsistent duration'); });
  await check('invalid bedtime is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { bedtime: 'bad' })); } catch { rejected = true; } assert(rejected, 'bedtime'); });
  await check('invalid wakeTime is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-11', { wakeTime: 'bad' })); } catch { rejected = true; } assert(rejected, 'wake'); });
  for (const quality of ['poor', 'fair', 'good', 'excellent'] as const) {
    await check(`quality ${quality} is accepted`, async () => {
      const e = await createSleepEntry(input(`2026-09-${13 + ['poor', 'fair', 'good', 'excellent'].indexOf(quality)}`, { quality }));
      assert(e.quality === quality, quality);
    });
  }
  await check('non-quality is rejected', async () => { let rejected = false; try { await createSleepEntry(input('2026-09-17', { quality: 'great' as never })); } catch { rejected = true; } assert(rejected, 'quality'); });

  const optional = await createSleepEntry(input('2026-09-18', { bedtime: null, wakeTime: null, notes: null }));
  await check('missing bedtime is safe', () => assert(optional.bedtime === undefined, 'bedtime missing'));
  await check('missing wakeTime is safe', () => assert(optional.wakeTime === undefined, 'wake missing'));
  await check('missing notes is safe', () => assert(optional.notes === undefined, 'notes missing'));
  await check('core interval remains valid without optional times', () => assert(optional.durationMinutes === 450, 'core interval'));

  const overnight = await createSleepEntry(input('2026-09-19', {
    bedtime: '2026-09-19T23:00:00.000Z', sleepStart: '2026-09-19T23:30:00.000Z',
    wakeTime: '2026-09-20T07:15:00.000Z', sleepEnd: '2026-09-20T07:00:00.000Z',
  }));
  await check('overnight sleep is supported', () => assert(overnight.durationMinutes === 450, 'overnight'));
  await check('overnight does not use date-only math', () => assert(Date.parse(overnight.sleepEnd) - Date.parse(overnight.sleepStart) === 450 * 60000, 'timestamp duration'));
  await check('bedtime remains separate from sleepStart', () => assert(Date.parse(overnight.bedtime!) < Date.parse(overnight.sleepStart), 'bedtime separate'));
  await check('wakeTime remains separate from sleepEnd', () => assert(Date.parse(overnight.wakeTime!) > Date.parse(overnight.sleepEnd), 'wake separate'));

  const edited = await updateSleepEntry(created.id, { quality: 'excellent', notes: 'Updated', sleepEnd: '2026-09-13T07:30:00.000Z' });
  await check('update returns same id', () => assert(edited.id === created.id, 'same id'));
  await check('update changes quality', () => assert(edited.quality === 'excellent', 'quality update'));
  await check('update changes notes', () => assert(edited.notes === 'Updated', 'notes update'));
  await check('update recalculates duration', () => assert(edited.durationMinutes === 480, 'duration update'));
  await check('update persists', async () => assert((await getSleepEntry(created.id))!.durationMinutes === 480, 'update persist'));
  await check('update can clear bedtime', async () => { const e = await updateSleepEntry(created.id, { bedtime: null }); assert(e.bedtime === undefined, 'clear bedtime'); });
  await check('update can clear wakeTime', async () => { const e = await updateSleepEntry(created.id, { wakeTime: null }); assert(e.wakeTime === undefined, 'clear wake'); });
  await check('update can clear notes', async () => { const e = await updateSleepEntry(created.id, { notes: null }); assert(e.notes === undefined, 'clear notes'); });
  await check('update rejects duplicate date', async () => { let rejected = false; try { await updateSleepEntry(created.id, { date: '2026-09-18' }); } catch { rejected = true; } assert(rejected, 'duplicate update'); });
  await check('update rejects invalid id', async () => { let rejected = false; try { await updateSleepEntry('missing', { quality: 'good' }); } catch { rejected = true; } assert(rejected, 'missing update'); });
  await check('update rejects invalid timestamp', async () => { let rejected = false; try { await updateSleepEntry(created.id, { sleepStart: 'bad' }); } catch { rejected = true; } assert(rejected, 'bad update timestamp'); });
  await check('update rejects reversed interval', async () => { let rejected = false; try { await updateSleepEntry(created.id, { sleepEnd: '2026-09-12T22:00:00.000Z' }); } catch { rejected = true; } assert(rejected, 'reversed update'); });

  const beforeDelete = await listSleepEntries();
  await deleteSleepEntry(edited.id);
  await check('delete removes entry', async () => assert(await getSleepEntry(edited.id) === null, 'delete'));
  await check('delete removes from list', async () => assert(!(await listSleepEntries()).some((e) => e.id === edited.id), 'delete list'));
  await check('delete preserves other entries', async () => assert((await listSleepEntries()).some((e) => e.id === optional.id), 'other preserved'));
  await check('delete missing id is harmless', async () => { await deleteSleepEntry('missing'); assert((await listSleepEntries()).length === beforeDelete.length - 1, 'missing delete'); });

  await saveData(SLEEP_KEY, [
    rawEntry('legacy-1', '2026-09-20', { durationMinutes: 999 }),
    { malformed: true },
    rawEntry('legacy-bad', '2026-09-21', { sleepEnd: 'bad' }),
  ]);
  await check('legacy valid timestamps are preserved', async () => assert((await listSleepEntries()).some((e) => e.id === 'legacy-1'), 'legacy'));
  await check('legacy duration is normalized from timestamps', async () => assert((await getSleepEntry('legacy-1'))!.durationMinutes === 450, 'legacy duration'));
  await check('malformed record is ignored', async () => assert(!(await listSleepEntries()).some((e) => e.id === 'legacy-bad'), 'bad legacy'));
  await check('malformed root is safe', async () => { await saveData(SLEEP_KEY, { malformed: true }); assert((await listSleepEntries()).length === 0, 'root'); });

  await saveData(SLEEP_KEY, [
    rawEntry('a', '2026-09-20', { updatedAt: '2026-09-20T09:00:00.000Z' }),
    rawEntry('b', '2026-09-20', { updatedAt: '2026-09-20T10:00:00.000Z' }),
  ]);
  await check('duplicate legacy dates resolve deterministically', async () => assert((await getSleepEntryByDate('2026-09-20'))?.id === 'b', 'deterministic duplicate'));
  await check('duplicate legacy date list is stable', async () => assert((await listSleepEntries()).map((e) => e.id).join(',') === 'b,a', 'stable list'));

  await saveData(SLEEP_KEY, [
    rawEntry('old', '2026-09-01'), rawEntry('mid', '2026-09-10'), rawEntry('new', '2026-09-20'),
  ]);
  const range = await getSleepEntriesByDateRange('2026-09-05', '2026-09-15');
  await check('range includes lower matching entries', () => assert(range.some((e) => e.id === 'mid'), 'range mid'));
  await check('range excludes earlier entries', () => assert(!range.some((e) => e.id === 'old'), 'range old'));
  await check('range excludes later entries', () => assert(!range.some((e) => e.id === 'new'), 'range new'));
  await check('range is sorted newest first', () => assert(range[0]?.id === 'mid', 'range order'));
  await check('invalid range start returns empty', async () => assert((await getSleepEntriesByDateRange('bad', '2026-09-20')).length === 0, 'bad start'));
  await check('invalid range end returns empty', async () => assert((await getSleepEntriesByDateRange('2026-09-01', 'bad')).length === 0, 'bad end'));
  await check('reversed range returns empty', async () => assert((await getSleepEntriesByDateRange('2026-09-20', '2026-09-01')).length === 0, 'reverse range'));
  await check('invalid date lookup returns null', async () => assert(await getSleepEntryByDate('2026-02-30') === null, 'invalid lookup'));

  await AsyncStorage.clear();
  const concurrent = Array.from({ length: 8 }, (_, i) => createSleepEntry(input(`2026-08-${String(i + 1).padStart(2, '0')}`)));
  const concurrentResults = await Promise.all(concurrent);
  await check('concurrent creates all resolve', () => assert(concurrentResults.length === 8, 'concurrent result count'));
  await check('concurrent creates persist all records', async () => assert((await listSleepEntries()).length === 8, 'concurrent persist'));
  await check('concurrent ids are unique', () => assert(new Set(concurrentResults.map((e) => e.id)).size === 8, 'unique ids'));
  await check('concurrent records retain distinct dates', () => assert(new Set(concurrentResults.map((e) => e.date)).size === 8, 'distinct dates'));

  await AsyncStorage.clear();
  const sameDateResults = await Promise.allSettled(Array.from({ length: 5 }, () => createSleepEntry(input('2026-07-15'))));
  const fulfilled = sameDateResults.filter((r) => r.status === 'fulfilled');
  const rejected = sameDateResults.filter((r) => r.status === 'rejected');
  await check('concurrent duplicate date has one winner', () => assert(fulfilled.length === 1, 'one winner'));
  await check('concurrent duplicate date rejects losers', () => assert(rejected.length === 4, 'four losers'));
  await check('concurrent duplicate date persists one record', async () => assert((await listSleepEntries()).length === 1, 'one persisted'));

  await AsyncStorage.clear();
  await saveData(SLEEP_KEY, [rawEntry('isolate-a', '2026-06-01'), rawEntry('isolate-b', '2026-06-02')]);
  await deleteSleepEntry('isolate-a');
  await check('delete one does not affect historical sibling', async () => assert((await getSleepEntry('isolate-b'))?.id === 'isolate-b', 'sibling'));
  const isolated = await listSleepEntries();
  await check('historical list contains only surviving sibling', () => assert(isolated.length === 1 && isolated[0].id === 'isolate-b', 'history isolation'));

  await AsyncStorage.clear();
  await check('storage load fallback remains safe', async () => assert(await loadData(SLEEP_KEY, []) instanceof Array, 'fallback'));
  await check('Phase 2A workout regression storage remains readable', async () => assert(Array.isArray(await getWorkoutSessions()), '2A'));
  await check('Phase 2B workout template regression remains readable', async () => assert(Array.isArray(await getWorkoutTemplates()), '2B'));
  await check('Phase 2C program subsystem remains available', async () => assert(Array.isArray(await listPrograms()), '2C'));
  await check('Phase 2D workout history remains available', async () => assert(Array.isArray((await getWorkoutHistory()).workouts), '2D'));
  await check('Phase 2E progression remains available', async () => assert(Array.isArray(await getExercisePRs('bench')), '2E'));
  await check('sleep data uses only canonical sleep key', async () => assert(store.has(SLEEP_KEY) === false || [...store.keys()].every((key) => key === SLEEP_KEY || key.startsWith('lifeos:workouts') || key.startsWith('@lifeos')), 'scope'));
  await check('no sleep analytics storage key exists', async () => assert(!store.has('lifeos:health:sleep:analytics'), 'analytics key'));
  await check('no recovery storage key exists', async () => assert(!store.has('lifeos:health:recovery'), 'recovery key'));
  await check('no sleep AI storage key exists', async () => assert(!store.has('lifeos:health:sleep:ai'), 'ai key'));

  console.log(`\nPhase 2F: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

void main();
