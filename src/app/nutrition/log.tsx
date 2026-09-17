import { useEffect, useMemo, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Utensils,
  X,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import {
  calculateNutrition,
  compatibleUnits,
  calculateRecipePerServing,
} from '@/services/nutrition';
import type {
  FoodItem,
  MealType,
  NutrientTotals,
  Recipe,
  ServingUnit,
} from '@/types/nutrition';
import { MEAL_TYPES, MEAL_TYPE_LABELS, getTodayDate } from '@/types/nutrition';
import type { ScaledNutrients } from '@/services/nutrition';

// ─── Display Helpers ──────────────────────────────────────────────────────────

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

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayDate();
}

function formatDisplayDate(dateStr: string): string {
  const today = getTodayDate();
  if (dateStr === today) return 'Today';
  const yesterday = shiftDate(today, -1);
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-');
  return `${Number(d)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m) - 1]} ${y}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MealLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    foodId?: string;
    recipeId?: string;
    itemType?: string;
    date?: string;
    mealType?: string;
  }>();

  const { foods, recipes, loading, addFoodLog } = useNutrition();

  const isRecipe = params.itemType === 'recipe';
  const itemId = isRecipe ? (params.recipeId ?? '') : (params.foodId ?? '');

  const food = useMemo(
    () => (!isRecipe ? foods.find((f) => f.id === itemId) ?? null : null),
    [foods, itemId, isRecipe],
  );

  const recipe = useMemo(
    () => (isRecipe ? recipes.find((r) => r.id === itemId) ?? null : null),
    [recipes, itemId, isRecipe],
  );

  const units = useMemo(() => (food ? compatibleUnits(food) : []), [food]);

  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<ServingUnit>('g');
  const [mealType, setMealType] = useState<MealType>(
    (params.mealType as MealType) ?? 'breakfast',
  );
  const [date, setDate] = useState(params.date ?? getTodayDate());
  const [dateInput, setDateInput] = useState(params.date ?? getTodayDate());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ScaledNutrients | NutrientTotals | null>(null);

  // Sync unit when food changes
  useEffect(() => {
    if (!isRecipe && units.length > 0 && !units.includes(unit)) {
      setUnit(units[0]);
    }
  }, [units, unit, isRecipe]);

  // Compute preview when qty/unit/food/recipe changes
  useEffect(() => {
    if (isRecipe) {
      if (!recipe || qty.trim() === '') {
        setPreview(null);
        return;
      }
      const amount = Number(qty.trim());
      if (!Number.isFinite(amount) || amount <= 0) {
        setPreview(null);
        return;
      }
      try {
        const result = calculateRecipePerServing(recipe, foods);
        const scaled: NutrientTotals = {
          calories: result.totals.calories * amount,
          protein: result.totals.protein * amount,
          carbohydrates: result.totals.carbohydrates * amount,
          fat: result.totals.fat * amount,
          fiber: result.totals.fiber * amount,
          sugar: result.totals.sugar * amount,
          saturatedFat: result.totals.saturatedFat * amount,
          sodium: result.totals.sodium * amount,
          micronutrients: result.totals.micronutrients,
        };
        setPreview(scaled);
      } catch {
        setPreview(null);
      }
    } else {
      if (!food || qty.trim() === '') {
        setPreview(null);
        return;
      }
      const amount = Number(qty.trim());
      if (!Number.isFinite(amount) || amount <= 0) {
        setPreview(null);
        return;
      }
      try {
        setPreview(calculateNutrition(food, { amount, unit }));
      } catch {
        setPreview(null);
      }
    }
  }, [food, recipe, qty, unit, isRecipe, foods]);

  const handleDateChange = (text: string) => {
    setDateInput(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      setDate(text);
      setError(null);
    }
  };

  const shiftDay = (days: number) => {
    const next = shiftDate(date, days);
    setDate(next);
    setDateInput(next);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!isRecipe && !food) {
      setError('Food not found');
      return;
    }
    if (isRecipe && !recipe) {
      setError('Recipe not found');
      return;
    }
    const trimmed = qty.trim();
    if (trimmed === '') {
      setError('Enter a quantity');
      return;
    }
    const amount = Number(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Quantity must be a positive number');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Invalid date format (use YYYY-MM-DD)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addFoodLog({
        foodId: itemId,
        quantity: amount,
        unit: isRecipe ? 'serving' : unit,
        mealType,
        date,
        itemType: isRecipe ? 'recipe' : 'food',
      });
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading...
        </Text>
      </View>
    );
  }

  if (!isRecipe && !food) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">
          Food not found
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {itemId ? `No food with ID "${itemId}"` : 'No food selected'}
        </Text>
        <Button
          onPress={() => router.back()}
          variant="outline"
          className="mt-4 min-h-[44px]"
        >
          <ButtonText>Go Back</ButtonText>
        </Button>
      </View>
    );
  }

  if (isRecipe && !recipe) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">
          Recipe not found
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {itemId ? `No recipe with ID "${itemId}"` : 'No recipe selected'}
        </Text>
        <Button
          onPress={() => router.back()}
          variant="outline"
          className="mt-4 min-h-[44px]"
        >
          <ButtonText>Go Back</ButtonText>
        </Button>
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
            <Text size="sm" className="text-muted-foreground">
              Nutrition
            </Text>
            <Heading size="xl" className="mt-1">
              Log Food
            </Heading>
          </View>
        </View>

        {/* Item info */}
        <Card className="w-full p-4">
          <View className="flex-row items-center gap-2">
            <Heading size="sm">
              {isRecipe ? recipe!.name : food!.name}
            </Heading>
            {isRecipe ? (
              <Badge variant="outline">
                <BadgeText>Recipe</BadgeText>
              </Badge>
            ) : null}
          </View>
          {isRecipe ? (
            <Text size="xs" className="mt-1 text-muted-foreground">
              {recipe!.category || 'Uncategorized'} · {recipe!.servings} serving{recipe!.servings !== 1 ? 's' : ''}
              {' · '}{recipe!.ingredients.length} ingredient{recipe!.ingredients.length !== 1 ? 's' : ''}
            </Text>
          ) : (
            <Text size="xs" className="mt-1 text-muted-foreground">
              {food!.category || 'Uncategorized'} · {food!.preparation}
              {food!.brand ? ` · ${food!.brand}` : ''}
            </Text>
          )}
          <Text size="xs" className="mt-1 text-muted-foreground">
            {isRecipe
              ? `${recipe!.servings} serving${recipe!.servings !== 1 ? 's' : ''}`
              : `${basisLabel(food!)} · ${fmt(food!.nutrition.calories)} kcal`
            }
          </Text>
        </Card>

        {/* Quantity */}
        <View>
          <Text size="sm" className="mb-2 font-medium">
            {isRecipe ? 'Servings' : 'Quantity'}
          </Text>
          <TextInput
            value={qty}
            onChangeText={(text: string) => {
              setQty(text);
              setError(null);
            }}
            placeholder={isRecipe ? 'e.g. 1' : 'e.g. 200'}
            keyboardType="decimal-pad"
            returnKeyType="done"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
            accessibilityLabel={isRecipe ? 'Number of servings' : 'Quantity amount'}
          />
        </View>

        {/* Unit (only for food, not recipe) */}
        {!isRecipe ? (
          <View>
            <Text size="sm" className="mb-2 font-medium">
              Unit
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {units.map((u) => {
                const active = unit === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => {
                      setUnit(u);
                      setError(null);
                    }}
                    className={`min-h-[44px] justify-center rounded-lg px-3 py-2 ${
                      active ? 'bg-primary' : 'bg-muted'
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Unit: ${u}`}
                  >
                    <Text
                      size="xs"
                      className={`font-medium ${
                        active ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {u}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Meal type */}
        <View>
          <Text size="sm" className="mb-2 font-medium">
            Meal
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {MEAL_TYPES.map((m) => {
              const active = mealType === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMealType(m);
                    setError(null);
                  }}
                  className={`min-h-[44px] justify-center rounded-lg px-3 py-2 ${
                    active ? 'bg-primary' : 'bg-muted'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Meal type: ${MEAL_TYPE_LABELS[m]}`}
                >
                  <Text
                    size="xs"
                    className={`font-medium ${
                      active ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {MEAL_TYPE_LABELS[m]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Date */}
        <View>
          <Text size="sm" className="mb-2 font-medium">
            Date
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => shiftDay(-1)}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
              accessibilityRole="button"
              accessibilityLabel="Previous day"
            >
              <ChevronLeft size={18} className="text-muted-foreground" />
            </Pressable>
            <TextInput
              value={dateInput}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              maxLength={10}
              className="min-h-[44px] flex-1 rounded-lg border border-border bg-card px-3 text-center text-foreground"
              accessibilityLabel="Date (YYYY-MM-DD)"
            />
            <Pressable
              onPress={() => shiftDay(1)}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
              accessibilityRole="button"
              accessibilityLabel="Next day"
            >
              <ChevronRight size={18} className="text-muted-foreground" />
            </Pressable>
          </View>
          <Text size="xs" className="mt-1 text-muted-foreground">
            {formatDisplayDate(date)}
          </Text>
        </View>

        {/* Preview */}
        {preview ? (
          <Card className="w-full p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Utensils size={14} className="text-muted-foreground" />
              <Text size="sm" className="font-medium">
                Preview
              </Text>
            </View>
            {!isRecipe && 'factor' in preview ? (
              <Text size="xs" className="mb-2 text-muted-foreground">
                {qty.trim()} {unit} × {(preview as ScaledNutrients).factor.toFixed(4)}
              </Text>
            ) : isRecipe ? (
              <Text size="xs" className="mb-2 text-muted-foreground">
                {qty.trim()} serving{Number(qty.trim()) !== 1 ? 's' : ''} × per-serving nutrition
              </Text>
            ) : null}
            <View className="gap-1">
              <PreviewRow label="Calories" value={preview.calories} unit=" kcal" />
              <PreviewRow label="Protein" value={preview.protein} unit=" g" />
              <PreviewRow label="Carbs" value={preview.carbohydrates} unit=" g" />
              <PreviewRow label="Fat" value={preview.fat} unit=" g" />
            </View>
          </Card>
        ) : null}

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
          accessibilityLabel={isRecipe ? 'Add recipe to meal' : 'Add to meal'}
        >
          {saving ? (
            <ActivityIndicator size="small" className="text-primary-foreground" />
          ) : (
            <>
              <Check size={16} className="mr-2 text-primary-foreground" />
              <ButtonText>Add to Meal</ButtonText>
            </>
          )}
        </Button>
      </View>
    </ScrollView>
  );
}

// ─── Preview Row ──────────────────────────────────────────────────────────────

function PreviewRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View className="flex-row justify-between">
      <Text size="xs" className="text-muted-foreground">
        {label}
      </Text>
      <Text size="xs" className="font-medium">
        {fmt(value)}
        {unit}
      </Text>
    </View>
  );
}
