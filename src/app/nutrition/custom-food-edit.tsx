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
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import type {
  CreateFoodInput,
  NutritionBasis,
  PreparationState,
  ServingUnit,
} from '@/types/nutrition';
import {
  MICRONUTRIENT_KEYS,
  NUTRITION_BASES,
  PREPARATION_STATES,
  SERVING_UNITS,
} from '@/types/nutrition';

function MicronutrientLabel(key: string): string {
  const labels: Record<string, string> = {
    cholesterol: 'Cholesterol',
    potassium: 'Potassium',
    calcium: 'Calcium',
    iron: 'Iron',
    magnesium: 'Magnesium',
    phosphorus: 'Phosphorus',
    zinc: 'Zinc',
    vitaminA: 'Vitamin A',
    vitaminC: 'Vitamin C',
    vitaminD: 'Vitamin D',
    vitaminE: 'Vitamin E',
    vitaminK: 'Vitamin K',
    vitaminB1: 'Vitamin B1',
    vitaminB2: 'Vitamin B2',
    vitaminB3: 'Vitamin B3',
    vitaminB5: 'Vitamin B5',
    vitaminB6: 'Vitamin B6',
    vitaminB7: 'Vitamin B7 (Biotin)',
    vitaminB12: 'Vitamin B12',
    copper: 'Copper',
    manganese: 'Manganese',
    selenium: 'Selenium',
    folate: 'Folate (B9)',
  };
  return labels[key] ?? key;
}

