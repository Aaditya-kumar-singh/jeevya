import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import {
  calculateNutrition,
  calculateDailyNutrition,
  calculateRecipePerServing,
} from '@/services/nutrition';
import type {
  FoodItem,
  FoodLogEntry,
  MealType,
  MealNutritionSummary,
  NutritionTargets,
  Recipe,
} from '@/types/nutrition';
import { MEAL_TYPES, MEAL_TYPE_LABELS, getTodayDate } from '@/types/nutrition';

// ─── Display Helpers ──────────────────────────────────────────────────────────

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr: string): string {
  const today = getTodayDate();
  if (dateStr === today) return 'Today';
  const yesterday = shiftDate(today, -1);
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-');
  return `${Number(d)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m) - 1]} ${y}`;
}

function getLogCalories(
  log: FoodLogEntry,
  food: FoodItem | null,
  recipe: Recipe | null,
  foods: FoodItem[],
): number | null {
  const itemType = log.itemType ?? 'food';
  if (itemType === 'recipe') {
    if (!recipe) return null;
    try {
      const result = calculateRecipePerServing(recipe, foods);
      // log.quantity = number of servings
      return result.totals.calories * log.quantity;
    } catch {
      return null;
    }
  }
  if (!food) return null;
  try {
    const scaled = calculateNutrition(food, { amount: log.quantity, unit: log.unit });
    return scaled.calories;
  } catch {
    return null;
  }
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'other'];

// ─── Log Entry Row ────────────────────────────────────────────────────────────

