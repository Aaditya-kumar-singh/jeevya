import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { getMealTemplates, deleteMealTemplate, applyMealTemplate, type MealTemplate } from '@/services/nutritionAdvanced';
import { getTodayDate, MEAL_TYPE_LABELS } from '@/types/nutrition';

export default function MealTemplatesScreen(){
 const router=useRouter(); const [templates,setTemplates]=useState<MealTemplate[]>([]);
 const load=()=>void getMealTemplates().then(setTemplates); useEffect(load,[]);
 const apply=async(t:MealTemplate)=>{await applyMealTemplate(t,getTodayDate());Alert.alert('Meal added',t.name+' was added to today.');};
 return <ScrollView className="flex-1 bg-background" contentContainerStyle={{padding:20,paddingTop:56,paddingBottom:40}}>
  <View className="flex-row items-center gap-3"><Pressable onPress={()=>router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-muted"><ArrowLeft size={20}/></Pressable><View><Text size="xs" className="text-muted-foreground">Nutrition</Text><Heading size="xl">Meal Templates</Heading></View></View>
  <Text size="sm" className="mt-2 text-muted-foreground">Reusable meal structures for fast, consistent logging.</Text>
  {templates.length===0?<Card className="mt-4 p-5"><Text size="sm" className="text-muted-foreground">No templates yet. Templates are stored locally and can be created by the nutrition service.</Text></Card>:templates.map(t=><Card key={t.id} className="mt-3 p-4"><View className="flex-row items-center justify-between"><View className="flex-1"><Heading size="sm">{t.name}</Heading><Text size="xs" className="mt-1 text-muted-foreground">{MEAL_TYPE_LABELS[t.mealType]} · {t.items.length} items</Text></View><Pressable onPress={()=>{void deleteMealTemplate(t.id).then(load)}}><Trash2 size={16} className="text-destructive"/></Pressable></View><Button className="mt-3" onPress={()=>void apply(t)}><ButtonText>Repeat today</ButtonText></Button></Card>)}
 </ScrollView>
}
