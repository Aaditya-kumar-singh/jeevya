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
  Calculator,
  ClipboardList,
  Flame,
  Search,
  X,
  Plus,
  BookOpen,
  BarChart3,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import {
  calculateNutrition,
  compatibleUnits,
  searchFoods,
} from '@/services/nutrition';
import type { FoodItem, FoodQuantity, ServingUnit } from '@/types/nutrition';
import type { ScaledNutrients } from '@/services/nutrition';

// ─── Display Helpers ──────────────────────────────────────────────────────────

/** Human reference for a profile: "per 100 g" / "per 100 ml" / "per 1 piece". */
function basisLabel(food: FoodItem): string {
  const n = food.nutrition;
  if (n.basis === 'per_100g') return 'per 100 g';
  if (n.basis === 'per_100ml') return 'per 100 ml';
  return `per ${n.servingAmount ?? '?'} ${n.servingUnit ?? ''}`.trim();
}

/** Presentation-only rounding (engine values stay precise). */
function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function sourceBadgeVariant(source: FoodItem['source']): 'secondary' | 'outline' {
  return source === 'system' ? 'secondary' : 'outline';
}

function sourceLabel(source: FoodItem['source']): string {
  if (source === 'system') return 'System';
  if (source === 'custom') return 'Custom';
  if (source === 'imported') return 'Imported';
  return 'Recipe';
}

// ─── Food Row ─────────────────────────────────────────────────────────────────

