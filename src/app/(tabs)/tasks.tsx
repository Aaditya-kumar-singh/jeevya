import { useState } from 'react';
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
import { TasksMatrixGraphic } from '@/components/visuals/TasksMatrixGraphic';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { WeeklyStreakMatrix } from '@/components/tasks/WeeklyStreakMatrix';
import { ListChecks } from 'lucide-react-native';
import { useTasks } from '@/hooks/useTasks';
type TaskFilter = 'All' | 'Today' | 'Done';

const filters: TaskFilter[] = ['All', 'Today', 'Done'];

export default function TasksScreen() {
  const { tasks, loading, addTask: createTask, complete, uncomplete } = useTasks();
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  const toggle = async (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    if (task.completed) await uncomplete(id);
    else await complete(id);
  };

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      await createTask({
        title,
        priority: 'medium',
        dueDate: 'Today',
      });
      setNewTitle('');
    } finally {
      setSaving(false);
    }
  };

  const visible = tasks.filter((t) => {
    if (filter === 'Done') return t.completed;
    if (filter === 'Today') return (t.dueDate ?? '').startsWith('Today');
    return true;
  });

  const doneCount = tasks.filter((t) => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <View className="flex-1 bg-violet-50/40 dark:bg-slate-950 relative">
      {/* Ambient glowing background orbs */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#8B5CF6" color2="#10B981" width={450} height={350} />
      </View>

      <ScrollView className="flex-1">
        <View
          className="gap-4 px-5 pb-12"
          style={{ zIndex: 1, paddingTop: topPadding }}
        >
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="xs" className="font-semibold text-violet-500 uppercase tracking-wider">
                  Productivity Hub
                </Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
                  Action Tasks & Routines
                </Heading>
                <Text size="sm" className="mt-1 text-muted-foreground font-medium">
                  {doneCount} of {tasks.length} items completed ({pct}%)
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/20 shadow-xs">
                <ListChecks size={24} className="text-violet-500" />
              </View>
            </View>
          </FadeInView>

          {/* Intricate Cyber Matrix SVG Graphic */}
          <FadeInView delay={40}>
            <View className="items-center my-1">
              <TasksMatrixGraphic width={350} height={130} />
            </View>
          </FadeInView>

          <FadeInView delay={80}>
            <WeeklyStreakMatrix />
          </FadeInView>

          <FadeInView delay={140}>
            <Card className="w-full p-5 border border-violet-500/25 bg-card shadow-sm rounded-3xl">
              <View className="flex-row items-center justify-between mb-2">
                <Text size="xs" className="font-bold text-violet-600 dark:text-violet-400">
                  Daily Completion Meter
                </Text>
                <Text size="xs" className="font-bold text-muted-foreground">{pct}%</Text>
              </View>
              <AnimatedProgress value={pct} color="bg-violet-600" height={10} delay={120} />
            </Card>
          </FadeInView>

          <FadeInView delay={200}>
            <Card className="w-full p-4 border border-border/50 shadow-xs rounded-3xl">
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

          <FadeInView delay={260}>
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
            <Card className="w-full items-center p-6 border border-border/40 rounded-3xl">
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
                      <Card className={`w-full p-4 border border-border/40 shadow-xs rounded-3xl ${task.completed ? 'opacity-65' : ''}`}>
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
    </View>
  );
}
