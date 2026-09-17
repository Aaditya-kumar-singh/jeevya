import React from 'react';
import { View } from 'react-native';
import { Card, Heading, Text } from '@/components/ui';
import { Check, Flame, Calendar } from 'lucide-react-native';

const DAYS = [
  { day: 'Mon', completed: true },
  { day: 'Tue', completed: true },
  { day: 'Wed', completed: true },
  { day: 'Thu', completed: true },
  { day: 'Fri', completed: true },
  { day: 'Sat', completed: true },
  { day: 'Sun', completed: false, isToday: true },
];

export function WeeklyStreakMatrix() {
  return (
    <Card className="w-full p-5 border border-violet-500/25 bg-card shadow-sm rounded-3xl">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
            <Calendar size={20} className="text-violet-500" />
          </View>
          <View>
            <Heading size="md" className="font-bold">Weekly Routine Matrix</Heading>
            <Text size="xs" className="text-muted-foreground font-medium">
              6 of 7 days locked in
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 border border-orange-500/25">
          <Flame size={14} className="text-orange-500" fill="#F97316" />
          <Text size="xs" className="font-bold text-orange-600 dark:text-orange-400">
            6 Day Streak
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row justify-between items-center px-1">
        {DAYS.map((item) => (
          <View key={item.day} className="items-center gap-2">
            <Text size="xs" className={`font-semibold ${item.isToday ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-muted-foreground'}`}>
              {item.day}
            </Text>
            <View
              className={`h-9 w-9 items-center justify-center rounded-2xl border ${
                item.completed
                  ? 'bg-violet-600 border-violet-600 shadow-sm shadow-violet-500/30'
                  : item.isToday
                    ? 'border-2 border-violet-500 bg-violet-500/10'
                    : 'border-border/60 bg-muted/40'
              }`}
            >
              {item.completed ? (
                <Check size={16} className="text-white" strokeWidth={3} />
              ) : item.isToday ? (
                <View className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default WeeklyStreakMatrix;
