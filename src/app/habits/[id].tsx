import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useHabits } from '@/hooks/useHabits';
import { HabitStreak, HabitCalendar, HabitWeeklyView } from '@/components/habit';
import { Card } from '@/components/ui/card';
import { Heading, Text, Button, ButtonText } from '@/components/ui';
import { getMonthlyHistory, type CompletionRate, type WeeklyProgress } from '@/services/habitStats';
import type { Habit, HabitLog } from '@/types/habit';

export default function HabitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getHabitByIdFn, getHabitLogsForHabit, getHabitStatsForHabit, archive, removeHabit, refresh } = useHabits();

  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [stats, setStats] = useState<{
    currentStreak: number;
    bestStreak: number;
    completionRate: CompletionRate;
    weeklyProgress: WeeklyProgress;
    totalCompletions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHabit = useCallback(async () => {
    if (!id) return;
    const foundHabit = await getHabitByIdFn(id);
    if (!foundHabit) { router.back(); return; }
    setHabit(foundHabit);
    const habitLogs = await getHabitLogsForHabit(id);
    setLogs(habitLogs);
    const habitStats = getHabitStatsForHabit(foundHabit, habitLogs);
    setStats(habitStats);
    setLoading(false);
  }, [id, getHabitByIdFn, getHabitLogsForHabit, getHabitStatsForHabit, router]);

  useEffect(() => { setLoading(true); loadHabit(); }, [loadHabit]);

  const handleEdit = useCallback(() => { if (!habit) return; router.push(`/habits/${habit.id}/edit` as any); }, [habit, router]);

  const handleArchive = useCallback(() => {
    if (!habit) return;
    Alert.alert('Archive Habit', `Archive "${habit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: async () => { await archive(habit.id); await refresh(); router.back(); } },
    ]);
  }, [habit, archive, refresh, router]);

  const handleDelete = useCallback(() => {
    if (!habit) return;
    Alert.alert('Delete Habit', `Permanently delete "${habit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await removeHabit(habit.id); await refresh(); router.back(); } },
    ]);
  }, [habit, removeHabit, refresh, router]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  if (loading || !habit) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text size="sm" className="text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  const iconMap: Record<string, string> = {
    book: '📖', dumbbell: '🏋️', droplet: '💧', brain: '🧠',
    heart: '❤️', moon: '🌙', check: '✓', target: '🎯',
    walk: '🚶', meditation: '🧘', water: '🚰', coffee: '☕',
    sun: '☀️', 'moon-star': '🌟', flame: '🔥', star: '⭐',
  };

  const monthlyHistory = stats ? getMonthlyHistory(habit, logs, currentYear, currentMonth) : null;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="px-5 pt-14">
        <Pressable onPress={() => router.back()} className="mb-4">
          <ArrowLeft size={24} color="#6B7280" />
        </Pressable>

        <Card className="p-5 mb-4">
          <View className="flex-row items-start gap-4 mb-4">
            <View className="h-12 w-12 rounded-full items-center justify-center text-2xl" style={{ backgroundColor: habit.color }}>
              <Text>{iconMap[habit.icon] ?? '📋'}</Text>
            </View>
            <View>
              <Heading size="lg">{habit.name}</Heading>
              {habit.description ? (<Text size="sm" className="text-muted-foreground mt-1">{habit.description}</Text>) : null}
            </View>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="flex-1">
              <Text size="xs" className="text-muted-foreground mb-1">Current Streak</Text>
              <HabitStreak currentStreak={stats?.currentStreak ?? 0} bestStreak={stats?.bestStreak ?? 0} size="md" />
            </View>
          </View>
        </Card>

        {stats?.weeklyProgress && (<HabitWeeklyView weeklyProgress={stats.weeklyProgress} />)}
        {monthlyHistory && (<HabitCalendar history={monthlyHistory} />)}

        <Card className="p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Heading size="sm">Completion Rate (This Year)</Heading>
            <Text size="sm" className="font-medium">{stats?.completionRate.percentage ?? 0}%</Text>
          </View>
          <View className="h-3 w-full bg-muted/30 rounded-full overflow-hidden">
            <View className="h-full bg-success rounded-full" style={{ width: `${stats?.completionRate.percentage ?? 0}%` }} />
          </View>
        </Card>

        <View className="flex-row gap-3 mt-4">
          <Button variant="outline" onPress={handleEdit} className="flex-1"><ButtonText>Edit</ButtonText></Button>
          <Button variant="outline" onPress={handleArchive} className="flex-1"><ButtonText>Archive</ButtonText></Button>
          <Button variant="destructive" onPress={handleDelete} className="flex-1"><ButtonText>Delete</ButtonText></Button>
        </View>
      </View>
    </ScrollView>
  );
}


