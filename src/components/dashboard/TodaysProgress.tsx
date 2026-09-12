import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { dailyPulse } from '@/lib/mockData';

interface TodaysProgressProps {
  completed?: number;
  total?: number;
}

export function TodaysProgress({
  completed = dailyPulse.completedTasks,
  total = dailyPulse.totalTasks,
}: TodaysProgressProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between">
        <Heading size="md">Today&apos;s Progress</Heading>
        <Text size="sm" className="text-muted-foreground">
          {completed}/{total} done
        </Text>
      </View>
      <Progress value={pct} className="mt-3">
        <ProgressFilledTrack />
      </Progress>
      <Text size="sm" className="mt-2 text-muted-foreground">
        {pct}% complete — keep going.
      </Text>
    </Card>
  );
}

export default TodaysProgress;
