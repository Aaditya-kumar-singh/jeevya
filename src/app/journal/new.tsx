import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { EntryForm, type EntryFormValue } from '@/components/journal/EntryForm';
import { useJournal } from '@/hooks/useJournal';
import { isValidJournalDate } from '@/services/journal';
import { getTodayDate } from '@/types/journal';

export default function NewJournalEntryScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { addEntry } = useJournal();
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  // Calendar passes ?date=YYYY-MM-DD. Valid dates prefill the form;
  // missing/invalid values keep the existing today default. Service-side
  // validation is unchanged and still guards the final save.
  const initialDate =
    typeof dateParam === 'string' && isValidJournalDate(dateParam)
      ? dateParam
      : getTodayDate();

  const handleSave = async (value: EntryFormValue) => {
    if (saving) return;
    setSaving(true);
    try {
      const created = await addEntry({
        title: value.title,
        content: value.content,
        date: value.date,
        mood: value.mood,
        tags: value.tags.split(','),
      });
      router.replace(`/journal/${created.id}` as any);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-4 px-5 pb-12" style={{ paddingTop: topPadding }}>
          <View className="flex-row items-center gap-3">
            <Button variant="ghost" size="icon" onPress={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <View className="flex-1">
              <Text size="sm" className="text-muted-foreground">
                Journal
              </Text>
              <Heading size="xl" className="mt-1">
                New Entry
              </Heading>
            </View>
          </View>

          {saving ? (
            <View className="items-center py-2">
              <ActivityIndicator size="small" className="text-primary" />
            </View>
          ) : null}

          <EntryForm
            initial={{
              title: '',
              content: '',
              date: initialDate,
              mood: null,
              tags: '',
            }}
            saving={saving}
            saveLabel="Save Entry"
            onSave={(v) => void handleSave(v)}
            onCancel={() => router.back()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
