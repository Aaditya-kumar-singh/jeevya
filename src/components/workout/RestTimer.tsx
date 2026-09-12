import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

interface RestTimerProps {
  active: boolean;
  remaining: number;
  paused: boolean;
  onAdd: (seconds: number) => void;
  onSkip: () => void;
}

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimer({ active, remaining, paused, onAdd, onSkip }: RestTimerProps) {
  if (!active) return null;
  const finished = remaining === 0 && !paused;
  return (
    <View className="rounded-3xl border border-border bg-card p-5">
      <Text size="xs" className="text-center font-medium uppercase tracking-wide text-muted-foreground">
        {paused ? 'Rest paused' : 'Rest'}
      </Text>
      <Text
        className={`mt-1 text-center text-5xl font-bold tabular-nums ${
          finished ? 'text-green-500' : 'text-foreground'
        }`}>
        {format(remaining)}
      </Text>
      {finished ? (
        <Text size="sm" className="mt-1 text-center font-medium text-green-500">
          Rest complete
        </Text>
      ) : null}
      <View className="mt-4 flex-row justify-center gap-3">
        <Pressable
          onPress={() => onAdd(30)}
          accessibilityRole="button"
          accessibilityLabel="Add 30 seconds rest"
          className="rounded-full border border-border bg-muted px-5 py-3 active:opacity-70">
          <Text size="sm" className="font-semibold text-foreground">
            +30
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onAdd(60)}
          accessibilityRole="button"
          accessibilityLabel="Add 60 seconds rest"
          className="rounded-full border border-border bg-muted px-5 py-3 active:opacity-70">
          <Text size="sm" className="font-semibold text-foreground">
            +60
          </Text>
        </Pressable>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip rest"
          className="rounded-full bg-primary px-6 py-3 active:opacity-80">
          <Text size="sm" className="font-semibold text-primary-foreground">
            Skip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}