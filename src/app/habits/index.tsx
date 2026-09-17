import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl, Pressable, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Plus, ChevronRight, ListChecks, Sparkles, Flame } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHabits } from '@/hooks/useHabits';
import { HabitCard, HabitProgress } from '@/components/habit';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text, Button, ButtonText } from '@/components/ui';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';

export default function HabitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

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
      <View className="flex-1 bg-indigo-50/40 dark:bg-slate-950 items-center justify-center">
        <Text size="sm" className="text-muted-foreground font-medium">Loading habits...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-indigo-50/40 dark:bg-slate-950 relative">
      {/* Ambient background SVG orbs */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#6366F1" color2="#8B5CF6" width={450} height={350} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
          />
        }
      >
        <View className="px-5 gap-4" style={{ zIndex: 1, paddingTop: topPadding }}>
          {/* Header */}
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="xs" className="font-semibold text-indigo-500 uppercase tracking-wider">
                  Consistency & Routines
                </Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
                  Today's Habits
                </Heading>
                <Text size="sm" className="mt-1 text-muted-foreground font-medium">
                  {completedToday} of {totalToday} completed today ({progressPercent}%)
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/20 shadow-xs">
                <ListChecks size={24} className="text-indigo-500" />
              </View>
            </View>
          </FadeInView>

          {/* Progress Card */}
          {totalToday > 0 && (
            <FadeInView delay={40}>
              <HabitProgress
                completed={completedToday}
                total={totalToday}
                title="Today's Progress"
              />
            </FadeInView>
          )}

          {/* Habits List */}
          <View className="gap-3">
            {todayHabits.length === 0 ? (
              <FadeInView delay={60}>
                <Card className="w-full p-6 border border-border/60 bg-card/90 dark:bg-card/70 rounded-3xl backdrop-blur-md">
                  <View className="items-center gap-3">
                    <Text size="lg" className="text-muted-foreground/50">📋</Text>
                    <View>
                      <Text size="md" className="text-center font-bold">No habits scheduled for today</Text>
                      <Text size="sm" className="text-muted-foreground text-center mt-1">
                        Add a daily habit to see it here every day
                      </Text>
                    </View>
                  </View>
                </Card>
              </FadeInView>
            ) : (
              todayHabits.map((habit, index) => {
                const stats = habitStats.get(habit.id);
                return (
                  <FadeInView key={habit.id} delay={60 + index * 40}>
                    <HabitCard
                      habit={habit}
                      onComplete={() => handleToggle(habit.id)}
                      showStreak={true}
                      currentStreak={stats?.currentStreak ?? 0}
                      onPress={() => handleViewHabit(habit.id)}
                    />
                  </FadeInView>
                );
              })
            )}
          </View>

          {/* Error state */}
          {error && (
            <Card className="w-full p-4 border border-destructive/30 bg-destructive/10 rounded-2xl">
              <Text size="sm" className="text-destructive font-semibold">{error}</Text>
              <Button onPress={handleRefresh} variant="outline" className="mt-2">
                <ButtonText>Retry</ButtonText>
              </Button>
            </Card>
          )}

          {/* Add Habit Button */}
          <FadeInView delay={200}>
            <ScalePressable onPress={() => router.push('/habits/new' as any)}>
              <View className="w-full rounded-3xl border-2 border-dashed border-indigo-500/30 bg-indigo-500/15 p-4 items-center justify-center flex-row gap-2 mt-2">
                <Plus size={20} className="text-indigo-600 dark:text-indigo-400" />
                <Text size="md" className="font-bold text-indigo-600 dark:text-indigo-400">Add New Habit</Text>
              </View>
            </ScalePressable>
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}

