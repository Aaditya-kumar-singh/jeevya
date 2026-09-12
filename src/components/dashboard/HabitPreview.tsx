import { View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Check } from 'lucide-react-native';
import { HabitCard } from '@/components/habit';
import { Heading, Text, Card } from '@/components/ui';
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
      <View className="flex-row items-center justify-between mb-2">
        <Heading size="sm">Today's Habits</Heading>
        <Text size="xs" className="text-muted-foreground">
          {completedCount}/{totalCount} completed
        </Text>
      </View>

      <View className="gap-2">
        {previewHabits.map((habit) => (
          <Pressable
            key={habit.id}
            onPress={() => onComplete?.(habit.id)}
            className="w-full"
          >
            <Card className="w-full p-3">
              <View className="flex-row items-center gap-3">
                {/* Completion indicator */}
                <View
                  className={`h-6 w-6 rounded-full flex-row items-center justify-center ${
                    habit.isCompleted
                      ? 'bg-success'
                      : 'bg-muted/50 border border-border'
                  }`}
                >
                  {habit.isCompleted ? (
                    <Check size={14} color="white" strokeWidth={3} />
                  ) : (
                    <View className="h-3 w-3 rounded-full border border-border" />
                  )}
                </View>

                <View className="flex-1">
                  <Text
                    size="sm"
                    className={habit.isCompleted ? 'text-muted-foreground line-through' : ''}
                  >
                    {habit.name}
                  </Text>
                </View>

                {/* Quick action */}
                {!habit.isCompleted && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onComplete?.(habit.id);
                    }}
                    className="h-7 w-7 rounded-full bg-success/20 items-center justify-center"
                  >
                    <Check size={14} color="#16A34A" strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>
            </Card>
          </Pressable>
        ))}

        {remainingCount > 0 && (
          <Link href={"/habits" as any} asChild>
            <Pressable>
              <Card className="w-full p-3">
                <View className="flex-row items-center justify-between">
                  <Text size="sm" className="text-muted-foreground">
                    +{remainingCount} more habit{remainingCount > 1 ? 's' : ''}
                  </Text>
                  <Text size="xs" className="text-primary">
                    View all →
                  </Text>
                </View>
              </Card>
            </Pressable>
          </Link>
        )}
      </View>
    </View>
  );
}

export default HabitPreview;
