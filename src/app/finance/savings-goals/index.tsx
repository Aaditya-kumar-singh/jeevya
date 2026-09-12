import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { ArrowLeft, Plus, Target, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDeadlineStatus(deadline: string): { label: string; color: string; icon: typeof Clock } {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Overdue', color: 'text-red-600 dark:text-red-400', icon: AlertCircle };
  } else if (diffDays <= 7) {
    return { label: 'Due soon', color: 'text-orange-600 dark:text-orange-400', icon: Clock };
  } else if (diffDays <= 30) {
    return { label: 'Upcoming', color: 'text-yellow-600 dark:text-yellow-400', icon: Clock };
  } else {
    return { label: 'On track', color: 'text-green-600 dark:text-green-400', icon: Clock };
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SavingsGoalsScreen() {
  const { savingsGoals, loading, refreshing, refresh } = useFinance();

  // Calculate totals
  const totalSaved = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);

  // Loading state
  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text size="sm" className="mt-3 text-muted-foreground">
            Loading savings goals...
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => {}}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Finance · Savings Goals
            </Text>
            <Heading size="xl" className="mt-1">
              Savings Goals
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              {savingsGoals.length} active goals
            </Text>
          </View>
          <Link href="/finance/add-savings-goal" asChild>
            <Pressable>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Plus size={20} className="text-primary-foreground" />
              </View>
            </Pressable>
          </Link>
        </View>

        {/* Summary Card */}
        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text size="sm" className="text-muted-foreground">
                Total Saved
              </Text>
              <Heading size="lg" className="mt-1">
                {formatCurrency(totalSaved)}
              </Heading>
            </View>
            <View className="items-end">
              <Text size="sm" className="text-muted-foreground">
                Total Target
              </Text>
              <Heading size="lg" className="mt-1">
                {formatCurrency(totalTarget)}
              </Heading>
            </View>
          </View>
          {totalTarget > 0 && (
            <Progress value={Math.min(100, Math.round((totalSaved / totalTarget) * 100))} className="mt-3">
              <ProgressFilledTrack />
            </Progress>
          )}
          <Text size="xs" className="mt-2 text-muted-foreground">
            {totalTarget > 0 ? `${Math.round((totalSaved / totalTarget) * 100)}% of your goals completed` : 'No goals set yet'}
          </Text>
        </Card>

        {/* Goals List */}
        {savingsGoals.length === 0 ? (
          <Card className="w-full items-center p-6">
            <Target size={32} className="text-muted-foreground" />
            <Heading size="md" className="mt-4">
              No savings goals yet
            </Heading>
            <Text size="sm" className="mt-2 text-center text-muted-foreground">
              Create your first savings goal to start tracking your progress.
            </Text>
            <Link href="/finance/add-savings-goal" asChild>
              <Pressable>
                <Button variant="default" className="mt-4">
                  <ButtonText>Create Goal</ButtonText>
                </Button>
              </Pressable>
            </Link>
          </Card>
        ) : (
          <View className="gap-3">
            {savingsGoals.map((goal) => {
              const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
              const isCompleted = goal.currentAmount >= goal.targetAmount;
              const deadlineStatus = goal.deadline ? getDeadlineStatus(goal.deadline) : null;

              return (
                <Link
                  key={goal.id}
                  href={{ pathname: '/finance/savings-goals/[id]', params: { id: goal.id } }}
                  asChild>
                  <Pressable>
                    <Card className="w-full p-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 flex-row items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <Target size={18} className="text-primary" />
                          )}
                          <Text size="md" className="font-medium">
                            {goal.name}
                          </Text>
                        </View>
                        <Text size="sm" className="text-muted-foreground">
                          {pct}%
                        </Text>
                      </View>

                      <Progress value={pct} className="mt-3">
                        <ProgressFilledTrack />
                      </Progress>

                      <View className="mt-2 flex-row items-center justify-between">
                        <Text size="sm" className="text-muted-foreground">
                          {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                        </Text>
                        {isCompleted ? (
                          <Text size="xs" className="font-medium text-green-600 dark:text-green-400">
                            Completed!
                          </Text>
                        ) : (
                          <Text size="xs" className="text-muted-foreground">
                            {formatCurrency(remaining)} remaining
                          </Text>
                        )}
                      </View>

                      {deadlineStatus && (
                        <View className="mt-2 flex-row items-center gap-1">
                          <deadlineStatus.icon size={12} className={deadlineStatus.color} />
                          <Text size="xs" className={deadlineStatus.color}>
                            {deadlineStatus.label} · Due {formatDate(goal.deadline)}
                          </Text>
                        </View>
                      )}
                    </Card>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
