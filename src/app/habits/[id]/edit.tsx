import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';
import { HabitForm } from '@/components/habit';
import { Text } from '@/components/ui';
import type { Habit, Weekday, HabitFrequency } from '@/types/habit';

export default function EditHabitScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getHabitByIdFn, editHabit, refresh } = useHabits();

  const [habit, setHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHabit = useCallback(async () => {
    if (!id) {
      router.back();
      return;
    }

    const foundHabit = await getHabitByIdFn(id);
    setHabit(foundHabit);
    setLoading(false);
  }, [id, getHabitByIdFn, router]);

  useEffect(() => {
    setLoading(true);
    loadHabit();
  }, [loadHabit]);

  const handleSubmit = useCallback(
    async (data: {
      name: string;
      description: string;
      icon: string;
      color: string;
      frequency: HabitFrequency;
      days: Weekday[];
      targetCount: number;
    }) => {
      if (!habit) return;

      await editHabit(habit.id, {
        name: data.name,
        description: data.description || undefined,
        icon: data.icon,
        color: data.color,
        frequency: data.frequency,
        days: data.days,
        targetCount: data.targetCount,
      });

      await refresh();
      router.back();
    },
    [habit, editHabit, refresh, router],
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (loading || !habit) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text size="sm" className="text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  return (
    <HabitForm
      initialData={{
        name: habit.name,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
        days: habit.days,
        targetCount: habit.targetCount,
      }}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      title="Edit Habit"
      submitLabel="Save Changes"
    />
  );
}
