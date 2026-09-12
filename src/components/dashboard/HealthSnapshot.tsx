import { View } from 'react-native';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { healthSnapshot } from '@/lib/mockData';
import { BedDouble, Droplets, Dumbbell, Heart } from 'lucide-react-native';

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
    { label: 'Sleep', value: sleep, icon: BedDouble, iconBg: 'bg-indigo-500/15', textColor: 'text-indigo-500' },
    { label: 'Water', value: water, icon: Droplets, iconBg: 'bg-sky-500/15', textColor: 'text-sky-500' },
    { label: 'Workout', value: workout, icon: Dumbbell, iconBg: 'bg-rose-500/15', textColor: 'text-rose-500' },
  ];

  return (
    <Card className="w-full p-5 border border-rose-500/20 bg-card shadow-sm">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15">
          <Heart size={20} className="text-rose-500" fill="#F43F5E" />
        </View>
        <View>
          <Heading size="md" className="font-bold">Health & Vitality</Heading>
          <Text size="xs" className="text-muted-foreground font-medium">
            Sleep, hydration, and activity tracker
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <View
              key={item.label}
              className="flex-1 rounded-2xl bg-muted/60 p-3 border border-border/40"
            >
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className={`h-6 w-6 items-center justify-center rounded-lg ${item.iconBg}`}>
                  <Icon size={13} className={item.textColor} />
                </View>
                <Text size="xs" className="text-muted-foreground font-semibold">
                  {item.label}
                </Text>
              </View>
              <Text size="xs" className="mt-1 font-bold text-foreground">
                {item.value}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export default HealthSnapshot;
