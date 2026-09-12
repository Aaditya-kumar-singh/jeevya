import { ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { savingsGoals } from '@/lib/mockData';

export default function GoalsScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Finance · Goals
          </Text>
          <Heading size="xl" className="mt-1">
            Savings goals
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {savingsGoals.length} active goals
          </Text>
        </View>

        <View className="gap-3">
          {savingsGoals.map((goal) => {
            const pct = goal.target > 0 ? Math.round((goal.saved / goal.target) * 100) : 0;
            return (
              <Card key={goal.id} className="w-full p-4">
                <View className="flex-row items-center justify-between">
                  <Heading size="sm">{goal.name}</Heading>
                  <Text size="sm" className="text-muted-foreground">
                    {pct}%
                  </Text>
                </View>
                <Progress value={Math.min(100, pct)} className="mt-3">
                  <ProgressFilledTrack />
                </Progress>
                <Text size="sm" className="mt-2 text-muted-foreground">
                  ₹{goal.saved.toLocaleString('en-IN')} saved of ₹{goal.target.toLocaleString('en-IN')}
                </Text>
              </Card>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

