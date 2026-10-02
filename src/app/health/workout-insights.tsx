import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, Dumbbell, Trophy } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { getWorkoutAdvancedAnalytics, type WorkoutAdvancedAnalytics } from '@/services/workoutAdvanced';

export default function WorkoutInsightsScreen(){
 const router=useRouter(); const [data,setData]=useState<WorkoutAdvancedAnalytics|null>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;getWorkoutAdvancedAnalytics(90).then(x=>{if(active)setData(x)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 if(loading)return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator/><Text size="sm" className="mt-3 text-muted-foreground">Loading workout analytics...</Text></View>;
 return <ScrollView className="flex-1 bg-background" contentContainerStyle={{padding:20,paddingTop:56,paddingBottom:40}}>
  <View className="flex-row items-center gap-3"><Pressable onPress={()=>router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-muted"><ArrowLeft size={20}/></Pressable><View><Text size="xs" className="text-muted-foreground">Training</Text><Heading size="xl">Workout Insights</Heading></View></View>
  <Card className="mt-4 p-4 gap-3"><View className="flex-row items-center gap-2"><BarChart3 size={18}/><Heading size="sm">Volume trend</Heading></View>{data?.volumeTrend.length?data.volumeTrend.slice(-14).map(x=><View key={x.date} className="flex-row justify-between border-b border-border/60 py-2"><Text size="xs">{x.date}</Text><Text size="xs" className="font-semibold">{Math.round(x.volume)} kg</Text></View>):<Text size="sm" className="text-muted-foreground">No completed-set volume recorded.</Text>}</Card>
  <Card className="mt-4 p-4 gap-3"><View className="flex-row items-center gap-2"><Dumbbell size={18}/><Heading size="sm">Muscle-group balance</Heading></View>{data?.muscleBalance.length?data.muscleBalance.map(x=><View key={x.muscle} className="flex-row items-center justify-between py-2"><Text size="sm" className="flex-1">{x.muscle}</Text><Text size="xs" className="text-muted-foreground">{x.sets} sets · {x.sharePercent}%</Text></View>):<Text size="sm" className="text-muted-foreground">No muscle-group data available.</Text>}</Card>
  <Card className="mt-4 p-4 gap-3"><View className="flex-row items-center gap-2"><Trophy size={18}/><Heading size="sm">PR timeline</Heading></View>{data?.prTimeline.length?data.prTimeline.slice(-20).reverse().map((x,i)=><View key={x.date+x.exerciseId+x.recordType+i} className="flex-row justify-between border-b border-border/60 py-2"><View><Text size="xs">{x.date}</Text><Text size="xs" className="text-muted-foreground">{x.exerciseId}</Text></View><Text size="xs" className="font-semibold">{x.recordType.replace('_',' ')} · {Math.round(x.value*10)/10}</Text></View>):<Text size="sm" className="text-muted-foreground">No PR events yet.</Text>}</Card>
  <Card className="mt-4 p-4 gap-2"><Heading size="sm">Workout adherence</Heading><Text size="sm">{data?.adherence.completedWorkouts ?? 0} completed workouts across {data?.adherence.activeDays ?? 0} active days in the last 90 days.</Text><Text size="xs" className="text-muted-foreground">Longest recorded gap: {data?.adherence.longestGapDays ?? 0} days. Scheduled-program adherence is unavailable when no schedule history exists.</Text></Card>
 </ScrollView>
}
