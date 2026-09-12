import { Pressable, View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { BookOpen, Dumbbell, Plus, Wallet } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface QuickActionsProps {
  workoutHref?: string;
  workoutLabel?: string;
}

export function QuickActions({
  workoutHref = '/health/workout-builder',
  workoutLabel = 'Workout',
}: QuickActionsProps) {
  const actions: {
    label: string;
    href: Href;
    icon: typeof Dumbbell;
  }[] = [
    { label: workoutLabel, href: workoutHref as Href, icon: Dumbbell },
    { label: 'Add Task', href: '/(tabs)/tasks', icon: Plus },
    { label: 'Add Expense', href: '/finance/transactions', icon: Wallet },
    { label: 'Journal', href: '/journal', icon: BookOpen },
  ];

  return (
    <Card className="w-full p-4">
      <Heading size="md">Quick Actions</Heading>
      <View className="mt-3 flex-row gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} asChild>
              <Pressable className="flex-1 items-center gap-2 rounded-2xl bg-muted py-4">
                <Icon size={20} />
                <Text size="xs" className="text-center font-medium">
                  {action.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Card>
  );
}

export default QuickActions;
