import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { CircleAlert, ChevronRight } from 'lucide-react-native';
import { Card, Heading, Text } from '@/components/ui';
import type { DashboardAttentionItem } from '@/types/dashboard';

export default function DashboardAttention({ items }: { items: DashboardAttentionItem[] }) {
  const visible = items.slice(0, 5);
  return (
    <Card className="w-full p-4 border border-amber-500/25 bg-amber-500/5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <CircleAlert size={18} className="text-amber-600 dark:text-amber-400" />
          <Heading size="md">Needs attention</Heading>
        </View>
        <Text size="xs" className="text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'}</Text>
      </View>
      {visible.length === 0 ? (
        <Text size="sm" className="mt-3 text-muted-foreground">Nothing urgent from today’s available data.</Text>
      ) : visible.map((item) => (
        <Pressable key={item.id} onPress={() => item.navigationTarget && router.push(item.navigationTarget as never)} className="mt-3 flex-row items-center gap-3 rounded-2xl border border-border/50 bg-background/70 p-3">
          <View className="flex-1">
            <Text size="sm" className="font-semibold">{item.title}</Text>
            <Text size="xs" className="mt-1 text-muted-foreground">{item.description}</Text>
          </View>
          {item.navigationTarget ? <ChevronRight size={16} className="text-muted-foreground" /> : null}
        </Pressable>
      ))}
    </Card>
  );
}
