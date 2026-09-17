import { loadData, saveData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import { createWorkoutSessionSnapshot } from '@/services/workouts';
import type {
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  WorkoutSession,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutTemplateExerciseInput,
  WorkoutTemplateSet,
  WorkoutTemplateSetInput,
  CreateWorkoutProgramInput,
  UpdateWorkoutProgramInput,
  WorkoutProgram,
  WorkoutProgramSchedule,
  WorkoutProgramScheduleInput,
} from '@/types/workout';

export const WORKOUT_TEMPLATES_KEY = 'lifeos:workouts:templates';

let storageQueue: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateOptionalNonNegative(value: number | null | undefined, label: string) {
  if (value == null) return;
  if (!finite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

function validateSetNumber(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Set number must be a positive integer');
  }
}

function validateExerciseId(exerciseId: string) {
  if (typeof exerciseId !== 'string' || exerciseId.trim().length === 0) {
    throw new Error('Exercise id is required');
  }
}

function validateTemplateSetInput(input: WorkoutTemplateSetInput) {
  if (input.setNumber != null) validateSetNumber(input.setNumber);
  validateOptionalNonNegative(input.targetReps, 'Target reps');
  validateOptionalNonNegative(input.targetWeightKg, 'Target weight');
  validateOptionalNonNegative(input.targetDurationSeconds, 'Target duration');
  validateOptionalNonNegative(input.targetDistanceKm, 'Target distance');
  validateOptionalNonNegative(input.restSeconds, 'Rest');
}

function validateTemplateExerciseInput(input: WorkoutTemplateExerciseInput) {
  validateExerciseId(input.exerciseId);
  if (input.sets) input.sets.forEach(validateTemplateSetInput);
}

function normalizeSet(raw: unknown, index: number): WorkoutTemplateSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<WorkoutTemplateSet>;
  const setNumber = Number(source.setNumber);
  if (!Number.isInteger(setNumber) || setNumber <= 0) return null;
  const values = {
    targetReps: source.targetReps ?? null,
    targetWeightKg: source.targetWeightKg ?? null,
    targetDurationSeconds: source.targetDurationSeconds ?? null,
    targetDistanceKm: source.targetDistanceKm ?? null,
    restSeconds: source.restSeconds ?? null,
  };
  if (
    [values.targetReps, values.targetWeightKg, values.targetDurationSeconds, values.targetDistanceKm, values.restSeconds]
      .some((value) => value != null && (!finite(value) || value < 0))
  ) return null;
  return {
    id: typeof source.id === 'string' ? source.id : uid('ts_'),
    setNumber,
    ...values,
  };
}

function normalizeExercise(raw: unknown, index: number): WorkoutTemplateExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<WorkoutTemplateExercise>;
  if (typeof source.id !== 'string' || typeof source.exerciseId !== 'string' || source.exerciseId.trim() === '') return null;
  const order = Number(source.order);
  const sets = Array.isArray(source.sets)
    ? source.sets.map((set, i) => normalizeSet(set, i)).filter((set): set is WorkoutTemplateSet => !!set)
    : [];
  if (!Number.isInteger(order) || order < 0) return null;
  const sortedSets = sets
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((set, i) => ({ ...set, setNumber: i + 1 }));
  return {
    id: source.id,
    exerciseId: source.exerciseId.trim(),
    order,
    sets: sortedSets,
  };
}

function normalizeTemplate(raw: unknown): WorkoutTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<WorkoutTemplate>;
  if (typeof source.id !== 'string' || typeof source.name !== 'string' || source.name.trim() === '') return null;
  if (source.description != null && typeof source.description !== 'string') return null;
  const exercises = Array.isArray(source.exercises)
    ? source.exercises.map((exercise, i) => normalizeExercise(exercise, i)).filter((e): e is WorkoutTemplateExercise => !!e)
    : [];
  exercises.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  exercises.forEach((exercise, index) => { exercise.order = index; });
  const createdAt = typeof source.createdAt === 'string' ? source.createdAt : nowIso();
  return {
    id: source.id,
    name: source.name.trim(),
    ...(source.description?.trim() ? { description: source.description.trim() } : {}),
    exercises,
    isFavorite: source.isFavorite === true,
    createdAt,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : createdAt,
  };
}

async function readTemplates(): Promise<WorkoutTemplate[]> {
  const raw = await loadData<unknown>(WORKOUT_TEMPLATES_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeTemplate).filter((template): template is WorkoutTemplate => !!template);
}

