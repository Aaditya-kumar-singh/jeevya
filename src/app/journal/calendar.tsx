import { useCallback, useMemo, useState } from 'react';
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
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Plus,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useJournal } from '@/hooks/useJournal';
import {
  formatCalendarDate,
  formatMonthTitle,
  getEntriesForDate,
  getEntryCountsByDate,
  getFirstWeekday,
  getMonthDays,
  parseYearMonth,
  shiftMonth,
  todayDay,
  WEEKDAY_HEADERS,
} from '@/lib/journal-calendar';
import { EntryCard } from './index';

export default function JournalCalendarScreen() {
  const router = useRouter();
  const { entries, loading, refreshing, error, refresh } = useJournal();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  const today = todayDay();
  const todayYM = parseYearMonth(today) ?? { year: 2000, month: 1 };

  const [viewYear, setViewYear] = useState(todayYM.year);
  const [viewMonth, setViewMonth] = useState(todayYM.month);
  const [selectedDate, setSelectedDate] = useState(today);

  const days = useMemo(
    () => getMonthDays(viewYear, viewMonth, today),
    [viewYear, viewMonth, today],
  );
  const firstWeekday = useMemo(
    () => getFirstWeekday(viewYear, viewMonth),
    [viewYear, viewMonth],
  );
  const counts = useMemo(
    () => getEntryCountsByDate(entries, viewYear, viewMonth),
    [entries, viewYear, viewMonth],
  );
  const selectedEntries = useMemo(
    () => getEntriesForDate(entries, selectedDate),
    [entries, selectedDate],
  );

  const goToMonth = useCallback(
    (delta: number) => {
      const next = shiftMonth(viewYear, viewMonth, delta);
      setViewYear(next.year);
      setViewMonth(next.month);
      // Keep the same day-of-month where possible, clamped to the new
      // month's length (handles month lengths, leap years, year crossings).
      const day = Number(selectedDate.slice(8, 10));
      const clamped = Math.min(
        Number.isFinite(day) ? day : 1,
        getMonthDays(next.year, next.month).length || 28,
      );
      setSelectedDate(
        `${next.year}-${String(next.month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`,
      );
    },
    [viewYear, viewMonth, selectedDate],
  );

  const goToToday = useCallback(() => {
    const ym = parseYearMonth(today);
    if (ym) {
      setViewYear(ym.year);
      setViewMonth(ym.month);
    }
    setSelectedDate(today);
  }, [today]);

  const goToEntry = useCallback(
    (id: string) => router.push(`/journal/${id}` as any),
    [router],
  );

  const goToNew = useCallback(
    () =>
      router.push(
        { pathname: '/journal/new', params: { date: selectedDate } } as any,
      ),
    [router, selectedDate],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading calendar...
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

  const blanks = firstWeekday >= 0 ? firstWeekday : 0;
  const prevTitle = formatMonthTitle(...monthTuple(viewYear, viewMonth, -1));
  const nextTitle = formatMonthTitle(...monthTuple(viewYear, viewMonth, 1));

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-4 px-5 pb-12" style={{ paddingTop: topPadding }}>
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Journal
            </Text>
            <Heading size="xl" className="mt-1">
              Calendar
            </Heading>
          </View>
          <Pressable
            onPress={goToToday}
            className="min-h-[44px] items-center justify-center rounded-lg bg-muted px-4 py-2"
            accessibilityRole="button"
            accessibilityLabel="Go to today"
          >
            <Text size="sm" className="font-medium text-foreground">
              Today
            </Text>
          </Pressable>
        </View>

        {/* Month grid */}
        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => goToMonth(-1)}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
              accessibilityRole="button"
              accessibilityLabel={`Previous month, ${prevTitle}`}
            >
              <ChevronLeft size={20} className="text-foreground" />
            </Pressable>
            <Heading size="md">{formatMonthTitle(viewYear, viewMonth)}</Heading>
            <Pressable
              onPress={() => goToMonth(1)}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
              accessibilityRole="button"
              accessibilityLabel={`Next month, ${nextTitle}`}
            >
              <ChevronRight size={20} className="text-foreground" />
            </Pressable>
          </View>

          <View className="mt-3 flex-row">
            {WEEKDAY_HEADERS.map((d) => (
              <View key={d} className="flex-1 items-center py-1">
                <Text size="xs" className="font-medium text-muted-foreground">
                  {d}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {Array.from({ length: blanks }).map((_, i) => (
              <View key={`blank-${i}`} className="w-[14.28%] p-0.5">
                <View className="min-h-[52px]" />
              </View>
            ))}
            {days.length === 0 ? (
              <View className="w-full items-center py-6">
                <Text size="sm" className="text-muted-foreground">
                  This month has no days to show.
                </Text>
              </View>
            ) : (
              days.map((day) => {
                const count = counts[day.date] ?? 0;
                const selected = day.date === selectedDate;
                return (
                  <View key={day.date} className="w-[14.28%] p-0.5">
                    <Pressable
                      onPress={() => setSelectedDate(day.date)}
                      className={`min-h-[52px] items-center justify-center rounded-xl border py-1 ${
                        selected
                          ? 'border-primary bg-primary'
                          : day.isToday
                            ? 'border-primary bg-accent'
                            : 'border-transparent bg-card'
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatCalendarDate(day.date)}, ${count === 0 ? 'no entries' : `${count} ${count === 1 ? 'entry' : 'entries'}`}${day.isToday ? ', today' : ''}`}
                      accessibilityState={{ selected }}
                    >
                      <Text
                        size="sm"
                        className={`font-medium ${
                          selected ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {day.day}
                      </Text>
                      {count > 0 ? (
                        <View className="mt-1 flex-row items-center justify-center gap-1">
                          <View
                            className={`h-1.5 w-1.5 rounded-full ${
                              selected ? 'bg-primary-foreground' : 'bg-primary'
                            }`}
                          />
                          {count > 1 ? (
                            <Text
                              size="xs"
                              className={
                                selected
                                  ? 'text-primary-foreground'
                                  : 'text-muted-foreground'
                              }
                            >
                              {count}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <View className="mt-1 h-1.5" />
                      )}
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </Card>

        {/* Selected day */}
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <Heading size="md">{formatCalendarDate(selectedDate)}</Heading>
            <Text size="sm" className="text-muted-foreground">
              {selectedEntries.length === 0
                ? 'No entries'
                : `${selectedEntries.length} ${selectedEntries.length === 1 ? 'entry' : 'entries'}`}
            </Text>
          </View>
          <Pressable
            onPress={goToNew}
            className="min-h-[44px] flex-row items-center gap-1 rounded-lg bg-primary px-4 py-2"
            accessibilityRole="button"
            accessibilityLabel={`Add entry on ${formatCalendarDate(selectedDate)}`}
          >
            <Plus size={16} className="text-primary-foreground" />
            <Text size="sm" className="font-medium text-primary-foreground">
              Add Entry
            </Text>
          </Pressable>
        </View>

        {selectedEntries.length === 0 ? (
          <Card className="w-full p-4">
            <View className="items-center py-4">
              <NotebookPen size={24} className="text-muted-foreground" />
              <Text size="sm" className="mt-2 text-muted-foreground">
                Nothing written on this date.
              </Text>
            </View>
          </Card>
        ) : (
          <View className="gap-3">
            {selectedEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onPress={goToEntry} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function monthTuple(
  year: number,
  month: number,
  delta: number,
): [number, number] {
  const next = shiftMonth(year, month, delta);
  return [next.year, next.month];
}
