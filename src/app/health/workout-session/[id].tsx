import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, MoreVertical, Pause, Play, Plus, Trash2, X } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { ExercisePicker } from '@/components/workout/ExercisePicker';
import { RestTimer } from '@/components/workout/RestTimer';
import { WorkoutEmptyState } from '@/components/workout/WorkoutEmptyState';
import { WorkoutHeader } from '@/components/workout/WorkoutHeader';
import { WorkoutProgress } from '@/components/workout/WorkoutProgress';
import { WorkoutSetRow } from '@/components/workout/WorkoutSetRow';
import { WorkoutSummary } from '@/components/workout/WorkoutSummary';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { getExercisesByIds, type Exercise } from '@/services/exercises';
import { addExerciseToWorkout, getPreviousExercisePerformance, startWorkout } from '@/services/workouts';
import type { WorkoutSet } from '@/types/workout';

function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    workout, loading, error, completing, paused, pause, resume, elapsedSeconds,
    currentExercise, currentIndex, setCurrentIndex, exercises, totalSets, completedSets,
    restRemaining, restComplete, restActive, addRestTime, skipRest, completeSet,
    updateSet, addSet, finish, discard, newPersonalRecords,
  } = useWorkoutSession(id);

  const [metas, setMetas] = useState<Map<string, Exercise>>(new Map());
  const [prevSets, setPrevSets] = useState<WorkoutSet[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const idsKey = useMemo(
    () => (workout ? workout.exercises.map((e) => e.exerciseId).join(',') : ''),
    [workout],
  );

  useEffect(() => {
    if (!idsKey) return;
    let active = true;
    getExercisesByIds(idsKey.split(',')).then((map) => {
      if (active) setMetas(map);
    });
    return () => {
      active = false;
    };
  }, [idsKey]);

  const currentExerciseId = currentExercise?.exerciseId ?? null;
  useEffect(() => {
    if (!currentExerciseId) return;
    let active = true;
    getPreviousExercisePerformance(currentExerciseId).then((sets) => {
      if (active) setPrevSets(sets);
    });
    return () => {
      active = false;
    };
  }, [currentExerciseId]);

  const meta = currentExercise ? metas.get(currentExercise.exerciseId) : undefined;
  const allCurrentDone = currentExercise
    ? currentExercise.sets.length > 0 && currentExercise.sets.every((s) => s.completed)
    : false;
  const nextExercise = allCurrentDone ? exercises[currentIndex + 1] ?? null : null;
  const firstIncomplete = currentExercise?.sets.find((s) => !s.completed) ?? null;
  const lastPrev = prevSets.length > 0 ? prevSets[prevSets.length - 1] : null;
  const defaultWeight = currentExercise?.weightTarget ?? lastPrev?.weight ?? null;

  const doFinish = useCallback(async () => {
    await finish();
  }, [finish]);

  const confirmFinish = useCallback(() => {
    const incomplete = totalSets - completedSets;
    if (incomplete > 0) {
      Alert.alert(
        'Finish workout?',
        `You still have ${incomplete} incomplete set${incomplete === 1 ? '' : 's'}.`,
        [
          { text: 'Continue Workout', style: 'cancel' },
          { text: 'Finish Workout', onPress: () => void doFinish() },
        ],
      );
    } else {
      void doFinish();
    }
  }, [totalSets, completedSets, doFinish]);

  const confirmDiscard = useCallback(() => {
    Alert.alert('Discard workout?', 'Your workout progress will be lost.', [
      { text: 'Keep Workout', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          void discard();
          router.replace('/(tabs)');
        },
      },
    ]);
  }, [discard, router]);

  const onPickerClose = useCallback(
    async (selected: Exercise[]) => {
      setPickerVisible(false);
      if (!workout) return;
      for (const exercise of selected) {
        if (workout.exercises.some((e) => e.exerciseId === exercise.id)) continue;
        await addExerciseToWorkout(workout.id, {
          exerciseId: exercise.id,
          setsTarget: 3,
          repsTarget: 10,
          weightTarget: null,
          restSeconds: 90,
        });
      }
      await startWorkout(workout.id);
    },
    [workout],
  );

    const exerciseNames = useMemo(
    () =>
      new Map(exercises.map((e) => [e.exerciseId, metas.get(e.exerciseId)?.name ?? e.exerciseId])),
    [exercises, metas],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text size="sm" className="mt-3 text-muted-foreground">Loading workout…</Text>
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View className="flex-1 bg-background">
        <WorkoutHeader title="Workout" onBack={() => router.back()} />
        <WorkoutEmptyState
          title="Couldn't load workout"
          message={error ?? 'Something went wrong. Check your connection and try again.'}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  if (workout.status === 'completed') {
    return (
      <WorkoutSummary
        workout={workout}
        newPersonalRecords={newPersonalRecords}
        exerciseNames={exerciseNames}
        onDone={() => router.replace('/health/workout-history' as never)}
      />
    );
  }

  return (
    <SessionBody
      workoutName={workout.name}
      paused={paused}
      onPause={pause}
      onResume={resume}
      elapsedSeconds={elapsedSeconds}
      completedSets={completedSets}
      totalSets={totalSets}
      meta={meta ?? null}
      currentExercise={currentExercise}
      prevSets={prevSets}
      defaultWeight={defaultWeight}
      allCurrentDone={allCurrentDone}
      nextExerciseName={nextExercise ? metas.get(nextExercise.exerciseId)?.name ?? null : null}
      onNextExercise={() => setCurrentIndex(currentIndex + 1)}
      onUpdateSet={(setId, patch) =>
        currentExercise ? void updateSet(currentExercise.id, setId, patch) : undefined
      }
      onCompleteSet={(setId) =>
        currentExercise ? void completeSet(currentExercise.id, setId) : undefined
      }
      onAddSet={() => (currentExercise ? void addSet(currentExercise.id) : undefined)}
      restActive={restActive && !paused}
      restRemaining={restRemaining}
      restComplete={restComplete}
      onAddRest={addRestTime}
      onSkipRest={skipRest}
      completing={completing}
      firstIncompleteId={firstIncomplete?.id ?? null}
      onFinish={confirmFinish}
      onDiscard={confirmDiscard}
      menuVisible={menuVisible}
      setMenuVisible={setMenuVisible}
      pickerVisible={pickerVisible}
      setPickerVisible={setPickerVisible}
      onPickerClose={(selected) => void onPickerClose(selected)}
      excludedIds={exercises.map((e) => e.exerciseId)}
    />
  );
}

