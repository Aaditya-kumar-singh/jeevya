import { loadData, saveData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import { todayCivilDate } from '@/lib/date';
import type { CreateTaskInput, Task } from '@/types/tasks';
import type { QuickTaskParse, RescheduleSuggestion, TaskTemplate, TaskContext, TaskEnergy } from '@/types/taskIntelligence';

const TEMPLATES_KEY='jeevya:task-templates:v1';
const DEPENDENCIES_KEY='jeevya:task-dependencies:v1';

function normalizeTemplate(raw:any):TaskTemplate|null{
 if(!raw||typeof raw!=='object'||!String(raw.name??'').trim()||!String(raw.title??'').trim())return null;
 return {id:String(raw.id??uid('template_')),name:String(raw.name).trim(),title:String(raw.title).trim(),description:raw.description?String(raw.description):undefined,priority:raw.priority==='high'||raw.priority==='low'?'low'===raw.priority?'low':'high':'medium',estimatedMinutes:typeof raw.estimatedMinutes==='number'&&raw.estimatedMinutes>0?Math.round(raw.estimatedMinutes):undefined,energy:['low','medium','high'].includes(raw.energy)?raw.energy as TaskEnergy:undefined,context:['anywhere','home','work','computer','phone','errand'].includes(raw.context)?raw.context as TaskContext:undefined,recurrence:raw.recurrence??null,createdAt:String(raw.createdAt??new Date().toISOString()),updatedAt:String(raw.updatedAt??new Date().toISOString())};
}
export async function getTaskTemplates():Promise<TaskTemplate[]>{return (await loadData<any[]>(TEMPLATES_KEY,[])).map(normalizeTemplate).filter(Boolean) as TaskTemplate[];}
export async function saveTaskTemplate(template:Omit<TaskTemplate,'id'|'createdAt'|'updatedAt'>):Promise<TaskTemplate>{const now=new Date().toISOString();const created={...template,id:uid('template_'),createdAt:now,updatedAt:now};await saveData(TEMPLATES_KEY,[...(await getTaskTemplates()),created]);return created;}
export async function deleteTaskTemplate(id:string){await saveData(TEMPLATES_KEY,(await getTaskTemplates()).filter(t=>t.id!==id));}
export function taskFromTemplate(template:TaskTemplate,overrides:Partial<CreateTaskInput>={}):CreateTaskInput{return{title:template.title,description:template.description,priority:template.priority,estimatedMinutes:template.estimatedMinutes??null,energy:template.energy??null,context:template.context??null,recurrence:template.recurrence,...overrides,templateId:template.id};}

export function parseNaturalTask(input:string, today=todayCivilDate()):QuickTaskParse{
 let text=input.trim(), priority:QuickTaskParse['priority'];
 const priorityMatch=/\b(urgent|high|low|medium)(?:\s+priority)?\b/i.exec(text);
 if(priorityMatch){const p=priorityMatch[1].toLowerCase();priority=p==='urgent'||p==='high'?'high':p as any;text=text.replace(priorityMatch[0],'').trim();}
 let estimatedMinutes:number|undefined;const duration=/\b(?:for\s*)?(\d+)\s*(min|mins|minutes|h|hr|hrs|hours)\b/i.exec(text);
 if(duration){estimatedMinutes=Number(duration[1])*(/^h/i.test(duration[2])?60:1);text=text.replace(duration[0],'').trim();}
 let dueDate:string|null=null;let dueTime:string|null=null;
 const time=/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(text);
 if(time){let h=Number(time[1]);const m=Number(time[2]??0);const ap=time[3].toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;dueTime=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');text=text.replace(time[0],'').trim();}
 const date=/\b(today|tomorrow)\b/i.exec(text);
 if(date){dueDate=date[1].toLowerCase()==='today'?today:shiftDay(today,1);text=text.replace(date[0],'').trim();}
 const energy=/\b(low energy|medium energy|high energy)\b/i.exec(text);const context=/\b(at home|at work|on computer|on phone|errand)\b/i.exec(text);
 if(energy){energyResult:0;text=text.replace(energy[0],'').trim();}
 const e=energy?energy[1].split(' ')[0] as TaskEnergy:undefined;
 let c:TaskContext|undefined;if(context){c=context[1].includes('home')?'home':context[1].includes('work')?'work':context[1].includes('computer')?'computer':context[1].includes('phone')?'phone':'errand';text=text.replace(context[0],'').trim();}
 return {title:text.replace(/\s{2,}/g,' ').replace(/[,.]$/,'').trim(),dueDate,dueTime,priority,estimatedMinutes,energy:e,context:c};
}
function shiftDay(date:string,delta:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);}
export async function setTaskDependency(taskId:string,dependsOnTaskId:string):Promise<boolean>{if(!taskId||!dependsOnTaskId||taskId===dependsOnTaskId)return false;const all=await loadData<any[]>(DEPENDENCIES_KEY,[]);if(all.some(x=>x.taskId===taskId&&x.dependsOnTaskId===dependsOnTaskId))return true;await saveData(DEPENDENCIES_KEY,[...all,{id:uid('dep_'),taskId,dependsOnTaskId:dependsOnTaskId,createdAt:new Date().toISOString()}]);return true;}
export async function removeTaskDependency(taskId:string,dependsOnTaskId:string){await saveData(DEPENDENCIES_KEY,(await loadData<any[]>(DEPENDENCIES_KEY,[])).filter(x=>!(x.taskId===taskId&&x.dependsOnTaskId===dependsOnTaskId)));}
export async function getTaskDependencies(taskId:string){return (await loadData<any[]>(DEPENDENCIES_KEY,[])).filter(x=>x.taskId===taskId);}
export function suggestReschedules(tasks:Task[],asOf=todayCivilDate()):RescheduleSuggestion[]{const overdue=tasks.filter(t=>!t.completed&&!t.archived&&!!t.dueDate&&t.dueDate<asOf);return overdue.map(t=>({taskId:t.id,reason:t.priority==='high'?'High-priority task is overdue.':'Task is overdue and has not been completed.',suggestedDate:asOf}));}
export function getFocusTasks(tasks:Task[],energy?:TaskEnergy,context?:TaskContext):Task[]{return tasks.filter(t=>!t.completed&&!t.archived&&(!energy||t.energy===energy)&&(!context||!t.context||t.context===context)).sort((a,b)=>(b.priority==='high'?2:b.priority==='medium'?1:0)-(a.priority==='high'?2:a.priority==='medium'?1:0)||(a.estimatedMinutes??999)-(b.estimatedMinutes??999));}
