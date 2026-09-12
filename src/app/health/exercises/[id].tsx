import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { getExerciseById } from '@/services/exercises';
import type { Exercise } from '@/types/exercise';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text size="sm" className="text-muted-foreground">{label}</Text>
      <Text size="sm" className="text-foreground">{value}</Text>
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const found = await getExerciseById(id);
      setExercise(found);
      if (!found) setError('Exercise not found.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load exercise');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text size="sm" className="text-center text-muted-foreground">{error ?? 'Exercise not found.'}</Text>
        <Pressable onPress={() => router.back()} className="rounded-full bg-primary px-5 py-2">
          <Text size="sm" className="font-medium text-primary-foreground">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const steps: string[] = exercise.instruction_steps?.en ?? [];
  const paragraph = exercise.instructions?.en ?? '';

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-10 pt-14">
        <Pressable onPress={() => router.back()} className="w-fit flex-row items-center gap-1 self-start">
          <ChevronLeft size={18} />
          <Text size="sm" className="text-muted-foreground">Back</Text>
        </Pressable>

        <View className="flex-row items-start justify-between gap-2">
          <Heading size="2xl" className="flex-1">{exercise.name}</Heading>
          <Badge variant="secondary"><BadgeText>{exercise.body_part ?? '—'}</BadgeText></Badge>
        </View>

        <Button
          variant="default"
          onPress={() =>
            router.push({
              pathname: '/health/workout-builder',
              params: { exerciseId: exercise.id },
            } as never)
          }>
          <ButtonText>Add to Workout</ButtonText>
        </Button>

        <Card className="gap-3 p-4">
          <DetailRow label="Body part" value={exercise.body_part ?? '—'} />
          <DetailRow label="Equipment" value={exercise.equipment ?? '—'} />
          <DetailRow label="Target" value={exercise.target ?? '—'} />
          <DetailRow label="Muscle group" value={exercise.muscle_group ?? '—'} />
          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 ? (
            <DetailRow label="Secondary" value={exercise.secondary_muscles.join(', ')} />
          ) : null}
        </Card>

        {paragraph ? (
          <Card className="p-4">
            <Heading size="sm">Instructions</Heading>
            <Text size="sm" className="mt-2 leading-5 text-foreground">{paragraph}</Text>
          </Card>
        ) : null}

        {steps.length > 0 ? (
          <Card className="p-4">
            <Heading size="sm">Steps</Heading>
            <View className="mt-2 gap-2">
              {steps.map((step, index) => (
                <View key={index} className="flex-row gap-2">
                  <Text size="sm" className="text-muted-foreground">{index + 1}.</Text>
                  <Text size="sm" className="flex-1 text-foreground">{step}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}