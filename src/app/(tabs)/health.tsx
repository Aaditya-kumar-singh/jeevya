import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Text } from '@/components/ui/text';
import { getExerciseCount } from '@/services/exercises';
import { WorkoutNowCard } from '@/components/workout/WorkoutNowCard';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
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
  iconBg: string;
}

const tiles = (exerciseText: string): HealthTile[] => [
  { label: 'Workout', value: "Today's plan", href: '/health/workout', icon: Dumbbell, iconBg: 'bg-primary/10 text-primary' },
  { label: 'Exercises', value: exerciseText, href: '/health/exercises', icon: Library, iconBg: 'bg-info/10 text-info' },
  { label: 'Sleep', value: sleepTonight.lastNight, href: '/health/sleep', icon: BedDouble, iconBg: 'bg-indigo-500/10 text-indigo-500' },
  {
    label: 'Nutrition',
    value: `${nutritionToday.caloriesEaten.toLocaleString()} kcal`,
    href: '/health/nutrition',
    icon: Apple,
    iconBg: 'bg-success/10 text-success',
  },
];

export default function HealthScreen() {
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

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
      <View className="gap-4 px-5 pb-12" style={{ paddingTop: topPadding }}>
        <FadeInView delay={0}>
          <View>
            <Text size="sm" className="text-muted-foreground font-medium">
              Health overview
            </Text>
            <Heading size="xl" className="mt-1 font-bold tracking-tight">
              Health score {healthScoreBreakdown.score}
            </Heading>
          </View>
        </FadeInView>

        <FadeInView delay={100}>
          <WorkoutNowCard />
        </FadeInView>

        <FadeInView delay={200}>
          <Card className="w-full p-4 border border-border/50 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Heading size="md">Today</Heading>
              <Text size="sm" className="text-muted-foreground">
                Sleep {healthScoreBreakdown.sleep} · Activity {healthScoreBreakdown.activity}
              </Text>
            </View>
            <View className="mt-4 gap-4">
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text size="sm" className="text-muted-foreground font-medium">
                    Water {waterPct}%
                  </Text>
                  <Text size="sm" className="text-muted-foreground">
                    {waterGoal.drunkMl}/{waterGoal.goalMl} ml
                  </Text>
                </View>
                <AnimatedProgress value={waterPct} height={8} trackColor="bg-info" />
              </View>
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text size="sm" className="text-muted-foreground font-medium">
                    Calories {caloriePct}%
                  </Text>
                  <Text size="sm" className="text-muted-foreground">
                    {nutritionToday.caloriesEaten}/{nutritionToday.calorieGoal} kcal
                  </Text>
                </View>
                <AnimatedProgress
                  value={caloriePct}
                  height={8}
                  trackColor={caloriePct > 100 ? 'bg-amber-500' : 'bg-success'}
                />
              </View>
            </View>
          </Card>
        </FadeInView>

        <View className="gap-3">
          {tiles(exerciseCountText).map((tile, index) => {
            const Icon = tile.icon;
            return (
              <FadeInView key={tile.label} delay={300 + index * 75}>
                <Link href={tile.href} asChild>
                  <ScalePressable>
                    <Card className="w-full p-4 border border-border/40 shadow-xs">
                      <View className="flex-row items-center gap-3">
                        <View className={`h-11 w-11 items-center justify-center rounded-xl ${tile.iconBg}`}>
                          <Icon size={20} />
                        </View>
                        <View className="flex-1">
                          <Heading size="sm" className="font-semibold">{tile.label}</Heading>
                          <Text size="sm" className="text-muted-foreground">
                            {tile.value}
                          </Text>
                        </View>
                        <ChevronRight size={18} className="text-muted-foreground/60" />
                      </View>
                    </Card>
                  </ScalePressable>
                </Link>
              </FadeInView>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
