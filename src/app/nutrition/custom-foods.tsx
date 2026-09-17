import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import { searchFoods } from '@/services/nutrition';
import type { FoodItem } from '@/types/nutrition';

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function basisLabel(food: FoodItem): string {
  const n = food.nutrition;
  if (n.basis === 'per_100g') return 'per 100 g';
  if (n.basis === 'per_100ml') return 'per 100 ml';
  return `per ${n.servingAmount ?? '?'} ${n.servingUnit ?? ''}`.trim();
}

export default function CustomFoodsScreen() {
  const router = useRouter();
  const { foods, loading, refreshing, refresh, removeFood } = useNutrition();
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const customFoods = useMemo(
    () => foods.filter((f) => f.source === 'custom'),
    [foods],
  );

  const results = useMemo(() => searchFoods(customFoods, query), [customFoods, query]);

  const handleDelete = async (id: string, name: string) => {
    setDeleting(id);
    try {
      await removeFood(id);
    } catch {
      // Error handled by hook
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading custom foods...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Nutrition
            </Text>
            <Heading size="xl" className="mt-1">
              Custom Foods
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              {results.length} of {customFoods.length} foods
            </Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/custom-food-edit')}
            accessibilityLabel="Create custom food"
          >
            <Plus size={20} />
          </Button>
        </View>

        {/* Search */}
        <Input className="bg-card">
          <InputSlot>
            <Search size={16} className="ml-3 text-muted-foreground" />
          </InputSlot>
          <InputField
            placeholder="Search custom foods..."
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            accessibilityLabel="Search custom foods"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              className="min-h-[44px] min-w-[44px] items-center justify-center px-3"
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={16} className="text-muted-foreground" />
            </Pressable>
          )}
        </Input>

        {/* Food list */}
        {results.length === 0 ? (
          <Card className="w-full items-center p-6">
            <Heading size="md" className="text-center">
              No custom foods
            </Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">
              {query.trim()
                ? `Nothing matches "${query.trim()}".`
                : 'Create your first custom food to get started.'}
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {results.map((food) => (
              <Card key={food.id} className="w-full p-4">
                <View className="flex-row items-start gap-3">
                  <View className="flex-1">
                    <Heading size="sm">{food.name}</Heading>
                    <Text size="xs" className="mt-0.5 text-muted-foreground">
                      {food.category || 'Uncategorized'} · {food.preparation}
                      {food.brand ? ` · ${food.brand}` : ''}
                    </Text>
                    <Text size="sm" className="mt-1 font-medium">
                      {fmt(food.nutrition.calories)} kcal{' '}
                      <Text size="xs" className="font-normal text-muted-foreground">
                        {basisLabel(food)} · P {fmt(food.nutrition.protein)}g · C{' '}
                        {fmt(food.nutrition.carbohydrates)}g · F {fmt(food.nutrition.fat)}g
                      </Text>
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/nutrition/custom-food-edit',
                          params: { foodId: food.id },
                        })
                      }
                      className="min-h-[44px] min-w-[44px] items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${food.name}`}
                    >
                      <Pencil size={14} className="text-muted-foreground" />
                    </Pressable>
                    <Pressable
                      onPress={() => void handleDelete(food.id, food.name)}
                      disabled={deleting === food.id}
                      className="min-h-[44px] min-w-[44px] items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${food.name}`}
                    >
                      {deleting === food.id ? (
                        <ActivityIndicator size={14} className="text-destructive" />
                      ) : (
                        <Trash2 size={14} className="text-destructive" />
                      )}
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
