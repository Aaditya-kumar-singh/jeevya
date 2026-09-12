import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Pencil,
  Trash2,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/hooks/useJournal';
import {
  JOURNAL_MOOD_LABELS,
  type JournalMood,
} from '@/types/journal';

/** "2026-03-05" → "Mar 5, 2026" via civil parsing (no locale date parsing). */
function formatEntryDate(date: string): string {
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  const [y, m, d] = parts.map(Number);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return date;
  if (m < 1 || m > 12) return date;
  return `${months[m - 1]} ${d}, ${y}`;
}

function moodBadgeVariant(mood: JournalMood | null): 'default' | 'secondary' | 'outline' {
  if (mood === 'great' || mood === 'good') return 'default';
  if (mood === 'okay') return 'secondary';
  return 'outline';
}

export default function JournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { entries, loading, error, refresh, removeEntry } = useJournal();
  const [deleting, setDeleting] = useState(false);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  const entry = entries.find((e) => e.id === id);

  const handleDelete = () => {
    if (!entry || deleting) return;
    Alert.alert(
      'Delete Entry',
      'Delete this journal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            void (async () => {
              try {
                await removeEntry(entry.id);
                router.replace('/journal' as any);
              } catch (e) {
                Alert.alert(
                  'Error',
                  e instanceof Error ? e.message : 'Failed to delete entry',
                );
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
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
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
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
              Entry
            </Heading>
          </View>
          <Pressable
            onPress={() => router.push(`/journal/${entry.id}/edit` as any)}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted px-3"
            accessibilityRole="button"
            accessibilityLabel="Edit entry"
          >
            <Pencil size={18} className="text-muted-foreground" />
          </Pressable>
        </View>

        {error ? (
          <Card className="w-full border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">
                {error}
              </Text>
              <Pressable onPress={() => void refresh()}>
                <Text
                  size="xs"
                  className="font-medium text-red-600 dark:text-red-400"
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between gap-2">
            <Heading size="md" className="flex-1">
              {entry.title || 'Untitled'}
            </Heading>
            <Badge variant={moodBadgeVariant(entry.mood)}>
              <BadgeText>
                {entry.mood ? JOURNAL_MOOD_LABELS[entry.mood] : 'No mood'}
              </BadgeText>
            </Badge>
          </View>
          <Text size="xs" className="mt-1 text-muted-foreground">
            {formatEntryDate(entry.date)}
          </Text>
          {entry.tags.length > 0 ? (
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <View key={tag} className="rounded-sm bg-muted px-1.5 py-0.5">
                  <Text size="xs" className="text-muted-foreground">
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text size="md" className="mt-3">
            {entry.content}
          </Text>
        </Card>

        <Button
          variant="destructive"
          className="min-h-[44px]"
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" className="text-primary-foreground" />
          ) : (
            <>
              <Trash2 size={16} className="text-white" />
              <ButtonText>Delete Entry</ButtonText>
            </>
          )}
        </Button>
      </View>
    </ScrollView>
  );
}
