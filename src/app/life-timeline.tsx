import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock3, Search } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useLifeTimeline } from '@/hooks/useLifeTimeline';
import { addDays, todayCivilDate } from '@/lib/date';
import type { LifeTimelineEvent, LifeTimelineFilter } from '@/types/lifeTimeline';

const DATE_FILTERS = ['all', 'today', 'week', 'month'] as const;

const FILTERS: { label: string; value: LifeTimelineFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Tasks', value: 'tasks' },
  { label: 'Habits', value: 'habits' },
  { label: 'Health', value: 'health/workout' },
  { label: 'Nutrition', value: 'nutrition' },
  { label: 'Finance', value: 'finance' },
  { label: 'Books', value: 'books' },
  { label: 'Journal', value: 'journal' },
  { label: 'Goals', value: 'goals' },
];

function EventRow({ event, onPress }: { event: LifeTimelineEvent; onPress: () => void }) {
  return (
    <Pressable onPress={event.route ? onPress : undefined} disabled={!event.route}>
      <Card className="w-full p-4 border border-border/60 bg-card/90 shadow-xs rounded-3xl">
        <View className="flex-row gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Clock3 size={18} className="text-primary" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <Heading size="sm" className="flex-1 font-bold">{event.title}</Heading>
              <Text size="xs" className="text-muted-foreground">{event.date}</Text>
            </View>
            <Text size="xs" className="mt-1 text-muted-foreground uppercase">{event.domain} · {event.type}</Text>
            {event.description ? <Text size="sm" className="mt-2 text-muted-foreground">{event.description}</Text> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function LifeTimelineScreen() {
  const router = useRouter();
  const { data, query, loading, refreshing, error, refresh, setFilter, setSearch, setRange } = useLifeTimeline();
  const today = todayCivilDate();
  const applyDateFilter = (value: typeof DATE_FILTERS[number]) => {
    if (value === 'all') return setRange(undefined, undefined);
    if (value === 'today') return setRange(today, today);
    if (value === 'week') return setRange(addDays(today, -6) ?? today, today);
    return setRange(`${today.slice(0, 7)}-01`, today);
  };

  if (loading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">Loading timeline...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
    >
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}><ArrowLeft size={20} /></Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">Jeevya · History</Text>
            <Heading size="xl" className="mt-1">Life Timeline</Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">A read-only history across your Jeevya systems</Text>
          </View>
          <Clock3 size={24} className="text-primary" />
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <Search size={17} className="text-muted-foreground" />
          <TextInput
            value={query.search ?? ''}
            onChangeText={setSearch}
            placeholder="Search history"
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-foreground"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {DATE_FILTERS.map((value) => {
            const active = value === 'all'
              ? !query.startDate && !query.endDate
              : value === 'today'
                ? query.startDate === today && query.endDate === today
                : value === 'week'
                  ? query.startDate === (addDays(today, -6) ?? today) && query.endDate === today
                  : query.startDate === `${today.slice(0, 7)}-01` && query.endDate === today;
            return (
              <Pressable key={value} className={`rounded-full border px-4 py-2 ${active ? 'border-primary bg-primary/10' : 'border-border bg-card'}`} onPress={() => applyDateFilter(value)}>
                <Text size="xs" className="font-semibold">{value === 'all' ? 'All time' : value[0].toUpperCase() + value.slice(1)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((filter) => (
            <Pressable
              key={filter.value}
              className={`rounded-full border px-4 py-2 ${query.filter === filter.value || (!query.filter && filter.value === 'all') ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
              onPress={() => setFilter(filter.value)}
            >
              <Text size="xs" className="font-semibold">{filter.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? <Card className="p-3"><Text size="xs" className="text-red-600 dark:text-red-400">{error}</Text></Card> : null}
        {data?.degradedDomains.length ? (
          <Card className="p-3">
            <Text size="xs" className="font-semibold text-amber-600 dark:text-amber-400">Some history is unavailable: {data.degradedDomains.join(', ')}</Text>
          </Card>
        ) : null}

        {!data || data.events.length === 0 ? (
          <Card className="items-center p-6">
            <Clock3 size={28} className="text-muted-foreground" />
            <Heading size="md" className="mt-3">No timeline events</Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">Historical activity will appear here as you use Jeevya.</Text>
          </Card>
        ) : (
          <View className="gap-3">
            {data.events.map((event) => <EventRow key={event.id} event={event} onPress={() => event.route && router.push(event.route as never)} />)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

