import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { AnimatedCheckbox } from '@/components/motion/AnimatedCheckbox';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { EmptyStateIllustration } from '@/components/visuals/EmptyStateIllustration';
import { CheckCircle, Plus } from 'lucide-react-native';
import {
  TASKS_STORAGE_KEY,
  seedTasks,
  type Task,
  type TaskFilter,
} from '@/lib/mockData';
import { loadData, saveData } from '@/lib/storage';

const filters: TaskFilter[] = ['All', 'Today', 'Done'];

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

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
      <View className="gap-4 px-5 pb-12" style={{ paddingTop: topPadding }}>

        <FadeInView delay={0}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text size="xs" className="font-semibold text-violet-500 uppercase tracking-wider">Productivity Hub</Text>
              <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">Action Tasks</Heading>
              <Text size="sm" className="mt-1 text-muted-foreground font-medium">
                {doneCount} of {tasks.length} items completed ({pct}%)
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/20">
              <CheckCircle size={24} className="text-violet-500" fill="#8B5CF6" />
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={60}>
          <Card className="w-full p-5 border border-violet-500/20 bg-card shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <Text size="xs" className="font-bold text-violet-600 dark:text-violet-400">Daily Task Completion</Text>
              <Text size="xs" className="font-bold text-muted-foreground">{pct}%</Text>
            </View>
            <AnimatedProgress value={pct} color="bg-violet-600" height={10} delay={120} />
          </Card>
        </FadeInView>

        <FadeInView delay={120}>
          <Card className="w-full p-4 border border-border/50 shadow-xs">
            <Heading size="sm" className="font-bold">Add a new task</Heading>
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <Input className="bg-muted/40 border border-border/60">
                  <InputField
                    placeholder="E.g., Complete project report..."
                    value={newTitle}
                    onChangeText={setNewTitle}
                    onSubmitEditing={addTask}
                    returnKeyType="done"
                  />
                </Input>
              </View>
              <Button
                onPress={addTask}
                isDisabled={saving || newTitle.trim().length === 0}
                className="bg-violet-600 dark:bg-violet-500 min-w-[70px]">
                <ButtonText className="font-bold">{saving ? 'Saving' : 'Add'}</ButtonText>
              </Button>
            </View>
          </Card>
        </FadeInView>

        <FadeInView delay={160}>
          <View className="flex-row gap-2">
            {filters.map((f) => {
              const active = f === filter;
              return (
                <Pressable key={f} onPress={() => setFilter(f)}>
                  <Badge variant={active ? 'secondary' : 'outline'}>
                    <BadgeText>{f}</BadgeText>
                  </Badge>
                </Pressable>
              );
            })}
          </View>
        </FadeInView>

        {loading ? (
          <Card className="w-full items-center p-6 border border-border/40">
            <ActivityIndicator color="#8B5CF6" />
            <Text size="sm" className="mt-2 text-muted-foreground">Loading tasks…</Text>
          </Card>
        ) : (
          <View className="gap-3">
            {visible.length === 0 ? (
              <EmptyStateIllustration
                title="No tasks match filter"
                message="Your action list for this view is clean and clear."
                icon="🎉"
              />
            ) : (
              visible.map((task, index) => (
                <FadeInView key={task.id} delay={index * 40}>
                  <ScalePressable onPress={() => toggle(task.id)}>
                    <Card className={`w-full p-4 border border-border/40 shadow-xs ${task.completed ? 'opacity-65' : ''}`}>
                      <View className="flex-row items-center gap-3">
                        <AnimatedCheckbox
                          checked={task.completed}
                          onPress={() => toggle(task.id)}
                          checkedColor="#8B5CF6"
                          size={22}
                          accessibilityLabel={`Mark "${task.title}" ${task.completed ? 'incomplete' : 'complete'}`}
                        />
                        <View className="flex-1">
                          <Heading
                            size="sm"
                            className={`font-semibold ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {task.title}
                          </Heading>
                          <Text size="xs" className="mt-0.5 text-muted-foreground font-medium">
                            {task.dueDate ?? 'No due date'}
                          </Text>
                        </View>
                        <Badge
                          variant={
                            task.priority === 'high'
                              ? 'destructive'
                              : task.priority === 'medium'
                                ? 'default'
                                : 'outline'
                          }>
                          <BadgeText>
                            {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Medium'}
                          </BadgeText>
                        </Badge>
                      </View>
                    </Card>
                  </ScalePressable>
                </FadeInView>
              ))
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
