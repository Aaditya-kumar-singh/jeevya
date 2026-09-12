import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { WorkoutHeader } from '@/components/workout/WorkoutHeader';
import { WorkoutEmptyState } from '@/components/workout/WorkoutEmptyState';
import { getExercisesByIds, type Exercise } from '@/services/exercises';
import { formatDuration, getPrsForWorkout, getWorkoutDetails } from '@/services/workouts';
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

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [metas, setMetas] = useState<Map<string, Exercise>>(new Map());

  useEffect(() => {
    let active = true;
    getWorkoutDetails(id).then((found) => {
      if (active) {
        setWorkout(found);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    getPrsForWorkout(id).then((list) => {
      if (active) setRecords(list);
    });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!workout) return;
    let active = true;
    const ids = workout.exercises.map((e) => e.exerciseId);
    getExercisesByIds(ids).then((map) => {
      if (active) setMetas(map);
    });
    return () => {
      active = false;
    };
  }, [workout]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View className="flex-1 bg-background">
        <WorkoutHeader title="Workout" onBack={() => router.back()} />
        <WorkoutEmptyState
          title="Workout not found"
          message="This workout may have been deleted."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <DetailBody workout={workout} records={records} metas={metas} onBack={() => router.back()} />
  );
}

interface DetailBodyProps {
  workout: Workout;
  records: PersonalRecord[];
  metas: Map<string, Exercise>;
  onBack: () => void;
}

function DetailBody({ workout, records, metas, onBack }: DetailBodyProps) {
  const completedSets = workout.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.completed).length,
    0,
  );
  const date = workout.completedAt
    ? new Date(workout.completedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <View className="flex-1 bg-background">
      <WorkoutHeader title={workout.name} onBack={onBack} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="gap-4 px-5 pt-2">
          <Text size="sm" className="text-muted-foreground">
            {date}
          </Text>

          <Card className="gap-3 p-4">
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">Duration</Text>
              <Text size="sm" className="font-semibold text-foreground">
                {formatDuration(workout.durationSeconds)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">Sets</Text>
              <Text size="sm" className="font-semibold text-foreground">
                {completedSets}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">Volume</Text>
              <Text size="sm" className="font-semibold text-foreground">
                {Math.round(workout.totalVolume).toLocaleString()} kg
              </Text>
            </View>
          </Card>

          {records.length > 0 ? (
            <Card className="gap-2 p-4">
              <View className="flex-row items-center gap-2">
                <Trophy size={18} color="#D97706" />
                <Heading size="sm">Personal records</Heading>
              </View>
              {records.map((record) => (
                <View
                  key={record.id}
                  className="flex-row items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2">
                  <View>
                    <Text size="sm" className="font-semibold text-foreground">
                      {metas.get(record.exerciseId)?.name ?? record.exerciseId}
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

          {workout.exercises.map((exercise) => {
            const meta = metas.get(exercise.exerciseId);
            return (
              <Card key={exercise.id} className="gap-2 p-4">
                <View className="flex-row items-center justify-between">
                  <Heading size="sm">{meta?.name ?? 'Exercise'}</Heading>
                  <Text size="xs" className="text-muted-foreground">
                    {[meta?.body_part, meta?.equipment].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View className="gap-1">
                  {exercise.sets
                    .filter((s) => s.completed)
                    .map((set) => (
                      <Text key={set.id} size="sm" className="text-foreground">
                        {set.weight != null ? `${set.weight} ${set.weightUnit}` : ''}
                        {set.weight != null && set.reps != null ? ' × ' : ''}
                        {set.reps != null ? `${set.reps} reps` : ''}
                        {set.weight == null && set.reps == null
                          ? set.durationSeconds != null
                            ? `${set.durationSeconds} sec`
                            : 'Completed'
                          : ''}
                      </Text>
                    ))}
                  {exercise.sets.filter((s) => s.completed).length === 0 ? (
                    <Text size="sm" className="text-muted-foreground">
                      No completed sets
                    </Text>
                  ) : null}
                </View>
                {exercise.notes ? (
                  <Text size="xs" className="text-muted-foreground">
                    Notes: {exercise.notes}
                  </Text>
                ) : null}
              </Card>
            );
          })}

          {workout.notes ? (
            <Card className="p-4">
              <Heading size="sm">Notes</Heading>
              <Text size="sm" className="mt-2 leading-5 text-foreground">
                {workout.notes}
              </Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}