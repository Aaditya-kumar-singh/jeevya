import { Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { Check, Flame } from 'lucide-react-native';
import { Heading, Text } from '@/components/ui';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Habit } from '@/types/habit';
import { WEEKDAY_LABELS, isScheduledDay } from '@/types/habit';

interface HabitCardProps {
  habit: Habit & { isCompleted?: boolean };
  onPress?: () => void;
  onComplete?: () => void;
  showStreak?: boolean;
  currentStreak?: number;
}

function getFrequencyLabel(habit: Habit): string {
  if (habit.frequency === 'daily') {
    return 'Every day';
  }

  if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
    const dayLabels = habit.days.map((d) => WEEKDAY_LABELS[d]);
    return dayLabels.join(' ');
  }

  return '';
}

export function HabitCard({
  habit,
  onPress,
  onComplete,
  showStreak = false,
  currentStreak = 0,
}: HabitCardProps) {
  const completed = habit.isCompleted ?? false;

  const handlePress = () => {
    if (onComplete) {
      onComplete();
    } else if (onPress) {
      onPress();
    }
  };

  const iconMap: Record<string, string> = {
    book: '📖',
    dumbbell: '🏋️',
    droplet: '💧',
    brain: '🧠',
    heart: '❤️',
    moon: '🌙',
    check: '✓',
    target: '🎯',
    walk: '🚶',
    meditation: '🧘',
    water: '🚰',
    coffee: '☕',
    sun: '☀️',
    'moon-star': '🌟',
    flame: '🔥',
    star: '⭐',
  };

  const iconEmoji = iconMap[habit.icon] ?? '📋';

  return (
    <Pressable
      onPress={handlePress}
      className="w-full rounded-xl border border-border bg-card p-4"
      accessibilityLabel={
        completed
          ? `Completed: ${habit.name}`
          : `Incomplete: ${habit.name}. Tap to ${completed ? 'uncomplete' : 'complete'}.`
      }
      accessibilityRole="button"
      accessibilityState={{ checked: completed }}
    >
      <View className="flex-row items-center gap-3">
        {/* Completion indicator */}
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${
            completed
              ? 'bg-success'
              : 'bg-muted/50 border border-border'
          }`}
          accessibilityLabel={completed ? 'Completed' : 'Not completed'}
        >
          {completed ? (
            <Check size={20} color="white" strokeWidth={3} />
          ) : (
            <View className="h-4 w-4 rounded-full border border-border" />
          )}
        </View>

        {/* Icon and name */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center">
              <Text size="lg">{iconEmoji}</Text>
            </View>
            <Heading size="md" className="flex-1">
              {habit.name}
            </Heading>
          </View>

          <View className="mt-1 flex-row items-center gap-2">
            <Text size="sm" className="text-muted-foreground">
              {getFrequencyLabel(habit)}
            </Text>

            {showStreak && currentStreak > 0 && (
              <View
                className="flex-row items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5"
                accessibilityLabel={`${currentStreak} day streak`}
              >
                <Flame size={12} color="#D97706" />
                <Text size="xs" className="text-amber-600 font-medium">
                  {currentStreak} day streak
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick complete for today's list */}
        {onComplete && !completed && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            className="h-10 w-10 rounded-full bg-success/20 items-center justify-center"
            accessibilityLabel="Mark as complete"
            accessibilityRole="button"
          >
            <Check size={20} color="#16A34A" strokeWidth={2.5} />
          </Pressable>
        )}

        {onComplete && completed && (
          <View
            className="h-10 w-10 rounded-full bg-success/30 items-center justify-center"
            accessibilityLabel="Completed"
          >
            <View className="h-6 w-6 rounded-full bg-success items-center justify-center">
              <Check size={14} color="white" strokeWidth={3} />
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default HabitCard;
