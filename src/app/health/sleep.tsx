import { ScrollView, View } from 'react-native';
import { BedDouble, MoonStar } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { sleepHistory, sleepTonight } from '@/lib/mockData';

const MAX_HOURS = 9;

export default function SleepScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="gap-4 px-5 pb-8 pt-14">
        <View>
          <Text size="sm" className="text-muted-foreground">
            Recovery
          </Text>
          <Heading size="xl" className="mt-1">
            Sleep
          </Heading>
        </View>

        <Card className="w-full p-4">
          <View className="flex-row items-center gap-2">
            <MoonStar size={18} />
            <Heading size="md">Last night</Heading>
          </View>
          <Heading size="xl" className="mt-2">
            {sleepTonight.lastNight}
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {sleepTonight.bedtime} → {sleepTonight.wakeup} · quality {sleepTonight.quality}%
          </Text>
          <Progress value={sleepTonight.quality} className="mt-3">
            <ProgressFilledTrack />
          </Progress>
        </Card>

        <Card className="w-full p-4">
          <View className="flex-row items-center gap-2">
            <BedDouble size={18} />
            <Heading size="md">This week</Heading>
          </View>
          <View className="mt-4 flex-row items-end gap-2">
            {sleepHistory.map((entry) => {
              const height = Math.round((entry.hours / MAX_HOURS) * 96);
              return (
                <View key={entry.day} className="flex-1 items-center gap-1">
                  <Text size="xs" className="text-muted-foreground">
                    {entry.hours.toFixed(1)}
                  </Text>
                  <View
                    className="w-full rounded-full bg-primary"
                    style={{ height }}
                  />
                  <Text size="xs" className="text-muted-foreground">
                    {entry.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

