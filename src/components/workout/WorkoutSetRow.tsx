import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import type { WorkoutSet } from '@/types/workout';

interface WorkoutSetRowProps {
  set: WorkoutSet;
  defaultWeight?: number | null;
  onUpdate: (patch: Partial<WorkoutSet>) => void;
  onRemove?: () => void;
}

export function WorkoutSetRow({ set, defaultWeight, onUpdate, onRemove }: WorkoutSetRowProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeight(
      set.weight != null ? String(set.weight) : defaultWeight != null ? String(defaultWeight) : '',
    );
     
    setReps(set.reps != null ? String(set.reps) : '');
  }, [set.id, set.weight, set.reps, defaultWeight]);

  const commitWeight = () => {
    const value = parseFloat(weight);
    onUpdate({ weight: Number.isFinite(value) && value > 0 ? value : null });
  };
  const commitReps = () => {
    const value = parseInt(reps, 10);
    onUpdate({ reps: Number.isFinite(value) && value > 0 ? value : null });
  };

  return (
    <View
      className={`flex-row items-center gap-2 rounded-xl px-1 ${
        set.completed ? 'bg-green-500/10' : ''
      }`}>
      <Text size="sm" className="w-7 text-center font-semibold text-foreground">
        {set.setNumber}
      </Text>
      <TextInput
        value={weight}
        onChangeText={setWeight}
        onBlur={commitWeight}
        keyboardType="decimal-pad"
        accessibilityLabel={`Set ${set.setNumber} weight in ${set.weightUnit}`}
        className="h-12 flex-1 rounded-xl border border-border bg-background px-3 text-center text-lg font-semibold text-foreground"
      />
      <Text size="xs" className="w-6 text-muted-foreground">
        {set.weightUnit}
      </Text>
      <TextInput
        value={reps}
        onChangeText={setReps}
        onBlur={commitReps}
        keyboardType="number-pad"
        accessibilityLabel={`Set ${set.setNumber} reps`}
        placeholder="–"
        placeholderTextColor="#9CA3AF"
        className="h-12 w-16 rounded-xl border border-border bg-background px-3 text-center text-lg font-semibold text-foreground"
      />
      {onRemove ? (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove set" hitSlop={6} className="h-12 w-8 items-center justify-center">
          <Trash2 size={16} color="#DC2626" />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => onUpdate({ completed: !set.completed })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.completed }}
        accessibilityLabel={`Complete set ${set.setNumber}`}
        hitSlop={6}
        className="h-12 w-12 items-center justify-center">
        <View
          className={`h-8 w-8 items-center justify-center rounded-full border-2 ${
            set.completed ? 'border-green-500 bg-green-500' : 'border-gray-400'
          }`}>
          {set.completed ? <Check size={16} color="#fff" /> : null}
        </View>
      </Pressable>
    </View>
  );
}