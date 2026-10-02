import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, CalendarCheck, CheckCircle2 } from 'lucide-react-native';
import { Button } from '@/components/ui/button'; import { Card } from '@/components/ui/card'; import { Heading } from '@/components/ui/heading'; import { Text } from '@/components/ui/text';
import { getUnifiedGoals } from '@/services/goalsIntegration'; import type { UnifiedGoal } from '@/types/goalsIntegration';
export default function GoalReview(){
 const router=useRouter();const[g,setG]=useState<UnifiedGoal[]>([]);useEffect(()=>{void getUnifiedGoals().then(setG)},[]);
 const active=g.filter(x=>x.status==='active'||x.status==='behind'||x.status==='upcoming');const today=new Date().toISOString().slice(0,10);const atRisk=g.filter(x=>x.status==='behind'||(x.endDate&&x.endDate<=today&&x.status!=='completed'));
 return <ScrollView className="flex-1 bg-background" contentContainerStyle={{paddingBottom:40}}><View className="gap-4 px-5 pt-14"><View className="flex-row items-center gap-3"><Button variant="ghost" size="icon" onPress={()=>router.back()}><ArrowLeft size={20}/></Button><View className="flex-1"><Text size="sm" className="text-muted-foreground">Goals</Text><Heading size="xl">Weekly Review</Heading></View><CalendarCheck size={24}/></View>
 <Card className="p-4"><Heading size="md">Review snapshot</Heading><Text size="sm" className="mt-2">Active goals: {active.length}</Text><Text size="sm">At-risk goals: {atRisk.length}</Text><Text size="sm">Completed goals: {g.filter(x=>x.status==='completed').length}</Text></Card>
 {atRisk.map(x=><Card key={x.id} className="border-amber-300 p-4"><View className="flex-row items-center gap-2"><AlertTriangle size={18}/><Heading size="sm">{x.title}</Heading></View><Text size="sm" className="mt-2 text-muted-foreground">{x.progressPercentage??0}% complete{x.endDate?' · due '+x.endDate:''}</Text></Card>)}
 {active.filter(x=>!atRisk.includes(x)).map(x=><Card key={x.id} className="p-4"><View className="flex-row items-center gap-2"><CheckCircle2 size={18}/><Text className="font-semibold">{x.title}</Text></View><Text size="xs" className="text-muted-foreground mt-1">{x.progressPercentage??0}% · {x.status}</Text></Card>)}
 </View></ScrollView>;
}