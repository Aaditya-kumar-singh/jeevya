import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Copy, Heart, Pencil, Play, Search, Trash2 } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { WorkoutEmptyState } from '@/components/workout/WorkoutEmptyState';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import type { WorkoutTemplate } from '@/types/workout';

export default function WorkoutTemplatesScreen() {
  const router = useRouter();
  const { getTemplates, startFromTemplate, deleteTemplate, duplicateTemplate, toggleTemplateFavorite } = useWorkoutTemplates();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await getTemplates(query));
    } finally {
      setLoading(false);
    }
  }, [getTemplates, query]);

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const start = useCallback(async (template: WorkoutTemplate) => {
    try {
      const session = await startFromTemplate(template.id);
      router.push({ pathname: '/health/workout-session/[id]', params: { id: session.id } } as never);
    } catch (error) {
      Alert.alert('Could not start workout', error instanceof Error ? error.message : 'Please try again.');
    }
  }, [router, startFromTemplate]);

  const remove = useCallback((template: WorkoutTemplate) => {
    Alert.alert('Delete template?', `Delete “${template.name}”? Existing workouts will stay available.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTemplate(template.id); await load(); } },
    ]);
  }, [load, deleteTemplate]);

  const duplicate = useCallback(async (template: WorkoutTemplate) => {
    await duplicateTemplate(template.id);
    await load();
  }, [load, duplicateTemplate]);

  const toggleFavorite = useCallback(async (template: WorkoutTemplate) => {
    await toggleTemplateFavorite(template.id);
    await load();
  }, [load, toggleTemplateFavorite]);

  const empty = useMemo(() => !loading && templates.length === 0, [loading, templates.length]);

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pb-3 pt-14">
        <Text size="sm" className="text-muted-foreground">Training</Text>
        <Heading size="xl" className="mt-1">Workout Templates</Heading>
        <View className="mt-3 flex-row items-center rounded-2xl border border-border bg-card px-3">
          <Search size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search templates"
            placeholderTextColor="#9CA3AF"
            className="flex-1 px-2 py-3 text-foreground"
            accessibilityLabel="Search templates"
          />
        </View>
      </View>

      <View className="px-5 pb-3">
        <Pressable
          onPress={() => router.push('/health/workout-template-editor' as never)}
          className="items-center justify-center rounded-2xl bg-primary py-3 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Create workout template">
          <Text size="sm" className="font-semibold text-primary-foreground">New Template</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="items-center justify-center py-12"><ActivityIndicator size="large" /></View>
      ) : empty ? (
        <WorkoutEmptyState
          title={query ? 'No templates found' : 'No templates yet'}
          message={query ? 'Try a different name or description.' : 'Save a workout from the Builder or create your first template.'}
          actionLabel="Create Template"
          onAction={() => router.push('/health/workout-template-editor' as never)}
        />
      ) : (
        <FlatList
          className="flex-1"
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20, gap: 12 }}
          renderItem={({ item }) => (
            <Card className="gap-3 p-4">
              <View className="flex-row items-start gap-3">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Heading size="sm">{item.name}</Heading>
                    {item.isFavorite ? <Heart size={15} fill="currentColor" className="text-rose-500" /> : null}
                  </View>
                  {item.description ? <Text size="xs" className="mt-1 text-muted-foreground">{item.description}</Text> : null}
                  <View className="mt-2 flex-row gap-2">
                    <Badge variant="secondary"><BadgeText>{item.exercises.length} exercises</BadgeText></Badge>
                    {item.isFavorite ? <Badge variant="outline"><BadgeText>Favorite</BadgeText></Badge> : null}
                  </View>
                </View>
                <Pressable onPress={() => void toggleFavorite(item)} hitSlop={8} accessibilityLabel="Toggle favorite">
                  <Heart size={20} fill={item.isFavorite ? 'currentColor' : 'none'} className={item.isFavorite ? 'text-rose-500' : 'text-muted-foreground'} />
                </Pressable>
              </View>
              <View className="flex-row items-center justify-between border-t border-border pt-3">
                <View className="flex-row gap-1">
                  <Pressable onPress={() => void start(item)} className="h-10 flex-row items-center gap-1 rounded-xl px-2 active:bg-muted" accessibilityLabel="Start template">
                    <Play size={17} /><Text size="xs" className="font-semibold">Start</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push({ pathname: '/health/workout-template-editor', params: { id: item.id } } as never)} className="h-10 flex-row items-center gap-1 rounded-xl px-2 active:bg-muted" accessibilityLabel="Edit template">
                    <Pencil size={17} /><Text size="xs" className="font-semibold">Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => void duplicate(item)} className="h-10 flex-row items-center gap-1 rounded-xl px-2 active:bg-muted" accessibilityLabel="Duplicate template">
                    <Copy size={17} /><Text size="xs" className="font-semibold">Duplicate</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => remove(item)} className="h-10 w-10 items-center justify-center rounded-xl active:bg-muted" accessibilityLabel="Delete template">
                  <Trash2 size={18} />
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
