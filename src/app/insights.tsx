import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Brain, CircleAlert, CircleCheck, Info } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useLifeIntelligence } from '@/hooks/useLifeIntelligence';
import type { LifeInsightSeverity } from '@/types/lifeIntelligence';

const icons: Record<LifeInsightSeverity, typeof Info> = { warning: CircleAlert, positive: CircleCheck, info: Info };

export default function InsightsScreen() {
  const router = useRouter();
  const { data, loading, error, refresh } = useLifeIntelligence();

  if (loading && !data) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" className="text-primary" /><Text size="sm" className="mt-3 text-muted-foreground">Loading insights...</Text></View>;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}>
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}><ArrowLeft size={20} /></Button>
          <View className="flex-1"><Text size="sm" className="text-muted-foreground">LifeOS</Text><Heading size="xl" className="mt-1">Life Intelligence</Heading><Text size="sm" className="mt-1 text-muted-foreground">Deterministic signals from your existing LifeOS data</Text></View>
          <Brain size={24} className="text-primary" />
        </View>
        {error ? <Card className="p-3"><Text size="xs" className="text-red-600 dark:text-red-400">{error}</Text></Card> : null}
        {data?.summary ? <Card className="p-4"><Heading size="sm">Today</Heading><Text size="sm" className="mt-1 text-muted-foreground">{data.summary}</Text></Card> : null}
        {data?.insights.length ? data.insights.map((item) => { const Icon = icons[item.severity]; return <Card key={item.id} className="p-4"><View className="flex-row gap-3"><Icon size={20} className={item.severity === 'warning' ? 'text-red-500' : item.severity === 'positive' ? 'text-emerald-500' : 'text-muted-foreground'} /><View className="flex-1"><View className="flex-row items-center justify-between gap-2"><Heading size="sm">{item.title}</Heading><Text size="xs" className="text-muted-foreground capitalize">{item.domain}</Text></View><Text size="sm" className="mt-1 text-muted-foreground">{item.description}</Text></View></View></Card>; }) : <Card className="items-center p-6"><Info size={28} className="text-muted-foreground" /><Heading size="md" className="mt-3">Not enough data yet</Heading><Text size="sm" className="mt-1 text-center text-muted-foreground">Keep using LifeOS and useful cross-module signals will appear here.</Text></Card>}
        <Text size="xs" className="text-center text-muted-foreground">Insights are informational and based only on recorded LifeOS data.</Text>
      </View>
    </ScrollView>
  );
}