function FoodRow({
  food,
  selected,
  onSelect,
}: {
  food: FoodItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(food.id)}
      className="min-h-[44px]"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Food: ${food.name}, ${fmt(food.nutrition.calories)} kilocalories ${basisLabel(food)}`}
    >
      <Card className={`w-full p-4 ${selected ? 'border-2 border-primary' : ''}`}>
        <View className="flex-row items-center gap-3">
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
          <Badge variant={sourceBadgeVariant(food.source)}>
            <BadgeText>{sourceLabel(food.source)}</BadgeText>
          </Badge>
        </View>
      </Card>
    </Pressable>
  );
}

// ─── Selected Food Detail ─────────────────────────────────────────────────────

function MacroRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View className="flex-row justify-between">
      <Text size="sm" className="text-muted-foreground">
        {label}
      </Text>
      <Text size="sm" className="font-medium">
        {fmt(value)}
        {unit}
      </Text>
    </View>
  );
}

function SelectedFoodCard({ food, onClose }: { food: FoodItem; onClose: () => void }) {
  const n = food.nutrition;
  const micros = Object.entries(n.micronutrients);
  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Heading size="md" className="flex-1">
          {food.name}
        </Heading>
        <Pressable
          onPress={onClose}
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Close selected food"
        >
          <X size={16} className="text-muted-foreground" />
        </Pressable>
      </View>
      <View className="mt-1 flex-row flex-wrap items-center gap-2">
        <Badge variant={sourceBadgeVariant(food.source)}>
          <BadgeText>{sourceLabel(food.source)}</BadgeText>
        </Badge>
        <Text size="xs" className="text-muted-foreground">
          {food.category || 'Uncategorized'} · {food.preparation}
          {food.brand ? ` · ${food.brand}` : ''}
        </Text>
      </View>
      {food.description ? (
        <Text size="sm" className="mt-2 text-muted-foreground">
          {food.description}
        </Text>
      ) : null}

      <Text size="sm" className="mb-2 mt-3 font-medium">
        Nutrition ({basisLabel(food)})
      </Text>
      <View className="gap-1.5">
        <MacroRow label="Calories" value={n.calories} unit=" kcal" />
        <MacroRow label="Protein" value={n.protein} unit=" g" />
        <MacroRow label="Carbohydrates" value={n.carbohydrates} unit=" g" />
        <MacroRow label="Fat" value={n.fat} unit=" g" />
        <MacroRow label="Fiber" value={n.fiber} unit=" g" />
        <MacroRow label="Sugar" value={n.sugar} unit=" g" />
        <MacroRow label="Saturated fat" value={n.saturatedFat} unit=" g" />
        <MacroRow label="Sodium" value={n.sodium} unit=" mg" />
        {micros.map(([key, value]) => (
          <MacroRow key={key} label={key} value={value as number} unit="" />
        ))}
      </View>

      {food.sourceDetail ? (
        <Text size="xs" className="mt-3 text-muted-foreground">
          Source: {food.sourceDetail}
        </Text>
      ) : null}
    </Card>
  );
}

// ─── Quantity Calculator (Phase 1C) ──────────────────────────────────────────

function QuantityCalculator({ food }: { food: FoodItem }) {
  const units = useMemo(() => compatibleUnits(food), [food]);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<ServingUnit>(units[0]);
  const [result, setResult] = useState<ScaledNutrients | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUnitChange = (u: ServingUnit) => {
    setUnit(u);
    setResult(null);
    setError(null);
  };

  const handleCalculate = () => {
    const trimmed = qty.trim();
    if (trimmed === '') {
      setError('Enter a quantity');
      setResult(null);
      return;
    }
    const amount = Number(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Quantity must be a positive number');
      setResult(null);
      return;
    }
    const input: FoodQuantity = { amount, unit };
    try {
      const scaled = calculateNutrition(food, input);
      setResult(scaled);
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid quantity';
      setError(msg);
      setResult(null);
    }
  };

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Calculator size={14} className="text-muted-foreground" />
        <Text size="sm" className="font-medium">
          Quantity Calculator
        </Text>
      </View>

      {/* Quantity input */}
      <View className="flex-row items-center gap-3 mb-3">
        <TextInput
          value={qty}
          onChangeText={(text: string) => {
            setQty(text);
            setResult(null);
            setError(null);
          }}
          placeholder="e.g. 200"
          keyboardType="decimal-pad"
          returnKeyType="done"
          className="min-h-[44px] flex-1 rounded-lg border border-border bg-card px-3 text-foreground"
          accessibilityLabel="Quantity amount"
        />
      </View>

      {/* Unit chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
        className="mb-3"
      >
        {units.map((u) => {
          const active = unit === u;
          return (
            <Pressable
              key={u}
              onPress={() => handleUnitChange(u)}
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

      {/* Calculate button */}
      <Button
        variant="outline"
        className="min-h-[44px] mb-3"
        onPress={handleCalculate}
        accessibilityLabel={`Calculate nutrition for ${qty || '0'} ${unit}`}
      >
        <ButtonText>Calculate</ButtonText>
      </Button>

      {/* Log Food button */}
      <Button
        variant="outline"
        className="min-h-[44px] mb-3"
        onPress={() =>
          router.push({
            pathname: '/nutrition/log',
            params: { foodId: food.id },
          })
        }
        accessibilityLabel={`Log ${food.name} to meal`}
      >
        <ClipboardList size={14} className="mr-2 text-muted-foreground" />
        <ButtonText>Log Food</ButtonText>
      </Button>

      {/* Error */}
      {error ? (
        <View className="flex-row items-center gap-2 rounded-lg bg-red-50 p-2.5 dark:bg-red-900/20">
          <AlertTriangle size={12} className="text-red-500" />
          <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">
            {error}
          </Text>
        </View>
      ) : null}

      {/* Results */}
      {result ? (
        <View className="mt-1 gap-1.5">
          <Text size="xs" className="font-medium text-muted-foreground">
            {qty.trim()} {unit} × {result.factor.toFixed(4)}
          </Text>
          <MacroRow label="Calories" value={result.calories} unit=" kcal" />
          <MacroRow label="Protein" value={result.protein} unit=" g" />
          <MacroRow label="Carbohydrates" value={result.carbohydrates} unit=" g" />
          <MacroRow label="Fat" value={result.fat} unit=" g" />
          <MacroRow label="Fiber" value={result.fiber} unit=" g" />
          <MacroRow label="Sugar" value={result.sugar} unit=" g" />
          <MacroRow label="Saturated fat" value={result.saturatedFat} unit=" g" />
          <MacroRow label="Sodium" value={result.sodium} unit=" mg" />
          {Object.entries(result.micronutrients).map(([key, value]) => (
            <MacroRow key={key} label={key} value={value as number} unit="" />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FoodBrowserScreen() {
  const router = useRouter();
  const { foods, loading, refreshing, error, refresh } = useNutrition();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of foods) {
      if (f.category.trim()) set.add(f.category);
    }
    return ['All', ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [foods]);

  const results = useMemo(() => {
    const base =
      category === 'All' ? foods : foods.filter((f) => f.category === category);
    return searchFoods(base, query);
  }, [foods, query, category]);

  const selected = selectedId ? foods.find((f) => f.id === selectedId) ?? null : null;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading foods...
        </Text>
      </View>
    );
  }

  if (error && foods.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">
          Failed to load foods
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {error}
        </Text>
        <Button
          onPress={() => void refresh()}
          variant="outline"
          className="mt-4 min-h-[44px]"
        >
          <ButtonText>Retry</ButtonText>
        </Button>
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
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Nutrition
            </Text>
            <Heading size="xl" className="mt-1">
              Foods
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              {results.length} of {foods.length} foods
            </Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/custom-foods')}
            accessibilityLabel="Manage custom foods"
          >
            <Plus size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/recipes')}
            accessibilityLabel="View recipes"
          >
            <BookOpen size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/meals')}
            accessibilityLabel="View today's meals"
          >
            <ClipboardList size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/targets')}
            accessibilityLabel="Set nutrition targets"
          >
            <Calculator size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/energy')}
            accessibilityLabel="View energy balance"
          >
            <Flame size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/analytics')}
            accessibilityLabel="View nutrition analytics"
          >
            <BarChart3 size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.push('/nutrition/insights')}
            accessibilityLabel="View nutrition insights"
          >
            <ClipboardList size={20} />
          </Button>
        </View>

        {/* Search */}
        <Input className="bg-card">
          <InputSlot>
            <Search size={16} className="ml-3 text-muted-foreground" />
          </InputSlot>
          <InputField
            placeholder="Search foods..."
            value={query}
            onChangeText={(text: string) => {
              setQuery(text);
              setSelectedId(null);
            }}
            returnKeyType="search"
            accessibilityLabel="Search foods by name, brand, or category"
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

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {categories.map((c) => {
            const active = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  setCategory(c);
                  setSelectedId(null);
                }}
                className={`min-h-[44px] justify-center rounded-lg px-4 py-2 ${
                  active ? 'bg-primary' : 'bg-muted'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by category ${c}`}
              >
                <Text
                  size="sm"
                  className={`font-medium ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Error banner (non-fatal) */}
        {error ? (
          <Card className="w-full border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">
                {error}
              </Text>
              <Pressable onPress={() => void refresh()}>
                <Text
                  size="xs"
                  className="font-medium text-red-600 dark:text-red-400"
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {/* Selected food + calculator */}
        {selected ? (
          <>
            <SelectedFoodCard food={selected} onClose={() => setSelectedId(null)} />
            <QuantityCalculator food={selected} />
          </>
        ) : null}

        {/* Results */}
        {results.length === 0 ? (
          <Card className="w-full items-center p-6">
            <Heading size="md" className="text-center">
              No foods found
            </Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">
              {query.trim()
                ? `Nothing matches "${query.trim()}".`
                : 'No foods in this category yet.'}
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {results.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                selected={food.id === selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
