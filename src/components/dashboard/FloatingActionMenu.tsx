import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Dumbbell, Plus, Wallet, X } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui';

export function FloatingActionMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const animation = useSharedValue(0);

  const toggleMenu = () => {
    const next = !open;
    setOpen(next);
    animation.value = withSpring(next ? 1 : 0, {
      damping: 14,
      stiffness: 220,
    });
  };

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${animation.value * 45}deg` }],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: animation.value,
    transform: [
      { translateY: (1 - animation.value) * 30 },
      { scale: animation.value },
    ],
  }));

  const actions = [
    {
      label: 'New Task',
      icon: Plus,
      color: 'bg-violet-600',
      action: () => router.push('/(tabs)/tasks'),
    },
    {
      label: 'Workout',
      icon: Dumbbell,
      color: 'bg-rose-600',
      action: () => router.push('/health/workout'),
    },
    {
      label: 'Expense',
      icon: Wallet,
      color: 'bg-emerald-600',
      action: () => router.push('/finance/transactions'),
    },
    {
      label: 'Journal',
      icon: BookOpen,
      color: 'bg-amber-600',
      action: () => router.push('/journal/new'),
    },
  ];

  return (
    <View className="absolute bottom-6 right-6 items-end z-50 pointer-events-box-none">
      {/* Action items popup */}
      {open && (
        <Animated.View style={menuStyle} className="mb-3 gap-2.5 items-end">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Pressable
                key={act.label}
                onPress={() => {
                  toggleMenu();
                  act.action();
                }}
                className="flex-row items-center gap-2"
              >
                <View className="rounded-xl bg-slate-900/90 dark:bg-slate-100/90 px-3 py-1.5 shadow-md">
                  <Text size="xs" className="font-bold text-white dark:text-slate-900">
                    {act.label}
                  </Text>
                </View>
                <View className={`h-11 w-11 items-center justify-center rounded-2xl ${act.color} shadow-md shadow-indigo-500/30`}>
                  <Icon size={20} className="text-white" />
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      )}

      {/* Main trigger button */}
      <Pressable
        onPress={toggleMenu}
        className="h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/40 active:opacity-80"
        accessibilityLabel="Quick action menu"
      >
        <Animated.View style={fabStyle}>
          <Plus size={28} className="text-white" strokeWidth={2.5} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export default FloatingActionMenu;