interface SessionBodyProps {
  workoutName: string;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  elapsedSeconds: number;
  completedSets: number;
  totalSets: number;
  meta: { name: string; body_part: string | null; equipment: string | null } | null;
  currentExercise: import('@/types/workout').WorkoutExercise | null;
  prevSets: WorkoutSet[];
  defaultWeight: number | null;
  allCurrentDone: boolean;
  nextExerciseName: string | null;
  onNextExercise: () => void;
  onUpdateSet: (setId: string, patch: Partial<WorkoutSet>) => void;
  onCompleteSet: (setId: string) => void;
  onAddSet: () => void;
  restActive: boolean;
  restRemaining: number;
  restComplete: boolean;
  onAddRest: (seconds: number) => void;
  onSkipRest: () => void;
  completing: boolean;
  firstIncompleteId: string | null;
  onFinish: () => void;
  onDiscard: () => void;
  menuVisible: boolean;
  setMenuVisible: (visible: boolean) => void;
  pickerVisible: boolean;
  setPickerVisible: (visible: boolean) => void;
  onPickerClose: (selected: Exercise[]) => void;
  excludedIds: string[];
}

function SessionBody({
  workoutName,
  paused,
  onPause,
  onResume,
  elapsedSeconds,
  completedSets,
  totalSets,
  meta,
  currentExercise,
  prevSets,
  defaultWeight,
  allCurrentDone,
  nextExerciseName,
  onNextExercise,
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  restActive,
  restRemaining,
  restComplete,
  onAddRest,
  onSkipRest,
  completing,
  firstIncompleteId,
  onFinish,
  onDiscard,
  menuVisible,
  setMenuVisible,
  pickerVisible,
  setPickerVisible,
  onPickerClose,
  excludedIds,
}: SessionBodyProps) {
  const insets = useSafeAreaInsets();
  const metaLine = [meta?.body_part, meta?.equipment].filter(Boolean).join(' · ');

  return (
    <View className="flex-1 bg-background">
      <WorkoutHeader
        title={workoutName}
        onBack={onDiscard}
        rightAction={
          <Pressable
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Workout options"
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted">
            <MoreVertical size={22} />
          </Pressable>
        }
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-4 px-5 pt-2">
          <View className="items-center">
            <Text className="text-4xl font-bold tabular-nums text-foreground">
              {formatClock(elapsedSeconds)}
            </Text>
            <Text size="xs" className="mt-1 text-muted-foreground">
              {paused ? 'Paused' : 'Workout duration'}
            </Text>
          </View>

          {paused ? (
            <Button size="default" variant="outline" onPress={onResume} className="w-full">
              <ButtonText>Resume Workout</ButtonText>
            </Button>
          ) : null}

          <WorkoutProgress completed={completedSets} total={totalSets} />

          {currentExercise ? (
            <Card className="gap-2 p-4">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1">
                  <Heading size="md" className="uppercase">
                    {meta?.name ?? 'Exercise'}
                  </Heading>
                  {metaLine ? (
                    <Text size="xs" className="text-muted-foreground">
                      {metaLine}
                    </Text>
                  ) : null}
                </View>
                <Badge variant="secondary">
                  <BadgeText>
                    {currentExercise.sets.filter((s) => s.completed).length}/
                    {currentExercise.sets.length}
                  </BadgeText>
                </Badge>
              </View>

              {prevSets.length > 0 ? (
                <View className="rounded-xl bg-muted p-3">
                  <Text size="xs" className="mb-1 font-medium text-muted-foreground">
                    Last time
                  </Text>
                  {prevSets.slice(0, 3).map((s) => (
                    <Text key={s.id} size="xs" className="text-foreground">
                      {s.weight ?? '—'} {s.weightUnit} × {s.reps ?? '—'}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text size="xs" className="text-muted-foreground">
                  First time doing this exercise
                </Text>
              )}

              <View className="flex-row items-center gap-2 px-1 pt-1">
                <Text size="xs" className="w-7 text-center text-muted-foreground">SET</Text>
                <Text size="xs" className="flex-1 text-center text-muted-foreground">KG</Text>
                <Text size="xs" className="w-6" />
                <Text size="xs" className="w-16 text-center text-muted-foreground">REPS</Text>
                <Text size="xs" className="w-12" />
              </View>
              {currentExercise.sets.map((set) => (
                <WorkoutSetRow
                  key={set.id}
                  set={set}
                  defaultWeight={defaultWeight}
                  onUpdate={(patch) => onUpdateSet(set.id, patch)}
                />
              ))}
              <Pressable
                onPress={onAddSet}
                accessibilityRole="button"
                accessibilityLabel="Add set"
                className="items-center justify-center rounded-xl border border-dashed border-border py-3 active:opacity-70">
                <View className="flex-row items-center gap-1">
                  <Plus size={14} />
                  <Text size="sm" className="font-medium text-foreground">Add Set</Text>
                </View>
              </Pressable>
            </Card>
          ) : null}

          <RestTimer
            active={restActive}
            remaining={restRemaining}
            paused={paused}
            onAdd={onAddRest}
            onSkip={onSkipRest}
          />

          {allCurrentDone && nextExerciseName ? (
            <Pressable
              onPress={onNextExercise}
              accessibilityRole="button"
              accessibilityLabel="Continue to next exercise"
              className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4 active:opacity-80">
              <View>
                <Text size="xs" className="text-muted-foreground">
                  Exercise complete ✓ — Next
                </Text>
                <Text size="sm" className="font-semibold text-foreground">
                  {nextExerciseName}
                </Text>
              </View>
              <ChevronRight size={18} />
            </Pressable>
          ) : null}

          {allCurrentDone && !nextExerciseName ? (
            <Text size="sm" className="text-center text-muted-foreground">
              All exercises complete — finish your workout.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View 
        className="gap-3 border-t border-border bg-background px-5 pt-4"
        style={{ paddingBottom: Math.max(32, insets.bottom + 16) }}
      >
        {firstIncompleteId ? (
          <Button
            size="lg"
            variant="default"
            disabled={completing}
            onPress={() => onCompleteSet(firstIncompleteId)}
            className="w-full">
            <ButtonText>{completing ? 'Saving…' : 'Complete Set'}</ButtonText>
          </Button>
        ) : null}
        <Button size="lg" variant="outline" onPress={onFinish} className="w-full">
          <ButtonText>Finish Workout</ButtonText>
        </Button>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setMenuVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close menu">
          <View className="mx-5 mt-24 rounded-2xl border border-border bg-card p-2">
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                if (paused) onResume();
                else onPause();
              }}
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume workout' : 'Pause workout'}
              className="h-12 flex-row items-center gap-3 rounded-xl px-4 active:bg-muted">
              {paused ? <Play size={18} /> : <Pause size={18} />}
              <Text size="sm" className="text-foreground">
                {paused ? 'Resume workout' : 'Pause workout'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                setPickerVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Add exercise"
              className="h-12 flex-row items-center gap-3 rounded-xl px-4 active:bg-muted">
              <Plus size={18} />
              <Text size="sm" className="text-foreground">Add exercise</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                onDiscard();
              }}
              accessibilityRole="button"
              accessibilityLabel="Discard workout"
              className="h-12 flex-row items-center gap-3 rounded-xl px-4 active:bg-muted">
              <Trash2 size={18} color="#DC2626" />
              <Text size="sm" className="text-red-600">Discard workout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ExercisePicker
        visible={pickerVisible}
        onClose={onPickerClose}
        excludedIds={excludedIds}
      />
    </View>
  );
}