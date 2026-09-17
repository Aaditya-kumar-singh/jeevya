import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Apple, Droplets, Flame, Utensils } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { FadeInView } from '@/components/motion/FadeInView';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { nutritionToday, waterGoal } from '@/lib/mockData';
import { useNutrition } from '@/hooks/useNutrition';
import { calculateFoodQuantity, searchFoods } from '@/services/nutrition';
import type { ServingUnit } from '@/types/nutrition';

const CALCULATOR_UNITS: ServingUnit[] = ['g', 'ml', 'piece', 'serving', 'cup', 'bowl', 'tbsp', 'tsp'];

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);
  const { foods, targets, getEnergySummary, getDailySummary } = useNutrition();
  const [drunkMl, setDrunkMl] = useState(waterGoal.drunkMl);
  const [foodQuery, setFoodQuery] = useState('');
  const [quantityText, setQuantityText] = useState('100');
  const [quantityUnit, setQuantityUnit] = useState<ServingUnit>('g');

  const waterPct = Math.min(100, Math.round((drunkMl / waterGoal.goalMl) * 100));
  const todayDate = new Date().toISOString().slice(0, 10);
  const today = getDailySummary(todayDate);
  const energy = getEnergySummary(todayDate);
  const selectedFood = searchFoods(foods, foodQuery)[0] ?? null;
  const quantity = Number(quantityText);
  const calculation = selectedFood && Number.isFinite(quantity) && quantity > 0
    ? (() => {
        try {
          return calculateFoodQuantity(selectedFood, { amount: quantity, unit: quantityUnit });
        } catch {
          return null;
        }
      })()
    : null;

  const calorieGoal = targets?.targetCalories ?? nutritionToday.calorieGoal;
  const proteinGoal = targets?.protein ?? nutritionToday.proteinGoal;
  const caloriesLeft = Math.max(0, calorieGoal - today.totals.calories);
  const caloriePct = calorieGoal > 0 ? Math.min(100, Math.round((today.totals.calories / calorieGoal) * 100)) : 0;
  const proteinPct = proteinGoal > 0 ? Math.min(100, Math.round((today.totals.protein / proteinGoal) * 100)) : 0;
  const mealCalories = new Map(today.byMeal.map((meal) => [meal.mealType, meal.totals.calories]));

  return (
    <View className="flex-1 bg-amber-50/40 dark:bg-slate-950 relative">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#F59E0B" color2="#EF4444" width={450} height={350} />
      </View>

      <ScrollView className="flex-1">
        <View className="gap-4 px-5 pb-12" style={{ zIndex: 1, paddingTop: topPadding }}>
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="xs" className="font-semibold text-amber-500 uppercase tracking-wider">
                  Macro & Fuel Tracker
                </Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
                  Daily Nutrition
                </Heading>
                <Text size="sm" className="mt-1 text-muted-foreground font-medium">
                  {Math.round(caloriesLeft)} kcal remaining for today
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/20 shadow-xs">
                <Apple size={24} className="text-amber-500" />
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={40}>
            <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Flame size={20} className="text-amber-500" />
                  <Heading size="md" className="font-bold">Calorie Intake</Heading>
                </View>
                <View className="rounded-full bg-amber-500/15 px-2.5 py-0.5 border border-amber-500/25">
                  <Text size="xs" className="font-bold text-amber-600 dark:text-amber-400">{caloriePct}% Goal</Text>
                </View>
              </View>
              <Heading size="xl" className="mt-3 font-extrabold tracking-tight">
                {Math.round(today.totals.calories).toLocaleString()}
                <Text size="sm" className="text-muted-foreground font-medium"> / {Math.round(calorieGoal).toLocaleString()} kcal</Text>
              </Heading>
              <Progress value={caloriePct} className="h-2.5 rounded-full bg-amber-100 dark:bg-amber-950 mt-3">
                <ProgressFilledTrack className="bg-amber-500" />
              </Progress>
              <View className="mt-4 pt-3 border-t border-border/40">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text size="xs" className="font-bold">Protein Intake: {Math.round(today.totals.protein)}g / {Math.round(proteinGoal)}g</Text>
                  <Text size="xs" className="font-bold text-orange-500">{proteinPct}%</Text>
                </View>
                <Progress value={proteinPct} className="h-2 rounded-full bg-orange-100 dark:bg-orange-950">
                  <ProgressFilledTrack className="bg-orange-500" />
                </Progress>
              </View>
            </Card>
          </FadeInView>

          <FadeInView delay={80}>
            <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
              <View className="flex-row items-center gap-2 mb-3">
                <Flame size={20} className="text-amber-500" />
                <Heading size="md" className="font-bold">Food Quantity Calculator</Heading>
              </View>
              <TextInput
                value={foodQuery}
                onChangeText={setFoodQuery}
                placeholder="Search food, e.g. roti, rice, banana"
                placeholderTextColor="#94A3B8"
                className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-foreground"
              />
              {selectedFood ? (
                <View className="mt-3 gap-2">
                  <Text size="sm" className="font-bold">{selectedFood.name}</Text>
                  <View className="flex-row gap-2">
                    <TextInput
                      value={quantityText}
                      onChangeText={setQuantityText}
                      keyboardType="decimal-pad"
                      className="flex-1 rounded-2xl border border-border/60 bg-background px-4 py-3 text-foreground"
                    />
                    <View className="flex-row flex-wrap gap-1.5 flex-[1.4]">
                      {CALCULATOR_UNITS.map((unit) => (
                        <Pressable
                          key={unit}
                          onPress={() => setQuantityUnit(unit)}
                          className={`rounded-xl border px-2.5 py-2 ${quantityUnit === unit ? 'bg-amber-500 border-amber-500' : 'bg-accent/30 border-border/50'}`}>
                          <Text size="xs" className={quantityUnit === unit ? 'font-bold text-white' : 'font-semibold text-muted-foreground'}>{unit}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  {calculation ? (
                    <View className="mt-2 rounded-2xl bg-accent/30 border border-border/30 p-3 gap-1">
                      <Text size="sm" className="font-bold">{quantity} {quantityUnit}: {Math.round(calculation.nutrients.calories)} kcal</Text>
                      <Text size="xs" className="text-muted-foreground">
                        Protein {calculation.nutrients.protein.toFixed(1)}g · Carbs {calculation.nutrients.carbohydrates.toFixed(1)}g · Fat {calculation.nutrients.fat.toFixed(1)}g · Fiber {calculation.nutrients.fiber.toFixed(1)}g
                      </Text>
                      <Text size="xs" className="text-muted-foreground">Source: {calculation.source.quality.replace('_', ' ')}</Text>
                      {Object.entries(calculation.nutrients.micronutrients).length > 0 ? (
                        <Text size="xs" className="text-muted-foreground mt-1">
                          {Object.entries(calculation.nutrients.micronutrients).map(([key, value]) => `${key}: ${Number(value).toFixed(1)}`).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text size="xs" className="text-muted-foreground">Choose a compatible quantity unit to calculate.</Text>
                  )}
                </View>
              ) : (
                <Text size="xs" className="mt-2 text-muted-foreground">Search your local food library to calculate a quantity.</Text>
              )}
            </Card>
          </FadeInView>

          <FadeInView delay={120}>
            <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
              <View className="flex-row items-center gap-2 mb-3">
                <Utensils size={20} className="text-amber-500" />
                <Heading size="md" className="font-bold">Today&apos;s Meals</Heading>
              </View>
              <View className="gap-2.5">
                {(['breakfast', 'lunch', 'snack', 'dinner', 'other'] as const).map((mealType) => (
                  <View key={mealType} className="flex-row items-center justify-between p-3 rounded-2xl bg-accent/30 border border-border/30">
                    <Text size="sm" className="font-semibold">{mealType[0].toUpperCase() + mealType.slice(1)}</Text>
                    <View className="rounded-full bg-amber-500/15 px-2.5 py-0.5">
                      <Text size="xs" className="font-bold text-amber-600 dark:text-amber-400">{Math.round(mealCalories.get(mealType) ?? 0)} kcal</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </FadeInView>

          <FadeInView delay={160}>
            <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Droplets size={20} className="text-sky-500" />
                  <Heading size="md" className="font-bold">Water Goal</Heading>
                </View>
                <Text size="xs" className="font-bold text-sky-500">{drunkMl} / {waterGoal.goalMl} ml</Text>
              </View>
              <Progress value={waterPct} className="h-2.5 rounded-full bg-sky-100 dark:bg-sky-950 mt-3">
                <ProgressFilledTrack className="bg-sky-500" />
              </Progress>
              <View className="mt-4 flex-row gap-3">
                <Button className="flex-1 rounded-2xl bg-sky-500 active:bg-sky-600 min-h-[44px]" onPress={() => setDrunkMl((v) => Math.min(waterGoal.goalMl, v + waterGoal.glassMl))}>
                  <ButtonText className="font-bold text-white">+ {waterGoal.glassMl} ml Glass</ButtonText>
                </Button>
                <Pressable onPress={() => setDrunkMl(waterGoal.drunkMl)} className="items-center justify-center rounded-2xl border border-border/60 bg-accent/40 px-4 min-h-[44px]">
                  <Text size="xs" className="font-semibold text-muted-foreground">Reset</Text>
                </Pressable>
              </View>
            </Card>
          </FadeInView>

          <FadeInView delay={200}>
            <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
              <Heading size="md" className="font-bold">Energy Balance</Heading>
              <Text size="sm" className="mt-2 text-muted-foreground">Consumed {Math.round(energy.caloriesIn)} kcal · Burned {Math.round(energy.caloriesOut)} kcal · Net {Math.round(energy.netCalories)} kcal</Text>
            </Card>
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}
