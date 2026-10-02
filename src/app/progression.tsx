import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Brain, Dumbbell, Heart, Sparkles, Trophy } from 'lucide-react-native';
import { Card, Heading, Text } from '@/components/ui';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import { getRecentXPEvents, getXPProgress, XP_RULES, type XPProgress, type XPEvent } from '@/services/xp';

const categoryMeta = [
  { key: 'mind' as const, label: 'Mind', icon: Brain },
  { key: 'body' as const, label: 'Body', icon: Dumbbell },
  { key: 'life' as const, label: 'Life', icon: Heart },
  { key: 'money' as const, label: 'Money', icon: Sparkles },
];

export default function ProgressionScreen() {
  const [progress, setProgress] = useState<XPProgress | null>(null);
  const [events, setEvents] = useState<XPEvent[]>([]);

  const refresh = useCallback(async () => {
    const [nextProgress, nextEvents] = await Promise.all([getXPProgress(), getRecentXPEvents(30)]);
    setProgress(nextProgress);
    setEvents(nextEvents);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!progress) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text size="sm" className="text-muted-foreground">Loading progression…</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-14 pb-12 gap-4">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} accessibilityLabel="Go back" className="h-10 w-10 items-center justify-center rounded-full bg-muted">
          <ArrowLeft size={20} className="text-foreground" />
        </Pressable>
        <View className="flex-1">
          <Text size="xs" className="font-bold uppercase tracking-wider text-indigo-500">Progression</Text>
          <Heading size="xl" className="font-black">Your growth</Heading>
        </View>
      </View>

      <Card className="p-5 rounded-3xl border border-indigo-500/30">
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15">
            <Trophy size={28} className="text-indigo-500" />
          </View>
          <View className="flex-1">
            <Text size="xs" className="font-bold text-muted-foreground">LEVEL {progress.level}</Text>
            <Heading size="lg" className="font-black">{progress.rank}</Heading>
          </View>
          <Text size="lg" className="font-black text-indigo-500">{progress.totalXp.toLocaleString()} XP</Text>
        </View>
        <View className="mt-5">
          <View className="flex-row justify-between mb-2">
            <Text size="xs" className="text-muted-foreground">{progress.currentLevelXp} XP this level</Text>
            <Text size="xs" className="font-bold">{progress.xpToNextLevel} XP to next</Text>
          </View>
          <AnimatedProgress value={progress.progressPercent} height={12} color="bg-indigo-600" />
        </View>
        <View className="mt-4 flex-row justify-between">
          <Text size="xs" className="text-muted-foreground">Today</Text>
          <Text size="xs" className="font-bold">{progress.todayXp}/{progress.todayCap} XP</Text>
        </View>
      </Card>

      <Card className="p-5 rounded-3xl border border-border/50">
        <Heading size="md" className="font-bold">Category progress</Heading>
        <View className="mt-4 gap-4">
          {categoryMeta.map(({ key, label, icon: Icon }) => {
            const value = progress.categoryXp[key];
            const total = Math.max(1, progress.totalXp);
            return (
              <View key={key}>
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <Icon size={16} className="text-muted-foreground" />
                    <Text size="sm" className="font-semibold">{label}</Text>
                  </View>
                  <Text size="xs" className="font-bold text-muted-foreground">{value} XP</Text>
                </View>
                <AnimatedProgress value={Math.round((value / total) * 100)} height={7} color="bg-indigo-500" />
              </View>
            );
          })}
        </View>
      </Card>

      <Card className="p-5 rounded-3xl border border-border/50">
        <Heading size="md" className="font-bold">How XP is earned</Heading>
        <Text size="sm" className="mt-1 text-muted-foreground">Only completed, persisted actions award XP. Repeating the same action cannot create duplicate XP.</Text>
        <View className="mt-4 gap-2.5">
          {Object.entries(XP_RULES).slice(0, 8).map(([action, rule]) => (
            <View key={action} className="flex-row items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
              <Text size="sm">{rule.label}</Text>
              <Text size="sm" className="font-black text-indigo-500">+{rule.baseXp} XP</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card className="p-5 rounded-3xl border border-border/50">
        <Heading size="md" className="font-bold">Recent XP</Heading>
        {events.length === 0 ? (
          <Text size="sm" className="mt-3 text-muted-foreground">Complete a real task, habit, or workout to start your progression.</Text>
        ) : (
          <View className="mt-3 gap-2.5">
            {events.map((event) => (
              <View key={event.id} className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text size="sm" className="font-medium">{XP_RULES[event.action].label}</Text>
                  <Text size="xs" className="text-muted-foreground">{event.date}</Text>
                </View>
                <Text size="sm" className="font-black text-indigo-500">+{event.totalXp}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
