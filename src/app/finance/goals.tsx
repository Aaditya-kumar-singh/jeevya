import { ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';

export default function GoalsScreen() {
  const { savingsGoals, loading } = useFinance();

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">Finance · Goals</Text>
          <Heading size="xl" className="mt-1">Savings goals</Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {loading ? 'Loading goals…' : `${savingsGoals.length} active goals`}
          </Text>
        </View>

        <View className="gap-3">
          {!loading && savingsGoals.length === 0 ? (
            <Card className="w-full p-5">
              <Heading size="sm">No savings goals yet</Heading>
              <Text size="sm" className="mt-1 text-muted-foreground">
                Create a savings goal to start tracking progress.
              </Text>
            </Card>
          ) : null}
          {savingsGoals.map((goal) => {
            const pct = goal.targetAmount > 0
              ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
              : 0;
            return (
              <Card key={goal.id} className="w-full p-4">
                <View className="flex-row items-center justify-between">
                  <Heading size="sm">{goal.name}</Heading>
                  <Text size="sm" className="text-muted-foreground">{pct}%</Text>
                </View>
                <Progress value={Math.min(100, pct)} className="mt-3">
                  <ProgressFilledTrack />
                </Progress>
                <Text size="sm" className="mt-2 text-muted-foreground">
                  ₹{goal.currentAmount.toLocaleString('en-IN')} saved of ₹{goal.targetAmount.toLocaleString('en-IN')}
                </Text>
              </Card>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
