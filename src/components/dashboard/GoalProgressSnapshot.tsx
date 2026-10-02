import React from 'react';
import { View, Pressable } from 'react-native';
import { ArrowRight, Target, TrendingDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { Card, Heading, Text } from '@/components/ui';
import type { DashboardGoalState } from '@/types/dashboard';

interface GoalProgressSnapshotProps { snapshot: DashboardGoalState; }

export function GoalProgressSnapshot({ snapshot }: GoalProgressSnapshotProps) {
  if (snapshot.total === 0) {
    return (
      <Card className="w-full p-5 rounded-3xl border border-border/50">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10">
            <Target size={20} className="text-rose-500" />
          </View>
          <View className="flex-1">
            <Heading size="md">Goals</Heading>
            <Text size="xs" className="mt-0.5 text-muted-foreground">No configured goals yet</Text>
          </View>
          <Pressable onPress={() => router.push('/goals' as never)} accessibilityLabel="Open goals">
            <ArrowRight size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Card className="w-full p-5 rounded-3xl border border-rose-500/20 bg-rose-500/5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10">
            <Target size={20} className="text-rose-500" />
          </View>
          <View>
            <Heading size="md">Goals</Heading>
            <Text size="xs" className="mt-0.5 text-muted-foreground">{snapshot.active} active · {snapshot.completed} completed</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/goals' as never)} accessibilityLabel="Open goals">
          <ArrowRight size={18} className="text-muted-foreground" />
        </Pressable>
      </View>
      <View className="mt-4">
        <View className="flex-row items-center justify-between">
          <Text size="xs" className="font-semibold text-muted-foreground">Overall progress</Text>
          <Text size="xs" className="font-bold">{snapshot.averageProgressPercent === null ? 'Not available' : snapshot.averageProgressPercent + '%'}</Text>
        </View>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <View className="h-full rounded-full bg-rose-500" style={{ width: (String(snapshot.averageProgressPercent ?? 0) + "%") as any }} />
        </View>
      </View>
      {snapshot.behind > 0 ? (
        <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-orange-500/10 px-3 py-2">
          <TrendingDown size={15} className="text-orange-500" />
          <Text size="xs" className="flex-1 font-semibold text-orange-700 dark:text-orange-300">{snapshot.behind} goal{snapshot.behind === 1 ? '' : 's'} behind pace</Text>
        </View>
      ) : null}
      {snapshot.closestDeadline ? <Text size="xs" className="mt-3 text-muted-foreground">Next deadline · {snapshot.closestDeadline}</Text> : null}
    </Card>
  );
}

export default GoalProgressSnapshot;