async function writeTemplates(templates: WorkoutTemplate[]) {
  await saveData(WORKOUT_TEMPLATES_KEY, templates);
}

function locked<T>(operation: () => Promise<T>): Promise<T> {
  const previous = storageQueue;
  let release!: () => void;
  storageQueue = new Promise<void>((resolve) => { release = resolve; });
  return previous.then(operation).finally(release);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeSet(input: WorkoutTemplateSetInput, setNumber: number): WorkoutTemplateSet {
  validateSetNumber(setNumber);
  validateTemplateSetInput(input);
  return {
    id: uid('ts_'),
    setNumber,
    targetReps: input.targetReps ?? null,
    targetWeightKg: input.targetWeightKg ?? null,
    targetDurationSeconds: input.targetDurationSeconds ?? null,
    targetDistanceKm: input.targetDistanceKm ?? null,
    restSeconds: input.restSeconds ?? null,
  };
}

function makeExercise(input: WorkoutTemplateExerciseInput, order: number): WorkoutTemplateExercise {
  validateTemplateExerciseInput(input);
  const sets = (input.sets?.length ? input.sets : [{}]).map((set, index) => makeSet(set, index + 1));
  return { id: uid('te_'), exerciseId: input.exerciseId.trim(), order, sets };
}

function normalizeForWrite(template: WorkoutTemplate): WorkoutTemplate {
  const normalized = normalizeTemplate(template);
  if (!normalized) throw new Error('Invalid workout template');
  return normalized;
}

export async function getWorkoutTemplates(query?: string): Promise<WorkoutTemplate[]> {
  const templates = await readTemplates();
  const q = query?.trim().toLowerCase() ?? '';
  return templates
    .filter((template) => !q || template.name.toLowerCase().includes(q) || (template.description ?? '').toLowerCase().includes(q))
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name));
}

export async function searchWorkoutTemplates(query: string): Promise<WorkoutTemplate[]> {
  return getWorkoutTemplates(query);
}

export async function getWorkoutTemplate(id: string): Promise<WorkoutTemplate | null> {
  const template = (await readTemplates()).find((item) => item.id === id);
  return template ? clone(template) : null;
}

export async function createWorkoutTemplate(input: CreateWorkoutTemplateInput): Promise<WorkoutTemplate> {
  return locked(async () => {
    if (typeof input.name !== 'string' || input.name.trim() === '') throw new Error('Template name is required');
    const createdAt = nowIso();
    const template: WorkoutTemplate = {
      id: uid('wt_'),
      name: input.name.trim(),
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
      exercises: (input.exercises ?? []).map((exercise, index) => makeExercise(exercise, index)),
      isFavorite: input.isFavorite === true,
      createdAt,
      updatedAt: createdAt,
    };
    const list = await readTemplates();
    await writeTemplates([template, ...list]);
    return clone(template);
  });
}

export async function updateWorkoutTemplate(id: string, patch: UpdateWorkoutTemplateInput): Promise<WorkoutTemplate> {
  return locked(async () => {
    const list = await readTemplates();
    const current = list.find((template) => template.id === id);
    if (!current) throw new Error('Workout template not found');
    if (patch.name !== undefined && (!patch.name.trim())) throw new Error('Template name is required');
    if (patch.exercises) patch.exercises.forEach(validateTemplateExerciseInput);
    const next: WorkoutTemplate = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? (patch.description.trim() ? { description: patch.description.trim() } : { description: undefined }) : {}),
      ...(patch.isFavorite !== undefined ? { isFavorite: patch.isFavorite } : {}),
      ...(patch.exercises !== undefined ? { exercises: patch.exercises.map((exercise, index) => makeExercise(exercise, index)) } : {}),
      updatedAt: nowIso(),
    };
    const normalized = normalizeForWrite(next);
    await writeTemplates(list.map((template) => template.id === id ? normalized : template));
    return clone(normalized);
  });
}

export async function deleteWorkoutTemplate(id: string): Promise<void> {
  return locked(async () => {
    const list = await readTemplates();
    await writeTemplates(list.filter((template) => template.id !== id));
  });
}

