import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Repeat, Save, Tag } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { LabelSelector } from '@/components/tasks/LabelSelector';
import { RecurrenceEditor } from '@/components/tasks/RecurrenceEditor';
import { useTasks } from '@/hooks/useTasks';
import { isValidDateString } from '@/lib/task-filters';
import {
  buildRecurrence,
  getDefaultFormRecurrence,
  validateFormRecurrence,
  type FormRecurrence,
} from '@/lib/task-recurrence';
import type { TaskPriority } from '@/types/tasks';

// ─── Priority Options ─────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateDate(value: string): boolean {
  if (!value) return true; // optional
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateTime(value: string): boolean {
  if (!value) return true; // optional
  return /^\d{2}:\d{2}$/.test(value);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewTaskScreen() {
  const router = useRouter();
  // Phase 1F: calendar passes ?dueDate=YYYY-MM-DD to prefill the form.
  // Invalid values are ignored so legacy/malformed params can never prefill junk.
  const { dueDate: dueDateParam } = useLocalSearchParams<{ dueDate?: string }>();
  const { addTask, labels, createLabel } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(
    typeof dueDateParam === 'string' && isValidDateString(dueDateParam)
      ? dueDateParam
      : '',
  );
  const [dueTime, setDueTime] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<FormRecurrence>(getDefaultFormRecurrence);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    dueDate?: string;
    dueTime?: string;
    recurrenceStart?: string;
    recurrenceEnd?: string;
    recurrenceWeekdays?: string;
  }>({});

  const validate = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title is too long (max 200 characters)';
    }

    if (dueDate && !validateDate(dueDate)) {
      newErrors.dueDate = 'Use format YYYY-MM-DD';
    }

    if (dueTime && !validateTime(dueTime)) {
      newErrors.dueTime = 'Use format HH:MM (24-hour)';
    }

    const recErrors = validateFormRecurrence(recurrence);
    if (recErrors.startDate) newErrors.recurrenceStart = recErrors.startDate;
    if (recErrors.endDate) newErrors.recurrenceEnd = recErrors.endDate;
    if (recErrors.weekdays) newErrors.recurrenceWeekdays = recErrors.weekdays;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, dueDate, dueTime, recurrence]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate.trim() || null,
        dueTime: dueTime.trim() || null,
        recurrence: buildRecurrence(recurrence),
        labelIds,
      });
      router.back();
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to create task',
      );
    } finally {
      setSaving(false);
    }
  }, [title, description, priority, dueDate, dueTime, labelIds, recurrence, validate, addTask, router]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-5 pt-14">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Tasks
            </Text>
            <Heading size="xl" className="mt-1">
              New Task
            </Heading>
          </View>
        </View>

        <View className="gap-4 px-5 pt-6">
          {/* Title */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Title <Text className="text-destructive">*</Text>
            </Text>
            <Input>
              <InputField
                placeholder="What needs to be done?"
                value={title}
                onChangeText={(text: string) => {
                  setTitle(text);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                returnKeyType="next"
                autoFocus
              />
            </Input>
            {errors.title && (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.title}
              </Text>
            )}
          </Card>

          {/* Description */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Description
            </Text>
            <Input className="min-h-[80px]">
              <InputField
                placeholder="Add notes or details..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </Input>
          </Card>

          {/* Priority */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-3 font-medium">
              Priority
            </Text>
            <View className="flex-row gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = priority === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPriority(opt.value)}
                    className={`flex-1 items-center rounded-xl py-3 ${
                      isSelected
                        ? opt.value === 'high'
                          ? 'border-2 border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/30'
                          : opt.value === 'medium'
                            ? 'border-2 border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/30'
                            : 'border-2 border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30'
                        : 'border-2 border-border bg-card'
                    }`}
                  >
                    <Text
                      size="sm"
                      className={`font-medium ${
                        isSelected
                          ? opt.value === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : opt.value === 'medium'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-blue-600 dark:text-blue-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Due Date */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Due Date
            </Text>
            <Input>
              <InputSlot>
                <Calendar size={16} className="ml-3 text-muted-foreground" />
              </InputSlot>
              <InputField
                placeholder="YYYY-MM-DD (optional)"
                value={dueDate}
                onChangeText={(text: string) => {
                  setDueDate(text);
                  if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </Input>
            {errors.dueDate && (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.dueDate}
              </Text>
            )}
            <Text size="xs" className="mt-1 text-muted-foreground">
              Format: YYYY-MM-DD (e.g. 2025-12-25)
            </Text>
          </Card>

          {/* Due Time */}
          <Card className="w-full p-4">
            <Text size="sm" className="mb-2 font-medium">
              Due Time
            </Text>
            <Input>
              <InputSlot>
                <Clock size={16} className="ml-3 text-muted-foreground" />
              </InputSlot>
              <InputField
                placeholder="HH:MM (optional)"
                value={dueTime}
                onChangeText={(text: string) => {
                  setDueTime(text);
                  if (errors.dueTime) setErrors((prev) => ({ ...prev, dueTime: undefined }));
                }}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </Input>
            {errors.dueTime && (
              <Text size="xs" className="mt-1 text-destructive">
                {errors.dueTime}
              </Text>
            )}
            <Text size="xs" className="mt-1 text-muted-foreground">
              24-hour format (e.g. 14:30)
            </Text>
          </Card>

          {/* Recurrence */}
          <Card className="w-full p-4">
            <View className="mb-3 flex-row items-center gap-1.5">
              <Tag size={14} className="text-muted-foreground" />
              <Text size="sm" className="font-medium">
                Labels
              </Text>
            </View>
            <LabelSelector
              labels={labels}
              selectedIds={labelIds}
              onChange={setLabelIds}
              onCreate={(name) => createLabel({ name })}
              disabled={saving}
            />
          </Card>

          {/* Recurrence */}
          <Card className="w-full p-4">
            <View className="mb-3 flex-row items-center gap-1.5">
              <Repeat size={14} className="text-muted-foreground" />
              <Text size="sm" className="font-medium">
                Repeat
              </Text>
            </View>
            <RecurrenceEditor
              value={recurrence}
              onChange={(next) => {
                setRecurrence(next);
                if (next.type === 'none') {
                  setErrors((prev) => ({
                    ...prev,
                    recurrenceStart: undefined,
                    recurrenceEnd: undefined,
                    recurrenceWeekdays: undefined,
                  }));
                }
              }}
              errors={{
                startDate: errors.recurrenceStart,
                endDate: errors.recurrenceEnd,
                weekdays: errors.recurrenceWeekdays,
              }}
            />
          </Card>

          {/* Actions */}
          <View className="flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => router.back()}
              disabled={saving}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" className="text-primary-foreground" />
              ) : (
                <>
                  <Save size={16} className="text-primary-foreground" />
                  <ButtonText>Save Task</ButtonText>
                </>
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
