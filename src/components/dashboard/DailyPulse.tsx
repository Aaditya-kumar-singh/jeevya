import { View } from 'react-native';

import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface DailyPulseProps {
  score: number;
  change: number;
}

export function DailyPulse({ score, change }: DailyPulseProps) {
  return (
    <View className="rounded-3xl bg-black p-6 dark:bg-white">
      <Text className="mb-2 text-sm text-white/60 dark:text-black/60">
        YOUR LIFE SCORE
      </Text>

      <View className="flex-row items-end">
        <Heading className="text-5xl font-bold text-white dark:text-black">
          {score}
        </Heading>

        <Text className="mb-2 ml-3 text-sm text-green-400">
          ↑ {change}% today
        </Text>
      </View>

      <Text className="mt-3 text-sm text-white/60 dark:text-black/60">
        Keep your momentum going.
      </Text>
    </View>
  );
}

export default DailyPulse;