export async function duplicateWorkoutTemplate(id: string): Promise<WorkoutTemplate> {
  return locked(async () => {
    const list = await readTemplates();
    const source = list.find((template) => template.id === id);
    if (!source) throw new Error('Workout template not found');
    const createdAt = nowIso();
    const duplicate: WorkoutTemplate = {
      ...clone(source),
      id: uid('wt_'),
      name: `${source.name} Copy`,
      isFavorite: false,
      createdAt,
      updatedAt: createdAt,
      exercises: clone(source.exercises).map((exercise) => ({
        ...exercise,
        id: uid('te_'),
        sets: exercise.sets.map((set) => ({ ...set, id: uid('ts_') })),
      })),
    };
    await writeTemplates([duplicate, ...list]);
    return clone(duplicate);
  });
}

export async function toggleWorkoutTemplateFavorite(id: string): Promise<WorkoutTemplate> {
  return mutateTemplate(id, (current) => ({ ...current, isFavorite: !current.isFavorite, updatedAt: nowIso() }));
}

async function mutateTemplate(id: string, mutator: (template: WorkoutTemplate) => WorkoutTemplate): Promise<WorkoutTemplate> {
  return locked(async () => {
    const list = await readTemplates();
    const current = list.find((template) => template.id === id);
    if (!current) throw new Error('Workout template not found');
    const next = normalizeForWrite(mutator(clone(current)));
    await writeTemplates(list.map((template) => template.id === id ? next : template));
    return clone(next);
  });
}

export async function addTemplateExercise(id: string, input: WorkoutTemplateExerciseInput): Promise<WorkoutTemplate> {
  validateTemplateExerciseInput(input);
  return mutateTemplate(id, (current) => ({
    ...current,
    exercises: [...current.exercises, makeExercise(input, current.exercises.length)],
    updatedAt: nowIso(),
  }));
}

export async function updateTemplateExercise(id: string, exerciseId: string, patch: Partial<Pick<WorkoutTemplateExercise, 'exerciseId' | 'order'>>): Promise<WorkoutTemplate> {
  if (patch.exerciseId !== undefined) validateExerciseId(patch.exerciseId);
  if (patch.order !== undefined && (!Number.isInteger(patch.order) || patch.order < 0)) throw new Error('Exercise order must be a non-negative integer');
  return mutateTemplate(id, (current) => {
    const exercises = current.exercises.slice().sort((a, b) => a.order - b.order);
    const index = exercises.findIndex((exercise) => exercise.id === exerciseId);
    if (index < 0) throw new Error('Template exercise not found');
    if (patch.exerciseId !== undefined) exercises[index].exerciseId = patch.exerciseId.trim();
    if (patch.order !== undefined) {
      const [moved] = exercises.splice(index, 1);
      const target = Math.min(Math.max(0, patch.order), exercises.length);
      exercises.splice(target, 0, moved);
    }
    exercises.forEach((exercise, position) => { exercise.order = position; });
    return { ...current, exercises, updatedAt: nowIso() };
  });
}

export async function removeTemplateExercise(id: string, exerciseId: string): Promise<WorkoutTemplate> {
  return mutateTemplate(id, (current) => ({
    ...current,
    exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId),
    updatedAt: nowIso(),
  }));
}

export async function moveTemplateExercise(id: string, exerciseId: string, direction: -1 | 1): Promise<WorkoutTemplate> {
  return mutateTemplate(id, (current) => {
    const exercises = current.exercises.slice().sort((a, b) => a.order - b.order);
    const index = exercises.findIndex((exercise) => exercise.id === exerciseId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= exercises.length) return current;
    [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
    exercises.forEach((exercise, position) => { exercise.order = position; });
    return { ...current, exercises, updatedAt: nowIso() };
  });
}

export async function addTemplateSet(id: string, exerciseId: string, input: WorkoutTemplateSetInput = {}): Promise<WorkoutTemplate> {
  validateTemplateSetInput(input);
  return mutateTemplate(id, (current) => {
    const exercise = current.exercises.find((item) => item.id === exerciseId);
    if (!exercise) throw new Error('Template exercise not found');
    exercise.sets.push(makeSet(input, exercise.sets.length + 1));
    return { ...current, updatedAt: nowIso() };
  });
}

export async function updateTemplateSet(id: string, exerciseId: string, setId: string, patch: WorkoutTemplateSetInput): Promise<WorkoutTemplate> {
  validateTemplateSetInput(patch);
  return mutateTemplate(id, (current) => {
    const exercise = current.exercises.find((item) => item.id === exerciseId);
    if (!exercise) throw new Error('Template exercise not found');
    if (!exercise.sets.some((set) => set.id === setId)) throw new Error('Template set not found');
    exercise.sets = exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set);
    return { ...current, updatedAt: nowIso() };
  });
}

