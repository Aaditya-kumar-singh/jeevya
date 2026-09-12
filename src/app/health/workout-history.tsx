import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { WorkoutEmptyState } from '@/components/workout/WorkoutEmptyState';
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory';
import { formatDuration } from '@/services/workouts';
import type { Workout } from '@/types/workout';

type HistoryFilter = 'All' | 'Strength' | 'Cardio';

function isCardio(workout: Workout): boolean {
  if (workout.name.toLowerCase().includes('cardio')) return true;
  return workout.exercises.some((e) => e.sets.some((s) => s.distance != null));
}

export default function WorkoutHistoryScreen() {
  const { workouts, loading, refreshing, error, refresh } = useWorkoutHistory();
  const router = useRouter();
  const [filter, setFilter] = useState<HistoryFilter>('All');

  const filtered = useMemo(() => {
    if (filter === 'All') return workouts;
    return workouts.filter((w) => (filter === 'Cardio' ? isCardio(w) : !isCardio(w)));
  }, [workouts, filter]);

  const totals = useMemo(() => {
    const seconds = workouts.reduce((n, w) => n + (w.durationSeconds ?? 0), 0);
    const volume = workouts.reduce((n, w) => n + w.totalVolume, 0);
    return { count: workouts.length, seconds, volume };
  }, [workouts]);

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-2 pt-14">
        <Text size="sm" className="text-muted-foreground">
          Training log
        </Text>
        <Heading size="xl" className="mt-1">
          Workout History
        </Heading>
      </View>

      <View className="flex-row gap-2 px-5 pb-3">
        {(['All', 'Strength', 'Cardio'] as HistoryFilter[]).map((chip) => {
          const active = chip === filter;
          return (
            <Pressable key={chip} onPress={() => setFilter(chip)}>
              <Badge variant={active ? 'default' : 'outline'}>
                <BadgeText>{chip}</BadgeText>
              </Badge>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View className="px-5 pb-3">
          <Card className="p-4">
            <Text size="sm" className="text-red-600">{error}</Text>
            <Pressable onPress={() => void refresh()} hitSlop={8}>
              <Text size="sm" className="mt-2 font-semibold text-primary">
                Try again
              </Text>
            </Pressable>
          </Card>
        </View>
      ) : null}

      {loading ? (
        <View className="gap-3 px-5 pt-2">
          <View className="h-20 rounded-2xl bg-muted" />
          <View className="h-20 rounded-2xl bg-muted" />
          <View className="h-20 rounded-2xl bg-muted" />
        </View>
      ) : workouts.length === 0 ? (
        <WorkoutEmptyState
          title="No workouts yet"
          message="Complete your first workout and your progress will appear here."
          actionLabel="Start Workout"
          onAction={() => router.push('/health/workout-builder' as never)}
        />
      ) : (
        <FlatList
          className="flex-1"
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <View className="px-5 pb-3">
              <Card className="gap-2 p-4">
                <View className="flex-row items-center justify-between">
                  <Text size="sm" className="text-muted-foreground">
                    Workouts
                  </Text>
                  <Text size="sm" className="font-semibold text-foreground">
                    {totals.count}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text size="sm" className="text-muted-foreground">
                    Total time
                  </Text>
                  <Text size="sm" className="font-semibold text-foreground">
                    {formatDuration(totals.seconds)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text size="sm" className="text-muted-foreground">
                    Total volume
                  </Text>
                  <Text size="sm" className="font-semibold text-foreground">
                    {Math.round(totals.volume).toLocaleString()} kg
                  </Text>
                </View>
              </Card>
            </View>
          }
          ListEmptyComponent={
            <View className="px-5">
              <Card className="p-4">
                <Text size="sm" className="text-muted-foreground">
                  No {filter.toLowerCase()} workouts yet.
                </Text>
              </Card>
            </View>
          }
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() =>
                router.push({
                  pathname: '/health/workout-history/[id]',
                  params: { id: item.id },
                } as never)
              }
            />
          )}
        />
      )}
    </View>
  );
}