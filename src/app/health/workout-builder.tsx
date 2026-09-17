import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ExercisePicker } from '@/components/workout/ExercisePicker';
import { WorkoutExerciseCard } from '@/components/workout/WorkoutExerciseCard';
import { WorkoutHeader } from '@/components/workout/WorkoutHeader';
import { WorkoutEmptyState } from '@/components/workout/WorkoutEmptyState';
import { useWorkout } from '@/hooks/useWorkout';

import { getExercisesByIds, type Exercise } from '@/services/exercises';
import type { Workout, WorkoutExercise } from '@/types/workout';

type ExercisePatch = Partial<
  Pick<WorkoutExercise, 'setsTarget' | 'repsTarget' | 'weightTarget' | 'restSeconds' | 'notes'>
>;

export default function WorkoutBuilderScreen() {
  const params = useLocalSearchParams<{ id?: string; exerciseId?: string }>();
  const router = useRouter();
  const {
    workout,
    loading,
    saving,
    error,
    addExercise,
    removeExercise,
    duplicateExercise,
    updateExercise,
    moveExercise,
    updateName,
    save,
    start,
    deleteWorkout,
    addTemplate,
  } = useWorkout(params.id ?? null);

  const [name, setName] = useState('');
  const [metas, setMetas] = useState<Map<string, Exercise>>(new Map());
  const [pickerVisible, setPickerVisible] = useState(false);
  const preselectRef = useRef<string | null>(params.exerciseId ?? null);
  const workoutRef = useRef(workout);
  // eslint-disable-next-line react-hooks/refs
  workoutRef.current = workout;

  // On unmount: remove an abandoned draft (planned, empty, default name) so
  // repeated visits to the builder don't accumulate junk rows in storage.
  useEffect(
    () => () => {
      const draft = workoutRef.current;
      if (
        draft &&
        draft.status === 'planned' &&
        draft.exercises.length === 0 &&
        draft.name === 'New Workout'
      ) {
        void deleteWorkout(draft.id);
      }
    },
    [deleteWorkout],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (workout) setName(workout.name);
  }, [workout]);

  useEffect(() => {
    if (!workout) return;
    let active = true;
    const ids = workout.exercises.map((e) => e.exerciseId);
    getExercisesByIds(ids).then((map) => {
      if (active) setMetas(map);
    });
    return () => {
      active = false;
    };
  }, [workout]);

  useEffect(() => {
    if (!workout || !preselectRef.current) return;
    const exerciseId = preselectRef.current;
    preselectRef.current = null;
    if (!workout.exercises.some((e) => e.exerciseId === exerciseId)) {
      void addExercise({
        exerciseId,
        setsTarget: 3,
        repsTarget: 10,
        weightTarget: null,
        restSeconds: 90,
      });
    }
  }, [workout, addExercise]);

  const commitName = useCallback(() => {
    if (workout && name.trim() && name.trim() !== workout.name) {
      void updateName(name);
    }
  }, [workout, name, updateName]);

  const onPickerClose = useCallback(
    (selected: Exercise[]) => {
      setPickerVisible(false);
      if (!workout) return;
      for (const exercise of selected) {
        if (workout.exercises.some((e) => e.exerciseId === exercise.id)) continue;
        void addExercise({
          exerciseId: exercise.id,
          setsTarget: 3,
          repsTarget: 10,
          weightTarget: null,
          restSeconds: 90,
        });
      }
    },
    [workout, addExercise],
  );

  const saveAsTemplate = useCallback(async () => {
    if (!workout || !name.trim()) return;
    await addTemplate({
      name: name.trim(),
      exercises: workout.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: Array.from({ length: Math.max(1, exercise.setsTarget) }, (_, index) => ({
          setNumber: index + 1,
          targetReps: exercise.repsTarget,
          targetWeightKg: exercise.weightTarget,
          restSeconds: exercise.restSeconds,
        })),
      })),
    });
  }, [workout, name, addTemplate]);

  const startWorkoutNow = useCallback(async () => {
    commitName();
    const active = await start();
    if (active) {
      router.replace({
        pathname: '/health/workout-session/[id]',
        params: { id: active.id },
      } as never);
    }
  }, [commitName, start, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading workout…
        </Text>
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View className="flex-1 bg-background">
        <WorkoutHeader title="New Workout" onBack={() => router.back()} />
        <WorkoutEmptyState
          title="Couldn't load workout"
          message={error ?? 'Something went wrong. Check your connection and try again.'}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <BuilderBody
      workout={workout}
      name={name}
      setName={setName}
      commitName={commitName}
      saving={saving}
      metas={metas}
      pickerVisible={pickerVisible}
      setPickerVisible={setPickerVisible}
      onPickerClose={onPickerClose}
      onSave={() => void save()}
      onRemove={removeExercise}
      onDuplicate={duplicateExercise}
      onUpdate={updateExercise}
      onMove={moveExercise}
      onStart={() => void startWorkoutNow()}
      onSaveTemplate={() => void saveAsTemplate()}
      onBack={() => router.back()}
    />
  );
}

