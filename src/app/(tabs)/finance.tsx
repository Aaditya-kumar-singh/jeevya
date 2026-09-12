import { Pressable, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { ChevronRight, Receipt, Target, Wallet } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { budgetCategories, financeSnapshot } from '@/lib/mockData';

const tiles: {
  label: string;
  value: string;
  href: '/finance/transactions' | '/finance/budget' | '/finance/goals';
  icon: typeof Wallet;
}[] = [
  { label: 'Transactions', value: 'Recent activity', href: '/finance/transactions', icon: Receipt },
  { label: 'Budget', value: '4 categories', href: '/finance/budget', icon: Wallet },
  { label: 'Goals', value: '3 savings goals', href: '/finance/goals', icon: Target },
];

export default function FinanceScreen() {
  const total = financeSnapshot.spent + financeSnapshot.budgetRemaining;
  const pct = total > 0 ? Math.round((financeSnapshot.spent / total) * 100) : 0;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Money overview
          </Text>
          <Heading size="xl" className="mt-1">
            ₹{financeSnapshot.spent.toLocaleString('en-IN')} spent
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            ₹{financeSnapshot.budgetRemaining.toLocaleString('en-IN')} left this month
          </Text>
        </View>

        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Heading size="md">Monthly budget</Heading>
            <Text size="sm" className="text-muted-foreground">
              {pct}% used
            </Text>
          </View>
          <Progress value={pct} className="mt-3">
            <ProgressFilledTrack />
          </Progress>
          <View className="mt-3 gap-2">
            {budgetCategories.slice(0, 3).map((cat) => {
              const used = Math.round((cat.spent / cat.limit) * 100);
              return (
                <View key={cat.id} className="flex-row items-center justify-between">
                  <Text size="sm">{cat.name}</Text>
                  <Text size="sm" className="text-muted-foreground">
                    {used}% · ₹{cat.spent.toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View className="gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.label} href={tile.href} asChild>
                <Pressable>
                  <Card className="w-full p-4">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Icon size={18} />
                      </View>
                      <View className="flex-1">
                        <Heading size="sm">{tile.label}</Heading>
                        <Text size="sm" className="text-muted-foreground">
                          {tile.value}
                        </Text>
                      </View>
                      <ChevronRight size={18} />
                    </View>
                  </Card>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

