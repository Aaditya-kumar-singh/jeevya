import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Heading, Text } from '@/components/ui';

export default function PaymentReviewCard({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Pressable onPress={() => router.push('/finance/import-payments' as never)}>
      <Card className="w-full p-4 border border-amber-500/25 bg-amber-500/5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1"><Heading size="sm">Imported payments need review</Heading><Text size="xs" className="mt-1 text-muted-foreground">{count} imported payment{count === 1 ? '' : 's'} are waiting for your review.</Text></View>
          <Text size="lg" className="font-bold text-amber-600 dark:text-amber-400">{count}</Text>
        </View>
      </Card>
    </Pressable>
  );
}
