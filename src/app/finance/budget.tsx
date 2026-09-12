import { ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { budgetCategories } from '@/lib/mockData';

export default function BudgetScreen() {
  const totalSpent = budgetCategories.reduce((sum, c) => sum + c.spent, 0);
  const totalLimit = budgetCategories.reduce((sum, c) => sum + c.limit, 0);
  const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Finance · Budget
          </Text>
          <Heading size="xl" className="mt-1">
            Monthly budget
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            ₹{totalSpent.toLocaleString('en-IN')} of ₹{totalLimit.toLocaleString('en-IN')} · {pct}% used
          </Text>
        </View>

        <Card className="w-full p-4">
          <Heading size="md">Overall</Heading>
          <Progress value={pct} className="mt-3">
            <ProgressFilledTrack />
          </Progress>
        </Card>

        <View className="gap-3">
          {budgetCategories.map((cat) => {
            const used = cat.limit > 0 ? Math.round((cat.spent / cat.limit) * 100) : 0;
            const left = Math.max(0, cat.limit - cat.spent);
            return (
              <Card key={cat.id} className="w-full p-4">
                <View className="flex-row items-center justify-between">
                  <Heading size="sm">{cat.name}</Heading>
                  <Text size="sm" className="text-muted-foreground">
                    {used}%
                  </Text>
                </View>
                <Progress value={Math.min(100, used)} className="mt-3">
                  <ProgressFilledTrack />
                </Progress>
                <Text size="sm" className="mt-2 text-muted-foreground">
                  ₹{cat.spent.toLocaleString('en-IN')} spent · ₹{left.toLocaleString('en-IN')} left of ₹
                  {cat.limit.toLocaleString('en-IN')}
                </Text>
              </Card>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

