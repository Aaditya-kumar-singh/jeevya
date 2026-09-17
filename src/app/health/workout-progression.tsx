import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, TrendingUp, Trophy } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { getExercisesByIds, type Exercise } from '@/services/exercises';
import { getWorkoutHistory } from '@/services/workoutHistory';
import { getExercisePRs, getExerciseProgression } from '@/services/workoutProgression';
import type { WorkoutExerciseProgression, WorkoutPR } from '@/types/workout';

const PR_LABELS: Record<WorkoutPR['recordType'], string> = {
  max_weight: 'Max Weight',
  max_reps: 'Max Reps',
  max_volume: 'Max Volume',
  longest_duration: 'Longest Duration',
  longest_distance: 'Longest Distance',
};

function formatMetric(value: number | undefined, suffix: string): string {
  return value == null ? '—' : `${Number(value.toFixed(2))} ${suffix}`;
}

function formatChange(value: number | null, suffix: string): string {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${Number(value.toFixed(2))} ${suffix}`;
}

export default function WorkoutProgressionScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [exerciseId, setExerciseId] = useState<string>();
  const [exerciseNames, setExerciseNames] = useState<Map<string, Exercise>>(new Map());
  const [exerciseIds, setExerciseIds] = useState<string[]>([]);
  const [prs, setPrs] = useState<WorkoutPR[]>([]);
  const [progression, setProgression] = useState<WorkoutExerciseProgression | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void getWorkoutHistory().then(async (result) => {
      const ids = [...new Set(result.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.exerciseId)))];
      const names = await getExercisesByIds(ids);
      if (mounted) { setExerciseIds(ids); setExerciseNames(names); if (ids[0]) setExerciseId(ids[0]); }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const loadExercise = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [nextPrs, nextProgression] = await Promise.all([getExercisePRs(id), getExerciseProgression(id)]);
      setPrs(nextPrs);
      setProgression(nextProgression);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    if (exerciseId) void loadExercise(exerciseId);
  }, [exerciseId, loadExercise]);

  const options = useMemo(() => exerciseIds
    .map((id) => [id, exerciseNames.get(id)?.name ?? id] as const)
    .filter(([, name]) => name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a[1].localeCompare(b[1])), [exerciseIds, exerciseNames, query]);

  const selectedName = exerciseId ? exerciseNames.get(exerciseId)?.name ?? exerciseId : 'Exercise';

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-3 pt-14">
        <Text size="sm" className="text-muted-foreground">Training</Text>
        <View className="mt-1 flex-row items-center gap-2"><TrendingUp size={22} /><Heading size="xl">Workout Progression</Heading></View>
        <Text size="xs" className="mt-1 text-muted-foreground">Measured history and estimated 1RM</Text>
      </View>
      <View className="px-5 pb-3">
        <TextInput value={query} onChangeText={setQuery} placeholder="Search exercise" placeholderTextColor="#9CA3AF" className="rounded-2xl border border-border bg-card px-3 py-3 text-foreground" accessibilityLabel="Search exercise" />
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={options} keyExtractor={([id]) => id} contentContainerStyle={{ gap: 8, paddingTop: 10 }} renderItem={({ item: [id, name] }) => (
          <Pressable onPress={() => setExerciseId(id)} className={`rounded-full border px-3 py-2 ${exerciseId === id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`} accessibilityRole="button" accessibilityLabel={`Select ${name}`}>
            <Text size="xs" className="font-medium">{name}</Text>
          </Pressable>
        )} />
      </View>
      {loading ? <View className="items-center justify-center py-12"><ActivityIndicator size="large" /></View> : !exerciseId ? (
        <View className="flex-1 items-center justify-center px-8 pb-16"><Dumbbell size={28} /><Heading size="md" className="mt-3">No exercise history</Heading><Text size="sm" className="mt-1 text-center text-muted-foreground">Complete a workout to see exercise progression.</Text></View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}>
          <View className="flex-row items-center justify-between"><Heading size="lg">{selectedName}</Heading><Pressable onPress={() => router.push('/health/workout-history' as never)}><Text size="xs" className="font-medium text-primary">History</Text></Pressable></View>
          <Card className="gap-3 p-4">
            <View className="flex-row items-center gap-2"><Trophy size={18} /><Heading size="sm">Personal Records</Heading></View>
            {prs.length ? prs.map((pr) => <View key={pr.recordType} className="flex-row items-center justify-between border-b border-border/60 py-2 last:border-b-0"><View className="flex-1"><Text size="sm" className="font-medium">{PR_LABELS[pr.recordType]}</Text><Text size="xs" className="text-muted-foreground">{pr.sessionDate}</Text></View><Badge variant="secondary"><BadgeText>{formatMetric(pr.value, pr.recordType === 'max_reps' ? 'reps' : pr.recordType === 'max_volume' ? 'kg' : pr.recordType === 'longest_duration' ? 'sec' : pr.recordType === 'longest_distance' ? 'km' : 'kg')}</BadgeText></Badge></View>) : <Text size="sm" className="text-muted-foreground">No qualifying completed sets yet.</Text>}
          </Card>

          {progression ? <PerformanceSection progression={progression} /> : null}
          <Card className="gap-3 p-4">
            <Heading size="sm">Progression History</Heading>
            {progression?.points.length ? progression.points.map((point) => <View key={point.sessionId} className="border-b border-border/60 py-3 last:border-b-0"><View className="flex-row items-center justify-between"><View className="flex-1"><Text size="sm" className="font-medium">{point.sessionName}</Text><Text size="xs" className="text-muted-foreground">{point.date}</Text></View><ChevronRight size={16} /></View><View className="mt-2 flex-row flex-wrap gap-2">{point.bestWeightKg != null ? <Badge variant="outline"><BadgeText>{formatMetric(point.bestWeightKg, 'kg')}</BadgeText></Badge> : null}{point.bestReps != null ? <Badge variant="outline"><BadgeText>{formatMetric(point.bestReps, 'reps')}</BadgeText></Badge> : null}{point.bestVolume != null ? <Badge variant="outline"><BadgeText>{formatMetric(point.bestVolume, 'kg vol')}</BadgeText></Badge> : null}{point.bestDurationSeconds != null ? <Badge variant="outline"><BadgeText>{formatMetric(point.bestDurationSeconds, 'sec')}</BadgeText></Badge> : null}{point.bestDistanceKm != null ? <Badge variant="outline"><BadgeText>{formatMetric(point.bestDistanceKm, 'km')}</BadgeText></Badge> : null}</View></View>) : <Text size="sm" className="text-muted-foreground">No progression points available.</Text>}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

function PerformanceSection({ progression }: { progression: WorkoutExerciseProgression }) {
  const current = progression.currentPerformance;
  const previous = progression.previousPerformance;
  return <Card className="gap-3 p-4">
    <Heading size="sm">Current vs Previous</Heading>
    <MetricRow label="Best weight" current={formatMetric(current?.bestWeightKg, 'kg')} previous={formatMetric(previous?.bestWeightKg, 'kg')} change={formatChange(progression.weightChange, 'kg')} />
    <MetricRow label="Best reps" current={formatMetric(current?.bestReps, 'reps')} previous={formatMetric(previous?.bestReps, 'reps')} change={formatChange(progression.repsChange, 'reps')} />
    <MetricRow label="Best volume" current={formatMetric(current?.bestVolume, 'kg')} previous={formatMetric(previous?.bestVolume, 'kg')} change={formatChange(progression.volumeChange, 'kg')} />
    <View className="mt-2 border-t border-border/60 pt-3"><Text size="xs" className="text-muted-foreground">Estimated 1RM</Text><Text size="sm" className="mt-1 font-semibold">Current: {progression.currentEstimatedOneRepMax == null ? '—' : `${progression.currentEstimatedOneRepMax.toFixed(2)} kg`}</Text><Text size="xs" className="mt-1 text-muted-foreground">Previous: {progression.previousEstimatedOneRepMax == null ? '—' : `${progression.previousEstimatedOneRepMax.toFixed(2)} kg`} · Best: {progression.bestEstimatedOneRepMax == null ? '—' : `${progression.bestEstimatedOneRepMax.toFixed(2)} kg`}</Text><Text size="xs" className="mt-1 text-muted-foreground">Estimated from completed sets using Epley, not a measured maximum.</Text></View>
  </Card>;
}

function MetricRow({ label, current, previous, change }: { label: string; current: string; previous: string; change: string }) {
  return <View className="flex-row items-center justify-between border-b border-border/60 py-2"><Text size="sm" className="font-medium flex-1">{label}</Text><View className="items-end"><Text size="xs">{current}</Text><Text size="xs" className="text-muted-foreground">Prev {previous} · {change}</Text></View></View>;
}
