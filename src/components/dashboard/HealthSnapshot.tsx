import { Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text as GSText } from '@/components/ui/text';
import { healthSnapshot } from '@/lib/mockData';

interface HealthSnapshotProps {
  sleep?: string;
  water?: string;
  workout?: string;
}

export function HealthSnapshot({
  sleep = healthSnapshot.sleep,
  water = healthSnapshot.water,
  workout = healthSnapshot.workout,
}: HealthSnapshotProps) {
  const items = [
    { label: 'Sleep', value: sleep },
    { label: 'Water', value: water },
    { label: 'Workout', value: workout },
  ];

  return (
    <Card className="w-full p-4">
      <Heading size="md">Health</Heading>
      <GSText size="sm" className="text-muted-foreground">
        Sleep, water, workout today
      </GSText>
      <View className="mt-3 flex-row gap-3">
        {items.map((item) => (
          <View
            key={item.label}
            className="flex-1 rounded-2xl bg-muted p-3">
            <Text className="text-xs text-gray-500">{item.label}</Text>
            <Text className="mt-1 text-sm font-semibold text-black dark:text-white">
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default HealthSnapshot;

