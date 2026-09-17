import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Clock, Dumbbell } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { getExercisesByIds, type Exercise } from '@/services/exercises';
import { getWorkoutHistory } from '@/services/workoutHistory';
import { calculateWorkoutVolume } from '@/services/workouts';
import type { WorkoutSession } from '@/types/workout';

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 min';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds} sec`;
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
}

export default function WorkoutHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutSession | null>(null);
  const [exerciseNames, setExerciseNames] = useState<Map<string, Exercise>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void getWorkoutHistory().then(async (result) => {
      const found = result.workouts.find((item) => item.id === id) ?? null;
      if (!mounted) return;
      setWorkout(found);
      if (found) {
        const ids = [...new Set(found.exercises.map((exercise) => exercise.exerciseId))];
        setExerciseNames(await getExercisesByIds(ids));
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  const totals = useMemo(() => {
    if (!workout) return null;
    return {
      completedSets: workout.exercises.reduce((count, exercise) => count + exercise.sets.filter((set) => set.completed).length, 0),
      volume: calculateWorkoutVolume(workout),
    };
  }, [workout]);

  if (loading) {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" /></View>;
  }

  if (!workout || !totals) {
    return (
      <View className="flex-1 bg-background px-5 pt-14">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full" accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={22} />
        </Pressable>
        <Heading size="xl" className="mt-4">Workout not found</Heading>
        <Text size="sm" className="mt-1 text-muted-foreground">Only completed sessions can be opened from history.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-14">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full" accessibilityRole="button" accessibilityLabel="Back to workout history">
          <ArrowLeft size={22} />
        </Pressable>
        <View className="flex-1">
          <Text size="xs" className="text-muted-foreground">Workout History</Text>
          <Heading size="lg">{workout.name}</Heading>
        </View>
        <Badge variant="secondary"><BadgeText>Read only</BadgeText></Badge>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <Card className="gap-3 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2"><Clock size={16} /><Text size="sm" className="font-semibold">{workout.completedAt?.slice(0, 10) ?? workout.startedAt.slice(0, 10)}</Text></View>
            <Text size="sm" className="font-semibold">{formatDuration(workout.durationSeconds ?? 0)}</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Badge variant="outline"><BadgeText>{workout.exercises.length} exercises</BadgeText></Badge>
            <Badge variant="outline"><BadgeText>{totals.completedSets} completed sets</BadgeText></Badge>
            <Badge variant="outline"><BadgeText>{Math.round(totals.volume).toLocaleString()} kg volume</BadgeText></Badge>
          </View>
        </Card>

        <View className="mt-4 gap-3">
          {workout.exercises.map((exercise) => (
            <Card key={exercise.id} className="gap-3 p-4">
              <View className="flex-row items-center gap-2">
                <Dumbbell size={17} />
                <Heading size="sm" className="flex-1">{exerciseNames.get(exercise.exerciseId)?.name ?? exercise.exerciseId}</Heading>
              </View>
              {exercise.sets.map((set) => (
                <View key={set.id} className="flex-row items-center gap-2 rounded-xl border border-border px-3 py-2">
                  <Text size="xs" className="w-8 text-muted-foreground">#{set.setNumber}</Text>
                  <Text size="sm" className="flex-1">{set.weightKg ?? set.weight ?? '—'} {set.weightKg != null || set.weight != null ? 'kg' : ''}</Text>
                  <Text size="sm" className="flex-1">{set.reps ?? '—'} reps</Text>
                  {set.durationSeconds != null ? <Text size="xs" className="text-muted-foreground">{set.durationSeconds}s</Text> : null}
                  {set.distanceKm != null || set.distance != null ? <Text size="xs" className="text-muted-foreground">{set.distanceKm ?? set.distance} km</Text> : null}
                  {set.rpe != null ? <Text size="xs" className="text-muted-foreground">RPE {set.rpe}</Text> : null}
                  <Check size={15} className={set.completed ? 'text-green-600' : 'text-muted-foreground'} />
                </View>
              ))}
              <Text size="xs" className="text-muted-foreground">Exercise history is available from the History list by filtering for this exercise.</Text>
            </Card>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
