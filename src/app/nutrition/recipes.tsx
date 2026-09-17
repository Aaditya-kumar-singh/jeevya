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
import { searchRecipes, calculateRecipePerServing } from '@/services/nutrition';
import type { Recipe } from '@/types/nutrition';

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, foods, loading, refreshing, refresh, removeRecipe } = useNutrition();
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const results = useMemo(() => searchRecipes(recipes, query), [recipes, query]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await removeRecipe(id);
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
          Loading recipes...
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
              Recipes
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              {results.length} of {recipes.length} recipes
            </Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/recipe-edit')}
            accessibilityLabel="Create recipe"
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
            placeholder="Search recipes..."
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            accessibilityLabel="Search recipes"
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

        {/* Recipe list */}
        {results.length === 0 ? (
          <Card className="w-full items-center p-6">
            <Heading size="md" className="text-center">
              No recipes
            </Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">
              {query.trim()
                ? `Nothing matches "${query.trim()}".`
                : 'Create your first recipe to get started.'}
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {results.map((recipe) => {
              const perServing = calculateRecipePerServing(recipe, foods);
              return (
                <Pressable
                  key={recipe.id}
                  onPress={() =>
                    router.push({
                      pathname: '/nutrition/recipe',
                      params: { recipeId: recipe.id },
                    })
                  }
                  className="min-h-[44px]"
                  accessibilityRole="button"
                  accessibilityLabel={`Recipe: ${recipe.name}`}
                >
                  <Card className="w-full p-4">
                    <View className="flex-row items-start gap-3">
                      <View className="flex-1">
                        <Heading size="sm">{recipe.name}</Heading>
                        <Text size="xs" className="mt-0.5 text-muted-foreground">
                          {recipe.category || 'Uncategorized'} · {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
                          {' · '}{recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                        </Text>
                        <Text size="sm" className="mt-1 font-medium">
                          {fmt(perServing.totals.calories)} kcal/serving{' '}
                          <Text size="xs" className="font-normal text-muted-foreground">
                            P {fmt(perServing.totals.protein)}g · C{' '}
                            {fmt(perServing.totals.carbohydrates)}g · F{' '}
                            {fmt(perServing.totals.fat)}g
                          </Text>
                        </Text>
                        {perServing.unavailableCount > 0 ? (
                          <Badge variant="outline" className="mt-1">
                            <BadgeText>
                              {perServing.unavailableCount} missing food{perServing.unavailableCount > 1 ? 's' : ''}
                            </BadgeText>
                          </Badge>
                        ) : null}
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: '/nutrition/recipe-edit',
                              params: { recipeId: recipe.id },
                            })
                          }
                          className="min-h-[44px] min-w-[44px] items-center justify-center"
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${recipe.name}`}
                        >
                          <Pencil size={14} className="text-muted-foreground" />
                        </Pressable>
                        <Pressable
                          onPress={() => void handleDelete(recipe.id)}
                          disabled={deleting === recipe.id}
                          className="min-h-[44px] min-w-[44px] items-center justify-center"
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${recipe.name}`}
                        >
                          {deleting === recipe.id ? (
                            <ActivityIndicator size={14} className="text-destructive" />
                          ) : (
                            <Trash2 size={14} className="text-destructive" />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
