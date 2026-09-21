import { loadData, saveData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import type {
  PersonalRecord, Workout, WorkoutExercise, WorkoutExerciseConfig, WorkoutFinishResult,
  WorkoutSet, WorkoutStatus, NewWorkoutSetInput, WorkoutSession, WorkoutTotals,
} from '@/types/workout';

export const WORKOUTS_KEY = 'jeevya:workouts:sessions';
const LEGACY_WORKOUTS_KEY = '@jeevya/workouts/v1';
const PRS_KEY = '@jeevya/prs/v1';
let storageQueue: Promise<void> = Promise.resolve();

function nowIso() { return new Date().toISOString(); }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function validateNonNegative(value: number | null | undefined, label: string) {
  if (value == null) return;
  if (!finite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number`);
}
function validateSetInput(input: NewWorkoutSetInput) {
  validateNonNegative(input.weightKg ?? input.weight, 'Weight');
  validateNonNegative(input.reps, 'Reps');
  validateNonNegative(input.durationSeconds, 'Duration');
  validateNonNegative(input.distanceKm ?? input.distance, 'Distance');
  if (input.rpe != null && (!finite(input.rpe) || input.rpe < 1 || input.rpe > 10)) throw new Error('RPE must be between 1 and 10');
}
function validateSetNumber(n: number) {
  if (!Number.isInteger(n) || n <= 0) throw new Error('Set number must be a positive integer');
}
function canonicalizeSet(raw: Partial<WorkoutSet>, exerciseId: string, index: number): WorkoutSet | null {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
  const setNumber = Number(raw.setNumber);
  if (!Number.isInteger(setNumber) || setNumber <= 0) return null;
  const weight = raw.weightKg ?? raw.weight ?? null;
  const distance = raw.distanceKm ?? raw.distance ?? null;
  if ((weight != null && (!finite(weight) || weight < 0)) || (raw.reps != null && (!finite(raw.reps) || raw.reps < 0)) ||
      (raw.durationSeconds != null && (!finite(raw.durationSeconds) || raw.durationSeconds < 0)) ||
      (distance != null && (!finite(distance) || distance < 0)) || (raw.rpe != null && (!finite(raw.rpe) || raw.rpe < 1 || raw.rpe > 10))) return null;
  return {
    id: raw.id, workoutExerciseId: raw.workoutExerciseId ?? exerciseId, setNumber, reps: raw.reps ?? null,
    weight, weightKg: weight, weightUnit: raw.weightUnit ?? 'kg', durationSeconds: raw.durationSeconds ?? null,
    distance, distanceKm: distance, distanceUnit: raw.distanceUnit ?? 'km', rpe: raw.rpe ?? null,
    completed: raw.completed === true, completedAt: raw.completedAt ?? null, createdAt: raw.createdAt ?? nowIso(),
  };
}
function normalizeWorkout(raw: unknown): Workout | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Partial<Workout>;
  if (typeof w.id !== 'string' || typeof w.name !== 'string' || !Array.isArray(w.exercises)) return null;
  const status = w.status === 'active' ? 'in_progress' : w.status;
  if (!['planned', 'in_progress', 'completed', 'cancelled'].includes(status as string)) return null;
  const exercises: WorkoutExercise[] = [];
  w.exercises.forEach((rawEx, index) => {
    if (!rawEx || typeof rawEx !== 'object') return;
    const e = rawEx as WorkoutExercise;
    if (typeof e.id !== 'string' || typeof e.exerciseId !== 'string') return;
    const sets: WorkoutSet[] = Array.isArray(e.sets)
      ? e.sets.map((set, i) => canonicalizeSet(set, e.id, i)).filter((set): set is WorkoutSet => !!set)
        .sort((a, b) => a.setNumber - b.setNumber).map((set, i) => ({ ...set, setNumber: i + 1 }))
      : [];
    exercises.push({
      ...e,
      workoutId: e.workoutId ?? w.id,
      position: Number.isInteger(e.position) ? e.position : (e.order ?? index),
      order: index,
      setsTarget: Number.isInteger(e.setsTarget) && e.setsTarget > 0 ? e.setsTarget : Math.max(1, sets.length),
      repsTarget: e.repsTarget ?? null,
      weightTarget: e.weightTarget ?? null,
      restSeconds: finite(e.restSeconds) && e.restSeconds >= 0 ? e.restSeconds : 90,
      notes: e.notes ?? null,
      createdAt: e.createdAt ?? nowIso(),
      sets,
    });
  });
  exercises.sort((a, b) => a.position - b.position).forEach((e, i) => { e.position = i; e.order = i; });  const createdAt = typeof w.createdAt === 'string' ? w.createdAt : nowIso();
  const updatedAt = typeof w.updatedAt === 'string' ? w.updatedAt : createdAt;
  return { id:w.id,name:w.name,status:status as WorkoutStatus,startedAt:w.startedAt ?? null,completedAt:w.completedAt ?? null,
    durationSeconds: w.durationSeconds ?? null,notes:w.notes ?? null,totalVolume: finite(w.totalVolume) ? w.totalVolume : calculateWorkoutVolume({ ...w, exercises } as Workout),createdAt,updatedAt,exercises };
}

async function readAllWorkouts(): Promise<Workout[]> {
  const raw = await loadData<unknown>(WORKOUTS_KEY, null);
  let source = raw;
  if (!Array.isArray(source)) source = await loadData<unknown>(LEGACY_WORKOUTS_KEY, []);
  const list = Array.isArray(source) ? source.map(normalizeWorkout).filter((w): w is Workout => !!w) : [];
  return list;
}
async function writeAllWorkouts(list: Workout[]) { await saveData(WORKOUTS_KEY, list); }
function locked<T>(operation: () => Promise<T>): Promise<T> {
  const previous = storageQueue;
  let release!: () => void;
  storageQueue = new Promise<void>(resolve => { release = resolve; });
  return previous.then(operation).finally(release);
}

export function calculateSetVolume(set: Pick<WorkoutSet, 'weight'|'weightKg'|'reps'>): number {
  const weight = set.weightKg ?? set.weight;
  return finite(weight) && finite(set.reps) ? weight * set.reps : 0;
}
export function calculateWorkoutVolume(session: Workout | WorkoutSession): number {
  return session.exercises.reduce((sum,e)=>sum+e.sets.reduce((s,set)=>s+calculateSetVolume(set),0),0);
}
export function calculateWorkoutTotals(session: Workout | WorkoutSession): WorkoutTotals {
  return { volume: calculateWorkoutVolume(session), completedSetCount: session.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.completed).length,0),
    totalSetCount: session.exercises.reduce((n,e)=>n+e.sets.length,0), exerciseCount: session.exercises.length,
    durationSeconds: session.durationSeconds ?? (session.startedAt ? elapsedBetween(session.startedAt) : 0) };
}
export function formatDuration(totalSeconds:number|null|undefined):string { if(!totalSeconds||totalSeconds<=0)return '0 min'; const m=Math.floor(totalSeconds/60); if(m<1)return `${totalSeconds} sec`; const h=Math.floor(m/60); return h?`${h}h ${m%60}m`:`${m} min`; }
export function elapsedBetween(startIso:string|null,endIso?:string):number { if(!startIso)return 0; const a=Date.parse(startIso),b=endIso?Date.parse(endIso):Date.now(); return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,Math.floor((b-a)/1000)):0; }

function makeSet(exerciseId:string,setNumber:number):WorkoutSet { validateSetNumber(setNumber); const t=nowIso(); return {id:uid('set_'),workoutExerciseId:exerciseId,setNumber,reps:null,weight:null,weightKg:null,weightUnit:'kg',durationSeconds:null,distance:null,distanceKm:null,distanceUnit:'km',rpe:null,completed:false,completedAt:null,createdAt:t}; }
function makeExercise(workoutId:string,c:WorkoutExerciseConfig,position:number):WorkoutExercise { if(!c.exerciseId)throw new Error('Exercise id is required'); return {id:uid('we_'),workoutId,exerciseId:c.exerciseId,position,order:position,setsTarget:c.setsTarget,repsTarget:c.repsTarget,weightTarget:c.weightTarget,restSeconds:c.restSeconds,notes:c.notes??null,createdAt:nowIso(),sets:[]}; }
function makeDraft(input?:{name?:string;exercises?:WorkoutExerciseConfig[]}):Workout { const t=nowIso(); const w:Workout={id:uid('wo_'),name:input?.name?.trim()||'New Workout',status:'planned',startedAt:null,completedAt:null,durationSeconds:null,notes:null,totalVolume:0,createdAt:t,updatedAt:t,exercises:[]}; w.exercises=(input?.exercises??[]).map((c,i)=>makeExercise(w.id,c,i)); return w; }
function touch(w:Workout):Workout{return {...w,updatedAt:nowIso(),totalVolume:calculateWorkoutVolume(w)};}

export async function getWorkoutSessions():Promise<WorkoutSession[]> { return (await readAllWorkouts()).filter(w=>w.status!=='planned').sort((a,b)=>Date.parse(b.startedAt??b.createdAt)-Date.parse(a.startedAt??a.createdAt)).map(toSession); }
export async function getWorkoutSession(id:string):Promise<WorkoutSession|null>{ const w=(await readAllWorkouts()).find(x=>x.id===id && x.status!=='planned'); return w?toSession(w):null; }
export async function createWorkoutSession(input:{name?:string;exercises?:WorkoutExerciseConfig[]} = {}):Promise<WorkoutSession>{ return locked(async()=>{const t=nowIso(); const w=makeDraft({name:input.name ?? 'Workout',exercises:input.exercises}); const session={...w,status:'in_progress' as const,startedAt:t}; const list=await readAllWorkouts(); if(list.some(x=>x.status==='in_progress'))throw new Error('An active workout is already in progress'); await writeAllWorkouts([session,...list]); return toSession(session);}); }
export async function updateWorkoutSession(id:string, patch:Partial<WorkoutSession>):Promise<WorkoutSession>{ return locked(async()=>{const list=await readAllWorkouts(); const w=list.find(x=>x.id===id); if(!w)throw new Error('Workout session not found'); const updated=touch({...w,...patch,status:patch.status??w.status} as Workout); const next=list.map(x=>x.id===id?updated:x); await writeAllWorkouts(next); return toSession(updated);}); }
export async function createWorkoutSessionSnapshot(session: WorkoutSession): Promise<WorkoutSession> {
  return locked(async () => {
    const list = await readAllWorkouts();
    if (list.some((workout) => workout.status === 'in_progress' || workout.status === 'active')) {
      throw new Error('An active workout is already in progress');
    }
    const normalized = normalizeWorkout(session as unknown as Partial<Workout>);
    if (!normalized || normalized.status !== 'in_progress') throw new Error('Invalid workout session snapshot');
    const snapshot = touch({ ...normalized, status: 'in_progress' as WorkoutStatus, startedAt: session.startedAt });
    await writeAllWorkouts([snapshot, ...list]);
    return toSession(snapshot);
  });
}
export async function deleteWorkoutSession(id:string):Promise<void>{return locked(async()=>{const list=await readAllWorkouts();await writeAllWorkouts(list.filter(w=>w.id!==id));});}
export async function startWorkoutSession(input:{name:string;exercises?:WorkoutExerciseConfig[]}):Promise<WorkoutSession>{return createWorkoutSession(input);}
export async function startWorkoutById(id:string):Promise<WorkoutSession>{const w=await startWorkout(id);return toSession(w);}

export async function listWorkouts(){return (await readAllWorkouts()).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));}
export async function getWorkout(id:string){return (await readAllWorkouts()).find(w=>w.id===id)??null;}
export async function getActiveWorkout(){const w=(await readAllWorkouts()).find(x=>x.status==='in_progress'||x.status==='active');return w?{...w,status:'in_progress' as const}:null;}
export async function createWorkout(input?:{name?:string;exercises?:WorkoutExerciseConfig[]}):Promise<Workout>{return locked(async()=>{const w=makeDraft(input);const list=await readAllWorkouts();await writeAllWorkouts([w,...list]);return w;});}
export async function saveWorkout(workout:Workout):Promise<Workout>{return locked(async()=>{const list=await readAllWorkouts();const updated=touch(workout);const i=list.findIndex(w=>w.id===workout.id);if(i>=0)list[i]=updated;else list.unshift(updated);await writeAllWorkouts(list);return updated;});}
export async function deleteWorkout(id:string){return deleteWorkoutSession(id);}
export async function deleteEmptyDrafts(){return locked(async()=>{const list=await readAllWorkouts();await writeAllWorkouts(list.filter(w=>!(w.status==='planned'&&w.exercises.length===0&&w.name==='New Workout')));});}
export async function updateWorkoutName(id:string,name:string){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');return saveWorkout({...w,name:name.trim()||w.name});}
export async function updateWorkoutNotes(id:string,notes:string|null){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');return saveWorkout({...w,notes});}
export async function addExerciseToWorkout(id:string,c:WorkoutExerciseConfig){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');return saveWorkout({...w,exercises:[...w.exercises,makeExercise(id,c,w.exercises.length)]});}
export async function removeWorkoutExercise(id:string,eid:string){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');return saveWorkout({...w,exercises:w.exercises.filter(e=>e.id!==eid).map((e,i)=>({...e,position:i,order:i}))});}
export async function duplicateWorkoutExercise(id:string,eid:string){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');const e=w.exercises.find(x=>x.id===eid);if(!e)return w;return saveWorkout({...w,exercises:[...w.exercises,makeExercise(id,{exerciseId:e.exerciseId,setsTarget:e.setsTarget,repsTarget:e.repsTarget,weightTarget:e.weightTarget,restSeconds:e.restSeconds,notes:e.notes},w.exercises.length)]});}
export async function updateWorkoutExercise(id:string,eid:string,patch:Partial<Pick<WorkoutExercise,'setsTarget'|'repsTarget'|'weightTarget'|'restSeconds'|'notes'>>){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');return saveWorkout({...w,exercises:w.exercises.map(e=>e.id===eid?{...e,...patch}:e)});}
export async function reorderWorkoutExercises(id:string,ids:string[]){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');const m=new Map(w.exercises.map(e=>[e.id,e]));return saveWorkout({...w,exercises:ids.map(x=>m.get(x)).filter((e):e is WorkoutExercise=>!!e).map((e,i)=>({...e,position:i,order:i}))});}
export async function moveWorkoutExercise(id:string,eid:string,d:-1|1){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');const ids=w.exercises.map(e=>e.id),i=ids.indexOf(eid),j=i+d;if(i<0||j<0||j>=ids.length)return w;[ids[i],ids[j]]=[ids[j],ids[i]];return reorderWorkoutExercises(id,ids);}

function patchSet(w:Workout,eid:string,sid:string,patch:Partial<WorkoutSet>):Workout{return {...w,exercises:w.exercises.map(e=>e.id===eid?{...e,sets:e.sets.map(s=>s.id===sid?{...s,...patch}:s).sort((a,b)=>a.setNumber-b.setNumber)}:e)};}
function ensureActive(w:Workout){if(w.status!=='in_progress'&&w.status!=='active')throw new Error('Workout is not in progress');}
export async function startWorkout(id:string):Promise<Workout>{return locked(async()=>{const list=await readAllWorkouts();const w=list.find(x=>x.id===id);if(!w)throw new Error('Workout not found');const active=list.find(x=>x.status==='in_progress'||x.status==='active');if(active&&active.id!==id)throw new Error('Another workout is already in progress');const startedAt=w.startedAt??nowIso();const next={...w,status:'in_progress' as WorkoutStatus,startedAt,exercises:w.exercises.map(e=>({...e,sets:e.sets.length?e.sets.slice().sort((a,b)=>a.setNumber-b.setNumber):Array.from({length:e.setsTarget},(_,i)=>makeSet(e.id,i+1))}))};const out=touch(next);await writeAllWorkouts(list.map(x=>x.id===id?out:x));return out;});}
export async function updateWorkoutSet(id:string,eid:string,sid:string,input:NewWorkoutSetInput){validateSetInput(input);const w=await getWorkout(id);if(!w)throw new Error('Workout not found');ensureActive(w);const weight=input.weightKg??input.weight;const distance=input.distanceKm??input.distance;const numericPatch={...(weight!==undefined?{weight,weightKg:weight}:{}),...(distance!==undefined?{distance,distanceKm:distance}:{}),};const completionPatch=input.completed===true?{completedAt:nowIso()}:(input.completed===false?{completedAt:null}:{});return saveWorkout(patchSet(w,eid,sid,{...input,...numericPatch,...completionPatch}));}
export async function addWorkoutSet(id:string,eid:string){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');ensureActive(w);return saveWorkout({...w,exercises:w.exercises.map(e=>e.id===eid?{...e,sets:[...e.sets,makeSet(e.id,e.sets.length+1)]}:e)});}
export async function removeWorkoutSet(id:string,eid:string,sid:string){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');ensureActive(w);return saveWorkout({...w,exercises:w.exercises.map(e=>e.id===eid?{...e,sets:e.sets.filter(s=>s.id!==sid).map((s,i)=>({...s,setNumber:i+1}))}:e)});}
export async function completeWorkoutSet(id:string,eid:string,sid:string,input:NewWorkoutSetInput={}){validateSetInput(input);const w=await getWorkout(id);if(!w)throw new Error('Workout not found');ensureActive(w);const now=nowIso();const weight=input.weightKg??input.weight;const distance=input.distanceKm??input.distance;const numericPatch={...(weight!==undefined?{weight,weightKg:weight}:{}),...(distance!==undefined?{distance,distanceKm:distance}:{}),};const out=await saveWorkout(patchSet(w,eid,sid,{...input,...numericPatch,completed:true,completedAt:now}));return {workout:out,newPersonalRecords:[] as PersonalRecord[]};}
export async function uncompleteWorkoutSet(id:string,eid:string,sid:string){const w=await getWorkout(id);if(!w)throw new Error('Workout not found');ensureActive(w);return saveWorkout(patchSet(w,eid,sid,{completed:false,completedAt:null}));}
export async function completeWorkout(id:string):Promise<Workout>{return locked(async()=>{const list=await readAllWorkouts();const w=list.find(x=>x.id===id);if(!w)throw new Error('Workout not found');ensureActive(w);const completedAt=nowIso();const out=touch({...w,status:'completed',completedAt,durationSeconds:elapsedBetween(w.startedAt,completedAt)});await writeAllWorkouts(list.map(x=>x.id===id?out:x));return out;});}
export async function cancelWorkout(id:string):Promise<Workout>{return locked(async()=>{const list=await readAllWorkouts();const w=list.find(x=>x.id===id);if(!w)throw new Error('Workout not found');ensureActive(w);const at=nowIso();const out=touch({...w,status:'cancelled',completedAt:null,durationSeconds:elapsedBetween(w.startedAt,at)});await writeAllWorkouts(list.map(x=>x.id===id?out:x));return out;});}
export async function finishWorkout(id:string,options:{pausedSeconds?:number}={}):Promise<WorkoutFinishResult>{const w=await completeWorkout(id);const paused=Math.max(0,Math.round(options.pausedSeconds??0));const out={...w,durationSeconds:Math.max(0,(w.durationSeconds??0)-paused)};if(out.durationSeconds!==w.durationSeconds)await saveWorkout(out);return {workout:out,newPersonalRecords:[]};}
export async function discardWorkout(id:string){return cancelWorkout(id);}
export async function getWorkoutHistory(){return (await listWorkouts()).filter(w=>w.status==='completed');}
export async function getWorkoutDetails(id:string){return getWorkout(id);}
export async function getPersonalRecords(){return loadData<PersonalRecord[]>(PRS_KEY,[]);}
export async function getPrsForWorkout(id:string){return (await getPersonalRecords()).filter(p=>p.workoutId===id);}

export function getPreviousExercisePerformance(exerciseId:string,sessions:WorkoutSession[]|Workout[]):WorkoutSet[]{const completed=sessions.filter(s=>s.status==='completed').slice().sort((a,b)=>Date.parse(b.completedAt??b.createdAt)-Date.parse(a.completedAt??a.createdAt));const session=completed.find(s=>s.exercises.some(e=>e.exerciseId===exerciseId));if(!session)return [];const exercise=session.exercises.find(e=>e.exerciseId===exerciseId);return exercise?exercise.sets.filter(s=>s.completed).slice().sort((a,b)=>a.setNumber-b.setNumber):[];}

function toSession(w:Workout):WorkoutSession { return {id:w.id,name:w.name,startedAt:w.startedAt??w.createdAt,completedAt:w.completedAt??undefined,status:(w.status==='active'?'in_progress':w.status) as WorkoutSession['status'],exercises:w.exercises,durationSeconds:w.durationSeconds??undefined,createdAt:w.createdAt,updatedAt:w.updatedAt}; }

// Compatibility aliases for existing UI and callers.
export const getWorkoutSessionsForHistory = getWorkoutSessions;
export const addSet = addWorkoutSet;
export const updateSet = updateWorkoutSet;
export const removeSet = removeWorkoutSet;
export const completeSet = completeWorkoutSet;
export const uncompleteSet = uncompleteWorkoutSet;


