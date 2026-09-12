import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { ChevronRight, Clock, Flame } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { exerciseLibrary, todaysWorkout } from '@/lib/mockData';

export default function WorkoutScreen() {
  const exercises = todaysWorkout.exerciseIds
    .map((id) => exerciseLibrary.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const [done, setDone] = useState<Record<string, boolean>>({});
  const doneCount = exercises.filter((e) => done[e.id]).length;
  const pct = exercises.length > 0 ? Math.round((doneCount / exercises.length) * 100) : 0;

  const toggle = (id: string) => setDone((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Today&apos;s workout
          </Text>
          <Heading size="xl" className="mt-1">
            {todaysWorkout.title}
          </Heading>
          <View className="mt-2 flex-row items-center gap-4">
            <View className="flex-row items-center gap-1">
              <Clock size={14} />
              <Text size="sm" className="text-muted-foreground">
                {todaysWorkout.durationMin} min
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Flame size={14} />
              <Text size="sm" className="text-muted-foreground">
                {exercises.length} exercises
              </Text>
            </View>
          </View>
        </View>

        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Heading size="md">Progress</Heading>
            <Text size="sm" className="text-muted-foreground">
              {doneCount}/{exercises.length} done
            </Text>
          </View>
          <Progress value={pct} className="mt-3">
            <ProgressFilledTrack />
          </Progress>
        </Card>

        <View className="gap-3">
          {exercises.map((exercise, index) => {
            const isDone = Boolean(done[exercise.id]);
            return (
              <Pressable key={exercise.id} onPress={() => toggle(exercise.id)}>
                <Card className={`w-full p-4 ${isDone ? 'opacity-70' : ''}`}>
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full ${
                        isDone ? 'bg-green-500' : 'bg-muted'
                      }`}>
                      <Text className={`font-bold ${isDone ? 'text-white' : ''}`}>
                        {isDone ? '✓' : index + 1}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Heading
                        size="sm"
                        className={isDone ? 'text-gray-400 line-through' : ''}>
                        {exercise.name}
                      </Heading>
                      <Text size="sm" className="text-muted-foreground">
                        {exercise.sets} sets × {exercise.reps} · {exercise.category}
                      </Text>
                    </View>
                    <Badge variant={isDone ? 'default' : 'outline'}>
                      <BadgeText>{isDone ? 'Done' : 'Tap'}</BadgeText>
                    </Badge>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Link href="/health/exercises" asChild>
          <Pressable className="flex-row items-center justify-center gap-1 rounded-full bg-primary py-3">
            <Text className="font-semibold text-primary-foreground">
              Browse exercise library
            </Text>
            <ChevronRight size={16} color="#fff" />
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

