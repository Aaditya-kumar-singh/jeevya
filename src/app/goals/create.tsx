import { useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Target } from 'lucide-react-native';
import { Button, ButtonText, Card, Heading, Text } from '@/components/ui';
import { createGoal } from '@/services/goalsIntegration';
import type { GoalMetric } from '@/types/goalsIntegration';

const metrics:GoalMetric[]=['tasks_completed','habit_completions','workout_sessions','workout_minutes','nutrition_logged_days','journal_entries','books_completed','pages_read','savings_amount','custom'];

export default function CreateGoalScreen(){
 const [title,setTitle]=useState('');const [target,setTarget]=useState('');const [metric,setMetric]=useState<GoalMetric>('tasks_completed');
 const [description,setDescription]=useState('');const [saving,setSaving]=useState(false);
 const submit=async()=>{const n=Number(target);if(!title.trim()||!Number.isFinite(n)||n<=0){Alert.alert('Goal needs a target','Enter a title and a positive target value.');return;}setSaving(true);try{await createGoal({title,description,metric,targetValue:n});router.replace('/goals');}catch(e){Alert.alert('Could not create goal',e instanceof Error?e.message:'Please try again.');}finally{setSaving(false);}};
 return <ScrollView className="flex-1 bg-background" contentContainerStyle={{padding:20,paddingTop:56,paddingBottom:48}}>
  <View className="flex-row items-center gap-3 mb-5"><Button variant="ghost" size="icon" onPress={()=>router.back()}><ArrowLeft size={20}/></Button><View className="flex-1"><Heading size="xl">Create goal</Heading><Text size="sm" className="text-muted-foreground">Connect a measurable target to your life data.</Text></View><Target size={24} className="text-primary"/></View>
  <Card className="p-4 rounded-3xl gap-4">
   <View><Text size="xs" className="font-semibold mb-2">Goal title</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Finish 10 tasks" className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground"/></View>
   <View><Text size="xs" className="font-semibold mb-2">Description</Text><TextInput value={description} onChangeText={setDescription} placeholder="Why this matters" multiline className="min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-foreground"/></View>
   <View><Text size="xs" className="font-semibold mb-2">Target</Text><TextInput value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="10" className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground"/></View>
   <View><Text size="xs" className="font-semibold mb-2">Progress metric</Text><View className="flex-row flex-wrap gap-2">{metrics.map(m=><Button key={m} variant={metric===m?'default':'outline'} onPress={()=>setMetric(m)}><ButtonText>{m.replaceAll('_',' ')}</ButtonText></Button>)}</View></View>
   <Button disabled={saving} onPress={()=>void submit()}><ButtonText>{saving?'Creating…':'Create measurable goal'}</ButtonText></Button>
  </Card>
 </ScrollView>;
}
