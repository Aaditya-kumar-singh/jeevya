import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import type {
  CreateRecipeInput,
  RecipeIngredient,
  ServingUnit,
} from '@/types/nutrition';
import { SERVING_UNITS } from '@/types/nutrition';

export default function RecipeEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const { foods, recipes, loading, addRecipe, editRecipe } = useNutrition();

  const isEdit = !!params.recipeId;
  const existing = isEdit ? recipes.find((r) => r.id === params.recipeId) ?? null : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [servings, setServings] = useState('1');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [totalQuantityUnit, setTotalQuantityUnit] = useState<ServingUnit>('g');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  // Existing form hydration intentionally updates local draft state from an external loaded record.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setCategory(existing.category ?? '');
      setServings(String(existing.servings));
      setTotalQuantity(existing.totalQuantity ? String(existing.totalQuantity.amount) : '');
      setTotalQuantityUnit(existing.totalQuantity?.unit ?? 'g');
      setIngredients([...existing.ingredients]);
    }
  }, [existing]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: `ring_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        foodId: foods.length > 0 ? foods[0].id : '',
        quantity: 100,
        unit: 'g' as ServingUnit,
      },
    ]);
  };

  const updateIngredient = (id: string, field: keyof RecipeIngredient, value: string | number) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        if (field === 'quantity') {
          return { ...ing, [field]: Number(value) || 0 };
        }
        return { ...ing, [field]: value };
      }),
    );
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }
    const parsedServings = Number(servings);
    if (!Number.isFinite(parsedServings) || parsedServings <= 0) {
      setError('Servings must be greater than 0');
      return;
    }
    if (ingredients.length === 0) {
      setError('Add at least one ingredient');
      return;
    }
    const parsedTotalQuantity = totalQuantity.trim() === '' ? undefined : Number(totalQuantity);
    if (parsedTotalQuantity !== undefined && (!Number.isFinite(parsedTotalQuantity) || parsedTotalQuantity <= 0)) {
      setError('Total recipe quantity must be greater than 0');
      return;
    }
    for (const ing of ingredients) {
      if (!ing.foodId) {
        setError('All ingredients must have a food selected');
        return;
      }
      if (!Number.isFinite(ing.quantity) || ing.quantity <= 0) {
        setError('All ingredient quantities must be positive numbers');
        return;
      }
    }

    const input: CreateRecipeInput = {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      servings: parsedServings,
      ...(parsedTotalQuantity !== undefined
        ? { totalQuantity: { amount: parsedTotalQuantity, unit: totalQuantityUnit } }
        : {}),
      ingredients: ingredients.map((ing) => ({
        foodId: ing.foodId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };

    setSaving(true);
    try {
      if (isEdit && params.recipeId) {
        await editRecipe(params.recipeId, {
          ...input,
          ingredients: ingredients,
        });
      } else {
        await addRecipe(input);
      }
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading && isEdit && !existing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">Recipe</Text>
            <Heading size="xl" className="mt-1">
              {isEdit ? 'Edit Recipe' : 'New Recipe'}
            </Heading>
          </View>
        </View>

        {/* Name */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chicken Rice"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
            accessibilityLabel="Recipe name"
          />
        </View>

        {/* Description */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description..."
            multiline
            numberOfLines={3}
            className="min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-foreground"
            accessibilityLabel="Description"
          />
        </View>

        {/* Category */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Category (optional)</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Main Course"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
            accessibilityLabel="Category"
          />
        </View>

        {/* Servings */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Servings *</Text>
          <TextInput
            value={servings}
            onChangeText={setServings}
            placeholder="1"
            keyboardType="number-pad"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
            accessibilityLabel="Number of servings"
          />
        </View>

        {/* Finished recipe quantity */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Total Recipe Quantity (optional)</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={totalQuantity}
              onChangeText={setTotalQuantity}
              placeholder="e.g. 800"
              keyboardType="decimal-pad"
              className="flex-1 min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
              accessibilityLabel="Total recipe quantity"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }} className="flex-[1.5]">
              {(['g', 'ml', 'cup', 'bowl', 'serving'] as ServingUnit[]).map((unit) => {
                const active = totalQuantityUnit === unit;
                return (
                  <Pressable key={unit} onPress={() => setTotalQuantityUnit(unit)} className={`min-h-[44px] justify-center rounded-lg px-3 py-2 ${active ? 'bg-primary' : 'bg-muted'}`}>
                    <Text size="xs" className={`font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{unit}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <Text size="xs" className="mt-2 text-muted-foreground">Declare the finished quantity when you want arbitrary consumed portions. No dish weight is assumed.</Text>
        </View>

        {/* Ingredients */}
        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Heading size="sm">Ingredients</Heading>
            <Button variant="ghost" size="icon" onPress={addIngredient} accessibilityLabel="Add ingredient">
              <Plus size={16} />
            </Button>
          </View>

          {ingredients.length === 0 ? (
            <Text size="sm" className="mt-2 text-muted-foreground">
              No ingredients yet. Tap + to add one.
            </Text>
          ) : (
            <View className="mt-3 gap-3">
              {ingredients.map((ing) => (
                <View key={ing.id} className="gap-2 rounded-lg border border-border p-3">
                  {/* Food selector */}
                  <View>
                    <Text size="xs" className="mb-1 text-muted-foreground">Food</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 4 }}
                    >
                      {foods.map((f) => {
                        const active = ing.foodId === f.id;
                        return (
                          <Pressable
                            key={f.id}
                            onPress={() => updateIngredient(ing.id, 'foodId', f.id)}
                            className={`min-h-[36px] justify-center rounded-lg px-2 py-1 ${active ? 'bg-primary' : 'bg-muted'}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text size="xs" className={`font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                              {f.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Quantity + Unit + Delete */}
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={String(ing.quantity)}
                      onChangeText={(t) => updateIngredient(ing.id, 'quantity', t)}
                      placeholder="100"
                      keyboardType="decimal-pad"
                      className="min-h-[44px] w-[80px] rounded-lg border border-border bg-card px-2 text-center text-foreground"
                      accessibilityLabel="Quantity"
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 4 }}
                      className="flex-1"
                    >
                      {SERVING_UNITS.map((u) => {
                        const active = ing.unit === u;
                        return (
                          <Pressable
                            key={u}
                            onPress={() => updateIngredient(ing.id, 'unit', u)}
                            className={`min-h-[36px] justify-center rounded-lg px-2 py-1 ${active ? 'bg-primary' : 'bg-muted'}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text size="xs" className={`font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                              {u}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Pressable
                      onPress={() => removeIngredient(ing.id)}
                      className="min-h-[44px] min-w-[44px] items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel="Remove ingredient"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Error */}
        {error ? (
          <View className="flex-row items-center gap-2 rounded-lg bg-red-50 p-2.5 dark:bg-red-900/20">
            <AlertTriangle size={12} className="text-red-500" />
            <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">
              {error}
            </Text>
          </View>
        ) : null}

        {/* Submit */}
        <Button
          className="min-h-[44px]"
          onPress={handleSubmit}
          disabled={saving}
          accessibilityLabel={isEdit ? 'Save changes' : 'Create recipe'}
        >
          {saving ? (
            <ActivityIndicator size="small" className="text-primary-foreground" />
          ) : (
            <>
              <Check size={16} className="mr-2 text-primary-foreground" />
              <ButtonText>{isEdit ? 'Save Changes' : 'Create Recipe'}</ButtonText>
            </>
          )}
        </Button>
      </View>
    </ScrollView>
  );
}
