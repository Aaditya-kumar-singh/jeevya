import { View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import type { SpendHeatmapDay } from '@/lib/analytics';
import { formatCurrency } from '@/lib/analytics';

export function SpendHeatmapCard({ days }: { days: SpendHeatmapDay[] }) {
  const firstDate = days[0]?.date;
  const leading = firstDate ? new Date(firstDate + 'T00:00:00').getDay() : 0;
  const cells: (SpendHeatmapDay | null)[] = [...Array(leading).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const maxAmount = Math.max(0, ...days.map((day) => day.amount));

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <Calendar size={18} />
        <Heading size="md">Spend Heatmap</Heading>
      </View>
      <Text size="xs" className="mt-1 text-muted-foreground">Daily expenses for the selected period</Text>
      {days.length === 0 ? (
        <Text size="sm" className="mt-4 text-muted-foreground">No spending data for this period.</Text>
      ) : (
        <View className="mt-4">
          <View className="flex-row justify-between px-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
              <Text key={index} size="xs" className="w-8 text-center text-muted-foreground">{label}</Text>
            ))}
          </View>
          <View className="mt-1 flex-row flex-wrap">
            {cells.map((day, index) => {
              const intensity = day?.intensity ?? 0;
              const bg = intensity === 0 ? 'bg-muted' : intensity === 1 ? 'bg-emerald-200 dark:bg-emerald-900/50' : intensity === 2 ? 'bg-emerald-300 dark:bg-emerald-800/70' : intensity === 3 ? 'bg-emerald-400 dark:bg-emerald-700' : 'bg-emerald-600 dark:bg-emerald-500';
              return (
                <View key={day?.date ?? `empty-${index}`} className="mb-1 mr-1 h-8 w-8 items-center justify-center">
                  {day ? (
                    <View className={`h-8 w-8 items-center justify-center rounded-md ${bg}`}>
                      <Text size="xs" className={intensity >= 3 ? 'font-semibold text-white' : 'text-foreground'}>{day.dayOfMonth}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <Text size="xs" className="text-muted-foreground">Low</Text>
            <Text size="xs" className="font-medium">Peak: {formatCurrency(maxAmount)}</Text>
          </View>
        </View>
      )}
    </Card>
  );
}
