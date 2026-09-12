import { useState } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { AnimatedCheckbox } from '@/components/motion/AnimatedCheckbox';
import { todayTasks } from '@/lib/mockData';
import { CheckSquare } from 'lucide-react-native';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskPreviewProps {
  tasks?: Task[];
}

export function TaskPreview({ tasks = todayTasks }: TaskPreviewProps) {
  const [taskList, setTaskList] = useState(tasks);
  const openCount = taskList.filter((t) => !t.completed).length;

  const toggleTask = (id: string) => {
    setTaskList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

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
              {openCount} remaining today
            </Text>
          </View>
        </View>
        <View className="rounded-full bg-violet-500/10 px-2.5 py-1 border border-violet-500/20">
          <Text size="xs" className="font-bold text-violet-600 dark:text-violet-400">
            {taskList.length - openCount}/{taskList.length} done
          </Text>
        </View>
      </View>

      <View className="mt-4 gap-3">
        {taskList.slice(0, 4).map((task) => (
          <View key={task.id} className="flex-row items-center gap-3 py-1">
            <AnimatedCheckbox
              checked={task.completed}
              onPress={() => toggleTask(task.id)}
              checkedColor="#8B5CF6"
              size={20}
            />
            <Text
              size="sm"
              className={`flex-1 font-medium ${
                task.completed
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
            >
              {task.title}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default TaskPreview;
