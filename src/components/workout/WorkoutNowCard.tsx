import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { formatDuration, getActiveWorkout, getWorkoutHistory } from '@/services/workouts';
import type { Workout } from '@/types/workout';

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function WorkoutNowCard() {
  const router = useRouter();
  const [active, setActive] = useState<Workout | null>(null);
  const [lastCompleted, setLastCompleted] = useState<Workout | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const activeWorkout = await getActiveWorkout();
          const history = activeWorkout ? [] : await getWorkoutHistory();
          if (!mounted) return;
          setActive(activeWorkout);
          setLastCompleted(history[0] ?? null);
        } catch {
          /* offline: keep previous state */
        }
      })();
      return () => {
        mounted = false;
      };
    }, []),
  );

  let title = 'Start a workout';
  let subtitle = 'Build a workout from 1,324 exercises';
  let label = 'Start Workout';
  let href: string = '/health/workout-builder';

  if (active) {
    title = 'Workout in progress';
    subtitle = active.name;
    label = 'Continue Workout';
    href = `/health/workout-session/${active.id}`;
  } else if (lastCompleted && isToday(lastCompleted.completedAt)) {
    title = 'Workout completed ✓';
    subtitle = `${formatDuration(lastCompleted.durationSeconds)} · ${Math.round(
      lastCompleted.totalVolume,
    ).toLocaleString()} kg volume`;
    label = 'View Workout';
    href = `/health/workout-history/${lastCompleted.id}`;
  }

  return (
    <Pressable
      onPress={() => router.push(href as never)}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="active:opacity-80">
      <Card className="w-full p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Heading size="sm">{title}</Heading>
            <Text size="sm" className="mt-0.5 text-muted-foreground">
              {subtitle}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text size="sm" className="font-semibold text-primary">
              {label}
            </Text>
            <ChevronRight size={16} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}