import { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { HabitFrequencyPicker } from './HabitFrequencyPicker';
import { HABIT_ICONS, HABIT_COLORS, type Weekday, type HabitFrequency } from '@/types/habit';

const iconMap: Record<string, string> = {
  book: '📖', dumbbell: '🏋️', droplet: '💧', brain: '🧠',
  heart: '❤️', moon: '🌙', check: '✓', target: '🎯',
  walk: '🚶', meditation: '🧘', water: '🚰', coffee: '☕',
  sun: '☀️', 'moon-star': '🌟', flame: '🔥', star: '⭐',
};

interface HabitFormProps {
  initialData?: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency?: HabitFrequency;
    days?: Weekday[];
    targetCount?: number;
  };
  onSubmit: (data: {
    name: string;
    description: string;
    icon: string;
    color: string;
    frequency: HabitFrequency;
    days: Weekday[];
    targetCount: number;
  }) => Promise<void>;
  onCancel: () => void;
  title: string;
  submitLabel: string;
  isLoading?: boolean;
}

export function HabitForm({ initialData, onSubmit, onCancel, title, submitLabel, isLoading = false }: HabitFormProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [icon, setIcon] = useState(initialData?.icon ?? 'book');
  const [color, setColor] = useState(initialData?.color ?? 'blue');
  const [frequency, setFrequency] = useState<HabitFrequency>(
    initialData?.frequency ?? 'daily',
  );
  const [selectedDays, setSelectedDays] = useState<Weekday[]>(
    initialData?.days ?? [],
  );
  const [targetCount, setTargetCount] = useState(
    initialData?.targetCount?.toString() ?? '1',
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (frequency !== 'daily' && selectedDays.length === 0) {
      setSelectedDays(['monday', 'wednesday', 'friday']);
    }
  }, [frequency]);

  const handleSubmit = async () => {
    const nameTrimmed = name.trim();
    const target = parseInt(targetCount, 10);

    if (!nameTrimmed) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    if (target < 1 || isNaN(target)) {
      Alert.alert('Error', 'Target must be at least 1');
      return;
    }

    if (frequency !== 'daily' && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: nameTrimmed,
        description: description.trim(),
        icon,
        color,
        frequency,
        days: selectedDays,
        targetCount: target,
      });

      if (!initialData) {
        router.back();
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save habit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1 px-5 pt-14"
        contentContainerStyle={{ gap: 20, paddingBottom: Math.max(60, insets.bottom + 20) }}
      >
        <Heading size="xl">{title}</Heading>

        <Card className="p-4">
          <Heading size="sm" className="mb-2">Habit Name</Heading>
          <Input>
            <InputField
              placeholder="e.g., Read 20 pages"
              value={name}
              onChangeText={setName}
              autoFocus={!initialData}
            />
          </Input>
        </Card>

        <Card className="p-4">
          <Heading size="sm" className="mb-2">Description (optional)</Heading>
          <Input>
            <InputField
              placeholder="e.g., Read at least 20 pages every day"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </Input>
        </Card>

        <Card className="p-4">
          <Heading size="sm" className="mb-2">Icon</Heading>
          <View className="flex-row flex-wrap gap-2">
            {HABIT_ICONS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setIcon(item.id)}
                accessibilityLabel={item.label}
                accessibilityState={{ selected: icon === item.id }}
                className={`h-10 w-10 rounded-full flex-row items-center justify-center will-change-variable ${
                  icon === item.id
                    ? 'bg-primary ring-2 ring-primary'
                    : 'bg-secondary'
                }`}
              >
                <Text className={`text-lg ${icon === item.id ? 'text-primary-foreground' : 'text-secondary-foreground'}`}>
                  {iconMap[item.id]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card className="p-4">
          <Heading size="sm" className="mb-2">Color</Heading>
          <View className="flex-row flex-wrap gap-2">
            {HABIT_COLORS.map((item) => {
              const bgColor = item.value;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setColor(item.id)}
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: color === item.id }}
                  className={`h-9 w-9 rounded-full will-change-variable ${
                    color === item.id ? 'ring-2 ring-offset-2 ring-ring' : ''
                  }`}
                  style={{ backgroundColor: bgColor }}
                />
              );
            })}
          </View>
        </Card>

        <Card className="p-4">
          <Heading size="sm" className="mb-2">Frequency</Heading>
          <HabitFrequencyPicker
            value={frequency}
            selectedDays={selectedDays}
            onChangeFrequency={setFrequency}
            onSelectDays={setSelectedDays}
          />
        </Card>

        <Card className="p-4">
          <Heading size="sm" className="mb-2">Target</Heading>
          <Input className="max-w-[120px]">
            <InputField
              placeholder="1"
              value={targetCount}
              onChangeText={setTargetCount}
              keyboardType="numeric"
              textAlign="center"
            />
          </Input>
          <Text size="xs" className="mt-1 text-muted-foreground text-center">
            Target {frequency === 'daily' ? 'per day' : 'per scheduled day'}
          </Text>
        </Card>

      </ScrollView>

      <View 
        className="flex-row gap-3 border-t border-border bg-background px-5 pt-4"
        style={{ paddingBottom: Math.max(32, insets.bottom + 16) }}
      >
        <Button
          variant="outline"
          onPress={onCancel}
          className="flex-1"
          disabled={submitting}
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button
          onPress={handleSubmit}
          className="flex-1"
          disabled={submitting || isLoading}
        >
          <ButtonText>{submitting ? 'Saving...' : submitLabel}</ButtonText>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

export default HabitForm;


