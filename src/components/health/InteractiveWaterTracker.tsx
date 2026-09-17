import React, { useState } from 'react';
import { View } from 'react-native';
import { Card, Heading, Text } from '@/components/ui';
import { AnimatedProgress } from '@/components/motion/AnimatedProgress';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { Droplets, Plus } from 'lucide-react-native';

interface InteractiveWaterTrackerProps {
  initialDrunkMl?: number;
  goalMl?: number;
}

export function InteractiveWaterTracker({
  initialDrunkMl = 1750,
  goalMl = 2500,
}: InteractiveWaterTrackerProps) {
  const [drunkMl, setDrunkMl] = useState(initialDrunkMl);

  const addGlass = () => {
    setDrunkMl((prev) => Math.min(goalMl + 1000, prev + 250));
  };

  const pct = Math.min(100, Math.round((drunkMl / goalMl) * 100));

  return (
    <Card className="w-full p-5 border border-sky-500/25 bg-card shadow-sm rounded-3xl overflow-hidden relative">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15">
            <Droplets size={22} className="text-sky-500" fill="#38BDF8" />
          </View>
          <View>
            <Heading size="md" className="font-bold">Hydration Tracker</Heading>
            <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
              Daily goal: {goalMl.toLocaleString()} ml
            </Text>
          </View>
        </View>

        <ScalePressable onPress={addGlass}>
          <View className="flex-row items-center gap-1.5 rounded-2xl bg-sky-500/15 px-3 py-2 border border-sky-500/30">
            <Plus size={16} className="text-sky-600 dark:text-sky-400" strokeWidth={2.5} />
            <Text size="xs" className="font-bold text-sky-600 dark:text-sky-400">
              +250 ml
            </Text>
          </View>
        </ScalePressable>
      </View>

      <View className="mt-4 flex-row items-baseline justify-between">
        <View>
          <Text size="xs" className="text-muted-foreground font-medium">Drunk Today</Text>
          <Heading size="xl" className="mt-0.5 font-black text-sky-600 dark:text-sky-400">
            {drunkMl.toLocaleString()} <Text size="sm" className="font-medium text-muted-foreground">ml</Text>
          </Heading>
        </View>
        <View className="items-end">
          <Text size="xs" className="text-muted-foreground font-medium">Completion</Text>
          <Text size="md" className="mt-0.5 font-bold text-sky-600 dark:text-sky-400">
            {pct}%
          </Text>
        </View>
      </View>

      <View className="mt-3">
        <AnimatedProgress value={pct} height={10} color="bg-sky-500" />
      </View>
    </Card>
  );
}

export default InteractiveWaterTracker;
