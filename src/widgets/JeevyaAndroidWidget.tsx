import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetModule, WidgetModuleSnapshot, WidgetSnapshot } from '@/types/widgets';

type WidgetSize = 'small' | 'medium' | 'large';
interface JeevyaAndroidWidgetProps { snapshot: WidgetSnapshot; width: number; height: number; dark?: boolean; }

const MODULE_LABELS: Record<WidgetModule, string> = { tasks:'Tasks', habits:'Habits', workout:'Workout', sleep:'Sleep', recovery:'Recovery', calories:'Calories', protein:'Protein', carbohydrates:'Carbs', fat:'Fat', water:'Water', finance_spending:'Spending', finance_budget:'Budget', finance_payment_review:'Payment review', savings:'Savings', books:'Books', goals:'Goals', daily_pulse:'Daily Pulse', daily_plan:'Daily Plan', life_intelligence:'Life Intelligence' };
const VALUE_LABELS: Record<string,string> = { total:'Total', dueToday:'Due today', overdue:'Overdue', completedToday:'Done', scheduled:'Scheduled', completionRate:'Completion', active:'Active', completedMinutes:'Minutes', durationMinutes:'Duration', quality:'Quality', readinessScore:'Readiness', readinessLevel:'Level', calories:'Calories', protein:'Protein', carbohydrates:'Carbs', fat:'Fat', expenseToday:'Today', transactionsToday:'Transactions', totalBudget:'Budget', totalSpent:'Spent', remaining:'Remaining', percentage:'Progress', current:'Current', target:'Target', currentlyReading:'Reading', activeToday:'Active today', pending:'Pending', completed:'Completed', amountMl:'Today', goalMl:'Goal', itemCount:'Items', focusCount:'Focus', progressCount:'Progress', insightCount:'Insights', warningCount:'Warnings' };

function getSize(width:number,height:number):WidgetSize { if(width>=250 || height>=180) return 'large'; if(width>=160 || height>=110) return 'medium'; return 'small'; }
function maxModules(size:WidgetSize,density:WidgetSnapshot['density']) { if(size==='large') return density==='detailed'?7:6; if(size==='medium') return density==='detailed'?4:3; return 2; }
function formatValue(key:string,value:number|string|boolean):string {
  if(typeof value==='boolean') return value?'Yes':'No';
  if(key==='completionRate'||key==='percentage') return String(value)+'%';
  if(key==='durationMinutes'||key==='completedMinutes') return String(value)+'m';
  if(key==='amountMl'||key==='goalMl') return Math.round(Number(value)).toLocaleString('en-IN')+' ml';
  if(typeof value==='number'){
    if(key==='calories') return Math.round(value)+' kcal';
    if(key==='protein'||key==='carbohydrates'||key==='fat') return Math.round(value)+'g';
    if(key==='expenseToday'||key==='totalBudget'||key==='totalSpent'||key==='remaining'||key==='current'||key==='target') return '₹'+Math.round(value).toLocaleString('en-IN');
  }
  return String(value);
}
function primaryEntry(module:WidgetModuleSnapshot){ return Object.entries(module.values)[0] ?? null; }
function secondaryEntries(module:WidgetModuleSnapshot){ return Object.entries(module.values).slice(1,3); }

function ModuleCard({module,size,textColor,secondaryColor,accentColor,borderColor,compact=false}:{module:WidgetModuleSnapshot;size:WidgetSize;textColor:any;secondaryColor:any;accentColor:any;borderColor:any;compact?:boolean}) {
  const primary=primaryEntry(module); const secondary=secondaryEntries(module); const label=module.title||MODULE_LABELS[module.module];
  return <FlexWidget style={{flex:1,padding:compact?8:size==='large'?11:9,borderRadius:compact?12:14,backgroundColor:accentColor,borderWidth:1,borderColor,flexDirection:'column',justifyContent:'space-between'}} clickAction="OPEN_URI" clickActionData={{uri:'jeevya://'+module.action.navigationTarget}} accessibilityLabel={module.action.label}>
    <TextWidget text={label} maxLines={1} truncate="END" style={{color:secondaryColor,fontSize:compact?9:10,fontWeight:'600'}} />
    {primary ? <FlexWidget style={{width:'match_parent',paddingTop:4}}><TextWidget text={formatValue(primary[0],primary[1])} maxLines={1} truncate="END" style={{color:textColor,fontSize:compact?15:size==='large'?19:17,fontWeight:'700'}} /><TextWidget text={VALUE_LABELS[primary[0]]??primary[0]} maxLines={1} truncate="END" style={{color:secondaryColor,fontSize:8,paddingTop:1}} /></FlexWidget> : null}
    {!compact&&secondary.length>0 ? <TextWidget text={secondary.map(([key,value])=>(VALUE_LABELS[key]??key)+' '+formatValue(key,value)).join(' · ')} maxLines={1} truncate="END" style={{color:secondaryColor,fontSize:8,paddingTop:5}} /> : null}
  </FlexWidget>;
}

