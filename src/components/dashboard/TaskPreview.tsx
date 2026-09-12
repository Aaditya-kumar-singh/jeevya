import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { todayTasks } from '@/lib/mockData';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskPreviewProps {
  tasks?: Task[];
}

export function TaskPreview({ tasks = todayTasks }: TaskPreviewProps) {
  const open = tasks.filter((t) => !t.completed).length;

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between">
        <Heading size="md">Tasks</Heading>
        <Text size="sm" className="text-muted-foreground">
          {open} open today
        </Text>
      </View>
      <View className="mt-3 gap-2">
        {tasks.slice(0, 4).map((task) => (
          <View key={task.id} className="flex-row items-center gap-3">
            <View
              className={`h-5 w-5 items-center justify-center rounded-full border ${
                task.completed
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-400'
              }`}>
              {task.completed ? (
                <Text size="xs" className="font-bold text-white">
                  ✓
                </Text>
              ) : null}
            </View>
            <Text
              size="sm"
              className={
                task.completed
                  ? 'text-gray-400 line-through'
                  : 'text-foreground'
              }>
              {task.title}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default TaskPreview;

