import React from 'react';
import { View } from 'react-native';
import { Heading, Text, Card } from '@/components/ui';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import { Award, Flame, Sparkles, Trophy } from 'lucide-react-native';

interface XPLevelCardProps {
  level?: number;
  currentXp?: number;
  maxXp?: number;
  streakDays?: number;
}

export function XPLevelCard({
  level = 7,
  currentXp = 3450,
  maxXp = 5000,
  streakDays = 7,
}: XPLevelCardProps) {
  const xpPct = Math.round((currentXp / maxXp) * 100);

  return (
    <Card className="w-full p-5 border border-indigo-500/30 bg-card shadow-md shadow-indigo-500/10 rounded-3xl overflow-hidden relative">
      {/* Subtle top border accent line */}
      <View className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shadow-indigo-500/30">
            <Trophy size={22} className="text-white" fill="#FCD34D" />
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <Heading size="md" className="font-bold">Level {level}</Heading>
              <View className="rounded-full bg-amber-500/15 px-2 py-0.5 border border-amber-500/30">
                <Text size="xs" className="font-bold text-amber-500">
                  Pro Jeevya
                </Text>
              </View>
            </View>
            <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
              Habit Master • Top 5% Achiever
            </Text>
          </View>
        </View>

        {/* Streak Counter Pill */}
        <View className="flex-row items-center gap-1.5 rounded-2xl bg-orange-500/15 px-3 py-1.5 border border-orange-500/30 shadow-xs">
          <Flame size={18} className="text-orange-500" fill="#F97316" />
          <Text size="xs" className="font-black text-orange-600 dark:text-orange-400">
            {streakDays} DAYS
          </Text>
        </View>
      </View>

      {/* XP Bar */}
      <View className="mt-4">
        <View className="flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center gap-1">
            <Sparkles size={14} className="text-indigo-500" />
            <Text size="xs" className="font-bold text-indigo-600 dark:text-indigo-400">
              {currentXp.toLocaleString()} / {maxXp.toLocaleString()} XP
            </Text>
          </View>
          <Text size="xs" className="font-bold text-muted-foreground">
            {100 - xpPct}% to Level {level + 1}
          </Text>
        </View>
        <AnimatedProgress value={xpPct} height={10} color="bg-indigo-600" />
      </View>

      <View className="mt-3 flex-row items-center justify-between pt-2 border-t border-border/40">
        <Text size="xs" className="text-muted-foreground font-medium">
          🎯 Next Reward: &quot;Deep Focus&quot; Badge (+500 XP)
        </Text>
        <Award size={16} className="text-amber-500" />
      </View>
    </Card>
  );
}

export default XPLevelCard;
