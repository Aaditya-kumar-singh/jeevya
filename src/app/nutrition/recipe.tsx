import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Pencil,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import { calculateRecipeNutrition, calculateRecipePerServing } from '@/services/nutrition';
import type { NutrientTotals } from '@/types/nutrition';

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function MacroRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View className="flex-row justify-between">
      <Text size="sm" className="text-muted-foreground">{label}</Text>
      <Text size="sm" className="font-medium">{fmt(value)}{unit}</Text>
    </View>
  );
}

function NutritionCard({ title, totals }: { title: string; totals: NutrientTotals }) {
  const micros = Object.entries(totals.micronutrients);
  return (
    <Card className="w-full p-4">
      <Heading size="sm">{title}</Heading>
      <View className="mt-2 gap-1.5">
        <MacroRow label="Calories" value={totals.calories} unit=" kcal" />
        <MacroRow label="Protein" value={totals.protein} unit=" g" />
        <MacroRow label="Carbohydrates" value={totals.carbohydrates} unit=" g" />
        <MacroRow label="Fat" value={totals.fat} unit=" g" />
        <MacroRow label="Fiber" value={totals.fiber} unit=" g" />
        <MacroRow label="Sugar" value={totals.sugar} unit=" g" />
        <MacroRow label="Saturated Fat" value={totals.saturatedFat} unit=" g" />
        <MacroRow label="Sodium" value={totals.sodium} unit=" mg" />
        {micros.map(([key, value]) => (
          <MacroRow key={key} label={key} value={value as number} unit="" />
        ))}
      </View>
    </Card>
  );
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const { recipes, foods, loading } = useNutrition();

  const recipe = params.recipeId
    ? recipes.find((r) => r.id === params.recipeId) ?? null
    : null;

  const totalResult = useMemo(
    () => (recipe ? calculateRecipeNutrition(recipe, foods) : null),
    [recipe, foods],
  );

  const perServingResult = useMemo(
    () => (recipe ? calculateRecipePerServing(recipe, foods) : null),
    [recipe, foods],
  );

  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">Recipe not found</Heading>
        <Button onPress={() => router.back()} variant="outline" className="mt-4 min-h-[44px]">
          <ButtonText>Go Back</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">Recipe</Text>
            <Heading size="xl" className="mt-1">{recipe.name}</Heading>
          </View>
          <Button
            variant="ghost"
            size="icon"
            onPress={() =>
              router.push({
                pathname: '/nutrition/recipe-edit',
                params: { recipeId: recipe.id },
              })
            }
            accessibilityLabel="Edit recipe"
          >
            <Pencil size={20} />
          </Button>
        </View>

        {/* Info */}
        <Card className="w-full p-4">
          {recipe.description ? (
            <Text size="sm" className="text-muted-foreground">{recipe.description}</Text>
          ) : null}
          <View className="mt-2 flex-row flex-wrap gap-2">
            {recipe.category ? (
              <Badge variant="secondary"><BadgeText>{recipe.category}</BadgeText></Badge>
            ) : null}
            <Badge variant="outline">
              <BadgeText>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</BadgeText>
            </Badge>
            <Badge variant="outline">
              <BadgeText>{recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}</BadgeText>
            </Badge>
          </View>
        </Card>

        {/* Ingredients */}
        <Card className="w-full p-4">
          <Heading size="sm">Ingredients</Heading>
          <View className="mt-2 gap-2">
            {recipe.ingredients.map((ing) => {
              const food = foodMap.get(ing.foodId);
              return (
                <View key={ing.id} className="flex-row items-center justify-between">
                  <Text size="sm" className="flex-1">
                    {food ? food.name : 'Unknown food'}
                  </Text>
                  <Text size="sm" className="text-muted-foreground">
                    {ing.quantity} {ing.unit}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Log as meal */}
        <Button
          variant="outline"
          className="min-h-[44px]"
          onPress={() =>
            router.push({
              pathname: '/nutrition/log',
              params: { recipeId: recipe.id, itemType: 'recipe' },
            })
          }
          accessibilityLabel="Log recipe as meal"
        >
          <ClipboardList size={14} className="mr-2 text-muted-foreground" />
          <ButtonText>Log as Meal</ButtonText>
        </Button>

        {/* Unavailable ingredients */}
        {totalResult && totalResult.unavailableCount > 0 ? (
          <View className="flex-row items-center gap-2 rounded-lg bg-yellow-50 p-2.5 dark:bg-yellow-900/20">
            <AlertTriangle size={12} className="text-yellow-600" />
            <Text size="xs" className="flex-1 text-yellow-700 dark:text-yellow-400">
              {totalResult.unavailableCount} ingredient{totalResult.unavailableCount > 1 ? 's' : ''} reference{totalResult.unavailableCount > 1 ? '' : 's'} a missing food and are excluded from totals.
            </Text>
          </View>
        ) : null}

        {/* Total nutrition */}
        {totalResult && totalResult.calculatedCount > 0 ? (
          <NutritionCard title={`Total Recipe Nutrition (${recipe.servings} servings)`} totals={totalResult.totals} />
        ) : null}

        {/* Per-serving nutrition */}
        {perServingResult && perServingResult.calculatedCount > 0 ? (
          <NutritionCard title="Per Serving Nutrition" totals={perServingResult.totals} />
        ) : null}
      </View>
    </ScrollView>
  );
}
