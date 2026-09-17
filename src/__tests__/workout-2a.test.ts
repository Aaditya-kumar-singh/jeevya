import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WORKOUTS_KEY, createWorkout, getWorkout, getWorkoutSessions, getWorkoutSession, getActiveWorkout,
  updateWorkoutName, deleteWorkout, startWorkout, addWorkoutSet, updateWorkoutSet, removeWorkoutSet,
  completeWorkoutSet, uncompleteWorkoutSet, completeWorkout, cancelWorkout, getWorkoutHistory, calculateWorkoutVolume,
  calculateWorkoutTotals, getPreviousExercisePerformance, elapsedBetween,
} from '@/services/workouts';
import type { WorkoutExerciseConfig } from '@/types/workout';

let passed=0, failed=0, total=0;
function assert(ok:boolean,msg:string){total++;if(ok){passed++;console.log(`  ? ${msg}`)}else{failed++;console.log(`  ? ${msg}`)}}
function eq(a:unknown,b:unknown,msg:string){assert(a===b,`${msg} (got ${String(a)}, expected ${String(b)})`)}
async function expectError(fn:()=>Promise<unknown>,msg:string){try{await fn();assert(false,msg)}catch{assert(true,msg)}}
const cfg=(exerciseId='bench'):WorkoutExerciseConfig=>({exerciseId,setsTarget:2,repsTarget:10,weightTarget:20,restSeconds:60});

