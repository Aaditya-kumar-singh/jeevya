import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock, Target, TrendingDown } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useGoalsIntegration } from '@/hooks/useGoalsIntegration';
import { getGoalSourceLabel, getGoalStatusLabel } from '@/services/goalsIntegration';
import type { GoalMetric, UnifiedGoal, UnifiedGoalStatus } from '@/types/goalsIntegration';

function metricUnit(metric: GoalMetric): string {
  switch (metric) {
    case 'books_completed': return 'books';
    case 'pages_read': return 'pages';
    case 'savings_amount': return 'saved';
  }
}

function formatValue(value: number, metric: GoalMetric): string {
  if (metric === 'savings_amount') return `₹${value.toLocaleString('en-IN')}`;
  return value.toLocaleString('en-IN');
}

function statusClass(status: UnifiedGoalStatus): string {
  switch (status) {
    case 'completed': return 'text-green-600 dark:text-green-400';
    case 'behind': return 'text-orange-600 dark:text-orange-400';
    case 'unavailable': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
}

function GoalCard({ goal }: { goal: UnifiedGoal }) {
  const statusColor = statusClass(goal.status);
  const unit = metricUnit(goal.metric);
  const percentage = goal.progressPercentage;

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <Target size={18} className="text-primary" />
        <View className="flex-1">
          <Text size="xs" className="text-muted-foreground">
            {getGoalSourceLabel(goal.source)}
          </Text>
          <Heading size="sm" className="mt-0.5">
            {goal.title}
          </Heading>
        </View>
        <View className="flex-row items-center gap-1">
          {goal.status === 'completed' ? (
            <CheckCircle size={14} className={statusColor} />
          ) : goal.status === 'behind' ? (
            <TrendingDown size={14} className={statusColor} />
          ) : (
            <Clock size={14} className={statusColor} />
          )}
          <Text size="xs" className={statusColor}>
            {getGoalStatusLabel(goal.status)}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-baseline justify-between">
        <Text size="sm" className="text-muted-foreground">
          {goal.currentValue === null || goal.targetValue === null
            ? 'Progress unavailable'
            : `${formatValue(goal.currentValue, goal.metric)} of ${formatValue(goal.targetValue, goal.metric)} ${unit}`}
        </Text>
        <Text size="sm" className="font-medium">
          {percentage === null ? '—' : `${percentage}%`}
        </Text>
      </View>

      {percentage !== null ? (
        <Progress value={percentage} className="mt-2">
          <ProgressFilledTrack />
        </Progress>
      ) : null}

      <View className="mt-2 flex-row items-center justify-between">
        {goal.endDate ? (
          <Text size="xs" className="text-muted-foreground">
            Due {goal.endDate}
          </Text>
        ) : (
          <Text size="xs" className="text-muted-foreground">
            No deadline
          </Text>
        )}
        {goal.currentValue !== null && goal.targetValue !== null && goal.status !== 'completed' && goal.targetValue > goal.currentValue ? (
          <Text size="xs" className="text-muted-foreground">
            {formatValue(goal.targetValue - goal.currentValue, goal.metric)} remaining
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export default function GoalsScreen() {
  const router = useRouter();
  const { goals, loading, refreshing, error, refresh } = useGoalsIntegration();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading goals...
        </Text>
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
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Jeevya · Progress
            </Text>
            <Heading size="xl" className="mt-1">
              Goals & Progress
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              One read-only view across your active goals
            </Text>
          </View>
        </View>

        {error ? (
          <Card className="w-full border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <Text size="xs" className="text-red-600 dark:text-red-400">
              {error}
            </Text>
          </Card>
        ) : null}

        {goals.length === 0 ? (
          <Card className="w-full items-center p-6">
            <Target size={28} className="text-muted-foreground" />
            <Heading size="md" className="mt-3 text-center">
              No configured goals yet
            </Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">
              Goals from supported modules will appear here automatically as their existing domain data provides a target.
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
