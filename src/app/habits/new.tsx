import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useHabits } from '@/hooks/useHabits';
import { HabitForm } from '@/components/habit';
import type { Weekday, HabitFrequency } from '@/types/habit';

export default function NewHabitScreen() {
  const router = useRouter();
  const { addHabit, refresh } = useHabits();

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
      await addHabit({
        name: data.name,
        description: data.description || undefined,
        icon: data.icon,
        color: data.color,
        frequency: data.frequency,
        days: data.days,
        targetCount: data.targetCount,
      });
      await refresh();
    },
    [addHabit, refresh],
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <HabitForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      title="Create Habit"
      submitLabel="Create Habit"
    />
  );
}
