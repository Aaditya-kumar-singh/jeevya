import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Clock3, Flame, Quote, Target, Trash2 } from 'lucide-react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { getBooks, updateBook } from '@/services/books';
import { getUnifiedGoals, linkGoalRecord } from '@/services/goalsIntegration';
import { createReadingSession, getReadingGoals, getReadingGoalProgress, getReadingSessions, getReadingStreak, getBookNotes, saveBookNote, saveReadingGoal, deleteBookNote, getYearlyReadingReview } from '@/services/readingJournalAdvanced';
import type { Book } from '@/types/books';
import type { ReadingGoal, ReadingSession, BookNote } from '@/services/readingJournalAdvanced';

function GoalRow({goal}:{goal:ReadingGoal}) {
 const [p,setP]=useState<{current:number;target:number;percent:number}|null>(null);
 useEffect(()=>{void getReadingGoalProgress(goal).then(setP)},[goal]);
 return <View className="rounded-xl bg-muted p-3"><Text size="sm" className="font-medium">{goal.title}</Text><Text size="xs" className="text-muted-foreground">{p?.current??0}/{goal.target} {goal.metric} · {p?.percent??0}%</Text></View>;
}
export default function AdvancedBooks() {
 const router=useRouter();
 const [books,setBooks]=useState<Book[]>([]),[selected,setSelected]=useState<Book|null>(null);
 const [sessions,setSessions]=useState<ReadingSession[]>([]),[goals,setGoals]=useState<ReadingGoal[]>([]),[notes,setNotes]=useState<BookNote[]>([]);
 const [streak,setStreak]=useState(0),[review,setReview]=useState<any>(null),[unifiedGoals,setUnifiedGoals]=useState<any[]>([]),[minutesInput,setMinutesInput]=useState('30'),[pagesInput,setPagesInput]=useState('5');
 const load=async()=>{
  const bs=await getBooks(); setBooks(bs);
  const [gs,rs,rv]=await Promise.all([getReadingGoals(),getReadingSessions(),getYearlyReadingReview(new Date().getFullYear())]);
  setGoals(gs);setSessions(rs);setReview(rv);setUnifiedGoals(await getUnifiedGoals());
  if(selected){const fresh=bs.find(b=>b.id===selected.id)??null;setSelected(fresh);if(fresh){setNotes(await getBookNotes(fresh.id));setStreak(await getReadingStreak(fresh.id));}}
 };
 useEffect(()=>{void load()},[]);
 const select=async(b:Book)=>{setSelected(b);setNotes(await getBookNotes(b.id));setStreak(await getReadingStreak(b.id));};
 const logSession=async()=>{
  if(!selected)return;
  const minutes=Math.max(0,Number(minutesInput)||0), pages=Math.max(0,Number(pagesInput)||0);
  const start=new Date(Date.now()-minutes*60000).toISOString();
  await createReadingSession({bookId:selected.id,startedAt:start,endedAt:new Date().toISOString(),minutes,pagesStart:selected.currentPage,pagesEnd:selected.currentPage+pages});
  await updateBook(selected.id,{currentPage:Math.min(selected.totalPages??selected.currentPage+pages,selected.currentPage+pages),status:'reading'});
  await load();
 };
 const addNote=async()=>{if(selected){await saveBookNote({bookId:selected.id,type:'note',text:'New reading note',page:selected.currentPage});await load();}};
 const addGoal=async()=>{const today=new Date().toISOString().slice(0,10);const end=new Date();end.setMonth(end.getMonth()+1);await saveReadingGoal({title:'30-day reading sprint',metric:'minutes',target:300,startDate:today,endDate:end.toISOString().slice(0,10),bookId:null});await load();};
 const linkToGoal=async()=>{if(!selected)return;const goal=unifiedGoals.find(g=>!g.id.includes(':')&&!(g.linkedRecordIds??[]).includes(selected.id));if(goal){await linkGoalRecord(goal.id,'books',selected.id);await load();}};
 const abandon=async()=>{if(selected){await updateBook(selected.id,{status:'abandoned'});await load();}};
 return <ScrollView className="flex-1 bg-background" contentContainerStyle={{paddingBottom:40}}><View className="gap-4 px-5 pt-14">
  <View className="flex-row items-center gap-3"><Button variant="ghost" size="icon" onPress={()=>router.back()}><ArrowLeft size={20}/></Button><View className="flex-1"><Text size="sm" className="text-muted-foreground">Books</Text><Heading size="xl">Advanced Reading</Heading></View></View>
  <Card className="p-4"><View className="flex-row items-center gap-3"><Flame size={20}/><View><Heading size="sm">{review?.streak??0} day reading streak</Heading><Text size="xs" className="text-muted-foreground">{review?.minutesRead??0} min · {review?.pagesRead??0} pages this year</Text></View></View></Card>
  <View className="flex-row gap-2"><Button className="flex-1" onPress={()=>router.push('/books/analytics')}><ButtonText>Analytics</ButtonText></Button><Button variant="outline" className="flex-1" onPress={addGoal}><ButtonText>New Goal</ButtonText></Button></View>
  <Heading size="md">Library</Heading>
  {books.map(b=><Pressable key={b.id} onPress={()=>void select(b)}><Card className={selected?.id===b.id?'border-primary p-4':'p-4'}><View className="flex-row items-center gap-3"><BookOpen size={20}/><View className="flex-1"><Text className="font-semibold">{b.title}</Text><Text size="xs" className="text-muted-foreground">{b.author||'Unknown author'} · {b.currentPage}/{b.totalPages??'?'} pages · {b.status}</Text></View></View></Card></Pressable>)}
  {selected?<Card className="gap-3 p-4"><View className="flex-row justify-between"><Heading size="md">{selected.title}</Heading><Text size="sm">{streak}d</Text></View><Text size="sm" className="text-muted-foreground">Reading sessions: {sessions.filter(s=>s.bookId===selected.id).length}</Text><View className="flex-row gap-2"><TextInput value={minutesInput} onChangeText={setMinutesInput} keyboardType="number-pad" placeholder="Minutes" className="flex-1 rounded-xl border border-border p-3 text-foreground"/><TextInput value={pagesInput} onChangeText={setPagesInput} keyboardType="number-pad" placeholder="Pages" className="flex-1 rounded-xl border border-border p-3 text-foreground"/></View><View className="flex-row gap-2"><Button className="flex-1" onPress={()=>void logSession()}><Clock3 size={16}/><ButtonText>Log session</ButtonText></Button><Button variant="outline" className="flex-1" onPress={()=>void addNote()}><Quote size={16}/><ButtonText>Note</ButtonText></Button></View><View className="flex-row gap-2"><Button variant="outline" className="flex-1" onPress={()=>void linkToGoal()}><ButtonText>Link to goal</ButtonText></Button><Button variant="outline" className="flex-1" onPress={()=>void abandon()}><ButtonText>Mark abandoned</ButtonText></Button></View><Heading size="sm">Notes & highlights</Heading>{notes.slice(0,8).map(n=><View key={n.id} className="flex-row items-start gap-2 rounded-xl bg-muted p-3"><Quote size={14}/><View className="flex-1"><Text size="sm">{n.text}</Text><Text size="xs" className="text-muted-foreground">{n.type} · page {n.page??'?'}</Text></View><Pressable onPress={()=>void deleteBookNote(n.id).then(load)}><Trash2 size={14}/></Pressable></View>)}<View className="flex-row items-center gap-2"><Target size={16}/><Text size="sm" className="font-semibold">Advanced goals</Text></View>{goals.map(g=><GoalRow key={g.id} goal={g}/>)}</Card>:null}
  <Card className="p-4"><Heading size="md">Yearly review</Heading><Text size="sm" className="mt-2">Books completed: {review?.booksCompleted??0}</Text><Text size="sm">Sessions: {review?.sessions??0}</Text><Text size="sm">Active reading days: {review?.activeDays??0}</Text></Card>
 </View></ScrollView>;
}