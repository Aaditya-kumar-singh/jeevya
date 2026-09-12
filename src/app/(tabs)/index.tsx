import { useCallback, useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import DailyPulse from '@/components/dashboard/DailyPulse';
import FinanceSnapshot from '@/components/dashboard/FinanceSnapshot';
import HealthSnapshot from '@/components/dashboard/HealthSnapshot';
import HomeHeader from '@/components/dashboard/HomeHeader';
import QuickActions from '@/components/dashboard/QuickActions';
import TaskPreview from '@/components/dashboard/TaskPreview';
import TodaysProgress from '@/components/dashboard/TodaysProgress';
import { HabitPreview } from '@/components/dashboard/HabitPreview';
import { useHabits } from '@/hooks/useHabits';
import { dailyPulse } from '@/lib/mockData';
import { getActiveWorkout } from '@/services/workouts';

export default function HomeScreen() {
  const [workoutHref, setWorkoutHref] = useState('/health/workout-builder');
  const [workoutLabel, setWorkoutLabel] = useState('Workout');
  const { todayHabits, toggleCompletion } = useHabits();

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

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <HomeHeader />
        <DailyPulse
          score={dailyPulse.lifeScore}
          change={dailyPulse.scoreChange}
        />
        <TodaysProgress />
        <HealthSnapshot />
        <TaskPreview />
        <FinanceSnapshot />
        <HabitPreview
          habits={todayHabits}
          onComplete={handleHabitComplete}
        />
        <QuickActions workoutHref={workoutHref} workoutLabel={workoutLabel} />
      </View>
    </ScrollView>
  );
}