export default function CustomFoodEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ foodId?: string }>();
  const { foods, loading, addFood, editFood } = useNutrition();

  const isEdit = !!params.foodId;
  const existing = isEdit ? foods.find((f) => f.id === params.foodId) ?? null : null;

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [preparation, setPreparation] = useState<PreparationState>('other');
  const [servingAmount, setServingAmount] = useState('100');
  const [servingUnit, setServingUnit] = useState<ServingUnit>('g');
  const [basis, setBasis] = useState<NutritionBasis>('per_100g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbohydrates, setCarbohydrates] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [monounsaturatedFat, setMonounsaturatedFat] = useState('');
  const [polyunsaturatedFat, setPolyunsaturatedFat] = useState('');
  const [transFat, setTransFat] = useState('');
  const [sodium, setSodium] = useState('');
  const [pieceGrams, setPieceGrams] = useState('');
  const [cupGrams, setCupGrams] = useState('');
  const [bowlGrams, setBowlGrams] = useState('');
  const [sourceDetail, setSourceDetail] = useState('');
  const [micros, setMicros] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  // Existing form hydration intentionally updates local draft state from an external loaded record.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setBrand(existing.brand ?? '');
      setCategory(existing.category);
      setDescription(existing.description ?? '');
      setPreparation(existing.preparation);
      setServingAmount(String(existing.serving.amount));
      setServingUnit(existing.serving.unit);
      setBasis(existing.nutrition.basis);
      setCalories(String(existing.nutrition.calories));
      setProtein(String(existing.nutrition.protein));
      setCarbohydrates(String(existing.nutrition.carbohydrates));
      setFat(String(existing.nutrition.fat));
      setFiber(String(existing.nutrition.fiber));
      setSugar(String(existing.nutrition.sugar));
      setSaturatedFat(String(existing.nutrition.saturatedFat));
      setMonounsaturatedFat(existing.nutrition.monounsaturatedFat === undefined ? '' : String(existing.nutrition.monounsaturatedFat));
      setPolyunsaturatedFat(existing.nutrition.polyunsaturatedFat === undefined ? '' : String(existing.nutrition.polyunsaturatedFat));
      setTransFat(existing.nutrition.transFat === undefined ? '' : String(existing.nutrition.transFat));
      setSodium(String(existing.nutrition.sodium));
      setPieceGrams(existing.quantityConversions?.piece === undefined ? '' : String(existing.quantityConversions.piece));
      setCupGrams(existing.quantityConversions?.cup === undefined ? '' : String(existing.quantityConversions.cup));
      setBowlGrams(existing.quantityConversions?.bowl === undefined ? '' : String(existing.quantityConversions.bowl));
      setSourceDetail(existing.sourceDetail ?? '');
      const m: Record<string, string> = {};
      for (const [k, v] of Object.entries(existing.nutrition.micronutrients)) {
        m[k] = String(v);
      }
      setMicros(m);
    }
  }, [existing]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Food name is required');
      return;
    }
    const parsedCalories = calories.trim() === '' ? 0 : Number(calories);
    const parsedProtein = protein.trim() === '' ? 0 : Number(protein);
    const parsedCarbs = carbohydrates.trim() === '' ? 0 : Number(carbohydrates);
    const parsedFat = fat.trim() === '' ? 0 : Number(fat);
    const parsedFiber = fiber.trim() === '' ? 0 : Number(fiber);
    const parsedSugar = sugar.trim() === '' ? 0 : Number(sugar);
    const parsedSatFat = saturatedFat.trim() === '' ? 0 : Number(saturatedFat);
    const parsedSodium = sodium.trim() === '' ? 0 : Number(sodium);
    const parsedMonoFat = monounsaturatedFat.trim() === '' ? undefined : Number(monounsaturatedFat);
    const parsedPolyFat = polyunsaturatedFat.trim() === '' ? undefined : Number(polyunsaturatedFat);
    const parsedTransFat = transFat.trim() === '' ? undefined : Number(transFat);
    const parsedPieceGrams = pieceGrams.trim() === '' ? undefined : Number(pieceGrams);
    const parsedCupGrams = cupGrams.trim() === '' ? undefined : Number(cupGrams);
    const parsedBowlGrams = bowlGrams.trim() === '' ? undefined : Number(bowlGrams);
    const parsedServingAmt = servingAmount.trim() === '' ? 0 : Number(servingAmount);

    if ([parsedCalories, parsedProtein, parsedCarbs, parsedFat, parsedFiber, parsedSugar, parsedSatFat, parsedSodium, parsedMonoFat, parsedPolyFat, parsedTransFat, parsedPieceGrams, parsedCupGrams, parsedBowlGrams].some((v) => v !== undefined && !Number.isFinite(v))) {
      setError('All nutrition values must be valid numbers');
      return;
    }
    if (!Number.isFinite(parsedServingAmt) || parsedServingAmt <= 0) {
      setError('Serving amount must be greater than 0');
      return;
    }
    if ([parsedMonoFat, parsedPolyFat, parsedTransFat, parsedPieceGrams, parsedCupGrams, parsedBowlGrams].some((v) => v !== undefined && v < 0)) {
      setError('Advanced fat and quantity conversion values cannot be negative');
      return;
    }

    const micronutrients: Record<string, number> = {};
    for (const key of MICRONUTRIENT_KEYS) {
      const val = micros[key];
      if (val !== undefined && val.trim() !== '') {
        const n = Number(val);
        if (!Number.isFinite(n) || n < 0) {
          setError(`${MicronutrientLabel(key)} must be a valid number (0 or more)`);
          return;
        }
        micronutrients[key] = n;
      }
    }

    const input: CreateFoodInput = {
      name: name.trim(),
      brand: brand.trim() || null,
      category: category.trim(),
      description: description.trim() || null,
      source: 'custom',
      sourceDetail: sourceDetail.trim() || null,
      preparation,
      serving: { amount: parsedServingAmt, unit: servingUnit },
      quantityConversions: {
        ...(parsedPieceGrams !== undefined && parsedPieceGrams > 0 ? { piece: parsedPieceGrams } : {}),
        ...(parsedCupGrams !== undefined && parsedCupGrams > 0 ? { cup: parsedCupGrams } : {}),
        ...(parsedBowlGrams !== undefined && parsedBowlGrams > 0 ? { bowl: parsedBowlGrams } : {}),
      },
      nutrition: {
        basis,
        servingAmount: basis === 'per_serving' ? parsedServingAmt : null,
        servingUnit: basis === 'per_serving' ? servingUnit : null,
        calories: parsedCalories,
        protein: parsedProtein,
        carbohydrates: parsedCarbs,
        fat: parsedFat,
        fiber: parsedFiber,
        sugar: parsedSugar,
        saturatedFat: parsedSatFat,
        sodium: parsedSodium,
        ...(parsedMonoFat !== undefined ? { monounsaturatedFat: parsedMonoFat } : {}),
        ...(parsedPolyFat !== undefined ? { polyunsaturatedFat: parsedPolyFat } : {}),
        ...(parsedTransFat !== undefined ? { transFat: parsedTransFat } : {}),
        micronutrients,
      },
    };

    setSaving(true);
    try {
      if (isEdit && params.foodId) {
        await editFood(params.foodId, input);
      } else {
        await addFood(input);
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
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading...
        </Text>
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
              {isEdit ? 'Edit Food' : 'New Custom Food'}
            </Heading>
          </View>
        </View>

        {/* Name */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Homemade Paneer"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
            accessibilityLabel="Food name"
          />
        </View>

        {/* Brand */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Brand (optional)</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Amul"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
            accessibilityLabel="Brand"
          />
        </View>

        {/* Category */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Dairy"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
            accessibilityLabel="Category"
          />
        </View>

        {/* Description */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes..."
            multiline
            numberOfLines={3}
            className="min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-foreground"
            accessibilityLabel="Description"
          />
        </View>

        {/* Preparation */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Preparation</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {PREPARATION_STATES.map((p) => {
              const active = preparation === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPreparation(p)}
                  className={`min-h-[44px] justify-center rounded-lg px-3 py-2 ${active ? 'bg-primary' : 'bg-muted'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text size="xs" className={`font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {p}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Serving */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text size="sm" className="mb-2 font-medium">Serving Amount *</Text>
            <TextInput
              value={servingAmount}
              onChangeText={setServingAmount}
              placeholder="100"
              keyboardType="decimal-pad"
              className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
              accessibilityLabel="Serving amount"
            />
          </View>
          <View className="w-[120px]">
            <Text size="sm" className="mb-2 font-medium">Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
              {SERVING_UNITS.map((u) => {
                const active = servingUnit === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => setServingUnit(u)}
                    className={`min-h-[44px] justify-center rounded-lg px-2 py-2 ${active ? 'bg-primary' : 'bg-muted'}`}
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
          </View>
        </View>

        {/* Nutrition Basis */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Nutrition Basis</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {NUTRITION_BASES.map((b) => {
              const active = basis === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => setBasis(b)}
                  className={`min-h-[44px] justify-center rounded-lg px-3 py-2 ${active ? 'bg-primary' : 'bg-muted'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text size="xs" className={`font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {b}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Macros */}
        <Card className="w-full p-4">
          <Heading size="sm">Nutrition Values</Heading>
          {[
            { label: 'Calories (kcal)', value: calories, set: setCalories, key: 'cal' },
            { label: 'Protein (g)', value: protein, set: setProtein, key: 'pro' },
            { label: 'Carbohydrates (g)', value: carbohydrates, set: setCarbohydrates, key: 'carb' },
            { label: 'Fat (g)', value: fat, set: setFat, key: 'fat' },
            { label: 'Fiber (g)', value: fiber, set: setFiber, key: 'fib' },
            { label: 'Sugar (g)', value: sugar, set: setSugar, key: 'sug' },
            { label: 'Saturated Fat (g)', value: saturatedFat, set: setSaturatedFat, key: 'sat' },
            { label: 'Sodium (mg)', value: sodium, set: setSodium, key: 'sod' },
          ].map(({ label, value, set, key }) => (
            <View key={key} className="mt-3">
              <Text size="xs" className="mb-1 text-muted-foreground">{label}</Text>
              <TextInput
                value={value}
                onChangeText={set}
                placeholder="0"
                keyboardType="decimal-pad"
                className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
                accessibilityLabel={label}
              />
            </View>
          ))}
        </Card>

        {/* Advanced fats + quantity conversions */}
        <Card className="w-full p-4">
          <Heading size="sm">Advanced Fat & Quantity Data (optional)</Heading>
          {[
            { label: 'Monounsaturated Fat (g)', value: monounsaturatedFat, set: setMonounsaturatedFat, key: 'mufa' },
            { label: 'Polyunsaturated Fat (g)', value: polyunsaturatedFat, set: setPolyunsaturatedFat, key: 'pufa' },
            { label: 'Trans Fat (g)', value: transFat, set: setTransFat, key: 'trans' },
            { label: '1 piece = grams', value: pieceGrams, set: setPieceGrams, key: 'piece-g' },
            { label: '1 cup = grams', value: cupGrams, set: setCupGrams, key: 'cup-g' },
            { label: '1 bowl = grams', value: bowlGrams, set: setBowlGrams, key: 'bowl-g' },
          ].map(({ label, value, set, key }) => (
            <View key={key} className="mt-3">
              <Text size="xs" className="mb-1 text-muted-foreground">{label}</Text>
              <TextInput
                value={value}
                onChangeText={set}
                placeholder="—"
                keyboardType="decimal-pad"
                className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
                accessibilityLabel={label}
              />
            </View>
          ))}
        </Card>

        {/* Micronutrients */}
        <Card className="w-full p-4">
          <Heading size="sm">Micronutrients (optional)</Heading>
          {MICRONUTRIENT_KEYS.map((key) => (
            <View key={key} className="mt-3">
              <Text size="xs" className="mb-1 text-muted-foreground">{MicronutrientLabel(key)}</Text>
              <TextInput
                value={micros[key] ?? ''}
                onChangeText={(t) => setMicros((prev) => ({ ...prev, [key]: t }))}
                placeholder="—"
                keyboardType="decimal-pad"
                className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
                accessibilityLabel={MicronutrientLabel(key)}
              />
            </View>
          ))}
        </Card>

        {/* Source Detail */}
        <View>
          <Text size="sm" className="mb-2 font-medium">Source Detail (optional)</Text>
          <TextInput
            value={sourceDetail}
            onChangeText={setSourceDetail}
            placeholder="e.g. Based on packaged label"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-foreground"
            accessibilityLabel="Source detail"
          />
        </View>

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
          accessibilityLabel={isEdit ? 'Save changes' : 'Create food'}
        >
          {saving ? (
            <ActivityIndicator size="small" className="text-primary-foreground" />
          ) : (
            <>
              <Check size={16} className="mr-2 text-primary-foreground" />
              <ButtonText>{isEdit ? 'Save Changes' : 'Create Food'}</ButtonText>
            </>
          )}
        </Button>
      </View>
    </ScrollView>
  );
}
