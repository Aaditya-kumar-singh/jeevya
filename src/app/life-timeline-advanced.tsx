import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { Button, ButtonText } from '@/components/ui/button'; import { Card } from '@/components/ui/card'; import { Heading } from '@/components/ui/heading'; import { Text } from '@/components/ui/text';
import { getLifeTimeline } from '@/services/lifeTimeline'; import { addDays, todayCivilDate } from '@/lib/date'; import type { LifeTimelineEvent, LifeTimelineFilter } from '@/types/lifeTimeline';
const filters:LifeTimelineFilter[]=['all','tasks','habits','health/workout','nutrition','finance','books','journal','goals'];
export default function TimelineAdvanced(){
 const router=useRouter();const[today]=useState(todayCivilDate());const[view,setView]=useState<'day'|'week'|'month'>('week');const[filter,setFilter]=useState<LifeTimelineFilter>('all');const[q,setQ]=useState('');const[anchor,setAnchor]=useState(today);const[data,setData]=useState<{events:LifeTimelineEvent[];total:number}|null>(null);
 const load=async()=>{let start=anchor,end=anchor;if(view==='week')start=addDays(anchor,-6)??anchor;if(view==='month'){start=anchor.slice(0,7)+'-01';const d=new Date(anchor+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);end=d.toISOString().slice(0,10)}const x=await getLifeTimeline({filter,search:q,startDate:start,endDate:end,newestFirst:true});setData(x)};
 useEffect(()=>{void load()},[anchor,view,filter,q]);
 const shift=(n:number)=>{const d=new Date(anchor+'T12:00:00Z');if(view==='day')d.setUTCDate(d.getUTCDate()+n);else if(view==='week')d.setUTCDate(d.getUTCDate()+n*7);else d.setUTCMonth(d.getUTCMonth()+n);setAnchor(d.toISOString().slice(0,10))};
 return <ScrollView className="flex-1 bg-background" contentContainerStyle={{paddingBottom:40}}><View className="gap-4 px-5 pt-14">
  <View className="flex-row items-center gap-3"><Button variant="ghost" size="icon" onPress={()=>router.back()}><ArrowLeft size={20}/></Button><View className="flex-1"><Text size="sm" className="text-muted-foreground">History</Text><Heading size="xl">Timeline Explorer</Heading></View></View>
  <View className="flex-row gap-2">{(['day','week','month'] as const).map(v=><Pressable key={v} onPress={()=>setView(v)} className={view===v?'flex-1 rounded-xl bg-primary p-3':'flex-1 rounded-xl bg-muted p-3'}><Text className={view===v?'text-primary-foreground':''} style={{textAlign:'center'}}>{v}</Text></Pressable>)}</View>
  <View className="flex-row items-center gap-2 rounded-xl border border-border p-3"><Search size={16}/><TextInput value={q} onChangeText={setQ} placeholder="Search timeline" placeholderTextColor="#9CA3AF" className="flex-1 text-foreground"/></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>{filters.map(f=><Pressable key={f} onPress={()=>setFilter(f)} className={filter===f?'rounded-full border border-primary bg-primary/10 px-3 py-2':'rounded-full border border-border px-3 py-2'}><Text size="xs">{f}</Text></Pressable>)}</ScrollView>
  <View className="flex-row items-center justify-between"><Button variant="outline" onPress={()=>shift(-1)}><ButtonText>Previous</ButtonText></Button><Text size="sm" className="font-semibold">{view} · {anchor}</Text><Button variant="outline" onPress={()=>shift(1)}><ButtonText>Next</ButtonText></Button></View>
  {data?.events.map(e=><Pressable key={e.id} onPress={()=>e.route&&router.push(e.route as never)}><Card className="p-4"><Heading size="sm">{e.title}</Heading><Text size="xs" className="text-muted-foreground">{e.date} · {e.domain} · {e.type}</Text>{e.description?<Text size="sm" className="mt-1">{e.description}</Text>:null}</Card></Pressable>)}{data?.events.length===0?<Card className="p-6"><Text className="text-center text-muted-foreground">No events in this range.</Text></Card>:null}
 </View></ScrollView>;
}