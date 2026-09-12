import { View } from 'react-native';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Heading, Text } from '@/components/ui';
import { Card } from '@/components/ui/card';

interface HabitProgressProps {
  completed: number;
  total: number;
  title?: string;
}

export function HabitProgress({ completed, total, title }: HabitProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between">
        <Heading size="md">{title ?? "Today's Progress"}</Heading>
        <Text size="sm" className="text-muted-foreground">
          {completed}/{total}
        </Text>
      </View>
      <Progress value={percentage} className="mt-3 w-full">
        <ProgressFilledTrack />
      </Progress>
      <View className="mt-2 flex-row items-center justify-between">
        <Text size="xs" className="text-muted-foreground">
          {percentage}% complete
        </Text>
        <Text size="xs" className="text-muted-foreground">
          {completed} of {total} habits
        </Text>
      </View>
    </Card>
  );
}

export default HabitProgress;
