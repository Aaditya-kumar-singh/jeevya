import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl, Pressable, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Plus, ChevronRight } from 'lucide-react-native';
import { useHabits } from '@/hooks/useHabits';
import { HabitCard, HabitProgress } from '@/components/habit';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text, Button, ButtonText } from '@/components/ui';
import { useEffect as reactEffect } from 'react';

export default function HabitsScreen() {
  const router = useRouter();
  const {
    habits,
    todayHabits,
    loading,
    refreshing,
    error,
    refresh,
    toggleCompletion,
    getHabitStatsForHabit,
    getHabitLogsForHabit,
  } = useHabits();

  const [habitStats, setHabitStats] = useState<Map<string, ReturnType<typeof getHabitStatsForHabit>>>(new Map());

  const completedToday = todayHabits.filter((h) => h.isCompleted).length;
  const totalToday = todayHabits.length;
  const progressPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  // Load stats for all today's habits
  useEffect(() => {
    const loadStats = async () => {
      const newStats = new Map();
      for (const habit of todayHabits) {
        const logs = await getHabitLogsForHabit(habit.id);
        const stats = getHabitStatsForHabit(habit, logs);
        newStats.set(habit.id, stats);
      }
      setHabitStats(newStats);
    };

    if (todayHabits.length > 0) {
      loadStats();
    }
  }, [todayHabits, getHabitLogsForHabit, getHabitStatsForHabit]);

  const handleToggle = useCallback(
    async (habitId: string) => {
      await toggleCompletion(habitId);
    },
    [toggleCompletion],
  );

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleEditHabit = useCallback((habitId: string) => {
    router.push(`/habits/${habitId}/edit` as any);
  }, [router]);

  const handleViewHabit = useCallback((habitId: string) => {
    router.push(`/habits/${habitId}` as any);
  }, [router]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text size="sm" className="text-muted-foreground">Loading habits...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#6B7280"
        />
      }
    >
      <View className="px-5 pt-14">
        {/* Header */}
        <View>
          <Text size="sm" className="text-muted-foreground">Habits</Text>
          <Heading size="xl" className="mt-1">Today's Habits</Heading>
        </View>

        {/* Progress Card */}
        {totalToday > 0 && (
          <HabitProgress
            completed={completedToday}
            total={totalToday}
            title="Today's Progress"
          />
        )}

        {/* Habits List */}
        <View className="gap-3">
          {todayHabits.length === 0 ? (
            <Card className="w-full p-6">
              <View className="items-center gap-3">
                <Text size="lg" className="text-muted-foreground/50">📋</Text>
                <View>
                  <Text size="md" className="text-center">No habits scheduled for today</Text>
                  <Text size="sm" className="text-muted-foreground text-center mt-1">
                    Add a daily habit to see it here every day
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            todayHabits.map((habit) => {
              const stats = habitStats.get(habit.id);
              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onComplete={() => handleToggle(habit.id)}
                  showStreak={true}
                  currentStreak={stats?.currentStreak ?? 0}
                  onPress={() => handleViewHabit(habit.id)}
                />
              );
            })
          )}
        </View>

        {/* Error state */}
        {error && (
          <Card className="w-full p-4">
            <Text size="sm" className="text-destructive">{error}</Text>
            <Button onPress={handleRefresh} variant="outline" className="mt-2">
              <ButtonText>Retry</ButtonText>
            </Button>
          </Card>
        )}
      </View>

      {/* Add Habit Button */}
      <View className="px-5 pb-6">
        <Pressable
          onPress={() => router.push('/habits/new' as any)}
          className="w-full rounded-xl border-2 border-dashed border-border bg-card/50 p-4 mt-2"
        >
          <View className="flex-row items-center justify-center gap-2">
            <Plus size={20} />
            <Text size="md" className="font-medium">Add Habit</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}
