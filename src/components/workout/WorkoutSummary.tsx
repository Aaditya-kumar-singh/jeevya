import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Trophy } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { formatDuration } from '@/services/workouts';
import type { PersonalRecord, Workout } from '@/types/workout';

const PR_LABELS: Record<PersonalRecord['recordType'], string> = {
  max_weight: 'Max weight',
  max_reps: 'Max reps',
  max_volume: 'Best set volume',
};

function prValueLabel(record: PersonalRecord): string {
  switch (record.recordType) {
    case 'max_weight':
      return `${record.value} kg`;
    case 'max_reps':
      return `${record.value} reps`;
    case 'max_volume':
      return `${Math.round(record.value)} kg volume`;
  }
}

interface WorkoutSummaryProps {
  workout: Workout;
  newPersonalRecords: PersonalRecord[];
  exerciseNames: Map<string, string>;
  onDone: () => void;
}

export function WorkoutSummary({
  workout,
  newPersonalRecords,
  exerciseNames,
  onDone,
}: WorkoutSummaryProps) {
  const insets = useSafeAreaInsets();
  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const completedSets = workout.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.completed).length,
    0,
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="gap-4 px-5 pb-6 pt-14">
          <View className="items-center gap-2 pt-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-green-500">
              <Check size={32} color="#fff" />
            </View>
            <Heading size="2xl">Workout Complete</Heading>
            <Text size="sm" className="text-muted-foreground">
              {workout.name}
            </Text>
          </View>

          <Card className="gap-3 p-4">
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">
                Duration
              </Text>
              <Text size="sm" className="font-semibold text-foreground">
                {formatDuration(workout.durationSeconds)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">
                Exercises
              </Text>
              <Text size="sm" className="font-semibold text-foreground">
                {workout.exercises.length}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">
                Sets
              </Text>
              <Text size="sm" className="font-semibold text-foreground">
                {completedSets}/{totalSets}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">
                Volume
              </Text>
              <Text size="sm" className="font-semibold text-foreground">
                {Math.round(workout.totalVolume).toLocaleString()} kg
              </Text>
            </View>
          </Card>

          {newPersonalRecords.length > 0 ? (
            <Card className="gap-2 p-4">
              <View className="flex-row items-center gap-2">
                <Trophy size={18} color="#D97706" />
                <Heading size="sm">New personal records</Heading>
              </View>
              {newPersonalRecords.map((record) => (
                <View
                  key={record.id}
                  className="flex-row items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2">
                  <View>
                    <Text size="sm" className="font-semibold text-foreground">
                      {exerciseNames.get(record.exerciseId) ?? record.exerciseId}
                    </Text>
                    <Text size="xs" className="text-muted-foreground">
                      {PR_LABELS[record.recordType]}
                    </Text>
                  </View>
                  <Text size="sm" className="font-semibold text-amber-600">
                    {prValueLabel(record)}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          {workout.notes ? (
            <Card className="p-4">
              <Heading size="sm">Notes</Heading>
              <Text size="sm" className="mt-2 leading-5 text-foreground">
                {workout.notes}
              </Text>
            </Card>
          ) : null}

          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="View workout history"
            className="mt-2 items-center py-2">
            <Text size="sm" className="font-medium text-primary">
              View in history
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <View 
        className="px-5 pt-2"
        style={{ paddingBottom: Math.max(32, insets.bottom + 16) }}
      >
        <Button variant="default" size="lg" onPress={onDone} className="w-full">
          <ButtonText>Done</ButtonText>
        </Button>
      </View>
    </View>
  );
}