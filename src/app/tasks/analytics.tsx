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
  CheckCircle,
  Clock,
  Flame,
  Tag,
  TrendingUp,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { DonutChart } from '@/components/charts/DonutChart';
import { LineChart } from '@/components/charts/LineChart';
import { useTaskAnalytics } from '@/hooks/useTaskAnalytics';
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
} from '@/lib/task-analytics';
import { PRIORITY_LABELS } from '@/types/tasks';

// ─── Small building blocks ────────────────────────────────────────────────────

function StatTile({
  value,
  label,
  valueClassName = '',
  icon,
  accessibilityLabel,
}: {
  value: string;
  label: string;
  valueClassName?: string;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <View
      className="flex-1 items-center rounded-xl bg-muted p-3"
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
    >
      {icon}
      <Text size="xl" className={`mt-1 font-bold ${valueClassName}`}>
        {value}
      </Text>
      <Text size="xs" className="text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function BreakdownRow({
  name,
  done,
  total,
  rate,
  icon,
}: {
  name: string;
  done: number;
  total: number;
  rate: number;
  icon?: React.ReactNode;
}) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${name}: ${done} of ${total} completed, ${rate} percent`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-1.5">
          {icon}
          <Text size="sm" className="font-medium" numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Text size="xs" className="text-muted-foreground">
          {done}/{total} · {rate}%
        </Text>
      </View>
      <View className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <View
          className="h-full rounded-full bg-green-500"
          style={{ width: `${rate}%` }}
        />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const TREND_COLORS = {
  created: 'rgb(59,130,246)',
  completed: 'rgb(34,197,94)',
};

export default function TaskAnalyticsScreen() {
  const router = useRouter();
  const {
    period,
    setPeriod,
    summary,
    byPriority,
    byLabel,
    trend,
    hasData,
    loading,
    refreshing,
    error,
    refresh,
  } = useTaskAnalytics();

  const trendLabels = useMemo(() => trend.map((p) => p.label), [trend]);
  const trendSeries = useMemo(
    () => [
      {
        label: 'Created',
        color: TREND_COLORS.created,
        data: trend.map((p) => p.created),
      },
      {
        label: 'Completed',
        color: TREND_COLORS.completed,
        data: trend.map((p) => p.completed),
      },
    ],
    [trend],
  );

  const priorityDonut = useMemo(
    () =>
      byPriority
        .filter((p) => p.completed > 0)
        .map((p) => ({
          label: PRIORITY_LABELS[p.priority],
          value: p.completed,
        })),
    [byPriority],
  );

  const labelDonut = useMemo(
    () =>
      byLabel
        .filter((l) => l.completed > 0)
        .slice(0, 6)
        .map((l) => ({ label: l.name, value: l.completed })),
    [byLabel],
  );

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
        <Button onPress={() => void refresh()} variant="outline" className="mt-4">
          <ButtonText>Retry</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Tasks
            </Text>
            <Heading size="xl" className="mt-1">
              Analytics
            </Heading>
          </View>
        </View>

        {/* Period selector */}
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
          {ANALYTICS_PERIODS.map((p: AnalyticsPeriod) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                className={`min-h-[44px] flex-1 items-center justify-center rounded-lg ${
                  active ? 'bg-primary' : 'bg-muted'
                }`}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Last ${p} days`}
              >
                <Text
                  size="sm"
                  className={`font-medium ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {p}D
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!hasData ? (
          <Card className="w-full items-center p-6">
            <Text size="3xl">📊</Text>
            <Heading size="md" className="mt-3 text-center">
              No task data yet
            </Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">
              Create and complete tasks to see productivity insights.
            </Text>
          </Card>
        ) : (
          <>
            {/* Streak banner */}
            <Card className="w-full p-4">
              <View
                className="flex-row items-center gap-3"
                accessibilityRole="text"
                accessibilityLabel={`Productive-day streak: ${summary.streak} days`}
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
                    Productive-day streak
                  </Text>
                </View>
              </View>
            </Card>

            {/* Backlog snapshot */}
            <Card className="w-full p-4">
              <Heading size="sm">Backlog</Heading>
              <View className="mt-3 flex-row gap-3">
                <StatTile value={`${summary.totalActive}`} label="Active" />
                <StatTile
                  value={`${summary.completed}`}
                  label="Done"
                  valueClassName="text-green-500"
                />
              </View>
              <View className="mt-3 flex-row gap-3">
                <StatTile
                  value={`${summary.completionRate}%`}
                  label="Completion rate"
                />
                <StatTile
                  value={`${summary.overdue}`}
                  label="Overdue"
                  valueClassName={
                    summary.overdue > 0 ? 'text-red-500' : 'text-foreground'
                  }
                />
              </View>
              <View className="mt-3">
                <View className="flex-row items-center justify-between">
                  <Text size="xs" className="text-muted-foreground">
                    Progress
                  </Text>
                  <Text size="xs" className="font-medium">
                    {summary.completionRate}%
                  </Text>
                </View>
                <View className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <View
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${summary.completionRate}%` }}
                  />
                </View>
              </View>
            </Card>

            {/* Period flow */}
            <Card className="w-full p-4">
              <Heading size="sm">
                Last {period} days
              </Heading>
              <Text size="xs" className="mt-1 text-muted-foreground">
                {summary.start} → {summary.end}
              </Text>
              <View className="mt-3 flex-row gap-3">
                <StatTile
                  value={`${summary.createdInPeriod}`}
                  label="Created"
                />
                <StatTile
                  value={`${summary.completedInPeriod}`}
                  label="Completed"
                  valueClassName="text-green-500"
                />
              </View>
              <View className="mt-3 flex-row gap-3">
                <StatTile
                  value={`${summary.completedOnTime}`}
                  label="On time"
                  valueClassName="text-green-500"
                  icon={<CheckCircle size={16} className="text-green-500" />}
                />
                <StatTile
                  value={`${summary.completedLate}`}
                  label="Late"
                  valueClassName={
                    summary.completedLate > 0
                      ? 'text-red-500'
                      : 'text-foreground'
                  }
                  icon={
                    <Clock
                      size={16}
                      className={
                        summary.completedLate > 0
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                      }
                    />
                  }
                />
              </View>
            </Card>

            {/* Daily trend */}
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <TrendingUp size={14} className="text-muted-foreground" />
                <Heading size="sm">Daily trend</Heading>
              </View>
              <LineChart labels={trendLabels} series={trendSeries} />
            </Card>

            {/* Completion by priority */}
            <Card className="w-full p-4">
              <Heading size="sm">Completed by priority</Heading>
              {priorityDonut.length === 0 ? (
                <Text size="sm" className="mt-2 text-muted-foreground">
                  Nothing completed yet.
                </Text>
              ) : (
                <>
                  <View className="mt-3 items-center">
                    <DonutChart
                      data={priorityDonut}
                      centerLabel={`${summary.completed} done`}
                    />
                  </View>
                  <View className="mt-3 gap-3">
                    {byPriority.map((p) => (
                      <BreakdownRow
                        key={p.priority}
                        name={PRIORITY_LABELS[p.priority]}
                        done={p.completed}
                        total={p.total}
                        rate={p.rate}
                      />
                    ))}
                  </View>
                </>
              )}
            </Card>

            {/* Completion by label */}
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <Tag size={14} className="text-muted-foreground" />
                <Heading size="sm">Completed by label</Heading>
              </View>
              {byLabel.length === 0 ? (
                <Text size="sm" className="text-muted-foreground">
                  No labeled tasks yet. Add labels to tasks to break down
                  productivity here.
                </Text>
              ) : (
                <>
                  {labelDonut.length > 0 && (
                    <View className="items-center">
                      <DonutChart
                        data={labelDonut}
                        centerLabel={`${labelDonut.reduce((n, d) => n + d.value, 0)} done`}
                      />
                    </View>
                  )}
                  <View className="mt-3 gap-3">
                    {byLabel.slice(0, 8).map((l) => (
                      <BreakdownRow
                        key={l.labelId}
                        name={l.name}
                        done={l.completed}
                        total={l.total}
                        rate={l.rate}
                        icon={<Tag size={12} className="text-muted-foreground" />}
                      />
                    ))}
                  </View>
                </>
              )}
            </Card>
          </>
        )}

        {/* Error banner (non-fatal) */}
        {error && hasData && (
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
        )}
      </View>
    </ScrollView>
  );
}
