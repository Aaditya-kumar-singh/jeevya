import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  JOURNAL_MOOD_LABELS,
  JOURNAL_MOODS,
  type JournalMood,
} from '@/types/journal';

// ─── Shared Journal Entry Form (Phase 1C) ─────────────────────────────────────
// Used by /journal/new and /journal/[id]/edit. Visual language matches the
// frozen Journal 1B timeline exactly (Card, Input, Button, mood chips, muted
// helper text). Tags are edited as comma-separated text and passed through to
// the existing service normalization on save.

export interface EntryFormValue {
  title: string;
  content: string;
  date: string;
  mood: JournalMood | null;
  tags: string;
}

const MOOD_OPTIONS: { key: JournalMood | null; label: string }[] = [
  { key: null, label: 'None' },
  ...JOURNAL_MOODS.map((m) => ({ key: m, label: JOURNAL_MOOD_LABELS[m] })),
];

export function EntryForm({
  initial,
  saving,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: EntryFormValue;
  saving: boolean;
  saveLabel: string;
  onSave: (value: EntryFormValue) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EntryFormValue>(initial);
  const [errors, setErrors] = useState<{
    title?: string;
    content?: string;
    date?: string;
  }>({});

  const set = (patch: Partial<EntryFormValue>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const handleSave = () => {
    // Client-side mirror of the service rules; the service re-validates.
    const next: typeof errors = {};
    if (form.title.trim().length > 200) {
      next.title = 'Title must be 200 characters or fewer';
    }
    if (!form.content.trim()) {
      next.content = 'Content is required';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
      next.date = 'Use format YYYY-MM-DD';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({ ...form, title: form.title.trim(), date: form.date.trim() });
  };

  return (
    <View className="gap-4">
      {/* Title */}
      <Card className="w-full p-4">
        <Text size="sm" className="mb-2 font-medium">
          Title (optional)
        </Text>
        <Input>
          <InputField
            placeholder="A quiet morning"
            value={form.title}
            onChangeText={(text: string) => set({ title: text })}
            returnKeyType="next"
            maxLength={200}
            editable={!saving}
            accessibilityLabel="Entry title, optional"
          />
        </Input>
        {errors.title ? (
          <Text size="xs" className="mt-1 text-destructive">
            {errors.title}
          </Text>
        ) : null}
      </Card>

      {/* Content */}
      <Card className="w-full p-4">
        <Text size="sm" className="mb-2 font-medium">
          Content <Text className="text-destructive">*</Text>
        </Text>
        <Input className="min-h-[160px]">
          <InputField
            placeholder="Write what happened today..."
            value={form.content}
            onChangeText={(text: string) => set({ content: text })}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            style={{ minHeight: 160 }}
            maxLength={50000}
            editable={!saving}
            accessibilityLabel="Entry content, required"
          />
        </Input>
        {errors.content ? (
          <Text size="xs" className="mt-1 text-destructive">
            {errors.content}
          </Text>
        ) : null}
      </Card>

      {/* Date */}
      <Card className="w-full p-4">
        <Text size="sm" className="mb-2 font-medium">
          Date
        </Text>
        <Input>
          <InputField
            placeholder="YYYY-MM-DD"
            value={form.date}
            onChangeText={(text: string) => set({ date: text })}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!saving}
            accessibilityLabel="Entry date, format YYYY-MM-DD"
          />
        </Input>
        {errors.date ? (
          <Text size="xs" className="mt-1 text-destructive">
            {errors.date}
          </Text>
        ) : null}
      </Card>

      {/* Mood */}
      <Card className="w-full p-4">
        <Text size="sm" className="mb-2 font-medium">
          Mood
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {MOOD_OPTIONS.map((o) => {
            const active = form.mood === o.key;
            return (
              <Pressable
                key={o.label}
                onPress={() => set({ mood: o.key })}
                disabled={saving}
                className={`min-h-[44px] justify-center rounded-lg px-4 py-2 ${
                  active ? 'bg-primary' : 'bg-muted'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Mood ${o.label}`}
              >
                <Text
                  size="sm"
                  className={`font-medium ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Tags */}
      <Card className="w-full p-4">
        <Text size="sm" className="mb-2 font-medium">
          Tags (optional)
        </Text>
        <Input>
          <InputField
            placeholder="gratitude, morning, walk"
            value={form.tags}
            onChangeText={(text: string) => set({ tags: text })}
            autoCapitalize="none"
            editable={!saving}
            accessibilityLabel="Tags, comma-separated"
          />
        </Input>
        <Text size="xs" className="mt-1 text-muted-foreground">
          Separate tags with commas.
        </Text>
      </Card>

      {/* Actions */}
      <View className="flex-row gap-3 pt-2">
        <Button
          variant="outline"
          className="min-h-[44px] flex-1"
          onPress={onCancel}
          disabled={saving}
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button
          variant="default"
          className="min-h-[44px] flex-1"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" className="text-primary-foreground" />
          ) : (
            <ButtonText>{saveLabel}</ButtonText>
          )}
        </Button>
      </View>
    </View>
  );
}