function renderBody(size:WidgetSize,modules:WidgetModuleSnapshot[],colors:{text:any;secondary:any;accent:any;border:any},layout:'stack'|'split'|'grid'|'hero_list'='stack') {
  const card=(module:WidgetModuleSnapshot, compact=false)=><ModuleCard key={module.module} module={module} size={size} compact={compact} textColor={colors.text} secondaryColor={colors.secondary} accentColor={colors.accent} borderColor={colors.border}/>;
  if(size==='small') return <FlexWidget style={{width:'match_parent',flex:1,flexDirection:'column',flexGap:7}}>{modules.slice(0,2).map((module,index)=>card(module,index===1))}</FlexWidget>;
  if(layout==='grid') {
    const rows: WidgetModuleSnapshot[][]=[];
    for(let i=0;i<modules.length;i+=2) rows.push(modules.slice(i,i+2));
    return <FlexWidget style={{width:'match_parent',flex:1,flexDirection:'column',flexGap:7}}>{rows.map((row,index)=><FlexWidget key={index} style={{width:'match_parent',flex:1,flexDirection:'row',flexGap:7}}>{row.map((module)=>card(module,true))}</FlexWidget>)}</FlexWidget>;
  }
  if(layout==='split') {
    const left=modules.filter((_,index)=>index%2===0); const right=modules.filter((_,index)=>index%2===1);
    return <FlexWidget style={{width:'match_parent',flex:1,flexDirection:'row',flexGap:7}}><FlexWidget style={{flex:1,flexDirection:'column',flexGap:7}}>{left.map((module)=>card(module,true))}</FlexWidget><FlexWidget style={{flex:1,flexDirection:'column',flexGap:7}}>{right.map((module)=>card(module,true))}</FlexWidget></FlexWidget>;
  }
  if(layout==='hero_list') {
    const hero=modules[0]; const rest=modules.slice(1,7);
    return <FlexWidget style={{width:'match_parent',flex:1,flexDirection:'column',flexGap:7}}>{hero?<FlexWidget style={{width:'match_parent',padding:12,borderRadius:16,backgroundColor:colors.accent,borderWidth:1,borderColor:colors.border}} clickAction="OPEN_URI" clickActionData={{uri:'jeevya://'+hero.action.navigationTarget}} accessibilityLabel={hero.action.label}><TextWidget text={hero.title||MODULE_LABELS[hero.module]} maxLines={1} style={{color:colors.secondary,fontSize:10,fontWeight:'600'}}/>{primaryEntry(hero)?<TextWidget text={formatValue(primaryEntry(hero)![0],primaryEntry(hero)![1])} maxLines={1} truncate="END" style={{color:colors.text,fontSize:26,fontWeight:'700',paddingTop:4}}/>:null}<TextWidget text={secondaryEntries(hero).map(([key,value])=>(VALUE_LABELS[key]??key)+' '+formatValue(key,value)).join(' · ')||'Open in Jeevya'} maxLines={1} truncate="END" style={{color:colors.secondary,fontSize:9,paddingTop:2}}/></FlexWidget>:null}{rest.map((module)=>card(module,true))}</FlexWidget>;
  }
  return <FlexWidget style={{width:'match_parent',flex:1,flexDirection:'column',flexGap:7}}>{modules.slice(0,size==='medium'?3:7).map((module,index)=>card(module,index>1))}</FlexWidget>;
}
function renderWidget(snapshot:WidgetSnapshot,width:number,height:number,dark:boolean):React.JSX.Element {
  const size=snapshot.size??getSize(width,height); const modules=snapshot.modules.slice(0,maxModules(size,snapshot.density)); const theme=snapshot.theme;
  const background=dark?'#10131C':(theme?.backgroundColor??'#FFFFFF'); const border=dark?'#273044':'#E2E8F0'; const text=dark?'#F8FAFC':(theme?.textColor??'#0F172A'); const secondary=dark?'#94A3B8':'#64748B'; const primary=theme?.accentColor??(dark?'#A5B4FC':'#6366F1');
  const colors={text:text as any,secondary:secondary as any,accent:primary as any,border:border as any}; const title=snapshot.title||'Jeevya';
  const dateLabel=new Date(snapshot.date+'T12:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
  return <FlexWidget style={{width:'match_parent',height:'match_parent',padding:size==='small'?9:size==='medium'?11:13,backgroundColor:background as any,borderRadius:Math.max(12,Math.min(24,theme?.radius??18)),borderWidth:1,borderColor:border as any,flexGap:6}} clickAction="OPEN_APP" accessibilityLabel={title+' '+size+' widget'}>
    <FlexWidget style={{width:'match_parent',flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingBottom:size==='small'?2:4}}><FlexWidget style={{flex:1}}><TextWidget text={title} maxLines={1} truncate="END" style={{color:colors.text,fontSize:size==='small'?12:14,fontWeight:'700'}}/>{size!=='small'?<TextWidget text={dateLabel} maxLines={1} style={{color:colors.secondary,fontSize:8,paddingTop:1}}/>:null}</FlexWidget>{snapshot.degradedDomains.length>0?<TextWidget text="Limited" maxLines={1} style={{color:colors.accent,fontSize:8,fontWeight:'700'}}/>:null}</FlexWidget>
    {modules.length>0?renderBody(size,modules,colors,snapshot.layout ?? 'stack'):<FlexWidget style={{width:'match_parent',flex:1,alignItems:'center',justifyContent:'center'}}><TextWidget text="No data yet" maxLines={1} style={{color:colors.secondary,fontSize:11,fontWeight:'600'}}/><TextWidget text="Open Jeevya to get started" maxLines={1} style={{color:colors.secondary,fontSize:9,paddingTop:3}}/></FlexWidget>}
  </FlexWidget>;
}
export function JeevyaAndroidWidget({snapshot,width,height,dark=false}:JeevyaAndroidWidgetProps){return renderWidget(snapshot,width,height,dark);}
export function renderJeevyaAndroidWidget(snapshot:WidgetSnapshot,width:number,height:number):{light:React.JSX.Element;dark:React.JSX.Element}{return {light:renderWidget(snapshot,width,height,false),dark:renderWidget(snapshot,width,height,true)};}