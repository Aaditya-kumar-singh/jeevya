import { loadData } from '@/lib/storage';
import { addDays, isValidCivilDate, todayCivilDate } from '@/lib/date';
import { getWorkoutHistory } from '@/services/workoutHistory';
import { listSleepEntries, type SleepEntry } from '@/services/sleep';
const isValidDay = isValidCivilDate;

export type ReadinessLevel = 'low' | 'moderate' | 'good' | 'excellent';
export interface RecoveryMetric { date:string; sleepScore:number|null; trainingLoadScore:number; consistencyScore:number|null; readinessScore:number|null; available:boolean; missingData:string[]; }
export interface RecoveryResult extends RecoveryMetric { readinessLevel?: ReadinessLevel; factors:string[]; }
const WORKOUT_KEY='jeevya:workouts:sessions';

function clone<T>(v:T):T{return JSON.parse(JSON.stringify(v)) as T;}
function dayShift(day:string,delta:number):string|null { return addDays(day, delta); }
function windowDays(date:string,count:number):string[]{const out:string[]=[]; for(let i=1;i<=count;i++){const d=dayShift(date,-i); if(d)out.push(d);} return out;}
export function calculateSleepScore(durationMinutes:number):number|null { if(!Number.isFinite(durationMinutes)||durationMinutes<=0)return null; if(durationMinutes>=480)return 100; if(durationMinutes>=420)return 85; if(durationMinutes>=360)return 70; if(durationMinutes>=300)return 50; return 30; }
export function calculateTrainingLoadScore(trainingMinutes:number):number { if(!Number.isFinite(trainingMinutes)||trainingMinutes<=0)return 100; if(trainingMinutes<=90)return 90; if(trainingMinutes<=180)return 75; if(trainingMinutes<=300)return 55; return 35; }
export function calculateConsistencyScore(validSleepDays:number):number|null { if(!Number.isFinite(validSleepDays)||validSleepDays<0)return null; if(validSleepDays===7)return 100; if(validSleepDays>=5)return 85; if(validSleepDays>=3)return 65; if(validSleepDays>=1)return 40; return null; }
export function calculateReadinessScore(sleepScore:number|null,trainingLoadScore:number|null,consistencyScore:number|null):number|null { if(sleepScore==null||trainingLoadScore==null||consistencyScore==null)return null; return Math.round(sleepScore*.5+trainingLoadScore*.3+consistencyScore*.2); }
export function getReadinessLevel(score:number|null):ReadinessLevel|undefined { if(score==null||!Number.isFinite(score))return undefined; if(score>=85)return'excellent'; if(score>=70)return'good'; if(score>=50)return'moderate'; return'low'; }
function validSleep(e:SleepEntry):boolean{return isValidDay(e.date)&&Number.isFinite(e.durationMinutes)&&e.durationMinutes>0;}
export async function getRecoveryForDate(date:string):Promise<RecoveryResult>{
 if(!isValidDay(date))return {date,readinessScore:null,readinessLevel:undefined,sleepScore:null,trainingLoadScore:100,consistencyScore:null,missingData:['sleep','consistency'],available:false,factors:['Invalid date']};
 const sleeps=await listSleepEntries(); const byDate=new Map<string,SleepEntry>(); for(const e of sleeps)if(validSleep(e)&&!byDate.has(e.date))byDate.set(e.date,e);
 const sleep=byDate.get(date); const sleepScore=sleep?calculateSleepScore(sleep.durationMinutes):null;
 const days=windowDays(date,7); const consistencyDays=days.filter(d=>byDate.has(d)).length; const consistencyScore=calculateConsistencyScore(consistencyDays);
 const history=await getWorkoutHistory({fromDate:days[days.length-1],toDate:days[0],newestFirst:false});
 const trainingMinutes=history.workouts.reduce((sum,w)=>{const seconds=w.durationSeconds; return sum+(typeof seconds==='number'&&Number.isFinite(seconds)&&seconds>0?seconds/60:0);},0);
 const trainingLoadScore=calculateTrainingLoadScore(trainingMinutes); const readinessScore=calculateReadinessScore(sleepScore,trainingLoadScore,consistencyScore);
 const missingData:string[]=[]; if(sleepScore==null)missingData.push('sleep'); if(consistencyScore==null)missingData.push('consistency');
 const factors:string[]=[]; if(sleep)factors.push(`Sleep duration: ${sleep.durationMinutes} minutes`); else factors.push('Missing sleep data'); factors.push(`Recent training volume: ${Math.round(trainingMinutes*100)/100} minutes`); if(consistencyScore!=null)factors.push(`Sleep consistency: ${consistencyDays}/7 days`); else factors.push('Missing sleep consistency data');
 return clone({date,readinessScore,readinessLevel:getReadinessLevel(readinessScore),sleepScore,trainingLoadScore,consistencyScore,missingData,available:readinessScore!=null,factors});
}
export async function getTodayRecovery():Promise<RecoveryResult>{return getRecoveryForDate(todayCivilDate());}
export async function getRecoveryForDateRange(startDate:string,endDate:string):Promise<RecoveryResult[]>{if(!isValidDay(startDate)||!isValidDay(endDate)||startDate>endDate)return[];const out:RecoveryResult[]=[];let d=startDate;while(d<=endDate){out.push(await getRecoveryForDate(d));const next=dayShift(d,1);if(!next)break;d=next;}return out;}
export const RECOVERY_STORAGE_KEYS=[WORKOUT_KEY,'jeevya:health:sleep'];
export async function __recoveryStorageSanity(){return loadData(RECOVERY_STORAGE_KEYS[0],[]);}



