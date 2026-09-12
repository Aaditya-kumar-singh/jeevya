import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useExercises } from '@/hooks/useExercises';
import { getExerciseFilterOptions } from '@/services/exercises';
import type { Exercise } from '@/types/exercise';

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <View className="px-5">
      <Link href={{ pathname: '/health/exercises/[id]', params: { id: exercise.id } } as unknown as Href} asChild>
        <Pressable>
          <Card className="w-full p-4">
            <View className="flex-row items-center justify-between gap-2">
              <Heading size="sm" className="flex-1">{exercise.name}</Heading>
              <Badge variant="secondary"><BadgeText>{exercise.body_part ?? '—'}</BadgeText></Badge>
            </View>
            <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
              <Text size="sm" className="text-muted-foreground">{exercise.equipment ?? '—'}</Text>
              {exercise.target ? <Text size="sm" className="text-muted-foreground">Target: {exercise.target}</Text> : null}
            </View>
          </Card>
        </Pressable>
      </Link>
    </View>
  );
}

export default function ExercisesScreen() {
  const { data: exercises, total, source, loading, loadingMore, refreshing, error, hasMore, setFilter, loadMore, refresh } = useExercises();
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState<string>('All');
  const [bodyParts, setBodyParts] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    getExerciseFilterOptions().then((o) => { if (active) setBodyParts(o.bodyParts); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFilter({ query, body_part: bodyPart === 'All' ? null : bodyPart }), 300);
    return () => clearTimeout(timer);
  }, [query, bodyPart, setFilter]);

  const chips = ['All', ...bodyParts];

  return (
    <FlatList
      className="flex-1 bg-background"
      data={exercises}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ExerciseCard exercise={item} />}
      contentContainerStyle={{ paddingBottom: 32 }}
      onEndReachedThreshold={0.4}
      onEndReached={() => { if (hasMore && !loadingMore) void loadMore(); }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      ListHeaderComponent={
        <View className="gap-4 px-5 pb-3 pt-14">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text size="sm" className="text-muted-foreground">Exercise database</Text>
              <Heading size="xl" className="mt-1">{total === null ? 'Loading…' : `${total.toLocaleString()} exercises`}</Heading>
            </View>
            {source === 'fallback' ? <Badge variant="outline"><BadgeText>Offline sample</BadgeText></Badge> : null}
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises…"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {chips.map((chip) => {
                const active = chip === bodyPart;
                return (
                  <Pressable key={chip} onPress={() => setBodyPart(chip)}>
                    <Badge variant={active ? 'default' : 'outline'}><BadgeText>{chip}</BadgeText></Badge>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {error && exercises.length === 0 ? (
            <View className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
              <Text size="sm" className="text-destructive">{error}</Text>
              <Pressable onPress={() => void refresh()} className="mt-3 self-start rounded-full bg-primary px-4 py-2">
                <Text size="sm" className="font-medium text-primary-foreground">Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        !loading && !error ? (
          <View className="px-5">
            <Card className="w-full p-4">
              <Text size="sm" className="text-muted-foreground">No exercises match your search.</Text>
            </Card>
          </View>
        ) : null
      }
      ListFooterComponent={
        <View className="px-5 pt-4">
          {loading ? <ActivityIndicator size="small" className="py-2" /> : null}
          {!loading && loadingMore ? <ActivityIndicator size="small" className="py-2" /> : null}
          {!loading && !loadingMore && hasMore ? (
            <Pressable onPress={() => void loadMore()} className="w-full items-center rounded-full border border-border bg-card py-3">
              <Text size="sm" className="font-medium text-foreground">Load more</Text>
            </Pressable>
          ) : null}
          {!loading && !hasMore && exercises.length > 0 ? (
            <Text size="sm" className="text-center text-muted-foreground">That&apos;s all {total ?? exercises.length} exercises</Text>
          ) : null}
        </View>
      }
    />
  );
}

