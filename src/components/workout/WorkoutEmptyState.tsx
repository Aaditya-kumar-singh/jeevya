import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

interface WorkoutEmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function WorkoutEmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: WorkoutEmptyStateProps) {
  return (
    <View className="px-5">
      <Card className="w-full items-center gap-2 p-8">
        <Text size="lg" className="font-semibold text-foreground">
          {title}
        </Text>
        <Text size="sm" className="text-center leading-5 text-muted-foreground">
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            className="mt-3 rounded-full bg-primary px-6 py-3 active:opacity-80">
            <Text size="sm" className="font-semibold text-primary-foreground">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
}