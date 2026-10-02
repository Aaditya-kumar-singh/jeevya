import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Award, Flame, Sparkles, Trophy } from 'lucide-react-native';
import { Heading, Text, Card } from '@/components/ui';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import type { XPProgress } from '@/services/xp';

interface XPLevelCardProps {
  progress: XPProgress | null;
  onPress?: () => void;
}

export function XPLevelCard({ progress, onPress }: XPLevelCardProps) {
  const handlePress = onPress ?? (() => router.push('/progression' as never));

  if (!progress) {
    return (
      <Card className="w-full p-5 border border-border/50 rounded-3xl">
        <Text size="sm" className="text-muted-foreground">Loading your progression…</Text>
      </Card>
    );
  }

  return (
    <Card className="w-full p-5 border border-indigo-500/30 bg-card rounded-3xl overflow-hidden">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15">
            <Trophy size={22} className="text-indigo-500" />
          </View>
          <View>
            <Heading size="md" className="font-bold">Level {progress.level}</Heading>
            <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
              {progress.rank} · {progress.totalXp.toLocaleString()} XP
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-2xl bg-orange-500/10 px-3 py-1.5 border border-orange-500/20">
          <Flame size={16} className="text-orange-500" />
          <Text size="xs" className="font-bold text-orange-600 dark:text-orange-400">
            {progress.streakDays} day{progress.streakDays === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <View className="flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center gap-1">
            <Sparkles size={14} className="text-indigo-500" />
            <Text size="xs" className="font-bold text-indigo-600 dark:text-indigo-400">
              {progress.currentLevelXp.toLocaleString()} / {progress.nextLevelXp.toLocaleString()} XP
            </Text>
          </View>
          <Text size="xs" className="font-bold text-muted-foreground">
            {progress.xpToNextLevel} to go
          </Text>
        </View>
        <AnimatedProgress value={progress.progressPercent} height={10} color="bg-indigo-600" />
      </View>

      <View className="mt-3 flex-row items-center justify-between pt-3 border-t border-border/40">
        <View className="flex-row items-center gap-1.5">
          <Award size={15} className="text-amber-500" />
          <Text size="xs" className="text-muted-foreground font-medium">
            {progress.todayXp}/{progress.todayCap} XP today
          </Text>
        </View>
        <Text onPress={handlePress} size="xs" className="font-bold text-indigo-600 dark:text-indigo-400">
          View progression
        </Text>
      </View>
    </Card>
  );
}

export default XPLevelCard;
