import {
  addTemplateExercise,
  addTemplateSet,
  createWorkoutSessionFromTemplate,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  duplicateWorkoutTemplate,
  getWorkoutTemplate,
  getWorkoutTemplates,
  moveTemplateExercise,
  removeTemplateExercise,
  removeTemplateSet,
  searchWorkoutTemplates,
  startWorkoutFromTemplate,
  toggleWorkoutTemplateFavorite,
  updateTemplateExercise,
  updateTemplateSet,
  updateWorkoutTemplate,
  WORKOUT_TEMPLATES_KEY,
} from '@/services/workoutTemplates';
import {
  addWorkoutSet,
  completeWorkout,
  completeWorkoutSet,
  createWorkout,
  createWorkoutSession,
  getWorkoutSession,
  getWorkoutSessions,
  updateWorkoutSession,
  calculateWorkoutVolume,
} from '@/services/workouts';
import { loadData } from '@/lib/storage';

declare global {
  var __MOCK_STORE__: Map<string, string>;
}

const store = globalThis.__MOCK_STORE__;
let passed = 0;
let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function scenario(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${passed}. ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}:`, error);
  }
}

async function reset() {
  store.clear();
}

async function main() {
  await reset();

  await scenario('storage key is exact', async () => {
    const t = await createWorkoutTemplate({ name: 'Push' });
    assert(store.has(WORKOUT_TEMPLATES_KEY), 'template key missing');
    assert(t.id.startsWith('wt_'), 'template id missing prefix');
  });
  await scenario('creation trims name', async () => {
    const t = await createWorkoutTemplate({ name: '  Pull  ' });
    assert(t.name === 'Pull', 'name not trimmed');
  });
  await scenario('creation stores description', async () => {
    const t = await createWorkoutTemplate({ name: 'Legs', description: 'Heavy lower body' });
    assert(t.description === 'Heavy lower body', 'description missing');
  });
  await scenario('creation stores favorite', async () => {
    const t = await createWorkoutTemplate({ name: 'Fav', isFavorite: true });
    assert(t.isFavorite === true, 'favorite missing');
  });
  await scenario('creation stores exercises', async () => {
    const t = await createWorkoutTemplate({ name: 'Chest', exercises: [{ exerciseId: 'bench', sets: [{ targetReps: 8, targetWeightKg: 60 }] }] });
    assert(t.exercises.length === 1 && t.exercises[0].exerciseId === 'bench', 'exercise missing');
  });
  await scenario('creation generates template exercise id', async () => {
    const t = await createWorkoutTemplate({ name: 'Ids', exercises: [{ exerciseId: 'bench' }] });
    assert(t.exercises[0].id.startsWith('te_'), 'exercise id missing');
  });
  await scenario('creation generates set id', async () => {
    const t = await createWorkoutTemplate({ name: 'Sets', exercises: [{ exerciseId: 'bench' }] });
    assert(t.exercises[0].sets[0].id.startsWith('ts_'), 'set id missing');
  });
  await scenario('default exercise has one set', async () => {
    const t = await createWorkoutTemplate({ name: 'Default', exercises: [{ exerciseId: 'bench' }] });
    assert(t.exercises[0].sets.length === 1 && t.exercises[0].sets[0].setNumber === 1, 'default set incorrect');
  });
  await scenario('retrieval by id', async () => {
    const created = await createWorkoutTemplate({ name: 'Retrieve' });
    const found = await getWorkoutTemplate(created.id);
    assert(found?.id === created.id, 'retrieval failed');
  });
  await scenario('retrieval returns a clone', async () => {
    const created = await createWorkoutTemplate({ name: 'Clone', exercises: [{ exerciseId: 'a' }] });
    const found = await getWorkoutTemplate(created.id);
    found!.exercises[0].exerciseId = 'mutated';
    const again = await getWorkoutTemplate(created.id);
    assert(again!.exercises[0].exerciseId === 'a', 'storage reference leaked');
  });
  await scenario('list returns templates', async () => {
    const list = await getWorkoutTemplates();
    assert(list.length > 0, 'list empty');
  });
  await scenario('favorites sort first', async () => {
    await createWorkoutTemplate({ name: 'ZZZ' });
    await createWorkoutTemplate({ name: 'AAA', isFavorite: true });
    const list = await getWorkoutTemplates();
    assert(list[0].isFavorite, 'favorite not prioritized');
  });
  await scenario('update name', async () => {
    const t = await createWorkoutTemplate({ name: 'Old' });
    const next = await updateWorkoutTemplate(t.id, { name: 'New' });
    assert(next.name === 'New', 'update name failed');
  });
  await scenario('update description', async () => {
    const t = await createWorkoutTemplate({ name: 'Desc' });
    const next = await updateWorkoutTemplate(t.id, { description: 'Details' });
    assert(next.description === 'Details', 'update description failed');
  });
  await scenario('update clears description', async () => {
    const t = await createWorkoutTemplate({ name: 'Desc2', description: 'Details' });
    const next = await updateWorkoutTemplate(t.id, { description: ' ' });
    assert(next.description === undefined, 'description not cleared');
  });
  await scenario('update favorite metadata', async () => {
    const t = await createWorkoutTemplate({ name: 'Fav2' });
    const next = await updateWorkoutTemplate(t.id, { isFavorite: true });
    assert(next.isFavorite, 'favorite update failed');
  });
  await scenario('delete template', async () => {
    const t = await createWorkoutTemplate({ name: 'Delete' });
    await deleteWorkoutTemplate(t.id);
    assert(await getWorkoutTemplate(t.id) === null, 'delete failed');
  });
  await scenario('delete missing template is safe', async () => {
    await deleteWorkoutTemplate('missing-template');
    assert(true, 'unexpected failure');
  });
  await scenario('duplicate creates a new id', async () => {
    const t = await createWorkoutTemplate({ name: 'Duplicate', exercises: [{ exerciseId: 'a', sets: [{ targetReps: 5 }] }] });
    const copy = await duplicateWorkoutTemplate(t.id);
    assert(copy.id !== t.id && copy.name === 'Duplicate Copy', 'duplicate identity failed');
  });
  await scenario('duplicate deep copies exercises', async () => {
    const t = await createWorkoutTemplate({ name: 'Deep', exercises: [{ exerciseId: 'a' }] });
    const copy = await duplicateWorkoutTemplate(t.id);
    assert(copy.exercises[0].id !== t.exercises[0].id, 'exercise id shared');
    assert(copy.exercises[0].sets[0].id !== t.exercises[0].sets[0].id, 'set id shared');
  });
  await scenario('duplicate does not favorite', async () => {
    const t = await createWorkoutTemplate({ name: 'FavDup', isFavorite: true });
    const copy = await duplicateWorkoutTemplate(t.id);
    assert(!copy.isFavorite, 'duplicate favorite leaked');
  });
  await scenario('toggle favorite on', async () => {
    const t = await createWorkoutTemplate({ name: 'ToggleOn' });
    const next = await toggleWorkoutTemplateFavorite(t.id);
    assert(next.isFavorite, 'toggle on failed');
  });
  await scenario('toggle favorite off', async () => {
    const t = await createWorkoutTemplate({ name: 'ToggleOff', isFavorite: true });
    const next = await toggleWorkoutTemplateFavorite(t.id);
    assert(!next.isFavorite, 'toggle off failed');
  });
  await scenario('search by name', async () => {
    await createWorkoutTemplate({ name: 'Upper Power' });
    const results = await searchWorkoutTemplates('upper');
    assert(results.some((item) => item.name === 'Upper Power'), 'name search failed');
  });
  await scenario('search by description', async () => {
    await createWorkoutTemplate({ name: 'Named', description: 'Saturday strength' });
    const results = await searchWorkoutTemplates('saturday');
    assert(results.some((item) => item.name === 'Named'), 'description search failed');
  });
  await scenario('search is case insensitive', async () => {
    const results = await searchWorkoutTemplates('SATURDAY');
    assert(results.some((item) => item.name === 'Named'), 'case insensitive search failed');
  });
  await scenario('search trims query', async () => {
    const results = await getWorkoutTemplates('  upper  ');
    assert(results.some((item) => item.name === 'Upper Power'), 'trimmed search failed');
  });
  await scenario('persistence round trip', async () => {
    const t = await createWorkoutTemplate({ name: 'Persist', exercises: [{ exerciseId: 'a', sets: [{ targetReps: 12, targetWeightKg: 20 }] }] });
    const raw = JSON.parse(store.get(WORKOUT_TEMPLATES_KEY)!);
    store.set(WORKOUT_TEMPLATES_KEY, JSON.stringify(raw));
    const found = await getWorkoutTemplate(t.id);
    assert(found?.exercises[0].sets[0].targetWeightKg === 20, 'persistence failed');
  });
  await scenario('malformed root storage recovers', async () => {
    store.set(WORKOUT_TEMPLATES_KEY, '{broken');
    const list = await getWorkoutTemplates();
    assert(Array.isArray(list), 'malformed root crashed');
  });
  await scenario('malformed entries are ignored', async () => {
    store.set(WORKOUT_TEMPLATES_KEY, JSON.stringify([null, {}, { id: 'ok', name: 'Valid', exercises: [] }, { id: 'bad', name: '' }]));
    const list = await getWorkoutTemplates();
    assert(list.length === 1 && list[0].name === 'Valid', 'malformed entries not filtered');
  });
  await scenario('malformed set is ignored safely', async () => {
    store.set(WORKOUT_TEMPLATES_KEY, JSON.stringify([{ id: 't', name: 'Safe', exercises: [{ id: 'e', exerciseId: 'a', order: 0, sets: [{ id: 's', setNumber: 1, targetWeightKg: null }, { id: 'bad', setNumber: 2, targetWeightKg: 'NaN' }] }] }]));
    const t = await getWorkoutTemplate('t');
    assert(t?.exercises[0].sets.length === 1, 'bad set survived');
  });
  await scenario('invalid empty name rejected', async () => {
    let rejected = false;
    try { await createWorkoutTemplate({ name: '   ' }); } catch { rejected = true; }
    assert(rejected, 'empty name accepted');
  });
  await scenario('invalid exercise id rejected', async () => {
    let rejected = false;
    try { await createWorkoutTemplate({ name: 'Bad Exercise', exercises: [{ exerciseId: '   ' }] }); } catch { rejected = true; }
    assert(rejected, 'empty exercise id accepted');
  });
  await scenario('NaN reps rejected', async () => {
    let rejected = false;
    try { await createWorkoutTemplate({ name: 'Bad', exercises: [{ exerciseId: 'a', sets: [{ targetReps: Number.NaN }] }] }); } catch { rejected = true; }
    assert(rejected, 'NaN reps accepted');
  });
  await scenario('Infinity weight rejected', async () => {
    let rejected = false;
    try { await createWorkoutTemplate({ name: 'Bad', exercises: [{ exerciseId: 'a', sets: [{ targetWeightKg: Number.POSITIVE_INFINITY }] }] }); } catch { rejected = true; }
    assert(rejected, 'Infinity weight accepted');
  });
  await scenario('negative duration rejected', async () => {
    let rejected = false;
    try { await createWorkoutTemplate({ name: 'Bad', exercises: [{ exerciseId: 'a', sets: [{ targetDurationSeconds: -1 }] }] }); } catch { rejected = true; }
    assert(rejected, 'negative duration accepted');
  });
  await scenario('negative distance rejected', async () => {
    let rejected = false;
    try { await createWorkoutTemplate({ name: 'Bad', exercises: [{ exerciseId: 'a', sets: [{ targetDistanceKm: -1 }] }] }); } catch { rejected = true; }
    assert(rejected, 'negative distance accepted');
  });
  await scenario('negative rest rejected', async () => {
    let rejected = false;
    try { await createWorkoutTemplate({ name: 'Bad', exercises: [{ exerciseId: 'a', sets: [{ restSeconds: -1 }] }] }); } catch { rejected = true; }
    assert(rejected, 'negative rest accepted');
  });
  await scenario('zero targets are allowed', async () => {
    const t = await createWorkoutTemplate({ name: 'Zeros', exercises: [{ exerciseId: 'a', sets: [{ targetReps: 0, targetWeightKg: 0, targetDurationSeconds: 0, targetDistanceKm: 0, restSeconds: 0 }] }] });
    assert(t.exercises[0].sets[0].targetReps === 0, 'zero reps rejected');
  });
  await scenario('add exercise', async () => {
    const t = await createWorkoutTemplate({ name: 'Exercise Add' });
    const next = await addTemplateExercise(t.id, { exerciseId: 'squat' });
    assert(next.exercises.length === 1 && next.exercises[0].exerciseId === 'squat', 'add exercise failed');
  });
  await scenario('add exercise has deterministic order', async () => {
    const t = await createWorkoutTemplate({ name: 'Order Add' });
    await addTemplateExercise(t.id, { exerciseId: 'a' });
    const b = await addTemplateExercise(t.id, { exerciseId: 'b' });
    assert(b.exercises[0].order === 0 && b.exercises[1].order === 1, 'exercise order failed');
  });
  await scenario('update exercise reference', async () => {
    const t = await createWorkoutTemplate({ name: 'Exercise Update', exercises: [{ exerciseId: 'a' }] });
    const id = t.exercises[0].id;
    const next = await updateTemplateExercise(t.id, id, { exerciseId: 'b' });
    assert(next.exercises[0].exerciseId === 'b', 'exercise update failed');
  });
  await scenario('update exercise order', async () => {
    const t = await createWorkoutTemplate({ name: 'Order Update', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }] });
    const id = t.exercises[1].id;
    const next = await updateTemplateExercise(t.id, id, { order: 0 });
    assert(next.exercises[0].exerciseId === 'b', 'order update failed');
  });
  await scenario('remove exercise', async () => {
    const t = await createWorkoutTemplate({ name: 'Exercise Remove', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }] });
    const next = await removeTemplateExercise(t.id, t.exercises[0].id);
    assert(next.exercises.length === 1 && next.exercises[0].exerciseId === 'b', 'remove exercise failed');
  });
  await scenario('move exercise down', async () => {
    const t = await createWorkoutTemplate({ name: 'Move Down', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }, { exerciseId: 'c' }] });
    const next = await moveTemplateExercise(t.id, t.exercises[0].id, 1);
    assert(next.exercises[1].exerciseId === 'a', 'move down failed');
  });
  await scenario('move exercise up', async () => {
    const t = await createWorkoutTemplate({ name: 'Move Up', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }, { exerciseId: 'c' }] });
    const next = await moveTemplateExercise(t.id, t.exercises[2].id, -1);
    assert(next.exercises[1].exerciseId === 'c', 'move up failed');
  });
  await scenario('move at boundary is safe', async () => {
    const t = await createWorkoutTemplate({ name: 'Boundary', exercises: [{ exerciseId: 'a' }] });
    const next = await moveTemplateExercise(t.id, t.exercises[0].id, -1);
    assert(next.exercises[0].exerciseId === 'a', 'boundary move changed');
  });
  await scenario('add set', async () => {
    const t = await createWorkoutTemplate({ name: 'Set Add', exercises: [{ exerciseId: 'a' }] });
    const next = await addTemplateSet(t.id, t.exercises[0].id, { targetReps: 8 });
    assert(next.exercises[0].sets.length === 2 && next.exercises[0].sets[1].setNumber === 2, 'add set failed');
  });
  await scenario('update set reps', async () => {
    const t = await createWorkoutTemplate({ name: 'Set Update', exercises: [{ exerciseId: 'a' }] });
    const sid = t.exercises[0].sets[0].id;
    const next = await updateTemplateSet(t.id, t.exercises[0].id, sid, { targetReps: 15 });
    assert(next.exercises[0].sets[0].targetReps === 15, 'set update failed');
  });
  await scenario('update set weight', async () => {
    const t = await createWorkoutTemplate({ name: 'Set Weight', exercises: [{ exerciseId: 'a' }] });
    const sid = t.exercises[0].sets[0].id;
    const next = await updateTemplateSet(t.id, t.exercises[0].id, sid, { targetWeightKg: 42.5 });
    assert(next.exercises[0].sets[0].targetWeightKg === 42.5, 'weight update failed');
  });
  await scenario('update set duration', async () => {
    const t = await createWorkoutTemplate({ name: 'Set Duration', exercises: [{ exerciseId: 'a' }] });
    const sid = t.exercises[0].sets[0].id;
    const next = await updateTemplateSet(t.id, t.exercises[0].id, sid, { targetDurationSeconds: 45 });
    assert(next.exercises[0].sets[0].targetDurationSeconds === 45, 'duration update failed');
  });
  await scenario('update set distance', async () => {
    const t = await createWorkoutTemplate({ name: 'Set Distance', exercises: [{ exerciseId: 'a' }] });
    const sid = t.exercises[0].sets[0].id;
    const next = await updateTemplateSet(t.id, t.exercises[0].id, sid, { targetDistanceKm: 2.5 });
    assert(next.exercises[0].sets[0].targetDistanceKm === 2.5, 'distance update failed');
  });
  await scenario('update set rest', async () => {
    const t = await createWorkoutTemplate({ name: 'Set Rest', exercises: [{ exerciseId: 'a' }] });
    const sid = t.exercises[0].sets[0].id;
    const next = await updateTemplateSet(t.id, t.exercises[0].id, sid, { restSeconds: 120 });
    assert(next.exercises[0].sets[0].restSeconds === 120, 'rest update failed');
  });
  await scenario('remove set', async () => {
    const t = await createWorkoutTemplate({ name: 'Set Remove', exercises: [{ exerciseId: 'a', sets: [{ targetReps: 5 }, { targetReps: 6 }, { targetReps: 7 }] }] });
    const next = await removeTemplateSet(t.id, t.exercises[0].id, t.exercises[0].sets[1].id);
    assert(next.exercises[0].sets.length === 2 && next.exercises[0].sets[1].setNumber === 2, 'remove set failed');
  });
  await scenario('set numbering repairs gaps', async () => {
    const t = await createWorkoutTemplate({ name: 'Gap', exercises: [{ exerciseId: 'a', sets: [{ setNumber: 9 }, { setNumber: 3 }] }] });
    assert(t.exercises[0].sets[0].setNumber === 1 && t.exercises[0].sets[1].setNumber === 2, 'set gap not normalized');
  });
  await scenario('set ordering is deterministic', async () => {
    const t = await createWorkoutTemplate({ name: 'Set Order', exercises: [{ exerciseId: 'a', sets: [{ setNumber: 3 }, { setNumber: 1 }, { setNumber: 2 }] }] });
    assert(t.exercises[0].sets.map((s) => s.setNumber).join(',') === '1,2,3', 'set order wrong');
  });
  await scenario('exercise ordering is deterministic after update', async () => {
    const t = await createWorkoutTemplate({ name: 'Ex Order', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }, { exerciseId: 'c' }] });
    const next = await updateTemplateExercise(t.id, t.exercises[0].id, { order: 2 });
    assert(next.exercises.map((e) => e.order).join(',') === '0,1,2', 'orders not normalized');
  });
  await scenario('concurrent template creates preserve all writes', async () => {
    await reset();
    const created = await Promise.all(Array.from({ length: 8 }, (_, i) => createWorkoutTemplate({ name: `Concurrent ${i}` })));
    const list = await getWorkoutTemplates();
    assert(list.length === created.length, `concurrent create lost writes: ${list.length}`);
  });
  await scenario('concurrent exercise adds preserve all writes', async () => {
    await reset();
    const t = await createWorkoutTemplate({ name: 'Concurrent Exercises' });
    await Promise.all(['a', 'b', 'c', 'd', 'e'].map((exerciseId) => addTemplateExercise(t.id, { exerciseId })));
    const next = await getWorkoutTemplate(t.id);
    assert(next!.exercises.length === 5, 'concurrent exercise add lost writes');
  });
  await scenario('concurrent set adds preserve all writes', async () => {
    await reset();
    const t = await createWorkoutTemplate({ name: 'Concurrent Sets', exercises: [{ exerciseId: 'a' }] });
    const eid = t.exercises[0].id;
    await Promise.all(Array.from({ length: 5 }, () => addTemplateSet(t.id, eid, { targetReps: 5 })));
    const next = await getWorkoutTemplate(t.id);
    assert(next!.exercises[0].sets.length === 6, 'concurrent set add lost writes');
  });
  await scenario('missing exercise reference is preserved', async () => {
    const t = await createWorkoutTemplate({ name: 'Missing Ref', exercises: [{ exerciseId: 'removed-exercise' }] });
    const found = await getWorkoutTemplate(t.id);
    assert(found!.exercises[0].exerciseId === 'removed-exercise', 'missing reference was deleted');
  });
  await scenario('builder-compatible template can be created', async () => {
    const draft = await createWorkout({ name: 'Builder Draft', exercises: [{ exerciseId: 'bench', setsTarget: 3, repsTarget: 10, weightTarget: 50, restSeconds: 90 }] });
    const template = await createWorkoutTemplate({ name: draft.name, exercises: draft.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: Array.from({ length: e.setsTarget }, (_, i) => ({ setNumber: i + 1, targetReps: e.repsTarget, targetWeightKg: e.weightTarget, restSeconds: e.restSeconds })) })) });
    assert(template.exercises[0].sets.length === 3, 'builder definition did not become template');
  });
  await scenario('pure session snapshot has independent session id', async () => {
    const t = await createWorkoutTemplate({ name: 'Snapshot', exercises: [{ exerciseId: 'bench', sets: [{ targetReps: 10, targetWeightKg: 20 }] }] });
    const session = createWorkoutSessionFromTemplate(t);
    assert(session.id !== t.id && session.status === 'in_progress', 'snapshot identity/status wrong');
  });
  await scenario('snapshot copies template name', async () => {
    const t = await createWorkoutTemplate({ name: 'Snapshot Name' });
    const session = createWorkoutSessionFromTemplate(t);
    assert(session.name === 'Snapshot Name', 'snapshot name missing');
  });
  await scenario('snapshot copies exercise ids and order', async () => {
    const t = await createWorkoutTemplate({ name: 'Snapshot Order', exercises: [{ exerciseId: 'a' }, { exerciseId: 'b' }] });
    const session = createWorkoutSessionFromTemplate(t);
    assert(session.exercises.map((e) => e.exerciseId).join(',') === 'a,b', 'snapshot order wrong');
  });
  await scenario('snapshot copies planned reps and weight', async () => {
    const t = await createWorkoutTemplate({ name: 'Snapshot Targets', exercises: [{ exerciseId: 'a', sets: [{ targetReps: 8, targetWeightKg: 70 }] }] });
    const session = createWorkoutSessionFromTemplate(t);
    assert(session.exercises[0].sets[0].reps === 8 && session.exercises[0].sets[0].weightKg === 70, 'snapshot targets missing');
  });
  await scenario('snapshot copies duration and distance', async () => {
    const t = await createWorkoutTemplate({ name: 'Snapshot Cardio', exercises: [{ exerciseId: 'run', sets: [{ targetDurationSeconds: 600, targetDistanceKm: 2 }] }] });
    const session = createWorkoutSessionFromTemplate(t);
    assert(session.exercises[0].sets[0].durationSeconds === 600 && session.exercises[0].sets[0].distanceKm === 2, 'snapshot cardio targets missing');
  });
  await scenario('snapshot creates new exercise ids', async () => {
    const t = await createWorkoutTemplate({ name: 'Snapshot Ids', exercises: [{ exerciseId: 'a' }] });
    const session = createWorkoutSessionFromTemplate(t);
    assert(session.exercises[0].id !== t.exercises[0].id, 'exercise object id shared');
  });
  await scenario('snapshot creates new set ids', async () => {
    const t = await createWorkoutTemplate({ name: 'Snapshot Set Ids', exercises: [{ exerciseId: 'a' }] });
    const session = createWorkoutSessionFromTemplate(t);
    assert(session.exercises[0].sets[0].id !== t.exercises[0].sets[0].id, 'set id shared');
  });
  await scenario('snapshot deep arrays are isolated', async () => {
    const t = await createWorkoutTemplate({ name: 'Deep Isolation', exercises: [{ exerciseId: 'a', sets: [{ targetReps: 10 }] }] });
    const session = createWorkoutSessionFromTemplate(t);
    session.exercises[0].sets[0].reps = 99;
    assert(t.exercises[0].sets[0].targetReps === 10, 'template changed from snapshot mutation');
  });
  await scenario('start from template persists a new session', async () => {
    await reset();
    const t = await createWorkoutTemplate({ name: 'Start Template', exercises: [{ exerciseId: 'bench', sets: [{ targetReps: 10, targetWeightKg: 30 }] }] });
    const session = await startWorkoutFromTemplate(t.id);
    assert((await getWorkoutSession(session.id))?.name === 'Start Template', 'session not persisted');
  });
  await scenario('start from template preserves planned sets', async () => {
    const existing = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    if (existing) await completeWorkout(existing.id);
    const t = await createWorkoutTemplate({ name: 'Planned Sets', exercises: [{ exerciseId: 'bench', sets: [{ targetReps: 5 }, { targetReps: 8 }] }] });
    const session = await startWorkoutFromTemplate(t.id);
    assert(session.exercises[0].sets.length === 2 && session.exercises[0].sets[1].reps === 8, 'planned sets not persisted');
  });
  await scenario('template modification does not change session', async () => {
    const existing = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    if (existing) await completeWorkout(existing.id);
    const t = await createWorkoutTemplate({ name: 'Isolation Template', exercises: [{ exerciseId: 'bench', sets: [{ targetReps: 10, targetWeightKg: 20 }] }] });
    const session = await startWorkoutFromTemplate(t.id);
    await updateWorkoutTemplate(t.id, { name: 'Changed', exercises: [{ exerciseId: 'squat', sets: [{ targetReps: 3, targetWeightKg: 100 }] }] });
    const stored = await getWorkoutSession(session.id);
    assert(stored!.name === 'Isolation Template' && stored!.exercises[0].exerciseId === 'bench', 'session changed with template');
  });
  await scenario('session modification does not change template', async () => {
    const existing = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    if (existing) await completeWorkout(existing.id);
    const t = await createWorkoutTemplate({ name: 'Reverse Isolation', exercises: [{ exerciseId: 'bench', sets: [{ targetReps: 10, targetWeightKg: 20 }] }] });
    const session = await startWorkoutFromTemplate(t.id);
    await updateWorkoutSession(session.id, { name: 'Session Edited', exercises: session.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, reps: 1 })) })) });
    const stored = await getWorkoutTemplate(t.id);
    assert(stored!.name === 'Reverse Isolation' && stored!.exercises[0].sets[0].targetReps === 10, 'template changed with session');
  });
  await scenario('deleting template preserves session', async () => {
    const existing = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    if (existing) await completeWorkout(existing.id);
    const t = await createWorkoutTemplate({ name: 'Delete Isolation', exercises: [{ exerciseId: 'bench' }] });
    const session = await startWorkoutFromTemplate(t.id);
    await deleteWorkoutTemplate(t.id);
    assert((await getWorkoutSession(session.id)) !== null, 'session deleted with template');
  });
  await scenario('favorite metadata does not affect session', async () => {
    const existing = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    if (existing) await completeWorkout(existing.id);
    const t = await createWorkoutTemplate({ name: 'Favorite Isolation' });
    const session = await startWorkoutFromTemplate(t.id);
    await toggleWorkoutTemplateFavorite(t.id);
    assert((await getWorkoutSession(session.id))!.name === 'Favorite Isolation', 'favorite affected session');
  });
  await scenario('second active template start is rejected', async () => {
    await reset();
    const a = await createWorkoutTemplate({ name: 'A' });
    const b = await createWorkoutTemplate({ name: 'B' });
    await startWorkoutFromTemplate(a.id);
    let rejected = false;
    try { await startWorkoutFromTemplate(b.id); } catch { rejected = true; }
    assert(rejected, 'duplicate active session allowed');
  });
  await scenario('completed first session allows another template', async () => {
    const sessions = await getWorkoutSessions();
    const active = sessions.find((s) => s.status === 'in_progress');
    assert(active, 'active session missing');
    await completeWorkout(active!.id);
    const templates = await getWorkoutTemplates();
    const nextTemplate = templates.find((t) => t.name === 'B')!;
    const next = await startWorkoutFromTemplate(nextTemplate.id);
    assert(next.status === 'in_progress', 'second start failed');
  });
  await scenario('multiple templates remain independent', async () => {
    const a = await createWorkoutTemplate({ name: 'Multi A' });
    const b = await createWorkoutTemplate({ name: 'Multi B' });
    await updateWorkoutTemplate(a.id, { description: 'A only' });
    assert((await getWorkoutTemplate(b.id))!.description === undefined, 'templates cross-mutated');
  });
  await scenario('multiple sessions remain independent', async () => {
    const active = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    if (active) await completeWorkout(active.id);
    const a = await createWorkoutTemplate({ name: 'Session A' });
    const b = await createWorkoutTemplate({ name: 'Session B' });
    const sa = await startWorkoutFromTemplate(a.id);
    await completeWorkout(sa.id);
    const sb = await startWorkoutFromTemplate(b.id);
    assert(sa.id !== sb.id, 'sessions shared id');
  });
  await scenario('Phase 2A session set update still works', async () => {
    const existing = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    if (existing) await completeWorkout(existing.id);
    const active = await createWorkoutSession({ name: 'Phase 2A Regression', exercises: [{ exerciseId: 'bench', setsTarget: 1, repsTarget: 8, weightTarget: 20, restSeconds: 60 }] });
    const exerciseId = active.exercises[0]?.id;
    if (!exerciseId) throw new Error('active session exercise missing');
    const updated = await addWorkoutSet(active.id, exerciseId);
    const set = updated.exercises[0].sets.at(-1)!;
    const completed = await completeWorkoutSet(updated.id, updated.exercises[0].id, set.id, { reps: 10, weightKg: 25 });
    assert(completed.workout.exercises[0].sets.at(-1)!.completed, 'Phase 2A set completion regressed');
  });
  await scenario('Phase 2A volume still works', async () => {
    const active = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    assert(calculateWorkoutVolume(active!) >= 0, 'Phase 2A volume failed');
  });
  await scenario('Phase 2A completion still works', async () => {
    const active = (await getWorkoutSessions()).find((s) => s.status === 'in_progress');
    const completed = await completeWorkout(active!.id);
    assert(completed.status === 'completed' && completed.completedAt, 'Phase 2A completion regressed');
  });
  await scenario('historical session remains after template deletion and completion', async () => {
    const list = await getWorkoutSessions();
    assert(list.some((s) => s.status === 'completed'), 'historical completed session missing');
  });
  await scenario('raw template storage remains valid JSON', async () => {
    const raw = await loadData<unknown>(WORKOUT_TEMPLATES_KEY, null);
    assert(Array.isArray(raw), 'template storage not an array');
  });

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

void main();
