import { Pressable, View } from 'react-native';
import { Calendar, Repeat, X } from 'lucide-react-native';

import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  WEEKDAY_OPTIONS,
  type FormRecurrence,
} from '@/lib/task-recurrence';
import type { RecurrenceType } from '@/types/tasks';

const TYPE_OPTIONS: { value: FormRecurrence['type']; label: string }[] = [
  { value: 'none', label: 'No' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/**
 * Shared recurrence editor for the create/edit task screens.
 * Fully controlled: parent owns `value` and applies `onChange`.
 * Mobile-first, semantic tokens only; degrades to nothing when hidden.
 */
export function RecurrenceEditor({
  value,
  onChange,
  errors = {},
  disabled = false,
}: {
  value: FormRecurrence;
  onChange: (next: FormRecurrence) => void;
  errors?: {
    startDate?: string;
    endDate?: string;
    weekdays?: string;
  };
  disabled?: boolean;
}) {
  const set = (patch: Partial<FormRecurrence>) => onChange({ ...value, ...patch });

  const toggleWeekday = (day: number) => {
    const has = value.weekdays.includes(day);
    set({
      weekdays: has
        ? value.weekdays.filter((d) => d !== day)
        : [...value.weekdays, day].sort(),
    });
  };

  return (
    <View className="gap-3">
      {/* Does this repeat? */}
      <View>
        <Text size="sm" className="mb-2 font-medium">
          Does this repeat?
        </Text>
        <View className="flex-row gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const isSelected = value.type === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => !disabled && set({ type: opt.value as FormRecurrence['type'] })}
                disabled={disabled}
                className={`flex-1 items-center rounded-xl py-3 ${
                  isSelected
                    ? 'border-2 border-primary bg-accent'
                    : 'border-2 border-border bg-card'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  size="sm"
                  className={`font-medium ${
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {value.type !== 'none' && (
        <>
          {/* Weekday selector (weekly only) */}
          {value.type === 'weekly' && (
            <View>
              <Text size="sm" className="mb-2 font-medium">
                Repeat on
              </Text>
              <View className="flex-row gap-2">
                {WEEKDAY_OPTIONS.map((wd) => {
                  const isSelected = value.weekdays.includes(wd.value);
                  return (
                    <Pressable
                      key={wd.value}
                      onPress={() => !disabled && toggleWeekday(wd.value)}
                      disabled={disabled}
                      className={`h-10 w-10 items-center justify-center rounded-full ${
                        isSelected
                          ? 'bg-primary'
                          : 'border border-border bg-card'
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel={wd.label}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        size="xs"
                        className={`font-medium ${
                          isSelected
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {wd.short}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.weekdays && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.weekdays}
                </Text>
              )}
            </View>
          )}

          {/* Start date */}
          <View>
            <Text size="sm" className="mb-2 font-medium">
              Starts on
            </Text>
            <Input>
              <InputField
                placeholder="YYYY-MM-DD"
                value={value.startDate}
                onChangeText={(text: string) => set({ startDate: text })}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                editable={!disabled}
              />
            </Input>
            {errors.startDate && (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.startDate}
              </Text>
            )}
          </View>

          {/* End date (optional) */}
          <View>
            <View className="mb-2 flex-row items-center gap-1">
              <Calendar size={14} className="text-muted-foreground" />
              <Text size="sm" className="font-medium">
                Ends on (optional)
              </Text>
            </View>
            <Input>
              <InputField
                placeholder="YYYY-MM-DD"
                value={value.endDate}
                onChangeText={(text: string) => set({ endDate: text })}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                editable={!disabled}
              />
              {value.endDate.length > 0 && (
                <Pressable onPress={() => !disabled && set({ endDate: '' })} className="px-3">
                  <X size={14} className="text-muted-foreground" />
                </Pressable>
              )}
            </Input>
            {errors.endDate && (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.endDate}
              </Text>
            )}
          </View>

          {/* Live preview */}
          <View className="flex-row items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
            <Repeat size={12} className="text-muted-foreground" />
            <Text size="xs" className="flex-1 text-muted-foreground">
              {previewText(value)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Local preview (kept tiny; full descriptions live in task-recurrence.ts) ─

function previewText(form: FormRecurrence): string {
  if (form.type === 'none') return 'Does not repeat';

  let base =
    form.type === 'daily'
      ? 'Repeats daily'
      : form.type === 'weekly'
        ? `Repeats weekly on ${form.weekdays.length} day(s)`
        : 'Repeats monthly';

  if (form.endDate) base += `, until ${form.endDate}`;
  return base;
}

// Re-export so screens can import the type alongside the editor.
export type { RecurrenceType };
