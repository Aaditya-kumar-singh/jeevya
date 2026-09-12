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
        <Text size="sm" className="text-muted-foreground">
          {today}
        </Text>
        <Heading size="xl" className="mt-1">
          {greeting}, {name}
        </Heading>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        className="h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Bell size={20} />
      </Pressable>
    </View>
  );
}

export default HomeHeader;
