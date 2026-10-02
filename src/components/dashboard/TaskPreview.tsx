import { View } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { AnimatedCheckbox } from '@/components/motion/AnimatedCheckbox';
import { CheckSquare } from 'lucide-react-native';

interface Task {
  id: string;
  title: string;
}

interface TaskPreviewProps {
  tasks?: Task[];
  completedToday?: number;
  dueToday?: number;
  onComplete?: (taskId: string) => Promise<void> | void;
}

export function TaskPreview({
  tasks = [],
  completedToday = 0,
  dueToday = tasks.length,
  onComplete,
}: TaskPreviewProps) {
  const visibleTasks = tasks.slice(0, 4);
  const remainingToday = Math.max(0, dueToday - completedToday);

  return (
    <Card className="w-full p-5 border border-violet-500/20 bg-card shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
            <CheckSquare size={20} className="text-violet-500" fill="#8B5CF6" />
          </View>
          <View>
            <Heading size="md" className="font-bold">Daily Action Items</Heading>
            <Text size="xs" className="text-muted-foreground font-medium">
              {remainingToday} remaining today
            </Text>
          </View>
        </View>
        <View className="rounded-full bg-violet-500/10 px-2.5 py-1 border border-violet-500/20">
          <Text size="xs" className="font-bold text-violet-600 dark:text-violet-400">
            {completedToday}/{Math.max(dueToday, completedToday)} done
          </Text>
        </View>
      </View>

      <View className="mt-4 gap-3">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <View key={task.id} className="flex-row items-center gap-3 py-1">
              <AnimatedCheckbox
                checked={false}
                onPress={() => void onComplete?.(task.id)}
                checkedColor="#8B5CF6"
                size={20}
              />
              <Text size="sm" className="flex-1 font-medium text-foreground">
                {task.title}
              </Text>
            </View>
          ))
        ) : (
          <View className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
            <Text size="sm" className="font-medium text-muted-foreground">
              {dueToday === 0 ? 'No tasks due today.' : 'All tasks due today are complete.'}
            </Text>
            <Text
              size="xs"
              className="mt-1 font-medium text-violet-600 dark:text-violet-400"
              onPress={() => router.push('/tasks' as never)}
            >
              View tasks
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}

export default TaskPreview;
