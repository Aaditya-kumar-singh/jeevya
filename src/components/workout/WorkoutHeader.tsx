import { Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { Heading } from '@/components/ui/heading';

interface WorkoutHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function WorkoutHeader({ title, onBack, rightAction }: WorkoutHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-5 pb-2 pt-14">
      <View className="w-11">
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted">
            <ChevronLeft size={24} />
          </Pressable>
        ) : null}
      </View>
      <Heading size="lg" className="flex-1 truncate px-2 text-center">
        {title}
      </Heading>
      <View className="w-11 items-end">{rightAction}</View>
    </View>
  );
}