export async function removeTemplateSet(id: string, exerciseId: string, setId: string): Promise<WorkoutTemplate> {
  return mutateTemplate(id, (current) => {
    const exercise = current.exercises.find((item) => item.id === exerciseId);
    if (!exercise) throw new Error('Template exercise not found');
    if (!exercise.sets.some((set) => set.id === setId)) throw new Error('Template set not found');
    exercise.sets = exercise.sets.filter((set) => set.id !== setId);
    return { ...current, updatedAt: nowIso() };
  });
}

/** Pure snapshot transformation. It shares no mutable arrays or objects with the template. */
export function createWorkoutSessionFromTemplate(template: WorkoutTemplate): WorkoutSession {
  if (!template || typeof template.name !== 'string' || template.name.trim() === '') throw new Error('Template name is required');
  const startedAt = nowIso();
  const createdAt = startedAt;
  const sessionId = uid('wo_');
  const exercises = clone(template.exercises)
    .sort((a, b) => a.order - b.order)
    .map((exercise, index) => ({
      id: uid('we_'),
      workoutId: sessionId,
      exerciseId: exercise.exerciseId,
      position: index,
      order: index,
      setsTarget: Math.max(1, exercise.sets.length),
      repsTarget: exercise.sets[0]?.targetReps ?? null,
      weightTarget: exercise.sets[0]?.targetWeightKg ?? null,
      restSeconds: exercise.sets[0]?.restSeconds ?? 90,
      notes: null,
      createdAt,
      sets: exercise.sets.map((set) => ({
        id: uid('set_'),
        workoutExerciseId: '',
        setNumber: set.setNumber,
        reps: set.targetReps ?? null,
        weight: set.targetWeightKg ?? null,
        weightKg: set.targetWeightKg ?? null,
        weightUnit: 'kg' as const,
        durationSeconds: set.targetDurationSeconds ?? null,
        distance: set.targetDistanceKm ?? null,
        distanceKm: set.targetDistanceKm ?? null,
        distanceUnit: 'km',
        rpe: null,
        completed: false,
        completedAt: null,
        createdAt,
      })),
    }));
  exercises.forEach((exercise) => exercise.sets.forEach((set) => { set.workoutExerciseId = exercise.id; }));
  return {
    id: sessionId,
    name: template.name.trim(),
    startedAt,
    status: 'in_progress',
    exercises,
    createdAt,
    updatedAt: createdAt,
  };
}

/** Creates and persists a fresh session snapshot from a template. */
export async function startWorkoutFromTemplate(id: string): Promise<WorkoutSession> {
  const template = await getWorkoutTemplate(id);
  if (!template) throw new Error('Workout template not found');
  const snapshot = createWorkoutSessionFromTemplate(template);
  return clone(await createWorkoutSessionSnapshot(snapshot));
}

// Convenience aliases matching the Phase 2B API wording.
export const addTemplate = createWorkoutTemplate;
export const editTemplate = updateWorkoutTemplate;
export const removeTemplate = deleteWorkoutTemplate;

