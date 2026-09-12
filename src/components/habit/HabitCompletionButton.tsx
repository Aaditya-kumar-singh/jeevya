import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Text } from '@/components/ui';

interface HabitCompletionButtonProps {
  completed: boolean;
  onComplete: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const buttonSizes = {
  sm: {
    container: 'h-8 w-8',
    check: 16,
  },
  md: {
    container: 'h-10 w-10',
    check: 20,
  },
  lg: {
    container: 'h-12 w-12',
    check: 24,
  },
};

export function HabitCompletionButton({
  completed,
  onComplete,
  size = 'md',
  disabled = false,
}: HabitCompletionButtonProps) {
  const s = buttonSizes[size];

  return (
    <Pressable
      onPress={onComplete}
      disabled={disabled || completed}
      className={`${s.container} rounded-full items-center justify-center ${
        completed
          ? 'bg-success'
          : disabled
          ? 'bg-muted/30 cursor-not-allowed'
          : 'bg-success/20 active:bg-success/30'
      }`}
      accessibilityLabel={completed ? 'Completed' : 'Mark as complete'}
      accessibilityRole="button"
      accessibilityState={{ checked: completed }}
    >
      {completed ? (
        <View className="h-5 w-5 rounded-full bg-white/30 items-center justify-center">
          <Check size={s.check - 4} color="white" strokeWidth={3} />
        </View>
      ) : (
        <View className="h-4 w-4 rounded-full border-2 border-success" />
      )}
    </Pressable>
  );
}

export default HabitCompletionButton;
