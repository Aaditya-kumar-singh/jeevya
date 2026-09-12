import { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { ALL_WEEKDAYS, WEEKDAY_LABELS, type Weekday, type HabitFrequency } from '@/types/habit';

interface HabitFrequencyPickerProps {
  value: HabitFrequency;
  selectedDays: Weekday[];
  onChangeFrequency: (frequency: HabitFrequency) => void;
  onSelectDays: (days: Weekday[]) => void;
}

const DAYS_IN_ORDER: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export function HabitFrequencyPicker({
  value,
  selectedDays,
  onChangeFrequency,
  onSelectDays,
}: HabitFrequencyPickerProps) {
  const [expanded, setExpanded] = useState(false);

  const handleDayToggle = (day: Weekday) => {
    if (value !== 'weekly' && value !== 'custom') return;

    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];

    onSelectDays(newDays);
  };

  const isDaySelected = (day: Weekday) => selectedDays.includes(day);

  return (
    <View>
      {/* Frequency selector */}
      <View className="flex-row gap-2">
        {(['daily', 'weekly', 'custom'] as HabitFrequency[]).map((freq) => {
          const isActive = value === freq;
          return (
            <Pressable
              key={freq}
              onPress={() => {
                onChangeFrequency(freq);
                if (freq === 'daily') {
                  onSelectDays([]);
                } else if (freq === 'weekly' && selectedDays.length === 0) {
                  onSelectDays(DAYS_IN_ORDER.filter((_, i) => i % 2 === 0));
                }
              }}
              className={`flex-1 rounded-lg py-2.5 items-center ${
                isActive
                  ? 'bg-primary'
                  : 'bg-secondary'
              }`}
              accessibilityState={{ selected: isActive }}
            >
              <Text className={`text-center font-medium ${isActive ? 'text-primary-foreground' : 'text-secondary-foreground'}`}>
                {freq === 'daily' && 'Every day'}
                {freq === 'weekly' && 'Weekly'}
                {freq === 'custom' && 'Custom'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Day selector for weekly/custom */}
      {(value === 'weekly' || value === 'custom') && (
        <View className="mt-3">
          <View className="flex-row flex-wrap gap-1.5 justify-between">
            {DAYS_IN_ORDER.map((day) => {
              const selected = isDaySelected(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => handleDayToggle(day)}
                  className={`h-9 w-9 rounded-full flex-row items-center justify-center ${
                    selected
                      ? 'bg-primary'
                      : 'bg-secondary border border-border'
                  }`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={WEEKDAY_LABELS[day]}
                >
                  <Text className={`text-xs font-medium ${selected ? 'text-primary-foreground' : 'text-secondary-foreground'}`}>
                    {WEEKDAY_LABELS[day]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Visual indicator for selected days */}
          {selectedDays.length > 0 && (
            <View className="mt-2 flex-row items-center gap-1">
              <View className="h-1.5 w-1.5 rounded-full bg-success" />
              <View className="h-1.5 w-1.5 rounded-full bg-success" />
              <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
              <View className="h-1.5 w-1.5 rounded-full bg-success" />
              <View className="h-1.5 w-1.5 rounded-full bg-success" />
              <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
              <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default HabitFrequencyPicker;
