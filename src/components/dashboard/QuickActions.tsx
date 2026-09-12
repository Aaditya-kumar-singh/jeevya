import { View } from 'react-native';
import { Link, type Href } from 'expo-router';
import { BookOpen, Dumbbell, Plus, Wallet } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { ScalePressable } from '@/components/motion/ScalePressable';

interface QuickActionsProps {
  workoutHref?: string;
  workoutLabel?: string;
}

export function QuickActions({
  workoutHref = '/health/workout-builder',
  workoutLabel = 'Workout',
}: QuickActionsProps) {
  const actions = [
    { label: workoutLabel, href: workoutHref as Href, icon: Dumbbell, iconBg: 'bg-rose-500/15', textColor: 'text-rose-500' },
    { label: 'Add Task', href: '/(tabs)/tasks' as Href, icon: Plus, iconBg: 'bg-violet-500/15', textColor: 'text-violet-500' },
    { label: 'Add Expense', href: '/finance/transactions' as Href, icon: Wallet, iconBg: 'bg-emerald-500/15', textColor: 'text-emerald-500' },
    { label: 'Journal', href: '/journal' as Href, icon: BookOpen, iconBg: 'bg-amber-500/15', textColor: 'text-amber-500' },
  ];

  return (
    <Card className="w-full p-4 border border-border/50 shadow-xs">
      <Heading size="md" className="font-bold">Quick Actions</Heading>
      <View className="mt-3.5 flex-row gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} asChild>
              <ScalePressable className="flex-1">
                <View className="items-center gap-2 rounded-2xl bg-muted/60 py-3.5 px-1 border border-border/30">
                  <View className={`h-10 w-10 items-center justify-center rounded-xl ${action.iconBg}`}>
                    <Icon size={18} className={action.textColor} />
                  </View>
                  <Text size="xs" className="text-center font-semibold text-foreground">
                    {action.label}
                  </Text>
                </View>
              </ScalePressable>
            </Link>
          );
        })}
      </View>
    </Card>
  );
}

export default QuickActions;
