import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DailyPulse from '@/components/dashboard/DailyPulse';
import FinanceSnapshot from '@/components/dashboard/FinanceSnapshot';
import HealthSnapshot from '@/components/dashboard/HealthSnapshot';
import HomeHeader from '@/components/dashboard/HomeHeader';
import QuickActions from '@/components/dashboard/QuickActions';
import TaskPreview from '@/components/dashboard/TaskPreview';
import TodaysProgress from '@/components/dashboard/TodaysProgress';
import XPLevelCard from '@/components/dashboard/XPLevelCard';
import FocusInsightCard from '@/components/dashboard/FocusInsightCard';
import FloatingActionMenu from '@/components/dashboard/FloatingActionMenu';
import { HabitPreview } from '@/components/dashboard/HabitPreview';
import { FadeInView } from '@/components/motion/FadeInView';
import { HeroWave } from '@/components/visuals/HeroWave';
import { useHabits } from '@/hooks/useHabits';
import { dailyPulse } from '@/lib/mockData';
import { getActiveWorkout } from '@/services/workouts';

export default function HomeScreen() {
  const [workoutHref, setWorkoutHref] = useState('/health/workout-builder');
  const [workoutLabel, setWorkoutLabel] = useState('Workout');
  const { todayHabits, toggleCompletion } = useHabits();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getActiveWorkout()
        .then((active) => {
          if (!mounted) return;
          if (active) {
            setWorkoutHref(`/health/workout-session/${active.id}`);
            setWorkoutLabel('Continue');
          } else {
            setWorkoutHref('/health/workout-builder');
            setWorkoutLabel('Workout');
          }
        })
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }, []),
  );

  const handleHabitComplete = useCallback(
    (habitId: string) => {
      toggleCompletion(habitId);
    },
    [toggleCompletion],
  );

  const topPadding = Math.max(insets.top + 12, 48);

  return (
    <View className="flex-1 bg-background relative">
      <ScrollView className="flex-1 bg-background">
        {/* Hero wave decorative background */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
          <HeroWave width={500} height={220} />
        </View>

        <View
          className="gap-4 px-5 pb-24"
          style={{ zIndex: 1, paddingTop: topPadding }}
        >
          <FadeInView delay={0}>
            <HomeHeader />
          </FadeInView>

          <FadeInView delay={60}>
            <XPLevelCard />
          </FadeInView>

          <FadeInView delay={120}>
            <DailyPulse
              score={dailyPulse.lifeScore}
              change={dailyPulse.scoreChange}
            />
          </FadeInView>

          <FadeInView delay={180}>
            <FocusInsightCard />
          </FadeInView>

          <FadeInView delay={240}>
            <TodaysProgress />
          </FadeInView>

          <FadeInView delay={300}>
            <QuickActions
              workoutHref={workoutHref}
              workoutLabel={workoutLabel}
            />
          </FadeInView>

          <FadeInView delay={360}>
            <HabitPreview habits={todayHabits} onComplete={handleHabitComplete} />
          </FadeInView>

          <FadeInView delay={420}>
            <TaskPreview />
          </FadeInView>

          <FadeInView delay={480}>
            <HealthSnapshot />
          </FadeInView>

          <FadeInView delay={540}>
            <FinanceSnapshot />
          </FadeInView>
        </View>
      </ScrollView>

      {/* Floating Speed Dial Action Button */}
      <FloatingActionMenu />
    </View>
  );
}
