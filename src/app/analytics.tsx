import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3 } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useLifeOSAnalytics } from '@/hooks/useLifeOSAnalytics';
import { useHistoricalAnalytics } from '@/hooks/useHistoricalAnalytics';
import type { LifeOSAnalyticsPeriod } from '@/types/lifeosAnalytics';
import type { HistoricalAnalyticsFilter, HistoricalAnalyticsPeriod } from '@/types/historicalAnalytics';

const PERIODS: LifeOSAnalyticsPeriod[] = [7, 30, 90];
const HISTORICAL_PERIODS: HistoricalAnalyticsPeriod[] = [7, 30, 90];
const HISTORICAL_FILTERS: HistoricalAnalyticsFilter[] = ['all', 'tasks', 'habits', 'health', 'nutrition', 'finance', 'books', 'journal', 'goals'];

const FILTER_LABELS: Record<HistoricalAnalyticsFilter, string> = {
  all: 'All', tasks: 'Tasks', habits: 'Habits', health: 'Health', nutrition: 'Nutrition', finance: 'Finance', books: 'Books', journal: 'Journal', goals: 'Goals',
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 p-4">
      <Text size="xs" className="text-muted-foreground">{label}</Text>
      <Heading size="md" className="mt-1">{value}</Heading>
    </Card>
  );
}

function HistoricalMetricCard({ metric }: { metric: import('@/types/historicalAnalytics').HistoricalMetric }) {
  const value = metric.currentValue == null ? '—' : `${Number(metric.currentValue.toFixed(1))}${metric.unit ? ` ${metric.unit}` : ''}`;
  const change = metric.absoluteChange == null ? 'Insufficient data' : `${metric.absoluteChange >= 0 ? '+' : ''}${Number(metric.absoluteChange.toFixed(1))}${metric.percentagePointChange != null ? ` pp` : metric.unit ? ` ${metric.unit}` : ''}`;
  const trend = metric.status === 'insufficient_data' ? 'Insufficient data' : metric.status;
  return (
    <Card className="flex-1 p-4">
      <Text size="xs" className="text-muted-foreground">{metric.label}</Text>
      <Heading size="md" className="mt-1">{value}</Heading>
      <Text size="xs" className="mt-1 text-muted-foreground">{change} · {trend}</Text>
    </Card>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { period, data, loading, refreshing, error, refresh, setPeriod } = useLifeOSAnalytics();
  const historical = useHistoricalAnalytics();

  if (loading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">Loading analytics...</Text>
      </View>
    );
  }

  const summary = data?.summary;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
    >
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">Jeevya · Insights</Text>
            <Heading size="xl" className="mt-1">Jeevya Analytics</Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">One read-only view across your daily systems</Text>
          </View>
          <BarChart3 size={24} className="text-primary" />
        </View>

        <View className="flex-row gap-2">
          {PERIODS.map((value) => (
            <Pressable
              key={value}
              className={`rounded-full border px-4 py-2 ${period === value ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
              onPress={() => setPeriod(value)}
            >
              <Text size="xs" className="font-semibold">{value}d</Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <Card className="w-full p-3">
            <Text size="xs" className="text-red-600 dark:text-red-400">{error}</Text>
          </Card>
        ) : null}

        <Card className="w-full p-4">
          <Heading size="sm">Historical comparison</Heading>
          <Text size="xs" className="mt-1 text-muted-foreground">Read-only comparison with the immediately preceding period</Text>
          <View className="mt-3 flex-row gap-2 flex-wrap">
            {HISTORICAL_PERIODS.map((value) => (
              <Pressable key={value} className={`rounded-full border px-4 py-2 ${historical.period === value ? 'border-primary bg-primary/10' : 'border-border bg-card'}`} onPress={() => historical.setPeriod(value)}>
                <Text size="xs" className="font-semibold">{value}d</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
            <View className="flex-row gap-2">
              {HISTORICAL_FILTERS.map((value) => (
                <Pressable key={value} className={`rounded-full border px-3 py-2 ${historical.filter === value ? 'border-primary bg-primary/10' : 'border-border bg-card'}`} onPress={() => historical.setFilter(value)}>
                  <Text size="xs" className="font-semibold">{FILTER_LABELS[value]}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {historical.error ? <Text size="xs" className="mt-3 text-red-600 dark:text-red-400">{historical.error}</Text> : null}
          {historical.data?.degradedDomains.length ? <Text size="xs" className="mt-2 text-muted-foreground">Some historical data is degraded: {historical.data.degradedDomains.join(', ')}</Text> : null}
          {historical.loading && !historical.data ? (
            <View className="items-center py-5"><ActivityIndicator size="small" className="text-primary" /></View>
          ) : historical.data?.metrics.length ? (
            <View className="mt-3 gap-3">
              {historical.data.metrics.map((item) => <HistoricalMetricCard key={item.id} metric={item} />)}
            </View>
          ) : (
            <Text size="sm" className="mt-4 text-muted-foreground">No comparable historical data is available for this selection.</Text>
          )}
        </Card>

        {summary ? (
          <>
            <View className="flex-row gap-3">
              <Metric label="Task completion" value={summary.taskCompletionRate === null ? '—' : `${summary.taskCompletionRate}%`} />
              <Metric label="Habit average" value={summary.averageHabitCompletionRate === null ? '—' : `${summary.averageHabitCompletionRate}%`} />
            </View>
            <View className="flex-row gap-3">
              <Metric label="Workouts" value={`${summary.totalWorkouts}`} />
              <Metric label="Workout time" value={`${summary.totalWorkoutMinutes} min`} />
            </View>
            <View className="flex-row gap-3">
              <Metric label="Avg sleep" value={summary.averageSleepMinutes === null ? '—' : `${(summary.averageSleepMinutes / 60).toFixed(1)}h`} />
              <Metric label="Readiness" value={summary.averageReadinessScore === null ? '—' : `${Math.round(summary.averageReadinessScore)}`} />
            </View>
            <View className="flex-row gap-3">
              <Metric label="Calories in" value={summary.averageCaloriesIn === null ? '—' : `${Math.round(summary.averageCaloriesIn)} kcal`} />
              <Metric label="Protein" value={summary.averageProteinGrams === null ? '—' : `${Math.round(summary.averageProteinGrams)} g`} />
            </View>
            <View className="flex-row gap-3">
              <Metric label="Transactions" value={`${summary.totalFinanceTransactions}`} />
              <Metric label="Journal entries" value={`${summary.totalJournalEntries}`} />
            </View>
            <Card className="w-full p-4">
              <Heading size="sm">Cross-module activity</Heading>
              <View className="mt-3 gap-2">
                <Text size="sm" className="text-muted-foreground">{summary.totalTasksCompleted} tasks completed across {summary.days} days</Text>
                <Text size="sm" className="text-muted-foreground">{summary.totalOverdueTaskDays} overdue-task days recorded</Text>
                <Text size="sm" className="text-muted-foreground">₹{Math.round(summary.totalFinanceIncome).toLocaleString('en-IN')} income · ₹{Math.round(summary.totalFinanceExpense).toLocaleString('en-IN')} expense</Text>
                <Text size="sm" className="text-muted-foreground">{summary.goalCompletionCount} completed-goal observations · {summary.goalBehindDays} behind-goal observations</Text>
              </View>
            </Card>
          </>
        ) : (
          <Card className="items-center p-6">
            <BarChart3 size={28} className="text-muted-foreground" />
            <Heading size="md" className="mt-3">No analytics available</Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">Start using Jeevya modules and cross-module activity will appear here.</Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
