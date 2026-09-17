import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, Dumbbell, History, RotateCcw } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { getExercisesByIds, type Exercise } from '@/services/exercises';
import {
  getWorkoutHistory,
  getWorkoutHistorySummary,
} from '@/services/workoutHistory';
import type { WorkoutHistoryFilter, WorkoutHistorySummary, WorkoutSession } from '@/types/workout';

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 min';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds} sec`;
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
}

function dateOf(session: WorkoutSession): string {
  return (session.completedAt ?? session.startedAt ?? session.createdAt).slice(0, 10);
}

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [summary, setSummary] = useState<WorkoutHistorySummary>({
    completedWorkoutCount: 0,
    totalCompletedSets: 0,
    totalExercisesPerformed: 0,
    totalWorkoutDurationSeconds: 0,
    totalVolume: 0,
  });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exerciseId, setExerciseId] = useState<string | undefined>();
  const [exerciseNames, setExerciseNames] = useState<Map<string, Exercise>>(new Map());
  const [loading, setLoading] = useState(true);

  const filter = useMemo<WorkoutHistoryFilter>(() => ({
    ...(fromDate.trim() ? { fromDate: fromDate.trim() } : {}),
    ...(toDate.trim() ? { toDate: toDate.trim() } : {}),
    ...(exerciseId ? { exerciseId } : {}),
  }), [fromDate, toDate, exerciseId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [history, totals] = await Promise.all([
        getWorkoutHistory(filter),
        getWorkoutHistorySummary(filter),
      ]);
      setWorkouts(history.workouts);
      setSummary(totals);
      const ids = [...new Set(history.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.exerciseId)))];
      setExerciseNames(await getExercisesByIds(ids));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setExerciseId(undefined);
  };

  const exerciseOptions = useMemo(() => {
    const unique = new Map<string, string>();
    workouts.forEach((workout) => workout.exercises.forEach((exercise) => {
      unique.set(exercise.exerciseId, exerciseNames.get(exercise.exerciseId)?.name ?? exercise.exerciseId);
    }));
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [workouts, exerciseNames]);

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-3 pt-14">
        <Text size="sm" className="text-muted-foreground">Training</Text>
        <View className="mt-1 flex-row items-center gap-2">
          <History size={22} />
          <Heading size="xl">Workout History</Heading>
        </View>
        <Text size="xs" className="mt-1 text-muted-foreground">Completed workouts only</Text>
      </View>

      <View className="gap-2 px-5 pb-3">
        <View className="flex-row gap-2">
          <TextInput
            value={fromDate}
            onChangeText={setFromDate}
            placeholder="From YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            className="flex-1 rounded-2xl border border-border bg-card px-3 py-3 text-foreground"
            accessibilityLabel="History start date"
          />
          <TextInput
            value={toDate}
            onChangeText={setToDate}
            placeholder="To YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            className="flex-1 rounded-2xl border border-border bg-card px-3 py-3 text-foreground"
            accessibilityLabel="History end date"
          />
        </View>
        {exerciseOptions.length > 0 ? (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={exerciseOptions}
            keyExtractor={([id]) => id}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item: [id, name] }) => (
              <Pressable
                onPress={() => setExerciseId((current) => current === id ? undefined : id)}
                className={`rounded-full border px-3 py-2 ${exerciseId === id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${name}`}>
                <Text size="xs" className="font-medium">{name}</Text>
              </Pressable>
            )}
          />
        ) : null}
        {(fromDate || toDate || exerciseId) ? (
          <Pressable onPress={clearFilters} className="flex-row items-center gap-1 self-start px-1 py-1" accessibilityRole="button" accessibilityLabel="Clear history filters">
            <RotateCcw size={14} />
            <Text size="xs" className="font-medium text-primary">Clear filters</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="px-5 pb-3">
        <Card className="gap-3 p-4">
          <View className="flex-row items-center justify-between">
            <Heading size="sm">Summary</Heading>
            <Badge variant="secondary"><BadgeText>{summary.completedWorkoutCount} workouts</BadgeText></Badge>
          </View>
          <View className="flex-row flex-wrap gap-y-3">
            <SummaryItem label="Completed sets" value={String(summary.totalCompletedSets)} />
            <SummaryItem label="Exercises" value={String(summary.totalExercisesPerformed)} />
            <SummaryItem label="Duration" value={formatDuration(summary.totalWorkoutDurationSeconds)} />
            <SummaryItem label="Volume" value={`${Math.round(summary.totalVolume).toLocaleString()} kg`} />
          </View>
        </Card>
      </View>

      {loading ? (
        <View className="items-center justify-center py-12"><ActivityIndicator size="large" /></View>
      ) : workouts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pb-16">
          <Dumbbell size={28} />
          <Heading size="md" className="mt-3">No completed workouts</Heading>
          <Text size="sm" className="mt-1 text-center text-muted-foreground">Completed sessions will appear here without changing the original workout record.</Text>
        </View>
      ) : (
        <FlatList
          className="flex-1"
          data={workouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}
          renderItem={({ item }) => <HistoryCard workout={item} exerciseNames={exerciseNames} onOpen={() => router.push({ pathname: '/health/workout-history/[id]', params: { id: item.id } } as never)} />}
        />
      )}
    </View>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2">
      <Text size="xs" className="text-muted-foreground">{label}</Text>
      <Text size="sm" className="mt-0.5 font-semibold">{value}</Text>
    </View>
  );
}

function HistoryCard({ workout, exerciseNames, onOpen }: { workout: WorkoutSession; exerciseNames: Map<string, Exercise>; onOpen: () => void }) {
  const completedSets = workout.exercises.reduce((count, exercise) => count + exercise.sets.filter((set) => set.completed).length, 0);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${workout.name} history`}>
      <Card className="gap-3 p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Heading size="sm">{workout.name}</Heading>
            <Text size="xs" className="mt-1 text-muted-foreground">{dateOf(workout)}</Text>
          </View>
          <ChevronRight size={18} />
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Badge variant="secondary"><BadgeText>{workout.exercises.length} exercises</BadgeText></Badge>
          <Badge variant="outline"><BadgeText>{completedSets} sets</BadgeText></Badge>
          <Badge variant="outline"><BadgeText><Clock size={11} /> {formatDuration(workout.durationSeconds ?? 0)}</BadgeText></Badge>
        </View>
        <Text size="xs" numberOfLines={1} className="text-muted-foreground">
          {workout.exercises.map((exercise) => exerciseNames.get(exercise.exerciseId)?.name ?? exercise.exerciseId).join(' · ')}
        </Text>
      </Card>
    </Pressable>
  );
}
