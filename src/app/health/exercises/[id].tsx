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
import { Image } from 'expo-image';
import { useOfflineExercise } from '@/hooks/useOfflineExercise';

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

  const {
    isDownloaded,
    isDownloading,
    downloadProgress,
    downloadError,
    removing,
    download,
    removeDownload,
    exercise: offlineExercise,
    mediaLocalUri
  } = useOfflineExercise(id ?? '');

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
    void load();
  }, [load]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Use offline exercise data if it exists, otherwise online data
  const activeExercise = offlineExercise || exercise;

  if (error || !activeExercise) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text size="sm" className="text-center text-muted-foreground">{error ?? 'Exercise not found.'}</Text>
        <Pressable onPress={() => router.back()} className="rounded-full bg-primary px-5 py-2">
          <Text size="sm" className="font-medium text-primary-foreground">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const rawSteps = activeExercise.instruction_steps;
  const steps: string[] = Array.isArray(rawSteps) ? rawSteps : (rawSteps?.en ?? []);
  
  const rawParagraph = activeExercise.instructions;
  const paragraph: string = typeof rawParagraph === 'string' ? rawParagraph : (rawParagraph?.en ?? '');

  const mediaUri = activeExercise.gif_url ?? activeExercise.image ?? null;
  let finalMediaUrl: string | null = null;
  if (mediaLocalUri) {
    finalMediaUrl = mediaLocalUri;
  } else if (mediaUri) {
    finalMediaUrl = mediaUri.startsWith('http') 
      ? mediaUri 
      : `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${mediaUri}`;
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-10 pt-14">
        <Pressable onPress={() => router.back()} className="w-fit flex-row items-center gap-1 self-start">
          <ChevronLeft size={18} />
          <Text size="sm" className="text-muted-foreground">Back</Text>
        </Pressable>

        {finalMediaUrl ? (
          <Image
            source={{ uri: finalMediaUrl }}
            style={{ width: '100%', height: 256, borderRadius: 16, backgroundColor: '#f5f5f5' }}
            contentFit="contain"
            transition={200}
          />
        ) : null}

        <View className="flex-row items-start justify-between gap-2 mt-2">
          <Heading size="2xl" className="flex-1">{activeExercise.name}</Heading>
          <Badge variant="secondary"><BadgeText>{activeExercise.body_part ?? '—'}</BadgeText></Badge>
        </View>

        <View className="flex-row items-center gap-3">
          <Button
            variant="default"
            className="flex-1"
            onPress={() =>
              router.push({
                pathname: '/health/workout-builder',
                params: { exerciseId: activeExercise.id },
              } as never)
            }>
            <ButtonText>Add to Workout</ButtonText>
          </Button>

          {isDownloaded ? (
             <Button
               variant="outline"
               disabled={removing}
               onPress={() => void removeDownload()}
             >
               <ButtonText>{removing ? 'Removing...' : 'Remove Offline'}</ButtonText>
             </Button>
          ) : (
             <Button
               variant="outline"
               disabled={isDownloading}
               onPress={() => void download(activeExercise)}
             >
               <ButtonText>{isDownloading ? `Downloading ${Math.round((downloadProgress ?? 0) * 100)}%` : 'Download Offline'}</ButtonText>
             </Button>
          )}
        </View>

        {downloadError ? (
          <Text size="sm" className="text-destructive">{downloadError}</Text>
        ) : null}

        <Card className="gap-3 p-4">
          <DetailRow label="Body part" value={activeExercise.body_part ?? '—'} />
          <DetailRow label="Equipment" value={activeExercise.equipment ?? '—'} />
          <DetailRow label="Target" value={activeExercise.target ?? '—'} />
          <DetailRow label="Muscle group" value={activeExercise.muscle_group ?? '—'} />
          {activeExercise.secondary_muscles && activeExercise.secondary_muscles.length > 0 ? (
            <DetailRow label="Secondary" value={activeExercise.secondary_muscles.join(', ')} />
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
