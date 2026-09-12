import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { EntryForm, type EntryFormValue } from '@/components/journal/EntryForm';
import { useJournal } from '@/hooks/useJournal';

export default function EditJournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { entries, loading, editEntry } = useJournal();
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  const entry = entries.find((e) => e.id === id);

  const [initial, setInitial] = useState<EntryFormValue | null>(null);
  useEffect(() => {
    if (entry && !initial) {
      setInitial({
        title: entry.title,
        content: entry.content,
        date: entry.date,
        mood: entry.mood,
        tags: entry.tags.join(', '),
      });
    }
  }, [entry, initial]);

  const handleSave = async (value: EntryFormValue) => {
    if (!entry || saving) return;
    setSaving(true);
    try {
      await editEntry(entry.id, {
        title: value.title,
        content: value.content,
        date: value.date,
        mood: value.mood,
        tags: value.tags.split(','),
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (loading || (entry && !initial)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading entry...
        </Text>
      </View>
    );
  }

  if (!entry) {
    return (
      <View className="flex-1 bg-background">
        <View className="gap-4 px-5 pb-12" style={{ paddingTop: topPadding }}>
          <Heading size="xl">Entry not found</Heading>
          <Text size="sm" className="text-muted-foreground">
            {`No journal entry matches id "${id}". It may have been deleted.`}
          </Text>
          <Button
            variant="outline"
            className="mt-2 min-h-[44px]"
            onPress={() => router.replace('/journal' as any)}
          >
            <ButtonText>Back to Journal</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

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
                Edit Entry
              </Heading>
            </View>
          </View>

          <EntryForm
            key={entry.id}
            initial={initial ?? { title: '', content: '', date: '', mood: null, tags: '' }}
            saving={saving}
            saveLabel="Save Changes"
            onSave={(v) => void handleSave(v)}
            onCancel={() => router.back()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
