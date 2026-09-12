import { View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { Heading, Text, Card } from '@/components/ui';
import { AnimatedCheckbox } from '@/components/motion/AnimatedCheckbox';
import { ScalePressable } from '@/components/motion/ScalePressable';
import type { Habit } from '@/types/habit';

interface HabitPreviewProps {
  habits: (Habit & { isCompleted: boolean })[];
  onComplete?: (habitId: string) => void;
}

export function HabitPreview({ habits, onComplete }: HabitPreviewProps) {
  const completedCount = habits.filter((h) => h.isCompleted).length;
  const totalCount = habits.length;

  if (habits.length === 0) {
    return null;
  }

  // Show up to 3 habits in preview
  const previewHabits = habits.slice(0, 3);
  const remainingCount = totalCount - previewHabits.length;

  return (
    <View className="mt-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-500">
            <Flame size={16} className="text-violet-500" fill="#8B5CF6" />
          </View>
          <Heading size="sm" className="font-bold">Today's Habits</Heading>
        </View>
        <View className="rounded-full bg-violet-500/10 px-2.5 py-0.5 border border-violet-500/20">
          <Text size="xs" className="font-bold text-violet-600 dark:text-violet-400">
            {completedCount}/{totalCount} done
          </Text>
        </View>
      </View>

      <View className="gap-2.5">
        {previewHabits.map((habit) => (
          <ScalePressable
            key={habit.id}
            onPress={() => onComplete?.(habit.id)}
          >
            <Card className="w-full p-3.5 border border-border/50 shadow-xs">
              <View className="flex-row items-center gap-3">
                <AnimatedCheckbox
                  checked={habit.isCompleted}
                  onPress={() => onComplete?.(habit.id)}
                  checkedColor="#8B5CF6"
                  size={22}
                />

                <View className="flex-1">
                  <Text
                    size="sm"
                    className={`font-medium ${
                      habit.isCompleted
                        ? 'line-through text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {habit.name}
                  </Text>
                  {habit.description ? (
                    <Text size="xs" className="text-muted-foreground/80 font-medium mt-0.5">
                      {habit.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          </ScalePressable>
        ))}

        {remainingCount > 0 && (
          <Link href="/(tabs)/tasks" asChild>
            <Pressable className="py-2 items-center">
              <Text size="xs" className="font-bold text-violet-600 dark:text-violet-400">
                + {remainingCount} more habits →
              </Text>
            </Pressable>
          </Link>
        )}
      </View>
    </View>
  );
}

export default HabitPreview;
