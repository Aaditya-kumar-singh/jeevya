import { daysBetweenInclusive, isValidCivilDate, todayCivilDate, type CivilDate } from '@/lib/date';
import { loadData, saveData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import { getSavingsGoals } from '@/services/finance';
import { getBooks } from '@/services/books';
import { formatGoalPeriod, getGoalProgress, getGoals as getBookGoals } from '@/services/book-goals';
import { getTasks } from '@/services/tasks';
import { getHabits } from '@/services/habits';
import { getWorkoutHistory } from '@/services/workouts';
import { getFoodLogs } from '@/services/nutrition';
import type { CreateGoalInput, GoalLink, GoalLinkDomain, GoalMetric, GoalMilestone, GoalSource, GoalProgressResult, UnifiedGoal, UnifiedGoalStatus } from '@/types/goalsIntegration';

const GOALS_KEY='jeevya:goals:v2';
const LINKS_KEY='jeevya:goal-links:v1';
const MILESTONES_KEY='jeevya:goal-milestones:v1';
interface StoredGoal extends CreateGoalInput { id:string; source:GoalSource; createdAt:string; updatedAt:string; }

function finiteNonNegative(v:unknown):v is number{return typeof v==='number'&&Number.isFinite(v)&&v>=0;}
function validDate(v:unknown):v is CivilDate{return isValidCivilDate(v);}
function target(v:unknown):number|null{return finiteNonNegative(v)&&v>0?v:null;}

export function calculateGoalProgress(currentValue:unknown,targetValue:unknown,window:{startDate?:CivilDate;endDate?:CivilDate}={},asOf:CivilDate=todayCivilDate()):GoalProgressResult{
 const t=target(targetValue), c=finiteNonNegative(currentValue)?currentValue:null;
 if(t===null||c===null||!validDate(asOf))return{currentValue:c,targetValue:t,progressPercentage:null,status:'unavailable'};
 if(window.startDate&&!validDate(window.startDate)||window.endDate&&!validDate(window.endDate)||(window.startDate&&window.endDate&&window.startDate>window.endDate))return{currentValue:c,targetValue:t,progressPercentage:null,status:'unavailable'};
 const p=Math.min(100,Math.max(0,Math.round(c/t*100)));
 if(c>=t)return{currentValue:c,targetValue:t,progressPercentage:p,status:'completed'};
 if(window.startDate&&asOf<window.startDate)return{currentValue:c,targetValue:t,progressPercentage:p,status:'upcoming'};
 if(window.endDate&&asOf>window.endDate)return{currentValue:c,targetValue:t,progressPercentage:p,status:'ended'};
 if(window.startDate&&window.endDate&&window.startDate<window.endDate){
   const total=daysBetweenInclusive(window.startDate,window.endDate),elapsed=daysBetweenInclusive(window.startDate,asOf);
   if(total>1&&elapsed>0&&p<(elapsed/total)*100)return{currentValue:c,targetValue:t,progressPercentage:p,status:'behind'};
 }
 return{currentValue:c,targetValue:t,progressPercentage:p,status:'active'};
}
function day(v:unknown):CivilDate|undefined{if(typeof v!=='string')return;const d=v.slice(0,10);return validDate(d)?d:undefined;}
function metricSource(metric:GoalMetric):GoalSource{
 switch(metric){case'books_completed':case'pages_read':return'books';case'savings_amount':return'finance';case'tasks_completed':return'tasks';case'habit_completions':return'habits';case'workout_sessions':case'workout_minutes':return'workouts';case'nutrition_logged_days':return'nutrition';case'journal_entries':return'journal';default:return'custom';}
}
function metricLabel(metric:GoalMetric){return metric.replaceAll('_',' ');}
async function loadUserGoals():Promise<StoredGoal[]>{return loadData<StoredGoal[]>(GOALS_KEY,[]).then(x=>Array.isArray(x)?x:[]);}
async function loadLinks():Promise<GoalLink[]>{return loadData<GoalLink[]>(LINKS_KEY,[]).then(x=>Array.isArray(x)?x:[]);}
async function loadMilestones():Promise<Record<string,GoalMilestone[]>>{return loadData<Record<string,GoalMilestone[]>>(MILESTONES_KEY,{});}
export async function createGoal(input:CreateGoalInput):Promise<UnifiedGoal>{
 const title=input.title.trim();const t=target(input.targetValue);if(!title||!t)throw new Error('Goal title and a positive target are required.');
 const now=new Date().toISOString();const stored:StoredGoal={...input,id:uid('goal_'),source:input.source??metricSource(input.metric),targetValue:t,title,createdAt:now,updatedAt:now};
 const goals=await loadUserGoals();await saveData(GOALS_KEY,[...goals,stored]);return getUserGoal(stored,todayCivilDate()) as Promise<UnifiedGoal>;
}
export async function updateGoal(id:string,patch:Partial<CreateGoalInput>):Promise<UnifiedGoal>{
 const goals=await loadUserGoals();const i=goals.findIndex(g=>g.id===id);if(i<0)throw new Error('Goal not found');
 goals[i]={...goals[i],...patch,title:patch.title?.trim()||goals[i].title,targetValue:patch.targetValue??goals[i].targetValue,updatedAt:new Date().toISOString()};await saveData(GOALS_KEY,goals);const updated=goals[i];return getUserGoal(updated,todayCivilDate());
}
export async function archiveGoal(id:string){const goals=await loadUserGoals();await saveData(GOALS_KEY,goals.filter(g=>g.id!==id));await saveData(LINKS_KEY,(await loadLinks()).filter(l=>l.goalId!==id));const ms=await loadMilestones();delete ms[id];await saveData(MILESTONES_KEY,ms);}
export async function linkGoalRecord(goalId:string,domain:GoalLinkDomain,recordId:string,weight=1):Promise<GoalLink>{
 const goals=await loadUserGoals();if(!goals.some(g=>g.id===goalId))throw new Error('Goal not found');if(!recordId.trim())throw new Error('Record id is required.');
 const links=await loadLinks();const existing=links.find(l=>l.goalId===goalId&&l.domain===domain&&l.recordId===recordId);if(existing)return existing;
 const link={id:uid('glink_'),goalId,domain,recordId,weight:Number.isFinite(weight)&&weight>0?weight:1,createdAt:new Date().toISOString()};await saveData(LINKS_KEY,[...links,link]);return link;
}
export async function unlinkGoalRecord(id:string){await saveData(LINKS_KEY,(await loadLinks()).filter(l=>l.id!==id));}
export async function setGoalMilestones(goalId:string,milestones:Array<Pick<GoalMilestone,'title'|'targetValue'>>):Promise<GoalMilestone[]>{
 const all=await loadMilestones();const next=milestones.map((m,i)=>({id:uid('milestone_'),title:m.title.trim(),targetValue:m.targetValue,completed:false,completedAt:null})).filter(m=>m.title&&finiteNonNegative(m.targetValue)&&m.targetValue>0);
 all[goalId]=next;await saveData(MILESTONES_KEY,all);return next;
}
async function userGoalValue(goal:StoredGoal,asOf:CivilDate):Promise<number>{
 const start=goal.startDate??'0000-01-01';const end=goal.endDate&&goal.endDate<asOf?goal.endDate:asOf;
 switch(goal.metric){
  case'tasks_completed':return (await getTasks()).filter(t=>t.completed).filter(t=>{const d=day(t.completedAt??t.updatedAt);return !!d&&d>=start&&d<=end;}).length;
  case'habit_completions':{const h=await getHabits();const logs=await loadData<any[]>('jeevya:habit-logs',[]);const count=logs.filter((x:any)=>{const d=day(x?.date);return !!x?.completed&&!!d&&d>=start&&d<=end;}).length;return h.length?Math.min(h.length,count):count;}
  case'journal_entries':return(await loadData<any[]>('jeevya:journal',[])).filter((e:any)=>e&&typeof e.date==='string'&&e.date>=start&&e.date<=end).length;
  case'workout_sessions':return(await getWorkoutHistory()).filter(w=>{const d=day(w.completedAt??w.createdAt);return !!d&&d>=start&&d<=end;}).length;
  case'workout_minutes':return(await getWorkoutHistory()).filter(w=>{const d=day(w.completedAt??w.createdAt);return !!d&&d>=start&&d<=end;}).reduce((s,w)=>s+(w.durationSeconds??0)/60,0);
  case'nutrition_logged_days':{const logs=await getFoodLogs();return new Set(logs.filter(x=>x.date>=start&&x.date<=end).map(x=>x.date)).size;}
  default:return 0;
 }
}
async function getUserGoal(goal:StoredGoal,asOf:CivilDate):Promise<UnifiedGoal>{
 const current=await userGoalValue(goal,asOf),progress=calculateGoalProgress(current,goal.targetValue,{startDate:goal.startDate,endDate:goal.endDate},asOf),links=(await loadLinks()).filter(l=>l.goalId===goal.id),ms=(await loadMilestones())[goal.id]??[];
 return{...goal,currentValue:progress.currentValue,targetValue:progress.targetValue,progressPercentage:progress.progressPercentage,status:progress.status,parentGoalId:goal.parentGoalId??null,milestones:ms,linkedRecordIds:links.map(l=>l.recordId)};
}
async function adaptBookGoals(asOf:CivilDate):Promise<UnifiedGoal[]>{const[goals,books]=await Promise.all([getBookGoals(),getBooks()]);return goals.map(g=>{const p=getGoalProgress(g,books),x=calculateGoalProgress(p.achieved,g.target,{startDate:validDate(g.startDate)?g.startDate:undefined,endDate:validDate(g.endDate)?g.endDate:undefined},asOf);return{id:`books:${g.id}`,title:`${formatGoalPeriod(g)} reading goal`,source:'books' as const,metric:g.type==='books'?'books_completed' as const:'pages_read' as const,targetValue:x.targetValue,currentValue:x.currentValue,progressPercentage:x.progressPercentage,status:x.status,startDate:validDate(g.startDate)?g.startDate:undefined,endDate:validDate(g.endDate)?g.endDate:undefined,createdAt:g.createdAt,updatedAt:g.updatedAt,milestones:[],linkedRecordIds:[]};});}
async function adaptFinanceGoals(asOf:CivilDate):Promise<UnifiedGoal[]>{const goals=await getSavingsGoals();return goals.map(g=>{const x=calculateGoalProgress(g.currentAmount,g.targetAmount,{startDate:day(g.createdAt),endDate:validDate(g.deadline)?g.deadline:undefined},asOf);return{id:`finance:${g.id}`,title:g.name,source:'finance' as const,metric:'savings_amount' as const,targetValue:x.targetValue,currentValue:x.currentValue,progressPercentage:x.progressPercentage,status:x.status,startDate:day(g.createdAt),endDate:validDate(g.deadline)?g.deadline:undefined,createdAt:g.createdAt,updatedAt:g.updatedAt,milestones:[],linkedRecordIds:[]};});}
export async function getUnifiedGoals(asOf:CivilDate=todayCivilDate()):Promise<UnifiedGoal[]>{
 if(!validDate(asOf))return[];const[user,books,finance]=await Promise.all([loadUserGoals(),adaptBookGoals(asOf),adaptFinanceGoals(asOf)]);const custom=await Promise.all(user.map(g=>getUserGoal(g,asOf)));
 return[...custom,...books,...finance].sort((a,b)=>(a.status==='completed'?1:0)-(b.status==='completed'?1:0)||(b.progressPercentage??-1)-(a.progressPercentage??-1)||a.id.localeCompare(b.id));
}
export function getGoalStatusLabel(status:UnifiedGoalStatus){return status==='completed'?'Completed':status==='behind'?'Behind':status==='upcoming'?'Upcoming':status==='ended'?'Ended':status==='unavailable'?'Unavailable':'Active';}
export function getGoalSourceLabel(source:GoalSource){return source[0].toUpperCase()+source.slice(1);}
export function getGoalMetricLabel(metric:GoalMetric){return metricLabel(metric);}