export const WORKOUT_PROGRAMS_KEY = 'lifeos:workouts:programs';
let programQueue: Promise<void> = Promise.resolve();
const programClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const validDay = (d: number) => Number.isInteger(d) && d >= 0 && d <= 6;
const normalizeProgram = (raw: unknown): WorkoutProgram | null => {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<WorkoutProgram>;
  if (typeof s.id !== 'string' || typeof s.name !== 'string' || !s.name.trim()) return null;
  const schedule = Array.isArray(s.schedule) ? s.schedule.filter((x): x is WorkoutProgramSchedule => {
    if (!x || typeof x !== 'object') return false;
    const e = x as Partial<WorkoutProgramSchedule>;
    return typeof e.id === 'string' && validDay(Number(e.dayOfWeek)) && typeof e.templateId === 'string' && e.templateId.trim() !== '' && Number.isInteger(e.order) && Number(e.order) >= 0;
  }).map(x => ({ id:x.id, dayOfWeek:x.dayOfWeek, templateId:x.templateId.trim(), order:x.order, enabled:x.enabled !== false })) : [];
  schedule.sort((a,b) => a.dayOfWeek-b.dayOfWeek || a.order-b.order || a.id.localeCompare(b.id));
  return { id:s.id, name:s.name.trim(), ...(typeof s.description === 'string' && s.description.trim() ? {description:s.description.trim()} : {}), isActive:s.isActive === true, createdAt:typeof s.createdAt === 'string' ? s.createdAt : nowIso(), updatedAt:typeof s.updatedAt === 'string' ? s.updatedAt : nowIso(), schedule };
};
async function readPrograms() { const raw=await loadData<unknown>(WORKOUT_PROGRAMS_KEY, []); return Array.isArray(raw) ? raw.map(normalizeProgram).filter((x): x is WorkoutProgram=>!!x) : []; }
function programLocked<T>(op:()=>Promise<T>):Promise<T> { const prev=programQueue; let release!:()=>void; programQueue=new Promise(r=>{release=r}); return prev.then(op).finally(release); }
function normalizeSchedule(list: WorkoutProgramSchedule[]) { const sorted=programClone(list).sort((a,b)=>a.dayOfWeek-b.dayOfWeek||Number(a.order)-Number(b.order)||a.id.localeCompare(b.id)); const counters=new Map<number,number>(); return sorted.map(e=>({...e,order:(counters.set(e.dayOfWeek,(counters.get(e.dayOfWeek)??0)+1),counters.get(e.dayOfWeek)!-1)})); }
function validateScheduleInput(input: WorkoutProgramScheduleInput) { if(!validDay(input.dayOfWeek)) throw new Error('dayOfWeek must be an integer from 0 to 6'); if(typeof input.templateId!=='string'||!input.templateId.trim()) throw new Error('Template id is required'); if(input.order!=null && (!Number.isInteger(input.order)||input.order<0)) throw new Error('Schedule order must be a non-negative integer'); }

