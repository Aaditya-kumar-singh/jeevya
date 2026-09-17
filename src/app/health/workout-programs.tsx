import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View, TextInput } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ChevronRight, Copy, Plus, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { useWorkoutPrograms } from '@/hooks/useWorkoutPrograms';
import type { WorkoutProgram } from '@/types/workout';

export default function WorkoutProgramsScreen() {
  const router=useRouter();
  const { getPrograms, createProgram, deleteProgram, duplicateProgram, setProgramActive } = useWorkoutPrograms();
  const [programs,setPrograms]=useState<WorkoutProgram[]>([]); const [q,setQ]=useState('');
  const load=useCallback(async()=>setPrograms(await getPrograms(q)),[getPrograms,q]); useEffect(()=>{ // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  },[load]);
  const create=async()=>{const p=await createProgram({name:'New Program'}); router.push({pathname:'/health/workout-program-editor',params:{id:p.id}} as never);};
  return <View className="flex-1 bg-background"><ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}><View className="gap-4">
    <View className="flex-row items-center justify-between"><View><Heading size="xl" className="font-bold">Workout Programs</Heading><Text className="text-muted-foreground mt-1">Weekly workout planning</Text></View><ScalePressable onPress={()=>void create()}><View className="h-11 w-11 rounded-2xl bg-rose-500 items-center justify-center"><Plus size={22} color="#fff"/></View></ScalePressable></View>
    <TextInput value={q} onChangeText={setQ} placeholder="Search programs" />
    {programs.map(p=><Card key={p.id} className="p-4 rounded-3xl border border-border gap-3"><View className="flex-row items-center justify-between"><View className="flex-1"><Heading size="md" className="font-bold">{p.name}</Heading><Text size="sm" className="text-muted-foreground mt-1">{p.schedule.length} scheduled workouts · {p.isActive?'Active':'Inactive'}</Text></View><Link href={{pathname:'/health/workout-program-editor',params:{id:p.id}} as never} asChild><ScalePressable><ChevronRight size={20}/></ScalePressable></Link></View><View className="flex-row gap-2"><Button size="sm" onPress={()=>void setProgramActive(p.id,!p.isActive).then(load)}><ButtonText>{p.isActive?'Deactivate':'Activate'}</ButtonText></Button><Button size="sm" variant="outline" onPress={()=>void duplicateProgram(p.id).then(load)}><Copy size={16}/></Button><Button size="sm" variant="outline" onPress={()=>Alert.alert('Delete program?',p.name,[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>void deleteProgram(p.id).then(load)}])}><Trash2 size={16}/></Button></View></Card>)}
    {!programs.length&&<Text className="text-muted-foreground text-center py-8">No workout programs yet.</Text>}
  </View></ScrollView></View>;
}
