import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import {
  Apple,
  BedDouble,
  ChevronRight,
  Dumbbell,
  Library,
  Flame,
  Activity,
  Sparkles,
  MapPin,
} from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { getExerciseCount } from '@/services/exercises';
import { WorkoutNowCard } from '@/components/workout/WorkoutNowCard';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { HealthActivityGraphic } from '@/components/visuals/HealthActivityGraphic';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { InteractiveWaterTracker } from '@/components/health/InteractiveWaterTracker';
import { useJeevyaIntegration } from '@/hooks/useJeevyaIntegration';

interface HealthTile {
  label: string;
  value: string;
  href: string;
  icon: typeof Dumbbell;
  iconBg: string;
}

const tiles = (exerciseText: string, sleepMinutes: number | null, calories: number): HealthTile[] => [
  { label: 'Gym & Testosterone', value: 'Strength, recovery, and training focus', href: '/health/gym', icon: Dumbbell, iconBg: 'bg-red-500/15 text-red-500' },
  { label: 'Workout Plan', value: "Today's hyper-focus session", href: '/health/workout', icon: Dumbbell, iconBg: 'bg-rose-500/15 text-rose-500' },

  { label: 'GPS Outdoor Workout', value: 'Track route, distance, speed, and Health Connect sync', href: '/health/outdoor-workout', icon: MapPin, iconBg: 'bg-emerald-500/15 text-emerald-500' },
  { label: 'Exercise Library', value: exerciseText, href: '/health/exercises', icon: Library, iconBg: 'bg-indigo-500/15 text-indigo-500' },
  { label: 'Sleep Quality', value: sleepMinutes == null ? 'No data recorded' : `${Math.floor(sleepMinutes / 60)}h ${sleepMinutes % 60}m`, href: '/health/sleep', icon: BedDouble, iconBg: 'bg-sky-500/15 text-sky-500' },
  {
    label: 'Nutrition & Macro',
    value: `${Math.round(calories).toLocaleString()} kcal eaten`,
    href: '/health/nutrition',
    icon: Apple,
    iconBg: 'bg-amber-500/15 text-amber-500',
  },
  { label: 'Health Insights', value: 'Deterministic wellness observations', href: '/health/insights', icon: Sparkles, iconBg: 'bg-rose-500/15 text-rose-500' },
  { label: 'Workout Insights', value: 'Volume, muscle balance, PR timeline and adherence', href: '/health/workout-insights', icon: Activity, iconBg: 'bg-violet-500/15 text-violet-500' },
];

export default function HealthScreen() {
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
  const { data: jeevyaState, loading: integrationLoading } = useJeevyaIntegration();
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
      ? 'Loading library…'
      : `${exerciseCount.toLocaleString()} exercises available`;

  const healthScore = jeevyaState?.health.recovery?.readinessScore ?? null;
  const sleepMinutes = jeevyaState?.health.sleep?.durationMinutes ?? null;
  const calories = jeevyaState?.nutrition.summary.totals.calories ?? 0;
  const calorieGoal = jeevyaState?.nutrition.targets?.targetCalories ?? null;
  const caloriePct = calorieGoal && calorieGoal > 0 ? Math.round((calories / calorieGoal) * 100) : null;

  return (
    <View className="flex-1 bg-rose-50/40 dark:bg-slate-950 relative">
      {/* Ambient background orbs */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#F43F5E" color2="#38BDF8" width={450} height={350} />
      </View>

      <ScrollView className="flex-1">
        <View
          className="gap-4 px-5 pb-12"
          style={{ zIndex: 1, paddingTop: topPadding }}
        >
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="xs" className="font-semibold text-rose-500 uppercase tracking-wider">
                  Health & Vitality Hub
                </Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
                  Body & Mind Score: {healthScore ?? '—'}
                </Heading>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/20 shadow-xs">
                <Activity size={24} className="text-rose-500" />
              </View>
            </View>
          </FadeInView>

          {/* Intricate SVG Graphic Illustration */}
          <FadeInView delay={40}>
            <View className="items-center my-1">
              <HealthActivityGraphic width={350} height={130} />
            </View>
          </FadeInView>

          <FadeInView delay={80}>
            <Card className="w-full p-5 border border-sky-500/20 bg-card shadow-sm rounded-3xl">
              <Heading size="md" className="font-bold">Hydration</Heading>
              <Text size="sm" className="mt-1 text-muted-foreground">
                {integrationLoading ? 'Loading health data…' : 'No hydration data recorded.'}
              </Text>
            </Card>
          </FadeInView>

          <FadeInView delay={140}>
            <WorkoutNowCard />
          </FadeInView>

          <FadeInView delay={200}>
            <Card className="w-full p-5 border border-amber-500/25 bg-card shadow-sm rounded-3xl">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Flame size={18} className="text-amber-500" fill="#F59E0B" />
                  <Heading size="md" className="font-bold">Calorie & Macro Meter</Heading>
                </View>
                <View className="rounded-full bg-amber-500/15 px-2.5 py-0.5 border border-amber-500/25">
                  <Text size="xs" className="font-bold text-amber-600 dark:text-amber-400">
                    {caloriePct === null ? 'No target' : `${caloriePct}% Goal`}
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text size="xs" className="text-muted-foreground font-medium">
                    Calories Eaten Today
                  </Text>
                  <Text size="xs" className="font-bold text-foreground">
                    {calorieGoal === null ? 'No nutrition target recorded' : `${Math.round(calories)} / ${Math.round(calorieGoal)} kcal`}
                  </Text>
                </View>
                <AnimatedProgress
                  value={caloriePct ?? 0}
                  height={10}
                  color={(caloriePct ?? 0) > 100 ? 'bg-amber-500' : 'bg-rose-500'}
                />
              </View>
            </Card>
          </FadeInView>

          <View className="gap-3">
            {tiles(exerciseCountText, sleepMinutes, calories).map((tile, index) => {
              const Icon = tile.icon;
              return (
                <FadeInView key={tile.label} delay={260 + index * 60}>
                  <Link href={tile.href as never} asChild>
                    <ScalePressable>
                      <Card className="w-full p-4 border border-border/50 shadow-xs rounded-3xl">
                        <View className="flex-row items-center gap-3.5">
                          <View className={`h-11 w-11 items-center justify-center rounded-2xl ${tile.iconBg}`}>
                            <Icon size={20} />
                          </View>
                          <View className="flex-1">
                            <Heading size="sm" className="font-bold">{tile.label}</Heading>
                            <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
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
    </View>
  );
}
