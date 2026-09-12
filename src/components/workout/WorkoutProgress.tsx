import { Text, View } from 'react-native';

import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text as UIText } from '@/components/ui/text';

interface WorkoutProgressProps {
  completed: number;
  total: number;
}

export function WorkoutProgress({ completed, total }: WorkoutProgressProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <UIText size="sm" className="text-muted-foreground">
          Progress
        </UIText>
        <UIText size="sm" className="font-medium text-foreground">
          {completed}/{total} sets
        </UIText>
      </View>
      <Progress value={pct} className="mt-2">
        <ProgressFilledTrack />
      </Progress>
    </View>
  );
}