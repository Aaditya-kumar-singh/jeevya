import { Pressable, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  valueSuffix?: string;
  valueFormatter?: (value: number) => string;
}

export function Stepper({
  value,
  onChange,
  label,
  min = 0,
  max = 300,
  step = 1,
  valueSuffix = '',
  valueFormatter,
}: StepperProps) {
  const decrease = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const increase = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100));
  const display = valueFormatter ? valueFormatter(value) : String(value);

  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border bg-muted px-1 py-0.5">
      <Pressable
        onPress={decrease}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        hitSlop={4}
        className="h-11 w-11 items-center justify-center rounded-xl active:bg-card">
        <Minus size={18} color="#6B7280" />
      </Pressable>
      <Text className="min-w-12 text-center text-base font-semibold text-foreground">
        {display}
        {valueSuffix}
      </Text>
      <Pressable
        onPress={increase}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        hitSlop={4}
        className="h-11 w-11 items-center justify-center rounded-xl active:bg-card">
        <Plus size={18} color="#6B7280" />
      </Pressable>
    </View>
  );
}