import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Calendar,
  Plus,
  Search,
  X,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/hooks/useJournal';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { EmptyStateIllustration } from '@/components/visuals/EmptyStateIllustration';
import {
  JOURNAL_MOOD_LABELS,
  JOURNAL_MOODS,
  type JournalEntry,
  type JournalMood,
} from '@/types/journal';

// ─── Filters ──────────────────────────────────────────────────────────────────

type MoodFilter = 'all' | JournalMood;

const MOOD_FILTERS: { key: MoodFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  ...JOURNAL_MOODS.map((m) => ({ key: m as MoodFilter, label: JOURNAL_MOOD_LABELS[m] })),
];

function moodBadgeVariant(mood: JournalMood | null): 'default' | 'secondary' | 'outline' {
  if (mood === 'great' || mood === 'good') return 'default';
  if (mood === 'okay') return 'secondary';
  return 'outline';
}

/** Case-insensitive search over title + content + tags. */
function matchesQuery(entry: JournalEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    entry.title.toLowerCase().includes(q) ||
    entry.content.toLowerCase().includes(q) ||
    entry.tags.some((t) => t.toLowerCase().includes(q))
  );
}

// ─── Display Helpers ──────────────────────────────────────────────────────────

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

/**
 * Safe content preview: collapse whitespace/newlines, then truncate to
 * ~140 chars on code-point boundaries (never splits surrogate pairs/emoji).
 */
