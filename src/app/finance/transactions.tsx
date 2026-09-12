import { ScrollView, View } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { transactions } from '@/lib/mockData';

export default function TransactionsScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Finance · Transactions
          </Text>
          <Heading size="xl" className="mt-1">
            Recent activity
          </Heading>
        </View>
        <View className="gap-3">
          {transactions.map((tx) => (
            <Card key={tx.id} className="w-full p-4">
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Heading size="sm">{tx.label}</Heading>
                  <Text size="sm" className="text-muted-foreground">
                    {tx.date} · {tx.category}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text
                    size="md"
                    className={`font-semibold ${tx.kind === 'income' ? 'text-green-500' : ''}`}>
                    {tx.kind === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </Text>
                  <Badge variant={tx.kind === 'income' ? 'default' : 'secondary'}>
                    <BadgeText>{tx.kind === 'income' ? 'Income' : 'Expense'}</BadgeText>
                  </Badge>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