void (async()=>{
  await AsyncStorage.clear();
  console.log('\n=== Phase 2A Workout Tracking Core ===');

  console.log('\n1. Types / creation / retrieval');
  const draft=await createWorkout({name:'Push Day',exercises:[cfg('bench'),cfg('row')]});
  eq(draft.name,'Push Day','workout creation preserves name');
  eq(draft.exercises.length,2,'workout creation preserves exercises');
  eq(draft.exercises[0].exerciseId,'bench','exercise references library id');
  eq(draft.exercises[0].position,0,'first exercise position');
  eq(draft.exercises[1].position,1,'second exercise position');
  const fetched=await getWorkout(draft.id);
  assert(!!fetched,'workout retrieval returns created workout');
  eq(fetched?.id,draft.id,'retrieval id matches');
  eq(fetched?.status,'planned','builder draft remains compatible');
  const sessions0=await getWorkoutSessions();
  eq(sessions0.length,0,'planned drafts are excluded from sessions');

  console.log('\n2. Start / active protection / persistence');
  const active=await startWorkout(draft.id);
  eq(active.status,'in_progress','start sets in_progress');
  assert(!!active.startedAt,'start records startedAt');
  eq(active.exercises[0].sets.length,2,'start materializes target sets');
  eq(active.exercises[0].sets[0].setNumber,1,'first set number');
  eq(active.exercises[0].sets[1].setNumber,2,'second set number');
  const activeAgain=await startWorkout(draft.id);
  eq(activeAgain.id,active.id,'starting same active workout is idempotent');
  const secondDraft=await createWorkout({name:'Pull Day',exercises:[cfg('pull')]});
  await expectError(()=>startWorkout(secondDraft.id),'second active workout is rejected deterministically');
  const restored=await getActiveWorkout();
  eq(restored?.id,active.id,'active workout survives re-read/app restart');
  eq((await getWorkoutSessions()).length,1,'active session is persisted');

  console.log('\n3. Set tracking / ordering');
  let w=await addWorkoutSet(active.id,active.exercises[0].id);
  eq(w.exercises[0].sets.length,3,'add set creates a set');
  eq(w.exercises[0].sets[2].setNumber,3,'new set is last and ordered');
  w=await updateWorkoutSet(w.id,w.exercises[0].id,w.exercises[0].sets[2].id,{reps:8,weightKg:25,rpe:8,durationSeconds:30,distanceKm:1});
  const set3=w.exercises[0].sets[2];
  eq(set3.reps,8,'set reps update');
  eq(set3.weight,25,'set weight update');
  eq(set3.weightKg,25,'weightKg normalized');
  eq(set3.rpe,8,'set RPE update');
  eq(set3.durationSeconds,30,'duration update');
  eq(set3.distanceKm,1,'distance update');
  await expectError(()=>updateWorkoutSet(w.id,w.exercises[0].id,set3.id,{weightKg:-1}),'negative weight rejected');
  await expectError(()=>updateWorkoutSet(w.id,w.exercises[0].id,set3.id,{reps:-1}),'negative reps rejected');
  await expectError(()=>updateWorkoutSet(w.id,w.exercises[0].id,set3.id,{durationSeconds:-1}),'negative duration rejected');
  await expectError(()=>updateWorkoutSet(w.id,w.exercises[0].id,set3.id,{distanceKm:-1}),'negative distance rejected');
  await expectError(()=>updateWorkoutSet(w.id,w.exercises[0].id,set3.id,{rpe:0}),'RPE below 1 rejected');
  await expectError(()=>updateWorkoutSet(w.id,w.exercises[0].id,set3.id,{rpe:11}),'RPE above 10 rejected');
  await expectError(()=>updateWorkoutSet(w.id,w.exercises[0].id,set3.id,{rpe:Number.NaN}),'non-finite RPE rejected');
  await expectError(()=>updateWorkoutSet(w.id,w.exercises[0].id,set3.id,{weightKg:Number.POSITIVE_INFINITY}),'non-finite weight rejected');
  w=(await completeWorkoutSet(w.id,w.exercises[0].id,set3.id)).workout;
  assert(!!w.exercises[0].sets[2].completedAt,'completing set records completedAt');
  eq(w.exercises[0].sets[2].completed,true,'complete set marks completed');
  w=await uncompleteWorkoutSet(w.id,w.exercises[0].id,set3.id);
  eq(w.exercises[0].sets[2].completed,false,'uncomplete set clears completed state');
  eq(w.exercises[0].sets[2].completedAt,null,'uncomplete set clears completedAt');
  w=(await completeWorkoutSet(w.id,w.exercises[0].id,set3.id,{reps:8,weightKg:25})).workout;
  assert(!!w.exercises[0].sets[2].completedAt,'re-complete records a fresh completedAt');
  const beforeRemove=w.exercises[0].sets.length;
  w=await removeWorkoutSet(w.id,w.exercises[0].id,set3.id);
  eq(w.exercises[0].sets.length,beforeRemove-1,'remove set deletes set');
  eq(w.exercises[0].sets.every((s,i)=>s.setNumber===i+1),true,'remaining sets are renumbered');

  console.log('\n4. Completion / cancellation / duration');
  const completed=await completeWorkout(w.id);
  eq(completed.status,'completed','workout completion sets completed status');
  assert(!!completed.completedAt,'workout completion records completedAt');
  assert((completed.durationSeconds??-1)>=0,'workout completion calculates duration');
  assert((completed.totalVolume??-1)>=0,'workout stores volume');
  const history=await getWorkoutSessions();
  eq(history.length,1,'completed workout appears in history');
  eq(history[0].status,'completed','history filters completed status');
  const totals=calculateWorkoutTotals(completed);
  eq(totals.exerciseCount,2,'totals count exercises');
  eq(totals.totalSetCount,4,'totals count all sets');
  eq(totals.completedSetCount,0,'totals count completed sets');
  eq(totals.volume,0,'volume ignores sets without weight/reps');
  assert(calculateWorkoutVolume(completed)===0,'pure volume calculation handles missing values');
  assert(elapsedBetween('2026-01-01T00:00:00.000Z','2026-01-01T00:01:05.000Z')===65,'duration helper is deterministic');

  const cancelDraft=await createWorkout({name:'Cancelled',exercises:[cfg('squat')]});
  const cancelActive=await startWorkout(cancelDraft.id);
  const cancelled=await cancelWorkout(cancelActive.id);
  eq(cancelled.status,'cancelled','cancel sets cancelled status');
  eq(cancelled.completedAt,null,'cancelled workout has no completion timestamp');
  eq((await getWorkoutSessions()).some(s=>s.id===cancelled.id),true,'cancelled data is retained in storage');
  eq((await getWorkoutHistory()).some(w=>w.id===cancelled.id),false,'cancelled workout is excluded from completed history');

  console.log('\n5. Previous performance / multiple sessions');
  const next=await createWorkout({name:'Push Day 2',exercises:[cfg('bench'),cfg('row')]});
  const nextActive=await startWorkout(next.id);
  let n=await updateWorkoutSet(nextActive.id,nextActive.exercises[0].id,nextActive.exercises[0].sets[0].id,{reps:10,weightKg:20});
  n=(await completeWorkoutSet(n.id,n.exercises[0].id,n.exercises[0].sets[0].id)).workout;
  n=await updateWorkoutSet(n.id,n.exercises[0].id,n.exercises[0].sets[1].id,{reps:8,weightKg:20});
  n=(await completeWorkoutSet(n.id,n.exercises[0].id,n.exercises[0].sets[1].id)).workout;
  n=await completeWorkout(n.id);
  const sessions=await getWorkoutSessions();
  const prev=getPreviousExercisePerformance('bench',sessions);;
  eq(prev.length,2,'previous performance returns prior completed sets');
  eq(prev[0].reps,10,'previous performance preserves set 1 reps');
  eq(prev[0].weight,20,'previous performance preserves set 1 weight');
  eq(prev[1].reps,8,'previous performance preserves set 2 reps');
  eq(prev[1].weight,20,'previous performance preserves set 2 weight');
  eq(getPreviousExercisePerformance('unknown',sessions).length,0,'missing previous performance returns empty');
  assert(getPreviousExercisePerformance('bench',sessions) !== n.exercises[0].sets,'previous helper returns independent array');

  console.log('\n6. CRUD / update / missing references / malformed recovery');
  const lookup=await getWorkoutSession(n.id);
  eq(lookup?.status,'completed','getWorkoutSession returns canonical session');
  eq(lookup?.name,'Push Day 2','session name is preserved');
  await updateWorkoutName(n.id,'Renamed Push');
  eq((await getWorkout(n.id))?.name,'Renamed Push','workout update persists');
  const rawMissing=await createWorkout({name:'Missing Exercise',exercises:[cfg('deleted-exercise')]});
  const missingStarted=await startWorkout(rawMissing.id);
  eq(missingStarted.exercises[0].exerciseId,'deleted-exercise','missing exercise reference is preserved');
  await completeWorkout(missingStarted.id);
  eq((await getWorkout(missingStarted.id))?.exercises[0].exerciseId,'deleted-exercise','history retains missing exercise');
  await AsyncStorage.setItem(WORKOUTS_KEY,'{"bad":true}');
  eq((await getWorkoutSessions()).length,0,'malformed object is safely recovered as empty');
  await AsyncStorage.setItem(WORKOUTS_KEY,JSON.stringify([{bad:true},null,42]));
  eq((await getWorkoutSessions()).length,0,'malformed array entries are ignored safely');

  console.log('\n7. Concurrent writes / persistence');
  await AsyncStorage.clear();
  const concurrent=await Promise.all(Array.from({length:10},(_,i)=>createWorkout({name:`Concurrent ${i}`})));
  eq(concurrent.length,10,'concurrent create calls all resolve');
  eq((await getWorkoutSessions()).length,0,'concurrent drafts remain drafts');
  const listed=await Promise.all(concurrent.map(x=>getWorkout(x.id)));
  eq(listed.filter(Boolean).length,10,'concurrent writes do not lose records');
  const deleteId=concurrent[0].id;
  await deleteWorkout(deleteId);
  eq(await getWorkout(deleteId),null,'workout deletion removes record');
  const remaining=await getWorkout(concurrent[1].id);
  assert(!!remaining,'deletion preserves other records');

  console.log('\n8. Validation edge cases / compatibility');
  const edge=await createWorkout({name:'Edge',exercises:[cfg('edge')]});
  const edgeActive=await startWorkout(edge.id);
  await expectError(()=>updateWorkoutSet(edgeActive.id,edgeActive.exercises[0].id,edgeActive.exercises[0].sets[0].id,{rpe:Infinity}),'infinite RPE rejected');
  await expectError(()=>updateWorkoutSet(edgeActive.id,edgeActive.exercises[0].id,edgeActive.exercises[0].sets[0].id,{reps:NaN}),'NaN reps rejected');
  await expectError(()=>updateWorkoutSet(edgeActive.id,edgeActive.exercises[0].id,edgeActive.exercises[0].sets[0].id,{distanceKm:NaN}),'NaN distance rejected');
  const zero=await updateWorkoutSet(edgeActive.id,edgeActive.exercises[0].id,edgeActive.exercises[0].sets[0].id,{reps:0,weightKg:0,durationSeconds:0,distanceKm:0,rpe:1});
  eq(zero.exercises[0].sets[0].reps,0,'zero reps is accepted as semantically valid input');
  eq(zero.exercises[0].sets[0].weight,0,'zero weight is accepted');
  eq(zero.exercises[0].sets[0].durationSeconds,0,'zero duration is accepted');
  eq(zero.exercises[0].sets[0].distanceKm,0,'zero distance is accepted');
  eq(zero.exercises[0].sets[0].rpe,1,'RPE lower bound is accepted');
  const final=await cancelWorkout(edgeActive.id);
  eq(final.status,'cancelled','edge workout can be cancelled after valid input');

  console.log(`\n========================================`);
  console.log(`Phase 2A Runtime Tests: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(`========================================`);
  if(failed>0)process.exit(1);
})();
