import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import {
  Apple,
  BedDouble,
  ChevronRight,
  Dumbbell,
  Library,
} from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { getExerciseCount } from '@/services/exercises';
import { WorkoutNowCard } from '@/components/workout/WorkoutNowCard';
import {
  healthScoreBreakdown,
  nutritionToday,
  sleepTonight,
  waterGoal,
} from '@/lib/mockData';

interface HealthTile {
  label: string;
  value: string;
  href: '/health/workout' | '/health/exercises' | '/health/sleep' | '/health/nutrition';
  icon: typeof Dumbbell;
}

const tiles = (exerciseText: string): HealthTile[] => [
  { label: 'Workout', value: "Today's plan", href: '/health/workout', icon: Dumbbell },
  { label: 'Exercises', value: exerciseText, href: '/health/exercises', icon: Library },
  { label: 'Sleep', value: sleepTonight.lastNight, href: '/health/sleep', icon: BedDouble },
  {
    label: 'Nutrition',
    value: `${nutritionToday.caloriesEaten.toLocaleString()} kcal`,
    href: '/health/nutrition',
    icon: Apple,
  },
];

export default function HealthScreen() {
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getExerciseCount()
      .then((n) => {
        if (active) setExerciseCount(n);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const exerciseCountText =
    exerciseCount === null
      ? 'Loading…'
      : `${exerciseCount.toLocaleString()} in library`;

  const waterPct = Math.round((waterGoal.drunkMl / waterGoal.goalMl) * 100);
  const caloriePct = Math.round(
    (nutritionToday.caloriesEaten / nutritionToday.calorieGoal) * 100,
  );

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Health overview
          </Text>
          <Heading size="xl" className="mt-1">
            Health score {healthScoreBreakdown.score}
          </Heading>
        </View>

        <WorkoutNowCard />

        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Heading size="md">Today</Heading>
            <Text size="sm" className="text-muted-foreground">
              Sleep {healthScoreBreakdown.sleep} · Activity {healthScoreBreakdown.activity}
            </Text>
          </View>
          <View className="mt-3 gap-3">
            <View>
              <View className="flex-row items-center justify-between">
                <Text size="sm" className="text-muted-foreground">
                  Water {waterPct}%
                </Text>
                <Text size="sm" className="text-muted-foreground">
                  {waterGoal.drunkMl}/{waterGoal.goalMl} ml
                </Text>
              </View>
              <Progress value={waterPct} className="mt-2">
                <ProgressFilledTrack />
              </Progress>
            </View>
            <View>
              <View className="flex-row items-center justify-between">
                <Text size="sm" className="text-muted-foreground">
                  Calories {caloriePct}%
                </Text>
                <Text size="sm" className="text-muted-foreground">
                  {nutritionToday.caloriesEaten}/{nutritionToday.calorieGoal} kcal
                </Text>
              </View>
              <Progress value={caloriePct} className="mt-2">
                <ProgressFilledTrack />
              </Progress>
            </View>
          </View>
        </Card>

        <View className="gap-3">
          {tiles(exerciseCountText).map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.label} href={tile.href} asChild>
                <Pressable>
                  <Card className="w-full p-4">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Icon size={18} />
                      </View>
                      <View className="flex-1">
                        <Heading size="sm">{tile.label}</Heading>
                        <Text size="sm" className="text-muted-foreground">
                          {tile.value}
                        </Text>
                      </View>
                      <ChevronRight size={18} />
                    </View>
                  </Card>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

