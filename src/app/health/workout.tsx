import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ChevronRight, Clock, Dumbbell, Flame, Check, Play } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { exerciseLibrary, todaysWorkout } from '@/lib/mockData';
import { useWorkoutPrograms } from '@/hooks/useWorkoutPrograms';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { getActiveWorkout } from '@/services/workouts';
import type { Workout } from '@/types/workout';

export default function WorkoutScreen() {
  const router = useRouter();
  const { getScheduledTemplates } = useWorkoutPrograms();
  const { startFromTemplate } = useWorkoutTemplates();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  const exercises = todaysWorkout.exerciseIds
    .map((id) => exerciseLibrary.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [scheduled, setScheduled] = useState<Array<{ schedule: { id: string; templateId: string }; template: { id: string; name: string } | null }>>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getActiveWorkout(), getScheduledTemplates(new Date())]).then(([active, today]) => { if (mounted) { setActiveWorkout(active); setScheduled(today); } });
    return () => { mounted = false; };
  }, [getScheduledTemplates]);
  const doneCount = exercises.filter((e) => done[e.id]).length;
  const pct = exercises.length > 0 ? Math.round((doneCount / exercises.length) * 100) : 0;

  const toggle = (id: string) => setDone((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <View className="flex-1 bg-rose-50/40 dark:bg-slate-950 relative">
      {/* Ambient background SVG orbs */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#F43F5E" color2="#E11D48" width={450} height={350} />
      </View>

      <ScrollView className="flex-1">
        <View className="gap-4 px-5 pb-12" style={{ zIndex: 1, paddingTop: topPadding }}>
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="xs" className="font-semibold text-rose-500 uppercase tracking-wider">
                  Today’s Hyper-Focus Session
                </Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
                  {todaysWorkout.title}
                </Heading>
                <View className="mt-2 flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-0.5 border border-rose-500/25">
                    <Clock size={12} className="text-rose-500" />
                    <Text size="xs" className="font-bold text-rose-600 dark:text-rose-400">
                      {todaysWorkout.durationMin} min
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-0.5 border border-orange-500/25">
                    <Flame size={12} className="text-orange-500" />
                    <Text size="xs" className="font-bold text-orange-600 dark:text-orange-400">
                      {exercises.length} exercises
                    </Text>
                  </View>
                </View>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/20 shadow-xs">
                <Dumbbell size={24} className="text-rose-500" />
              </View>
            </View>
          </FadeInView>

          {scheduled.length > 0 ? <View className="gap-2"><Text size="sm" className="font-bold">Today&apos;s scheduled workouts</Text>{scheduled.map(({schedule,template}) => template ? <ScalePressable key={schedule.id} onPress={()=>{void startFromTemplate(template.id).then((s)=>{setActiveWorkout(s as unknown as Workout);router.push({pathname:'/health/workout-session/[id]',params:{id:s.id}} as never);});}}><Card className="p-4 rounded-3xl border border-border"><View className="flex-row items-center justify-between"><View><Heading size="sm" className="font-bold">{template.name}</Heading><Text size="xs" className="text-muted-foreground">Scheduled today</Text></View><Play size={18}/></View></Card></ScalePressable> : null)}</View> : null}

          {activeWorkout ? (
            <Link href={{ pathname: '/health/workout-session/[id]', params: { id: activeWorkout.id } } as never} asChild>
              <ScalePressable>
                <View className="flex-row items-center justify-between rounded-3xl bg-rose-500 p-4 shadow-md shadow-rose-500/30">
                  <View>
                    <Text size="xs" className="font-semibold text-white/80 uppercase tracking-wider">Active workout</Text>
                    <Text size="md" className="mt-0.5 font-bold text-white">Resume {activeWorkout.name}</Text>
                  </View>
                  <ChevronRight size={20} color="#fff" />
                </View>
              </ScalePressable>
            </Link>
          ) : null}

          {/* Progress Card */}
          <FadeInView delay={40}>
            <Card className="w-full p-5 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md">
              <View className="flex-row items-center justify-between">
                <Heading size="md" className="font-bold">Workout Progress</Heading>
                <Text size="xs" className="font-bold text-rose-500">
                  {doneCount} of {exercises.length} completed ({pct}%)
                </Text>
              </View>
              <Progress value={pct} className="h-2.5 rounded-full bg-rose-100 dark:bg-rose-950 mt-3">
                <ProgressFilledTrack className="bg-rose-500" />
              </Progress>
            </Card>
          </FadeInView>

          {/* Exercise List */}
          <View className="gap-3">
            {exercises.map((exercise, index) => {
              const isDone = Boolean(done[exercise.id]);
              return (
                <FadeInView key={exercise.id} delay={80 + index * 40}>
                  <ScalePressable onPress={() => toggle(exercise.id)}>
                    <Card className={`w-full p-4 border border-border/60 bg-card/90 dark:bg-card/70 shadow-xs rounded-3xl backdrop-blur-md ${isDone ? 'opacity-70' : ''}`}>
                      <View className="flex-row items-center gap-3.5">
                        <View
                          className={`h-11 w-11 items-center justify-center rounded-2xl ${
                            isDone ? 'bg-emerald-500 shadow-xs shadow-emerald-500/30' : 'bg-rose-500/15'
                          }`}>
                          {isDone ? (
                            <Check size={20} className="text-white" />
                          ) : (
                            <Text size="sm" className="font-extrabold text-rose-500">
                              {index + 1}
                            </Text>
                          )}
                        </View>
                        <View className="flex-1">
                          <Heading
                            size="sm"
                            className={`font-bold ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                            {exercise.name}
                          </Heading>
                          <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
                            {exercise.sets} sets × {exercise.reps} reps · {exercise.category}
                          </Text>
                        </View>
                        <Badge variant={isDone ? 'default' : 'outline'} className={isDone ? 'bg-emerald-500/15 border-emerald-500/30' : ''}>
                          <BadgeText className={isDone ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                            {isDone ? 'Done' : 'Tap to complete'}
                          </BadgeText>
                        </Badge>
                      </View>
                    </Card>
                  </ScalePressable>
                </FadeInView>
              );
            })}
          </View>

          <FadeInView delay={205}>
            <Link href="/health/workout-history" asChild><ScalePressable><View className="flex-row items-center justify-center gap-2 rounded-3xl border border-border bg-card p-4 mt-2"><Text className="font-bold text-foreground size-md">Workout History</Text><ChevronRight size={18}/></View></ScalePressable></Link>
          </FadeInView>

          <FadeInView delay={208}>
            <Link href={"/health/workout-progression" as never} asChild><ScalePressable><View className="flex-row items-center justify-center gap-2 rounded-3xl border border-border bg-card p-4 mt-2"><Text className="font-bold text-foreground size-md">Workout Progression</Text><ChevronRight size={18}/></View></ScalePressable></Link>
          </FadeInView>

          <FadeInView delay={210}>
            <Link href="/health/workout-programs" asChild><ScalePressable><View className="flex-row items-center justify-center gap-2 rounded-3xl border border-border bg-card p-4 mt-2"><Text className="font-bold text-foreground size-md">Workout Programs</Text><ChevronRight size={18}/></View></ScalePressable></Link>
          </FadeInView>

          {/* Template Navigation Link */}
          <FadeInView delay={220}>
            <Link href="/health/workout-templates" asChild>
              <ScalePressable>
                <View className="flex-row items-center justify-center gap-2 rounded-3xl border border-border bg-card p-4 mt-2">
                  <Text className="font-bold text-foreground size-md">Workout Templates</Text>
                  <ChevronRight size={18} />
                </View>
              </ScalePressable>
            </Link>
          </FadeInView>

          {/* Library Navigation Link */}
          <FadeInView delay={240}>
            <Link href="/health/exercises" asChild>
              <ScalePressable>
                <View className="flex-row items-center justify-center gap-2 rounded-3xl bg-rose-500 p-4 shadow-md shadow-rose-500/30 mt-2">
                  <Text className="font-bold text-white size-md">
                    Browse Full Exercise Library
                  </Text>
                  <ChevronRight size={18} color="#fff" />
                </View>
              </ScalePressable>
            </Link>
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}



