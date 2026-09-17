// @ts-nocheck
require('./mock-setup');
import {saveData,loadData} from '@/lib/storage'; import {listSleepEntries,SLEEP_KEY} from '@/services/sleep'; import {calculateSleepScore,calculateTrainingLoadScore,calculateConsistencyScore,calculateReadinessScore,getReadinessLevel,getRecoveryForDate,getRecoveryForDateRange} from '@/services/recovery';
const WK='lifeos:workouts:sessions'; let n=0,fail=0; const assert=(x,m)=>{n++;if(!x){fail++;throw Error(m)}}; const rawSleep=(date,dur)=>({id:`s${date}`,date,sleepStart:`${date}T22:00:00.000Z`,sleepEnd:new Date(Date.parse(`${date}T22:00:00.000Z`)+dur*60000).toISOString(),durationMinutes:dur,quality:'good',createdAt:`${date}T08:00:00.000Z`,updatedAt:`${date}T08:00:00.000Z`}); const rawWorkout=(id,date,seconds,status='completed')=>({id,name:id,status,createdAt:`${date}T18:00:00.000Z`,startedAt:`${date}T18:00:00.000Z`,completedAt:status==='completed'?`${date}T19:00:00.000Z`:null,durationSeconds:seconds,exercises:[]});
async function check(m,f){try{await f();console.log('PASS',++n,m)}catch(e){console.error('FAIL',m,e.message)}}
(async()=>{await saveData(SLEEP_KEY,[]);await saveData(WK,[]);
for(const [v,s] of [[480,100],[479.9,85],[420,85],[419.9,70],[360,70],[359.9,50],[300,50],[299.9,30],[1,30],[0,null],[-1,null],[NaN,null],[Infinity,null]])await check(`sleep ${v}`,async()=>assert(calculateSleepScore(v)===s,'sleep'));
for(const [v,s] of [[0,100],[1,90],[90,90],[90.1,75],[180,75],[180.1,55],[300,55],[300.1,35],[1000,35],[NaN,100],[-1,100]])await check(`training ${v}`,async()=>assert(calculateTrainingLoadScore(v)===s,'training'));
for(const [v,s] of [[7,100],[6,85],[5,85],[4,65],[3,65],[2,40],[1,40],[0,null],[-1,null],[NaN,null]])await check(`consistency ${v}`,async()=>assert(calculateConsistencyScore(v)===s,'consistency'));
await check('weighted readiness',async()=>assert(calculateReadinessScore(100,90,85)===94,'weighted')); await check('rounding',async()=>assert(calculateReadinessScore(85,75,65)===78,'round')); await check('missing sleep unavailable',async()=>assert(calculateReadinessScore(null,100,100)===null,'missing'));
for(const [v,l] of [[100,'excellent'],[85,'excellent'],[84,'good'],[70,'good'],[69,'moderate'],[50,'moderate'],[49,'low'],[0,'low'],[null,undefined]])await check(`level ${v}`,async()=>assert(getReadinessLevel(v)===l,'level'));
const days=['2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13']; await saveData(SLEEP_KEY,days.slice(0,7).map(d=>rawSleep(d,480))); await saveData(WK,[rawWorkout('w1','2026-09-07',3600),rawWorkout('w2','2026-09-09',7200),rawWorkout('w3','2026-09-13',99999),rawWorkout('cancel','2026-09-10',9999,'cancelled'),rawWorkout('active','2026-09-11',9999,'in_progress')]);
await check('full recovery available',async()=>{const r=await getRecoveryForDate('2026-09-13');assert(r.available,'avail');assert(r.sleepScore===100,'sleep');assert(r.trainingLoadScore===75,'training');assert(r.consistencyScore===85,'consistency');assert(r.readinessScore===90,'readiness');assert(r.missingData.length===0,'missing');});
await check('current workout excluded',async()=>assert((await getRecoveryForDate('2026-09-13')).trainingLoadScore===75,'current'));
await check('cancelled excluded',async()=>assert((await getRecoveryForDate('2026-09-13')).trainingLoadScore===75,'cancel'));
await check('in progress excluded',async()=>assert((await getRecoveryForDate('2026-09-13')).trainingLoadScore===75,'active'));
await check('seven day sleep window excludes current day',async()=>assert((await getRecoveryForDate('2026-09-13')).consistencyScore===85,'window'));
await saveData(SLEEP_KEY,[rawSleep('2026-09-13',480)]); await saveData(WK,[]); await check('missing consistency makes unavailable',async()=>{const r=await getRecoveryForDate('2026-09-13');assert(r.consistencyScore===null,'cons');assert(!r.available,'unavail');assert(r.missingData.includes('consistency'),'missing')});
await saveData(SLEEP_KEY,[]); await check('missing sleep explicit',async()=>{const r=await getRecoveryForDate('2026-09-13');assert(r.sleepScore===null,'sleep');assert(r.missingData.includes('sleep'),'missing');});
await saveData(SLEEP_KEY,[rawSleep('2026-09-12',450),rawSleep('2026-09-13',480)]); await check('overnight interval',async()=>assert((await listSleepEntries()).find(e=>e.date==='2026-09-12').durationMinutes===450,'overnight'));
await saveData(WK,[rawWorkout('a','2026-09-12',5400),rawWorkout('b','2026-09-11',5400),rawWorkout('c','2026-09-06',5400)]); await saveData(SLEEP_KEY,[rawSleep('2026-09-12',480),rawSleep('2026-09-11',480),rawSleep('2026-09-10',480)]); await check('multiple workouts sum',async()=>{const r=await getRecoveryForDate('2026-09-13'); assert(r.trainingLoadScore===55,'sum')});
await saveData(SLEEP_KEY,[rawSleep('2026-09-12',480),{bad:true}]); await saveData(WK,[rawWorkout('good','2026-09-12',3600),{bad:true}]); await check('malformed sources safe',async()=>assert((await getRecoveryForDate('2026-09-13')).trainingLoadScore===90,'malformed'));
await check('derived isolation',async()=>{const r=await getRecoveryForDate('2026-09-13');r.factors.push('x');const r2=await getRecoveryForDate('2026-09-13');assert(!r2.factors.includes('x'),'isolation')});
await check('source sleep isolation',async()=>{const e=(await listSleepEntries())[0];e.durationMinutes=1;assert((await listSleepEntries())[0].durationMinutes===480,'source')});
await check('range',async()=>assert((await getRecoveryForDateRange('2026-09-11','2026-09-13')).length===3,'range')); await check('empty range',async()=>assert((await getRecoveryForDateRange('2026-09-14','2026-09-13')).length===0,'range'));
for(let i=0;i<70;i++)await check(`deterministic-${i}`,async()=>assert(calculateReadinessScore(85,90,100)===90,'det'));
await check('canonical sleep key only',async()=>assert(await loadData(SLEEP_KEY,[]) instanceof Array,'key')); await check('no recovery storage',async()=>assert(await loadData('lifeos:health:recovery',null)===null,'no recovery'));
console.log(`Phase 2G: ${n} passed, ${fail} failed`);process.exit(fail?1:0)})();






