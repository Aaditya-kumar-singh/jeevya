import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { ExercisePicker } from '@/components/workout/ExercisePicker';
import { Stepper } from '@/components/workout/Stepper';
import { WorkoutHeader } from '@/components/workout/WorkoutHeader';
import { WorkoutEmptyState } from '@/components/workout/WorkoutEmptyState';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { getExercisesByIds, type Exercise } from '@/services/exercises';
import type { WorkoutTemplate, WorkoutTemplateExercise, WorkoutTemplateSet, WorkoutTemplateSetInput } from '@/types/workout';

export default function WorkoutTemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const {
    getTemplate,
    createTemplate,
    updateTemplate,
    addExercise: addTemplateExercise,
    moveExercise: moveTemplateExercise,
    removeExercise: removeTemplateExercise,
    addSet: addTemplateSet,
    updateSet: updateTemplateSet,
    removeSet: removeTemplateSet,
  } = useWorkoutTemplates();
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [name, setName] = useState('New Template');
  const [description, setDescription] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [metas, setMetas] = useState<Map<string, Exercise>>(new Map());
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getTemplate(id).then((result) => {
      if (!mounted) return;
      if (!result) setError('Workout template not found');
      else {
        setTemplate(result);
        setName(result.name);
        setDescription(result.description ?? '');
      }
      setLoading(false);
    }).catch(() => { if (mounted) { setError('Could not load template'); setLoading(false); } });
    return () => { mounted = false; };
  }, [id, getTemplate]);

  useEffect(() => {
    if (!template) return;
    let mounted = true;
    getExercisesByIds(template.exercises.map((exercise) => exercise.exerciseId)).then((map) => {
      if (mounted) setMetas(map);
    });
    return () => { mounted = false; };
  }, [template]);

  const persistMeta = useCallback(async () => {
    if (!template || !name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTemplate(template.id, { name: name.trim(), description });
      setTemplate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save template');
    } finally {
      setSaving(false);
    }
  }, [template, name, description, updateTemplate]);

  const create = useCallback(async () => {
    if (!name.trim()) { setError('Template name is required'); return; }
    setSaving(true);
    try {
      const created = await createTemplate({ name: name.trim(), description });
      setTemplate(created);
      router.replace({ pathname: '/health/workout-template-editor', params: { id: created.id } } as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create template');
    } finally {
      setSaving(false);
    }
  }, [name, description, router, createTemplate]);

  const addExercise = useCallback(async (selected: Exercise[]) => {
    setPickerVisible(false);
    if (!template) return;
    for (const exercise of selected) {
      if (template.exercises.some((item) => item.exerciseId === exercise.id)) continue;
      try {
        const next = await addTemplateExercise(template.id, { exerciseId: exercise.id, sets: [{ targetReps: 10, restSeconds: 90 }] });
        setTemplate(next);
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not add exercise'); }
    }
  }, [template, addTemplateExercise]);

  const moveExercise = useCallback(async (exercise: WorkoutTemplateExercise, direction: -1 | 1) => {
    if (!template) return;
    const next = await moveTemplateExercise(template.id, exercise.id, direction);
    setTemplate(next);
  }, [template, moveTemplateExercise]);

  const changeSet = useCallback(async (exerciseId: string, set: WorkoutTemplateSet, patch: WorkoutTemplateSetInput) => {
    if (!template) return;
    const next = await updateTemplateSet(template.id, exerciseId, set.id, patch);
    setTemplate(next);
  }, [template, updateTemplateSet]);

  const addSet = useCallback(async (exerciseId: string) => {
    if (!template) return;
    const next = await addTemplateSet(template.id, exerciseId, { targetReps: 10, restSeconds: 90 });
    setTemplate(next);
  }, [template, addTemplateSet]);

  const removeSet = useCallback(async (exerciseId: string, setId: string) => {
    if (!template) return;
    const next = await removeTemplateSet(template.id, exerciseId, setId);
    setTemplate(next);
  }, [template, removeTemplateSet]);

  const removeExercise = useCallback(async (exerciseId: string) => {
    if (!template) return;
    const next = await removeTemplateExercise(template.id, exerciseId);
    setTemplate(next);
  }, [template, removeTemplateExercise]);

  if (loading) return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" /></View>;
  if (error && !template) return <View className="flex-1 bg-background"><WorkoutHeader title="Template" onBack={() => router.back()} /><WorkoutEmptyState title="Couldn't load template" message={error} actionLabel="Go back" onAction={() => router.back()} /></View>;

  return (
    <View className="flex-1 bg-background">
      <WorkoutHeader
        title={template?.name ?? 'New Template'}
        onBack={() => router.back()}
        rightAction={template ? <Pressable onPress={() => void persistMeta()} disabled={saving} className="h-11 items-center justify-center px-1"><Text size="sm" className="font-semibold text-primary">{saving ? 'Saving…' : 'Save'}</Text></Pressable> : undefined}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-4 px-5 pt-2">
          <TextInput value={name} onChangeText={setName} onBlur={() => void persistMeta()} placeholder="Template name" placeholderTextColor="#9CA3AF" accessibilityLabel="Template name" className="rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold text-foreground" />
          <TextInput value={description} onChangeText={setDescription} onBlur={() => void persistMeta()} placeholder="Description (optional)" placeholderTextColor="#9CA3AF" accessibilityLabel="Template description" className="rounded-2xl border border-border bg-card px-4 py-3 text-foreground" multiline />

          {template?.exercises.map((exercise, index) => (
            <TemplateExerciseEditor
              key={exercise.id}
              exercise={exercise}
              index={index}
              total={template.exercises.length}
              meta={metas.get(exercise.exerciseId) ?? null}
              onMove={(direction) => void moveExercise(exercise, direction)}
              onRemove={() => void removeExercise(exercise.id)}
              onAddSet={() => void addSet(exercise.id)}
              onRemoveSet={(setId) => void removeSet(exercise.id, setId)}
              onChangeSet={(set, patch) => void changeSet(exercise.id, set, patch)}
            />
          ))}

          {template ? (
            <Pressable onPress={() => setPickerVisible(true)} className="items-center justify-center rounded-2xl border border-dashed border-border bg-card py-4 active:opacity-70" accessibilityRole="button" accessibilityLabel="Add exercise to template">
              <View className="flex-row items-center gap-2"><Plus size={18} /><Text size="sm" className="font-semibold">Add Exercise</Text></View>
            </Pressable>
          ) : null}

          {error ? <Text size="sm" className="text-red-600">{error}</Text> : null}
          {!template ? <Button size="lg" disabled={saving} onPress={() => void create()}><ButtonText>Create Template</ButtonText></Button> : null}
        </View>
      </ScrollView>
      {template ? <ExercisePicker visible={pickerVisible} onClose={(selected) => void addExercise(selected)} excludedIds={template.exercises.map((exercise) => exercise.exerciseId)} /> : null}
    </View>
  );
}

function TemplateExerciseEditor({
  exercise, index, total, meta, onMove, onRemove, onAddSet, onRemoveSet, onChangeSet,
}: {
  exercise: WorkoutTemplateExercise;
  index: number;
  total: number;
  meta: Exercise | null;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onRemoveSet: (id: string) => void;
  onChangeSet: (set: WorkoutTemplateSet, patch: { targetReps?: number | null; targetWeightKg?: number | null; targetDurationSeconds?: number | null; targetDistanceKm?: number | null; restSeconds?: number | null }) => void;
}) {
  return (
    <Card className="gap-3 p-4">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1"><Heading size="sm">{meta?.name ?? 'Exercise unavailable'}</Heading><Text size="xs" className="text-muted-foreground mt-0.5">{meta ? [meta.body_part, meta.equipment].filter(Boolean).join(' · ') : exercise.exerciseId}</Text></View>
        <Text size="xs" className="text-muted-foreground">{index + 1}/{total}</Text>
      </View>
      {exercise.sets.map((set) => (
        <View key={set.id} className="rounded-2xl border border-border p-3 gap-3">
          <View className="flex-row items-center justify-between"><Text size="sm" className="font-semibold">Set {set.setNumber}</Text><Pressable onPress={() => onRemoveSet(set.id)} hitSlop={8} accessibilityLabel="Remove template set"><Trash2 size={17} /></Pressable></View>
          <View className="flex-row gap-3">
            <View className="flex-1"><Text size="xs" className="mb-1 text-muted-foreground">Reps</Text><Stepper label="reps" min={0} max={100} value={set.targetReps ?? 0} onChange={(value) => onChangeSet(set, { targetReps: value })} /></View>
            <View className="flex-1"><Text size="xs" className="mb-1 text-muted-foreground">Weight (kg)</Text><Stepper label="weight" min={0} max={500} step={2.5} value={set.targetWeightKg ?? 0} onChange={(value) => onChangeSet(set, { targetWeightKg: value })} /></View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1"><Text size="xs" className="mb-1 text-muted-foreground">Rest (sec)</Text><Stepper label="rest" min={0} max={600} step={15} value={set.restSeconds ?? 0} onChange={(value) => onChangeSet(set, { restSeconds: value })} /></View>
            <View className="flex-1"><Text size="xs" className="mb-1 text-muted-foreground">Duration</Text><NumericInput value={set.targetDurationSeconds} onCommit={(value) => onChangeSet(set, { targetDurationSeconds: value })} /></View>
          </View>
          <View><Text size="xs" className="mb-1 text-muted-foreground">Distance (km)</Text><NumericInput value={set.targetDistanceKm} onCommit={(value) => onChangeSet(set, { targetDistanceKm: value })} /></View>
        </View>
      ))}
      <Pressable onPress={onAddSet} className="items-center rounded-xl border border-dashed border-border py-3 active:opacity-70" accessibilityLabel="Add template set"><View className="flex-row items-center gap-2"><Plus size={16} /><Text size="xs" className="font-semibold">Add Set</Text></View></Pressable>
      <View className="flex-row items-center justify-between border-t border-border pt-2">
        <View className="flex-row gap-1"><Pressable onPress={() => onMove(-1)} disabled={index === 0} className={`h-10 w-10 items-center justify-center rounded-xl ${index === 0 ? 'opacity-30' : 'active:bg-muted'}`}><ArrowUp size={17} /></Pressable><Pressable onPress={() => onMove(1)} disabled={index === total - 1} className={`h-10 w-10 items-center justify-center rounded-xl ${index === total - 1 ? 'opacity-30' : 'active:bg-muted'}`}><ArrowDown size={17} /></Pressable></View>
        <Pressable onPress={onRemove} className="h-10 flex-row items-center gap-1 rounded-xl px-2 active:bg-muted" accessibilityLabel="Remove template exercise"><Trash2 size={17} /><Text size="xs" className="font-semibold">Remove</Text></Pressable>
      </View>
    </Card>
  );
}

function NumericInput({ value, onCommit }: { value?: number | null; onCommit: (value: number | null) => void }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(value == null ? '' : String(value));
  }, [value]);
  return <TextInput keyboardType="decimal-pad" value={text} onChangeText={setText} onBlur={() => { const n = Number(text); onCommit(text.trim() === '' ? null : (Number.isFinite(n) ? Math.max(0, n) : null)); }} placeholder="0" placeholderTextColor="#9CA3AF" className="rounded-xl border border-border bg-card px-3 py-2 text-foreground" accessibilityLabel="Numeric template target" />;
}

