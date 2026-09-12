import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { formatDuration } from '@/services/workouts';
import type { Workout } from '@/types/workout';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
}

export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  const completedSets = workout.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.completed).length,
    0,
  );
  const date = workout.completedAt
    ? new Date(workout.completedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <View className="px-5">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open workout ${workout.name}`}
        className="active:opacity-80">
        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Heading size="sm">{workout.name}</Heading>
            <Text size="xs" className="text-muted-foreground">
              {date}
            </Text>
          </View>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {formatDuration(workout.durationSeconds)} · {completedSets} sets ·{' '}
            {Math.round(workout.totalVolume).toLocaleString()} kg volume
          </Text>
        </Card>
      </Pressable>
    </View>
  );
}