export async function createProgram(input: CreateWorkoutProgramInput): Promise<WorkoutProgram> { return programLocked(async()=>{ if(typeof input.name!=='string'||!input.name.trim()) throw new Error('Program name is required'); (input.schedule??[]).forEach(validateScheduleInput); const t=nowIso(); const p:WorkoutProgram={id:uid('wp_'),name:input.name.trim(),...(input.description?.trim()?{description:input.description.trim()}:{}),isActive:false,createdAt:t,updatedAt:t,schedule:normalizeSchedule((input.schedule??[]).map((e,i)=>({id:uid('wps_'),dayOfWeek:e.dayOfWeek,templateId:e.templateId.trim(),order:e.order??i,enabled:e.enabled!==false})))}; const list=await readPrograms(); await saveData(WORKOUT_PROGRAMS_KEY,[p,...list]); return programClone(p); }); }
export async function getProgram(id:string){const p=(await readPrograms()).find(x=>x.id===id);return p?programClone(p):null;}
export async function listPrograms(query?:string){const q=query?.trim().toLowerCase()??'';return (await readPrograms()).filter(p=>!q||p.name.toLowerCase().includes(q)||(p.description??'').toLowerCase().includes(q)).sort((a,b)=>Number(b.isActive)-Number(a.isActive)||a.name.localeCompare(b.name)).map(programClone);}
export async function updateProgram(id:string, patch:UpdateWorkoutProgramInput){return programLocked(async()=>{const list=await readPrograms(), cur=list.find(x=>x.id===id);if(!cur)throw new Error('Workout program not found');if(patch.name!==undefined&&!patch.name.trim())throw new Error('Program name is required');const next=normalizeProgram({...cur,...(patch.name!==undefined?{name:patch.name.trim()}:{}),...(patch.description!==undefined?{description:patch.description.trim()||undefined}:{}),...(patch.isActive!==undefined?{isActive:patch.isActive}:{}),updatedAt:nowIso()})!;await saveData(WORKOUT_PROGRAMS_KEY,list.map(x=>x.id===id?next:x));return programClone(next);});}
export async function deleteProgram(id:string){return programLocked(async()=>saveData(WORKOUT_PROGRAMS_KEY,(await readPrograms()).filter(x=>x.id!==id)));}
export async function duplicateProgram(id:string){return programLocked(async()=>{const list=await readPrograms(),src=list.find(x=>x.id===id);if(!src)throw new Error('Workout program not found');const t=nowIso(), p:WorkoutProgram={...programClone(src),id:uid('wp_'),name:`${src.name} Copy`,isActive:false,createdAt:t,updatedAt:t,schedule:src.schedule.map(e=>({...e,id:uid('wps_')}))};await saveData(WORKOUT_PROGRAMS_KEY,[p,...list]);return programClone(p);});}
export async function activateProgram(id:string){return programLocked(async()=>{const list=await readPrograms(),target=list.find(x=>x.id===id);if(!target)throw new Error('Workout program not found');const next=list.map(x=>({...x,isActive:x.id===id,updatedAt:x.id===id?nowIso():x.updatedAt}));await saveData(WORKOUT_PROGRAMS_KEY,next);return programClone(next.find(x=>x.id===id)!);});}
export async function deactivateProgram(id:string){return programLocked(async()=>{const list=await readPrograms();const next=list.map(x=>x.id===id?{...x,isActive:false,updatedAt:nowIso()}:x);await saveData(WORKOUT_PROGRAMS_KEY,next);return programClone(next.find(x=>x.id===id)!);});}
async function mutateProgram(id:string, fn:(p:WorkoutProgram)=>WorkoutProgram){return programLocked(async()=>{const list=await readPrograms(),cur=list.find(x=>x.id===id);if(!cur)throw new Error('Workout program not found');const next=normalizeProgram(fn(programClone(cur)));if(!next)throw new Error('Invalid workout program');await saveData(WORKOUT_PROGRAMS_KEY,list.map(x=>x.id===id?next:x));return programClone(next);});}
export async function addScheduleEntry(id:string,input:WorkoutProgramScheduleInput){validateScheduleInput(input);return mutateProgram(id,p=>{const order=input.order??p.schedule.filter(x=>x.dayOfWeek===input.dayOfWeek).length;if(p.schedule.some(x=>x.dayOfWeek===input.dayOfWeek&&x.templateId===input.templateId&&x.order===order))throw new Error('Duplicate schedule entry');return {...p,schedule:normalizeSchedule([...p.schedule,{id:uid('wps_'),dayOfWeek:input.dayOfWeek,templateId:input.templateId.trim(),order,enabled:input.enabled!==false}]),updatedAt:nowIso()};});}
export async function updateScheduleEntry(id:string,entryId:string,patch:Partial<WorkoutProgramScheduleInput>){if(patch.dayOfWeek!=null&&!validDay(patch.dayOfWeek))throw new Error('dayOfWeek must be an integer from 0 to 6');if(patch.order!=null&&(!Number.isInteger(patch.order)||patch.order<0))throw new Error('Schedule order must be a non-negative integer');return mutateProgram(id,p=>{const i=p.schedule.findIndex(x=>x.id===entryId);if(i<0)throw new Error('Schedule entry not found');const e={...p.schedule[i],...patch,templateId:patch.templateId?.trim()??p.schedule[i].templateId};return {...p,schedule:normalizeSchedule(p.schedule.map((x,j)=>j===i?e:x)),updatedAt:nowIso()};});}
export async function removeScheduleEntry(id:string,entryId:string){return mutateProgram(id,p=>({...p,schedule:normalizeSchedule(p.schedule.filter(x=>x.id!==entryId)),updatedAt:nowIso()}));}
export async function reorderScheduleEntries(id:string,entryId:string,direction:-1|1){return mutateProgram(id,p=>{const a=p.schedule.slice().sort((x,y)=>x.dayOfWeek-y.dayOfWeek||x.order-y.order);const i=a.findIndex(x=>x.id===entryId),j=i+direction;if(i<0||j<0||j>=a.length)return p;if(a[i].dayOfWeek!==a[j].dayOfWeek)return p;[a[i],a[j]]=[a[j],a[i]];return {...p,schedule:normalizeSchedule(a),updatedAt:nowIso()};});}
export async function getActiveProgram(){return (await listPrograms()).find(x=>x.isActive)??null;}
function civilDayOfWeek(date:Date|string){if(typeof date==='string'){const m=date.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3])).getDay();return new Date(date).getDay();}return date.getDay();}
export async function getScheduledWorkoutsForDate(date:Date|string){const p=await getActiveProgram();if(!p)return [];const day=civilDayOfWeek(date);return p.schedule.filter(x=>x.enabled&&x.dayOfWeek===day).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(programClone);}
export async function getScheduledTemplatesForDate(date:Date|string){const entries=await getScheduledWorkoutsForDate(date);const result=[];for(const e of entries){const t=await getWorkoutTemplate(e.templateId);result.push({schedule:e,template:t});}return result;}
