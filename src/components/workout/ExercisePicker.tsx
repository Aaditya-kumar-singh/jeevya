import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getExercises, getExerciseFilterOptions } from '@/services/exercises';
import type { Exercise } from '@/types/exercise';

interface ExercisePickerProps {
  visible: boolean;
  onClose: (selected: Exercise[]) => void;
  initialSelectedIds?: string[];
  excludedIds?: string[];
}

export function ExercisePicker({
  visible,
  onClose,
  initialSelectedIds = [],
  excludedIds = [],
}: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState('All');
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [rows, setRows] = useState<Exercise[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedMap, setSelectedMap] = useState<Map<string, Exercise>>(new Map());
  const pageRef = useRef(0);

  const load = useCallback(
    async (page: number) => {
      const result = await getExercises({
        page,
        pageSize: 20,
        filter: { query, body_part: bodyPart === 'All' ? null : bodyPart },
      });
      setRows((prev) => (page === 0 ? result.data : [...prev, ...result.data]));
      setCount(result.count);
      setHasMore(result.hasMore);
    },
    [query, bodyPart],
  );

  useEffect(() => {
    let active = true;
    getExerciseFilterOptions().then((o) => {
      if (active) setBodyParts(o.bodyParts);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    pageRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
     
    setRows([]);
    load(0)
      .catch(() => {
        setRows([]);
        setCount(0);
        setHasMore(false);
      })
      .finally(() => setLoading(false));
  }, [visible, query, bodyPart, load]);

  const toggle = (exercise: Exercise) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(exercise.id)) next.delete(exercise.id);
      else next.set(exercise.id, exercise);
      return next;
    });
  };

  const chips = ['All', ...bodyParts];
  const selectedCount = selectedMap.size;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onClose([])}>
      <View className="flex-1 bg-background pt-14">
        <View className="flex-row items-center justify-between px-5 pb-2">
          <Text size="lg" className="font-semibold text-foreground">
            Select Exercise
          </Text>
          <Pressable
            onPress={() => onClose([...selectedMap.values()])}
            accessibilityRole="button"
            accessibilityLabel="Done"
            className="h-11 items-center justify-center px-2">
            <Text size="sm" className="font-semibold text-primary">
              Done{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Text>
          </Pressable>
        </View>

        <View className="gap-3 px-5 pb-3">
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
                    <Badge variant={active ? 'default' : 'outline'}>
                      <BadgeText>{chip}</BadgeText>
                    </Badge>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          {count !== null ? (
            <Text size="xs" className="text-muted-foreground">
              {count.toLocaleString()} results
            </Text>
          ) : null}
        </View>

        <FlatList
          className="flex-1"
          data={rows.filter((r) => !excludedIds.includes(r.id))}
          keyExtractor={(item) => item.id}
          extraData={selectedMap}
          contentContainerStyle={{ paddingBottom: 24 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              setLoadingMore(true);
              load(pageRef.current + 1)
                .then(() => {
                  pageRef.current += 1;
                })
                .finally(() => setLoadingMore(false));
            }
          }}
          ListEmptyComponent={
            loading ? (
              <View className="gap-2 px-5 pt-2">
                <View className="h-16 rounded-2xl bg-muted" />
                <View className="h-16 rounded-2xl bg-muted" />
                <View className="h-16 rounded-2xl bg-muted" />
              </View>
            ) : (
              <View className="px-5 pt-4">
                <Text size="sm" className="text-center text-muted-foreground">
                  No exercises found. Try a different search or filter.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" className="py-3" /> : null
          }
          renderItem={({ item }) => {
            const selected = selectedMap.has(item.id);
            return (
              <Pressable
                onPress={() => toggle(item)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`Select ${item.name}`}
                className={`mx-5 mb-2 flex-row items-center gap-3 rounded-2xl border p-4 ${
                  selected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}>
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-primary bg-primary' : 'border-gray-400'
                  }`}>
                  {selected ? <Check size={14} color="#fff" /> : null}
                </View>
                <View className="flex-1">
                  <Text size="sm" className="font-semibold text-foreground">
                    {item.name}
                  </Text>
                  <Text size="xs" className="mt-0.5 text-muted-foreground">
                    {item.body_part ?? '—'} · {item.equipment ?? '—'}
                    {item.target ? ` · ${item.target}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />

        <View className="px-5 pb-6 pt-2">
          <Button variant="default" size="lg" onPress={() => onClose([...selectedMap.values()])}>
            <ButtonText>Add{selectedCount > 0 ? ` (${selectedCount})` : ''}</ButtonText>
          </Button>
        </View>
      </View>
    </Modal>
  );
}