function LogEntryRow({
  log,
  food,
  recipe,
  foods,
  onDelete,
}: {
  log: FoodLogEntry;
  food: FoodItem | null;
  recipe: Recipe | null;
  foods: FoodItem[];
  onDelete: (id: string) => void;
}) {
  const itemType = log.itemType ?? 'food';
  const isRecipe = itemType === 'recipe';
  const calories = getLogCalories(log, food, recipe, foods);
  const displayName = isRecipe
    ? (recipe?.name ?? 'Unknown recipe')
    : (food?.name ?? 'Unknown food');
  const quantityLabel = isRecipe
    ? `${log.quantity} serving${log.quantity !== 1 ? 's' : ''}`
    : `${log.quantity} ${log.unit}`;

  return (
    <Card className="w-full p-3">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text size="sm" className="font-medium">
              {displayName}
            </Text>
            {isRecipe ? (
              <Badge variant="outline">
                <BadgeText>Recipe</BadgeText>
              </Badge>
            ) : null}
          </View>
          <Text size="xs" className="mt-0.5 text-muted-foreground">
            {quantityLabel}
            {calories !== null ? ` · ${fmt(calories)} kcal` : ''}
          </Text>
          {((isRecipe && !recipe) || (!isRecipe && !food)) ? (
            <Text size="xs" className="mt-0.5 text-destructive">
              {isRecipe ? 'Recipe no longer available' : 'Food no longer available'}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => onDelete(log.id)}
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={`Delete ${displayName} log`}
        >
          <Trash2 size={14} className="text-destructive" />
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Meal Section ─────────────────────────────────────────────────────────────

function MealSection({
  mealType,
  logs,
  foods,
  recipes,
  onDelete,
}: {
  mealType: MealType;
  logs: FoodLogEntry[];
  foods: FoodItem[];
  recipes: Recipe[];
  onDelete: (id: string) => void;
}) {
  if (logs.length === 0) return null;

  const totalCalories = logs.reduce((sum, log) => {
    const itemType = log.itemType ?? 'food';
    const food = itemType === 'food' ? foods.find((f) => f.id === log.foodId) ?? null : null;
    const recipe = itemType === 'recipe' ? recipes.find((r) => r.id === log.foodId) ?? null : null;
    const cal = getLogCalories(log, food, recipe, foods);
    return cal !== null ? sum + cal : sum;
  }, 0);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Heading size="sm">{MEAL_TYPE_LABELS[mealType]}</Heading>
        <Badge variant="secondary">
          <BadgeText>{fmt(totalCalories)} kcal</BadgeText>
        </Badge>
      </View>
      <View className="gap-2">
        {logs.map((log) => {
          const itemType = log.itemType ?? 'food';
          const food = itemType === 'food' ? foods.find((f) => f.id === log.foodId) ?? null : null;
          const recipe = itemType === 'recipe' ? recipes.find((r) => r.id === log.foodId) ?? null : null;
          return (
            <LogEntryRow
              key={log.id}
              log={log}
              food={food}
              recipe={recipe}
              foods={foods}
              onDelete={onDelete}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Nutrient Display ─────────────────────────────────────────────────────────

function NutrientRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View className="flex-row justify-between">
      <Text size="xs" className="text-muted-foreground">{label}</Text>
      <Text size="xs" className="font-medium">{fmt(value)} {unit}</Text>
    </View>
  );
}

function TargetProgressRow({
  label,
  consumed,
  target,
  unit,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
}) {
  const remaining = target - consumed;
  const remainingText = remaining > 0 ? `${fmt(remaining)} left` : `+${fmt(Math.abs(remaining))} over`;
  const isOver = consumed > target;
  return (
    <View className="flex-row items-center justify-between">
      <Text size="xs" className="text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Text size="xs" className="font-medium">
          {fmt(consumed)} / {fmt(target)} {unit}
        </Text>
        <Text size="xs" className={isOver ? 'text-destructive' : 'text-muted-foreground'}>
          {remainingText}
        </Text>
      </View>
    </View>
  );
}

function MealSummaryRow({ summary }: { summary: MealNutritionSummary }) {
  if (summary.loggedCount === 0) return null;
  return (
    <View className="rounded-lg border border-border bg-card/50 p-3">
      <View className="flex-row items-center justify-between">
        <Text size="sm" className="font-medium">{MEAL_TYPE_LABELS[summary.mealType]}</Text>
        <Text size="sm" className="font-bold">{fmt(summary.totals.calories)} kcal</Text>
      </View>
      <View className="mt-1 flex-row gap-3">
        <Text size="xs" className="text-muted-foreground">
          P {fmt(summary.totals.protein)}g
        </Text>
        <Text size="xs" className="text-muted-foreground">
          C {fmt(summary.totals.carbohydrates)}g
        </Text>
        <Text size="xs" className="text-muted-foreground">
          F {fmt(summary.totals.fat)}g
        </Text>
      </View>
      {summary.unavailableCount > 0 ? (
        <Text size="xs" className="mt-1 text-destructive">
          {summary.unavailableCount} food{summary.unavailableCount > 1 ? 's' : ''} unavailable
        </Text>
      ) : null}
    </View>
  );
}

function DailySummaryCard({
  date,
  summary,
  targets,
}: {
  date: string;
  summary: {
    totals: {
      calories: number;
      protein: number;
      carbohydrates: number;
      fat: number;
      fiber: number;
      sugar: number;
    };
    loggedCount: number;
    calculatedCount: number;
    unavailableCount: number;
    byMeal: MealNutritionSummary[];
  };
  targets?: NutritionTargets | null;
}) {
  const t = summary.totals;
  const hasTargets = targets != null;
  return (
    <Card className="w-full p-4">
      <Heading size="sm">Daily Summary</Heading>
      <Text size="xs" className="mb-3 text-muted-foreground">{formatDisplayDate(date)}</Text>

      {/* Top-line macros */}
      <View className="mb-3 flex-row justify-around">
        <View className="items-center">
          <Text size="lg" className="font-bold">{fmt(t.calories)}</Text>
          <Text size="xs" className="text-muted-foreground">kcal</Text>
        </View>
        <View className="items-center">
          <Text size="lg" className="font-bold">{fmt(t.protein)}</Text>
          <Text size="xs" className="text-muted-foreground">protein (g)</Text>
        </View>
        <View className="items-center">
          <Text size="lg" className="font-bold">{fmt(t.carbohydrates)}</Text>
          <Text size="xs" className="text-muted-foreground">carbs (g)</Text>
        </View>
        <View className="items-center">
          <Text size="lg" className="font-bold">{fmt(t.fat)}</Text>
          <Text size="xs" className="text-muted-foreground">fat (g)</Text>
        </View>
      </View>

      {/* Consumed vs Target (when targets available) */}
      {hasTargets ? (
        <View className="mb-3 gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Text size="xs" className="font-medium text-primary">Consumed / Target</Text>
          <TargetProgressRow
            label="Calories"
            consumed={t.calories}
            target={targets.targetCalories}
            unit="kcal"
          />
          <TargetProgressRow
            label="Protein"
            consumed={t.protein}
            target={targets.protein}
            unit="g"
          />
          <TargetProgressRow
            label="Carbs"
            consumed={t.carbohydrates}
            target={targets.carbohydrates}
            unit="g"
          />
          <TargetProgressRow
            label="Fat"
            consumed={t.fat}
            target={targets.fat}
            unit="g"
          />
          <TargetProgressRow
            label="Fiber"
            consumed={t.fiber}
            target={targets.fiber}
            unit="g"
          />
        </View>
      ) : null}

      {/* Detailed nutrients */}
      <View className="gap-1">
        <NutrientRow label="Fiber" value={t.fiber} unit="g" />
        <NutrientRow label="Sugar" value={t.sugar} unit="g" />
      </View>

      {/* Status line */}
      <View className="mt-3 border-t border-border pt-2">
        <Text size="xs" className="text-muted-foreground">
          {summary.calculatedCount} item{summary.calculatedCount !== 1 ? 's' : ''} calculated
          {summary.unavailableCount > 0
            ? ` · ${summary.unavailableCount} unavailable`
            : ''}
        </Text>
      </View>

      {/* Per-meal breakdown */}
      {summary.byMeal.some((m) => m.loggedCount > 0) ? (
        <View className="mt-3 gap-2">
          {summary.byMeal.map((m) => (
            <MealSummaryRow key={m.mealType} summary={m} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MealsScreen() {
  const router = useRouter();
  const { foods, foodLogs, recipes, targets, loading, refreshing, refresh, removeFoodLog } =
    useNutrition();

  const [date, setDate] = useState(getTodayDate());
  const [dateInput, setDateInput] = useState(getTodayDate());
  const [deleting, setDeleting] = useState<string | null>(null);

  const dayLogs = useMemo(
    () => foodLogs.filter((l) => l.date === date),
    [foodLogs, date],
  );

  const logsByMeal = useMemo(() => {
    const map = new Map<MealType, FoodLogEntry[]>();
    for (const m of MEAL_ORDER) map.set(m, []);
    for (const log of dayLogs) {
      const arr = map.get(log.mealType);
      if (arr) arr.push(log);
    }
    return map;
  }, [dayLogs]);

  const dailySummary = useMemo(
    () => calculateDailyNutrition(date, foodLogs, foods, recipes),
    [date, foodLogs, foods, recipes],
  );

  const totalCalories = dailySummary.totals.calories;

  const handleDateChange = (text: string) => {
    setDateInput(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      setDate(text);
    }
  };

  const shiftDay = (days: number) => {
    const next = shiftDate(date, days);
    setDate(next);
    setDateInput(next);
  };

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id);
      try {
        await removeFoodLog(id);
      } catch {
        // Error handled by hook
      } finally {
        setDeleting(null);
      }
    },
    [removeFoodLog],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading meals...
        </Text>
      </View>
    );
  }

  const hasAnyLogs = dayLogs.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
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
              Meals
            </Heading>
          </View>
        </View>

        {/* Date navigator */}
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
        <Text size="xs" className="text-center text-muted-foreground">
          {formatDisplayDate(date)}
          {hasAnyLogs ? ` · ${fmt(totalCalories)} kcal total` : ''}
        </Text>

        {/* Daily Nutrition Summary */}
        {hasAnyLogs ? (
          <DailySummaryCard date={date} summary={dailySummary} targets={targets} />
        ) : null}

        {/* Meals grouped by type */}
        {hasAnyLogs ? (
          <View className="gap-5">
            {MEAL_ORDER.map((m) => (
              <MealSection
                key={m}
                mealType={m}
                logs={logsByMeal.get(m) ?? []}
                foods={foods}
                recipes={recipes}
                onDelete={handleDelete}
              />
            ))}
          </View>
        ) : (
          <Card className="w-full items-center p-6">
            <Heading size="md" className="text-center">
              No meals logged
            </Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">
              {date === getTodayDate()
                ? "You haven't logged any food today."
                : `No food logged on ${formatDisplayDate(date)}.`}
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
