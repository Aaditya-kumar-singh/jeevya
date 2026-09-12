import { View } from 'react-native';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import { financeSnapshot } from '@/lib/mockData';
import { Wallet } from 'lucide-react-native';

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
  const isHighSpend = pct > 80;

  return (
    <Card className="w-full p-5 border border-emerald-500/20 bg-card shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <Wallet size={20} className="text-emerald-500" />
          </View>
          <View>
            <Heading size="md" className="font-bold">Finance</Heading>
            <Text size="xs" className="text-muted-foreground font-medium">
              Monthly budget status
            </Text>
          </View>
        </View>
        <View className="rounded-full bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20">
          <Text size="xs" className="font-bold text-emerald-600 dark:text-emerald-400">
            {100 - pct}% left
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-baseline justify-between">
        <View>
          <Text size="xs" className="text-muted-foreground font-medium">Spent so far</Text>
          <Heading size="xl" className="mt-0.5 font-bold tracking-tight text-foreground">
            ₹{spent.toLocaleString('en-IN')}
          </Heading>
        </View>
        <View className="items-end">
          <Text size="xs" className="text-muted-foreground font-medium">Remaining</Text>
          <Text size="md" className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400">
            ₹{budgetRemaining.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View className="mt-3">
        <AnimatedProgress
          value={pct}
          height={8}
          color={isHighSpend ? 'bg-rose-500' : 'bg-emerald-500'}
        />
      </View>
    </Card>
  );
}

export default FinanceSnapshot;
