import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import {
  TASKS_STORAGE_KEY,
  seedTasks,
  type Task,
  type TaskFilter,
} from '@/lib/mockData';
import { loadData, saveData } from '@/lib/storage';

const filters: TaskFilter[] = ['All', 'Today', 'Done'];

function toBadgePriority(priority: Task['priority']): 'High' | 'Medium' | 'Low' {
  if (priority === 'high') return 'High';
  if (priority === 'low') return 'Low';
  return 'Medium';
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await loadData<Task[]>(TASKS_STORAGE_KEY, seedTasks);
      if (mounted) {
        setTasks(stored);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = async (next: Task[]) => {
    setTasks(next);
    await saveData(TASKS_STORAGE_KEY, next);
  };

  const toggle = (id: string) =>
    persist(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    const task: Task = {
      id: `${Date.now()}`,
      title,
      completed: false,
      priority: 'medium',
      dueDate: 'Today',
      createdAt: new Date().toISOString(),
    };
    await persist([task, ...tasks]);
    setNewTitle('');
    setSaving(false);
  };

  const visible = tasks.filter((t) => {
    if (filter === 'Done') return t.completed;
    if (filter === 'Today') return (t.dueDate ?? '').startsWith('Today');
    return true;
  });

  const doneCount = tasks.filter((t) => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Productivity
          </Text>
          <Heading size="xl" className="mt-1">
            Tasks
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {doneCount}/{tasks.length} done · {pct}%
          </Text>
        </View>

        <Card className="w-full p-4">
          <Progress value={pct} className="w-full">
            <ProgressFilledTrack />
          </Progress>
        </Card>

        <Card className="w-full p-4">
          <Heading size="sm">Add a task</Heading>
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Input>
                <InputField
                  placeholder="Go to gym"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  onSubmitEditing={addTask}
                  returnKeyType="done"
                />
              </Input>
            </View>
            <Button
              onPress={addTask}
              isDisabled={saving || newTitle.trim().length === 0}>
              <ButtonText>{saving ? 'Saving' : 'Add'}</ButtonText>
            </Button>
          </View>
        </Card>

        <View className="flex-row gap-2">
          {filters.map((f) => {
            const active = f === filter;
            return (
              <Pressable key={f} onPress={() => setFilter(f)}>
                <Badge variant={active ? 'default' : 'outline'}>
                  <BadgeText>{f}</BadgeText>
                </Badge>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <Card className="w-full items-center p-6">
            <ActivityIndicator />
            <Text size="sm" className="mt-2 text-muted-foreground">
              Loading tasks…
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {visible.map((task) => (
            <Pressable key={task.id} onPress={() => toggle(task.id)}>
              <Card className={`w-full p-4 ${task.completed ? 'opacity-70' : ''}`}>
                <View className="flex-row items-center gap-3">
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full border ${
                      task.completed ? 'border-green-500 bg-green-500' : 'border-gray-400'
                    }`}>
                    {task.completed ? (
                      <Text size="xs" className="font-bold text-white">
                        ✓
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Heading
                      size="sm"
                      className={task.completed ? 'text-gray-400 line-through' : ''}>
                      {task.title}
                    </Heading>
                    <Text size="sm" className="mt-0.5 text-muted-foreground">
                      {task.dueDate ?? 'No due date'}
                    </Text>
                  </View>
                  <Badge
                    variant={
                      task.priority === 'high'
                        ? 'destructive'
                        : task.priority === 'medium'
                          ? 'default'
                          : 'secondary'
                    }>
                    <BadgeText>{toBadgePriority(task.priority)}</BadgeText>
                  </Badge>
                </View>
              </Card>
            </Pressable>
          ))}
            {visible.length === 0 ? (
              <Card className="w-full p-4">
                <Text size="sm" className="text-muted-foreground">
                  No tasks in this view.
                </Text>
              </Card>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

