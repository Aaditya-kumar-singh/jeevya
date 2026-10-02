import { View } from 'react-native';
import { Card, Heading, Text } from '@/components/ui';

export default function WeeklyMomentum({ currentXp, previousXp, changePercent }: { currentXp: number; previousXp: number; changePercent: number | null }) {
  const label = changePercent == null ? 'No previous XP baseline' : changePercent > 0 ? `Up ${changePercent}%` : changePercent < 0 ? `Down ${Math.abs(changePercent)}%` : 'Steady';
  return (
    <Card className="w-full p-4">
      <Heading size="md">Weekly momentum</Heading>
      <View className="mt-3 flex-row items-end justify-between">
        <View>
          <Text size="2xl" className="font-bold">{currentXp} XP</Text>
          <Text size="xs" className="mt-1 text-muted-foreground">Last 7 days</Text>
        </View>
        <View className="items-end">
          <Text size="sm" className="font-semibold">{label}</Text>
          <Text size="xs" className="mt-1 text-muted-foreground">{previousXp} XP previous period</Text>
        </View>
      </View>
    </Card>
  );
}
