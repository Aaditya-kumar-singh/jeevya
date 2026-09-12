import { Pressable, View } from 'react-native';
import { Bell } from 'lucide-react-native';

import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface HomeHeaderProps {
  name?: string;
  dateText?: string;
}

export function HomeHeader({ name = 'there', dateText }: HomeHeaderProps) {
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const today =
    dateText ??
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <Text size="xs" className="font-semibold text-indigo-500 uppercase tracking-wider">
          {today}
        </Text>
        <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
          {greeting}, {name} 👋
        </Heading>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 relative"
      >
        <Bell size={20} className="text-indigo-600 dark:text-indigo-400" />
        <View className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-background" />
      </Pressable>
    </View>
  );
}

export default HomeHeader;
