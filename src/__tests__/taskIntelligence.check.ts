import { parseNaturalTask, getFocusTasks, suggestReschedules } from '@/services/taskIntelligence';
import type { Task } from '@/types/tasks';

const assert=(c:boolean,m:string)=>{if(!c)throw new Error(m)};
const base=(x:Partial<Task>):Task=>({id:'t',title:'Task',description:'',completed:false,priority:'medium',dueDate:null,dueTime:null,createdAt:'2026-09-25T00:00:00Z',updatedAt:'2026-09-25T00:00:00Z',completedAt:null,archived:false,recurrence:null,seriesId:null,subtasks:[],labelIds:[],estimatedMinutes:null,energy:null,context:null,dependencyIds:[],templateId:null,...x});
let passed=0;
const p=parseNaturalTask('Finish report tomorrow at 6 pm for 45 minutes high priority on computer','2026-09-25');
assert(p.title==='Finish report','natural title');assert(p.dueDate==='2026-09-26','tomorrow');assert(p.dueTime==='18:00','time');assert(p.estimatedMinutes===45,'duration');assert(p.priority==='high','priority');assert(p.context==='computer','context');passed++;
const focused=getFocusTasks([base({id:'a',priority:'high',energy:'high',context:'computer',estimatedMinutes:30}),base({id:'b',priority:'low',energy:'high',context:'computer',estimatedMinutes:10})],'high','computer');
assert(focused[0]?.id==='a','focus ordering');passed++;
const suggestions=suggestReschedules([base({id:'late',dueDate:'2026-09-20',priority:'high'})],'2026-09-25');
assert(suggestions.length===1&&suggestions[0].suggestedDate==='2026-09-25','reschedule');passed++;
console.log('JEEVYA TASK INTELLIGENCE:',passed,'passed, 0 failed');