export function previewContent(content: string, maxLength = 140): string {
  const collapsed = content.replace(/\s+/g, ' ').trim();
  if (Array.from(collapsed).length <= maxLength) return collapsed;
  return `${Array.from(collapsed).slice(0, maxLength).join('').trimEnd()}…`;
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

const TAG_PREVIEW_MAX = 4;

export function EntryCard({
  entry,
  onPress,
}: {
  entry: JournalEntry;
  onPress: (id: string) => void;
}) {
  const preview = previewContent(entry.content);
  const shownTags = entry.tags.slice(0, TAG_PREVIEW_MAX);
  const extraTags = entry.tags.length - shownTags.length;

  return (
    <Pressable
      onPress={() => onPress(entry.id)}
      className="min-h-[44px]"
      accessibilityRole="button"
      accessibilityLabel={`Journal entry${entry.title ? `: ${entry.title}` : ''}, ${formatEntryDate(entry.date)}${entry.mood ? `, mood ${JOURNAL_MOOD_LABELS[entry.mood]}` : ''}`}
    >
      <Card className="w-full p-4">
        <View className="flex-row items-center justify-between gap-2">
          <Heading size="sm" numberOfLines={1} className="flex-1">
            {entry.title || 'Untitled'}
          </Heading>
          <Badge variant={moodBadgeVariant(entry.mood)}>
            <BadgeText>
              {entry.mood ? JOURNAL_MOOD_LABELS[entry.mood] : 'No mood'}
            </BadgeText>
          </Badge>
        </View>
        {preview ? (
          <Text size="sm" className="mt-2 text-muted-foreground" numberOfLines={3}>
            {preview}
          </Text>
        ) : null}
        {shownTags.length > 0 ? (
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {shownTags.map((tag) => (
              <View key={tag} className="rounded-sm bg-muted px-1.5 py-0.5">
                <Text size="xs" className="text-muted-foreground">
                  #{tag}
                </Text>
              </View>
            ))}
            {extraTags > 0 ? (
              <View className="rounded-sm bg-muted px-1.5 py-0.5">
                <Text size="xs" className="text-muted-foreground">
                  +{extraTags}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text size="xs" className="mt-2 text-muted-foreground">
          {formatEntryDate(entry.date)}
        </Text>
      </Card>
    </Pressable>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  hasQuery,
  hasFilter,
  hasAnyEntries,
}: {
  hasQuery: boolean;
  hasFilter: boolean;
  hasAnyEntries: boolean;
}) {
  let title = 'No entries yet';
  let message = 'Tap + to write your first entry';
  let icon = '📓';

  if (!hasAnyEntries) {
    // defaults above
  } else if (hasQuery) {
    icon = '🔍';
    title = 'No matches found';
    message = 'No journal entries match your search query';
  } else if (hasFilter) {
    icon = '💭';
    title = 'Nothing here';
    message = 'No journal entries with this mood filter';
  } else {
    title = 'No entries';
    message = 'Your journal is currently empty';
  }

  return (
    <EmptyStateIllustration
      title={title}
      message={message}
      icon={icon}
    />
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const router = useRouter();
  const { entries, loading, refreshing, error, refresh } = useJournal();
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState<MoodFilter>('all');
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  const visible = useMemo(
    () =>
      entries.filter(
        (e) => (mood === 'all' || e.mood === mood) && matchesQuery(e, query),
      ),
    [entries, query, mood],
  );

  const filtersActive = query.trim() !== '' || mood !== 'all';

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading journal...
        </Text>
      </View>
    );
  }

  if (error && entries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">
          Failed to load journal
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {error}
        </Text>
        <Button
          onPress={() => void refresh()}
          variant="outline"
          className="mt-4 min-h-[44px]"
        >
          <ButtonText>Retry</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-4 px-5 pb-12" style={{ paddingTop: topPadding }}>
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Growth · Reflection
            </Text>
            <Heading size="xl" className="mt-1">
              Journal
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/journal/calendar' as any)}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted px-3"
            accessibilityRole="button"
            accessibilityLabel="Open journal calendar"
          >
            <Calendar size={18} className="text-muted-foreground" />
          </Pressable>
        </View>

        {/* Search */}
        <Input className="bg-card">
          <InputSlot>
            <Search size={16} className="ml-3 text-muted-foreground" />
          </InputSlot>
          <InputField
            placeholder="Search title, content, or #tag..."
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            accessibilityLabel="Search journal entries"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              className="min-h-[44px] min-w-[44px] items-center justify-center px-3"
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={16} className="text-muted-foreground" />
            </Pressable>
          )}
        </Input>

        {/* Mood filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {MOOD_FILTERS.map((f) => {
            const active = mood === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setMood(f.key)}
                className={`min-h-[44px] justify-center rounded-lg px-4 py-2 ${
                  active ? 'bg-primary' : 'bg-muted'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by mood ${f.label}`}
              >
                <Text
                  size="sm"
                  className={`font-medium ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active-filter summary + Clear */}
        {filtersActive && (
          <View className="flex-row items-center justify-between rounded-lg bg-muted px-3 py-2">
            <Text size="xs" className="flex-1 text-muted-foreground">
              {[
                mood !== 'all' &&
                  MOOD_FILTERS.find((f) => f.key === mood)?.label,
                query.trim() && `"${query.trim()}"`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Pressable
              onPress={() => {
                setQuery('');
                setMood('all');
              }}
              className="ml-2 min-h-[44px] flex-row items-center gap-1 px-2"
              accessibilityRole="button"
              accessibilityLabel="Clear search and filters"
            >
              <X size={12} className="text-primary" />
              <Text size="xs" className="font-medium text-primary">
                Clear
              </Text>
            </Pressable>
          </View>
        )}

        {/* Error banner (non-fatal) */}
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

        {/* Entry list */}
        {visible.length === 0 ? (
          <EmptyState
            hasQuery={query.trim().length > 0}
            hasFilter={mood !== 'all'}
            hasAnyEntries={entries.length > 0}
          />
        ) : (
          <View className="gap-3">
            {visible.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onPress={(id) => router.push(`/journal/${id}` as any)}
              />
            ))}
          </View>
        )}
      </View>

      {/* Add Entry */}
      <View className="absolute bottom-6 right-5">
        <Pressable
          onPress={() => router.push('/journal/new' as any)}
          className="h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
          accessibilityRole="button"
          accessibilityLabel="Add journal entry"
        >
          <Plus size={24} className="text-primary-foreground" />
        </Pressable>
      </View>
    </ScrollView>
  );
}
