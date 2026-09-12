import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Droplets } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { nutritionToday, waterGoal } from '@/lib/mockData';

export default function NutritionScreen() {
  const [drunkMl, setDrunkMl] = useState(waterGoal.drunkMl);
  const waterPct = Math.min(100, Math.round((drunkMl / waterGoal.goalMl) * 100));
  const caloriesLeft = Math.max(0, nutritionToday.calorieGoal - nutritionToday.caloriesEaten);
  const caloriePct = Math.min(
    100,
    Math.round((nutritionToday.caloriesEaten / nutritionToday.calorieGoal) * 100),
  );
  const proteinPct = Math.min(
    100,
    Math.round((nutritionToday.protein / nutritionToday.proteinGoal) * 100),
  );

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Fuel today
          </Text>
          <Heading size="xl" className="mt-1">
            Nutrition
          </Heading>
        </View>

        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Heading size="md">Calories</Heading>
            <Text size="sm" className="text-muted-foreground">
              {caloriesLeft} kcal left
            </Text>
          </View>
          <Heading size="xl" className="mt-2">
            {nutritionToday.caloriesEaten.toLocaleString()}
            <Text size="sm" className="text-muted-foreground">
              {' '}
              / {nutritionToday.calorieGoal.toLocaleString()} kcal
            </Text>
          </Heading>
          <Progress value={caloriePct} className="mt-3">
            <ProgressFilledTrack />
          </Progress>
          <View className="mt-3">
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">
                Protein {nutritionToday.protein}g / {nutritionToday.proteinGoal}g
              </Text>
              <Text size="sm" className="text-muted-foreground">
                {proteinPct}%
              </Text>
            </View>
            <Progress value={proteinPct} className="mt-2">
              <ProgressFilledTrack />
            </Progress>
          </View>
        </Card>

        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Droplets size={18} />
              <Heading size="md">Water</Heading>
            </View>
            <Text size="sm" className="text-muted-foreground">
              {drunkMl} / {waterGoal.goalMl} ml
            </Text>
          </View>
          <Progress value={waterPct} className="mt-3">
            <ProgressFilledTrack />
          </Progress>
          <View className="mt-3 flex-row gap-2">
            <Button
              className="flex-1"
              onPress={() => setDrunkMl((v) => Math.min(waterGoal.goalMl, v + waterGoal.glassMl))}>
              <ButtonText>+ {waterGoal.glassMl} ml</ButtonText>
            </Button>
            <Pressable
              onPress={() => setDrunkMl(waterGoal.drunkMl)}
              className="items-center justify-center rounded-md border border-border px-4">
              <Text size="sm">Reset</Text>
            </Pressable>
          </View>
        </Card>

        <Card className="w-full p-4">
          <Heading size="md">Meals</Heading>
          <View className="mt-3 gap-2">
            {nutritionToday.meals.map((meal) => (
              <View key={meal.id} className="flex-row items-center justify-between">
                <Text size="sm">{meal.name}</Text>
                <Text size="sm" className="text-muted-foreground">
                  {meal.calories} kcal
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

