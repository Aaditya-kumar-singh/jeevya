import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { financeSnapshot } from '@/lib/mockData';

interface FinanceSnapshotProps {
  spent?: number;
  budgetRemaining?: number;
}

export function FinanceSnapshot({
  spent = financeSnapshot.spent,
  budgetRemaining = financeSnapshot.budgetRemaining,
}: FinanceSnapshotProps) {
  const total = spent + budgetRemaining;
  const pct = total > 0 ? Math.round((spent / total) * 100) : 0;

  return (
    <Card className="w-full p-4">
      <Heading size="md">Finance</Heading>
      <Text size="sm" className="text-muted-foreground">
        Balance and budget preview
      </Text>
      <View className="mt-3 flex-row items-baseline gap-2">
        <Heading size="xl">₹{spent.toLocaleString('en-IN')}</Heading>
        <Text size="sm" className="text-muted-foreground">
          spent
        </Text>
      </View>
      <Progress value={pct} className="mt-3">
        <ProgressFilledTrack />
      </Progress>
      <Text size="sm" className="mt-2 text-muted-foreground">
        ₹{budgetRemaining.toLocaleString('en-IN')} left ({100 - pct}% of budget)
      </Text>
    </Card>
  );
}

export default FinanceSnapshot;

