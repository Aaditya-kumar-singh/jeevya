import { View } from 'react-native';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import { dailyPulse } from '@/lib/mockData';
import { Target } from 'lucide-react-native';

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
    <Card className="w-full p-5 border border-indigo-500/20 bg-card shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15">
            <Target size={20} className="text-indigo-500" />
          </View>
          <View>
            <Heading size="md" className="font-bold">Today&apos;s Goal Progress</Heading>
            <Text size="xs" className="text-muted-foreground font-medium">
              Overall habit & task execution
            </Text>
          </View>
        </View>
        <View className="rounded-full bg-indigo-500/10 px-2.5 py-1 border border-indigo-500/20">
          <Text size="xs" className="font-bold text-indigo-600 dark:text-indigo-400">
            {pct}% Complete
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <AnimatedProgress value={pct} height={10} color="bg-indigo-600" />
      </View>

      <View className="mt-2.5 flex-row justify-between items-center">
        <Text size="xs" className="text-muted-foreground font-medium">
          {completed} of {total} targets completed
        </Text>
        <Text size="xs" className="font-bold text-indigo-600 dark:text-indigo-400">
          {total - completed} remaining
        </Text>
      </View>
    </Card>
  );
}

export default TodaysProgress;