interface BuilderBodyProps {
  workout: Workout;
  name: string;
  setName: (value: string) => void;
  commitName: () => void;
  saving: boolean;
  metas: Map<string, Exercise>;
  pickerVisible: boolean;
  setPickerVisible: (visible: boolean) => void;
  onPickerClose: (selected: Exercise[]) => void;
  onSave: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdate: (id: string, patch: ExercisePatch) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onStart: () => void;
  onSaveTemplate: () => void;
  onBack: () => void;
}

function BuilderBody({
  workout,
  name,
  setName,
  commitName,
  saving,
  metas,
  pickerVisible,
  setPickerVisible,
  onPickerClose,
  onSave,
  onRemove,
  onDuplicate,
  onUpdate,
  onMove,
  onStart,
  onSaveTemplate,
  onBack,
}: BuilderBodyProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      <WorkoutHeader
        title={workout.exercises.length > 0 ? workout.name : 'New Workout'}
        onBack={onBack}
        rightAction={
          <Pressable
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Save workout"
            hitSlop={8}
            className="h-11 items-center justify-center px-1">
            <Text size="sm" className={`font-semibold ${saving ? 'text-muted-foreground' : 'text-primary'}`}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        }
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-4 px-5 pt-2">
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={commitName}
            placeholder="Workout name"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel="Workout name"
            className="rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold text-foreground"
          />

          {workout.exercises.map((exercise, index) => {
            const meta = metas.get(exercise.exerciseId);
            return (
              <WorkoutExerciseCard
                key={exercise.id}
                exercise={exercise}
                meta={
                  meta
                    ? { name: meta.name, bodyPart: meta.body_part, equipment: meta.equipment }
                    : null
                }
                index={index}
                total={workout.exercises.length}
                onUpdate={(patch) => onUpdate(exercise.id, patch)}
                onMove={(direction) => onMove(exercise.id, direction)}
                onDuplicate={() => onDuplicate(exercise.id)}
                onRemove={() => onRemove(exercise.id)}
              />
            );
          })}

          <Pressable
            onPress={onSaveTemplate}
            disabled={saving || workout.exercises.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Save workout as template"
            className="items-center justify-center rounded-2xl border border-border bg-card py-3 active:opacity-70">
            <Text size="sm" className="font-semibold text-primary">Save as Template</Text>
          </Pressable>

          {workout.exercises.length === 0 ? (
            <WorkoutEmptyState
              title="No exercises yet"
              message="Add exercises from the library to build your workout."
              actionLabel="Add Exercise"
              onAction={() => setPickerVisible(true)}
            />
          ) : (
            <Pressable
              onPress={() => setPickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Add exercise"
              className="items-center justify-center rounded-2xl border border-dashed border-border bg-card py-4 active:opacity-70">
              <View className="flex-row items-center gap-2">
                <Plus size={18} />
                <Text size="sm" className="font-semibold text-foreground">
                  Add Exercise
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View 
        className="border-t border-border bg-background px-5 pt-4"
        style={{ paddingBottom: Math.max(32, insets.bottom + 16) }}
      >
        <Button
          size="lg"
          variant="default"
          disabled={workout.exercises.length === 0 || saving}
          onPress={onStart}
          className="w-full">
          <ButtonText>Start Workout</ButtonText>
        </Button>
      </View>

      <ExercisePicker
        visible={pickerVisible}
        onClose={onPickerClose}
        excludedIds={workout.exercises.map((e) => e.exerciseId)}
      />
    </View>
  );
}

