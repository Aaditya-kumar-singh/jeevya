import { Pressable, View } from 'react-native';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Stepper } from '@/components/workout/Stepper';
import type { WorkoutExercise } from '@/types/workout';

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  meta: { name: string; bodyPart: string | null; equipment: string | null } | null;
  index: number;
  total: number;
  onUpdate: (patch: Partial<WorkoutExercise>) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function WorkoutExerciseCard({
  exercise,
  meta,
  index,
  total,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
}: WorkoutExerciseCardProps) {
  const name = meta?.name ?? 'Exercise';
  const metaLine = [meta?.bodyPart, meta?.equipment].filter(Boolean).join(' · ');

  return (
    <View className="px-5">
      <Card className="gap-3 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <Heading size="sm">{name}</Heading>
            {metaLine ? (
              <Text size="xs" className="mt-0.5 text-muted-foreground">
                {metaLine}
              </Text>
            ) : null}
          </View>
          <Badge variant="secondary">
            <BadgeText>
              {index + 1}/{total}
            </BadgeText>
          </Badge>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text size="xs" className="mb-1 text-muted-foreground">
              Sets
            </Text>
            <Stepper
              label="sets"
              min={1}
              max={10}
              value={exercise.setsTarget}
              onChange={(setsTarget) => onUpdate({ setsTarget })}
            />
          </View>
          <View className="flex-1">
            <Text size="xs" className="mb-1 text-muted-foreground">
              Reps
            </Text>
            <Stepper
              label="reps"
              min={0}
              max={100}
              value={exercise.repsTarget ?? 0}
              onChange={(repsTarget) => onUpdate({ repsTarget })}
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text size="xs" className="mb-1 text-muted-foreground">
              Weight (kg)
            </Text>
            <Stepper
              label="weight"
              min={0}
              max={500}
              step={2.5}
              value={exercise.weightTarget ?? 0}
              valueFormatter={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
              onChange={(weightTarget) => onUpdate({ weightTarget })}
            />
          </View>
          <View className="flex-1">
            <Text size="xs" className="mb-1 text-muted-foreground">
              Rest (sec)
            </Text>
            <Stepper
              label="rest"
              min={0}
              max={600}
              step={15}
              value={exercise.restSeconds}
              onChange={(restSeconds) => onUpdate({ restSeconds })}
            />
          </View>
        </View>

        <View className="mt-1 flex-row items-center justify-between border-t border-border pt-3">
          <View className="flex-row gap-1">
            <Pressable
              onPress={() => onMove(-1)}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel="Move up"
              className={`h-11 w-11 items-center justify-center rounded-xl ${
                index === 0 ? 'opacity-30' : 'active:bg-muted'
              }`}>
              <ArrowUp size={18} />
            </Pressable>
            <Pressable
              onPress={() => onMove(1)}
              disabled={index === total - 1}
              accessibilityRole="button"
              accessibilityLabel="Move down"
              className={`h-11 w-11 items-center justify-center rounded-xl ${
                index === total - 1 ? 'opacity-30' : 'active:bg-muted'
              }`}>
              <ArrowDown size={18} />
            </Pressable>
            <Pressable
              onPress={onDuplicate}
              accessibilityRole="button"
              accessibilityLabel="Duplicate exercise"
              className="h-11 w-11 items-center justify-center rounded-xl active:bg-muted">
              <Copy size={18} />
            </Pressable>
          </View>
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${name}`}
            className="h-11 items-center justify-center rounded-xl px-2 active:bg-muted">
            <Trash2 size={18} color="#DC2626" />
          </Pressable>
        </View>
      </Card>
    </View>
  );
}