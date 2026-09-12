import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Flame,
  Star,
  Tag,
  Target,
  TrendingUp,
  User,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { DonutChart } from '@/components/charts/DonutChart';
import { LineChart } from '@/components/charts/LineChart';
import { useBookAnalytics } from '@/hooks/useBookAnalytics';
import {
  BOOK_ANALYTICS_PERIODS,
  type BookAnalyticsPeriod,
} from '@/lib/book-analytics';
import { formatGoalPeriod } from '@/services/book-goals';

// ─── Small building blocks ────────────────────────────────────────────────────

function StatTile({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View
      className="flex-1 items-center rounded-xl bg-muted p-3"
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text size="xl" className="font-bold">
        {value}
      </Text>
      <Text size="xs" className="text-center text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function BarRow({
  name,
  detail,
  fraction,
  icon,
  accessibilityLabel,
}: {
  name: string;
  detail: string;
  fraction: number;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const width = Math.min(100, Math.max(0, Math.round(fraction * 100)));
  return (
    <View accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? `${name}: ${detail}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-1.5">
          {icon}
          <Text size="sm" className="font-medium" numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Text size="xs" className="text-muted-foreground">
          {detail}
        </Text>
      </View>
      <View className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <View
          className="h-full rounded-full bg-green-500"
          style={{ width: `${width}%` }}
        />
      </View>
    </View>
  );
}

function periodLabel(period: BookAnalyticsPeriod): string {
  return period === 'all' ? 'All' : `${period}D`;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookAnalyticsScreen() {
  const router = useRouter();
  const {
    period,
    setPeriod,
    summary,
    series,
    best,
    categories,
    authors,
    ratings,
    goalInsights,
    hasData,
    loading,
    refreshing,
    error,
    refresh,
  } = useBookAnalytics();

  const activityLabels = useMemo(() => series.map((p) => p.label), [series]);
  const activitySeries = useMemo(
    () => [
      {
        label: 'Pages',
        color: 'rgb(34,197,94)',
        data: series.map((p) => p.pages),
      },
    ],
    [series],
  );

  const statusDonut = useMemo(
    () =>
      [
        { label: 'Want to Read', value: summary.wantToRead },
        { label: 'Reading', value: summary.reading },
        { label: 'Completed', value: summary.completed },
      ].filter((d) => d.value > 0),
    [summary],
  );

  const categoryDonut = useMemo(
    () => categories.map((c) => ({ label: c.category, value: c.books })),
    [categories],
  );

  const ratedTotal = useMemo(
    () => ratings.reduce((n, r) => n + r.count, 0),
    [ratings],
  );

  const rangeLabel =
    summary.start != null
      ? `${summary.start} → ${summary.end}`
      : `All time → ${summary.end}`;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading analytics...
        </Text>
      </View>
    );
  }

  if (error && !hasData) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <AlertTriangle size={32} className="text-destructive" />
        <Heading size="md" className="mt-3 text-center">
          Failed to load analytics
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          {error}
        </Text>
        <Button onPress={() => void refresh()} variant="outline" className="mt-4 min-h-[44px]">
          <ButtonText>Retry</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Books
            </Text>
            <Heading size="xl" className="mt-1">
              Analytics
            </Heading>
          </View>
        </View>

        {/* Period selector */}
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
          {BOOK_ANALYTICS_PERIODS.map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={String(p)}
                onPress={() => setPeriod(p)}
                className={`min-h-[44px] flex-1 items-center justify-center rounded-lg ${
                  active ? 'bg-primary' : 'bg-muted'
                }`}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={
                  p === 'all' ? 'All time' : `Last ${p} days`
                }
              >
                <Text
                  size="sm"
                  className={`font-medium ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {periodLabel(p)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!hasData ? (
          <Card className="w-full items-center p-6">
            <Text size="3xl">📊</Text>
            <Heading size="md" className="mt-3 text-center">
              No book data yet
            </Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">
              Add books and log reading progress to see insights.
            </Text>
          </Card>
        ) : (
          <>
            {/* Streak */}
            <Card className="w-full p-4">
              <View
                className="flex-row items-center gap-3"
                accessibilityRole="text"
                accessibilityLabel={`Reading streak: ${summary.streak} days`}
              >
                <View
                  className={`h-12 w-12 items-center justify-center rounded-full ${
                    summary.streak > 0
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-muted'
                  }`}
                >
                  <Flame
                    size={22}
                    className={
                      summary.streak > 0 ? 'text-amber-500' : 'text-muted-foreground'
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text size="xl" className="font-bold">
                    {summary.streak} day{summary.streak === 1 ? '' : 's'}
                  </Text>
                  <Text size="sm" className="text-muted-foreground">
                    Reading streak (days with pages logged)
                  </Text>
                </View>
              </View>
            </Card>

            {/* Library snapshot */}
            <Card className="w-full p-4">
              <Heading size="sm">Library</Heading>
              <View className="mt-3 flex-row gap-2">
                <StatTile value={`${summary.totalBooks}`} label="Books" />
                <StatTile value={`${summary.reading}`} label="Reading" />
              </View>
              <View className="mt-2 flex-row gap-2">
                <StatTile value={`${summary.completed}`} label="Done" />
                <StatTile
                  value={`${summary.completionRate}%`}
                  label="Completion"
                />
              </View>
              <View className="mt-2 flex-row gap-2">
                <StatTile value={`${summary.pagesReached}`} label="Pages reached" />
                <StatTile
                  value={
                    summary.averageRating != null
                      ? `${summary.averageRating}`
                      : '—'
                  }
                  label="Avg rating"
                />
              </View>
            </Card>

            {/* Period activity */}
            <Card className="w-full p-4">
              <Heading size="sm">
                {period === 'all' ? 'All time' : `Last ${period} days`}
              </Heading>
              <Text size="xs" className="mt-1 text-muted-foreground">
                {rangeLabel}
              </Text>
              <View className="mt-3 flex-row gap-2">
                <StatTile
                  value={`${summary.completedInPeriod}`}
                  label="Books finished"
                />
                <StatTile
                  value={`${summary.pagesInPeriod}`}
                  label="Pages read"
                />
              </View>
              <View className="mt-2 flex-row gap-2">
                <StatTile
                  value={`${summary.activeDays}`}
                  label="Active days"
                />
                <StatTile
                  value={`${summary.avgPagesPerActiveDay}`}
                  label="Pages / day"
                />
              </View>
              {best ? (
                <Text size="xs" className="mt-2 text-muted-foreground">
                  Best day: {best.label} ({best.pages} pages)
                </Text>
              ) : (
                <Text size="xs" className="mt-2 text-muted-foreground">
                  No pages logged in this period yet.
                </Text>
              )}
            </Card>

            {/* Daily activity chart */}
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <TrendingUp size={14} className="text-muted-foreground" />
                <Heading size="sm">Reading activity</Heading>
              </View>
              <LineChart labels={activityLabels} series={activitySeries} />
            </Card>

            {/* Status distribution */}
            <Card className="w-full p-4">
              <Heading size="sm">Status mix</Heading>
              {statusDonut.length === 0 ? (
                <Text size="sm" className="mt-2 text-muted-foreground">
                  No data
                </Text>
              ) : (
                <View className="mt-3 items-center">
                  <DonutChart
                    data={statusDonut}
                    centerLabel={`${summary.totalBooks} books`}
                  />
                </View>
              )}
            </Card>

            {/* Categories */}
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <Tag size={14} className="text-muted-foreground" />
                <Heading size="sm">Top categories</Heading>
              </View>
              {categories.length === 0 ? (
                <Text size="sm" className="text-muted-foreground">
                  Add categories to books to see this breakdown.
                </Text>
              ) : (
                <>
                  <View className="items-center">
                    <DonutChart
                      data={categories.map((c) => ({
                        label: c.category,
                        value: c.books,
                      }))}
                      centerLabel={`${categories.reduce((n, c) => n + c.books, 0)} books`}
                    />
                  </View>
                  <View className="mt-3 gap-3">
                    {categories.map((c) => (
                      <BarRow
                        key={c.category}
                        name={c.category}
                        detail={`${c.books} books · ${c.pages} pages`}
                        fraction={
                          c.books / Math.max(1, categories[0].books)
                        }
                      />
                    ))}
                  </View>
                </>
              )}
            </Card>

            {/* Authors */}
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <User size={14} className="text-muted-foreground" />
                <Heading size="sm">Top authors</Heading>
              </View>
              {authors.length === 0 ? (
                <Text size="sm" className="text-muted-foreground">
                  Add authors to books to see this breakdown.
                </Text>
              ) : (
                <View className="gap-3">
                  {authors.map((a) => (
                    <BarRow
                      key={a.author}
                      name={a.author}
                      detail={`${a.books} books · ${a.pages} pages`}
                      fraction={a.books / Math.max(1, authors[0].books)}
                      icon={<User size={12} className="text-muted-foreground" />}
                    />
                  ))}
                </View>
              )}
            </Card>

            {/* Ratings */}
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <Star size={14} className="text-muted-foreground" />
                <Heading size="sm">Ratings</Heading>
              </View>
              {ratedTotal === 0 ? (
                <Text size="sm" className="text-muted-foreground">
                  No rated books yet.
                </Text>
              ) : (
                <View className="gap-3">
                  {ratings.map((r) => (
                    <BarRow
                      key={r.stars}
                      name={`${r.stars}★`}
                      detail={`${r.count}`}
                      fraction={r.count / Math.max(1, ratedTotal)}
                      icon={<Star size={12} className="text-amber-500" />}
                      accessibilityLabel={`${r.count} books rated ${r.stars} stars`}
                    />
                  ))}
                </View>
              )}
            </Card>

            {/* Goal insights */}
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Target size={14} className="text-muted-foreground" />
                  <Heading size="sm">Active goals</Heading>
                </View>
                <Pressable
                  onPress={() => router.push('/books/goals' as any)}
                  className="min-h-[44px] justify-center px-2"
                  accessibilityRole="button"
                  accessibilityLabel="View all reading goals"
                >
                  <Text size="xs" className="font-medium text-primary">
                    View all
                  </Text>
                </Pressable>
              </View>
              {goalInsights.length === 0 ? (
                <Text size="sm" className="text-muted-foreground">
                  No active goals. Set one to track targets here.
                </Text>
              ) : (
                <View className="gap-3">
                  {goalInsights.slice(0, 3).map(({ goal, achieved, percent }) => (
                    <BarRow
                      key={goal.id}
                      name={formatGoalPeriod(goal)}
                      detail={`${achieved}/${goal.target} · ${percent}%`}
                      fraction={percent / 100}
                    />
                  ))}
                </View>
              )}
            </Card>
          </>
        )}

        {error && hasData ? (
          <Card className="w-full border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">
                {error}
              </Text>
              <Pressable onPress={() => void refresh()}>
                <Text size="xs" className="font-medium text-red-600 dark:text-red-400">
                  Retry
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}
