import { View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { Card } from '@/components/ui/card';

interface HabitStreakProps {
  currentStreak: number;
  bestStreak: number;
  size?: 'sm' | 'md' | 'lg';
}

const streakSizes = {
  sm: {
    icon: 14,
    text: 'xs' as const,
    container: 'py-1 px-2',
  },
  md: {
    icon: 18,
    text: 'sm' as const,
    container: 'py-1.5 px-3',
  },
  lg: {
    icon: 24,
    text: 'md' as const,
    container: 'py-2 px-4',
  },
};

export function HabitStreak({ currentStreak, bestStreak, size = 'md' }: HabitStreakProps) {
  const s = streakSizes[size];

  if (currentStreak === 0 && bestStreak === 0) {
    return (
      <View className={`flex-row items-center gap-2 ${s.container}`}>
        <Flame size={s.icon} color="#9CA3AF" />
        <Text size={s.text} className="text-muted-foreground">
          No streak yet
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      {/* Current streak */}
      <View
        className={`flex-row items-center gap-1.5 rounded-full bg-amber-500/10 ${s.container}`}
        accessibilityLabel={`Current streak: ${currentStreak} days`}
      >
        <Flame size={s.icon} color="#D97706" />
        <Text size={s.text} className="font-medium text-amber-600">
          {currentStreak}
        </Text>
        <Text size={s.text} className="text-amber-600/70">
          day{currentStreak !== 1 ? 's' : ''} streak
        </Text>
      </View>

      {/* Best streak */}
      {bestStreak > currentStreak && (
        <View className="flex-row items-center gap-1.5">
          <Text size={s.text} className="text-muted-foreground">
            Best:
          </Text>
          <Text size={s.text} className="font-medium">
            {bestStreak}
          </Text>
        </View>
      )}
    </View>
  );
}

export default HabitStreak;
