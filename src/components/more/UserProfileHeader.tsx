import React from 'react';
import { View } from 'react-native';
import { Card, Heading, Text } from '@/components/ui';
import { Award, Flame, ShieldCheck, Sparkles, User } from 'lucide-react-native';

export function UserProfileHeader() {
  return (
    <Card className="w-full p-5 border border-amber-500/25 bg-card shadow-sm rounded-3xl overflow-hidden relative">
      <View className="flex-row items-center gap-4">
        {/* User Avatar with Level Badge */}
        <View className="relative">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-md shadow-amber-500/20">
            <User size={32} className="text-white" />
          </View>
          <View className="absolute -bottom-1.5 -right-1.5 h-6 w-6 items-center justify-center rounded-full bg-amber-500 border-2 border-background shadow-xs">
            <Text className="text-[10px] font-black text-black">
              L7
            </Text>
          </View>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Heading size="md" className="font-bold">Jeevya Architect</Heading>
            <ShieldCheck size={18} className="text-amber-500" fill="#F59E0B" />
          </View>
          <Text size="xs" className="text-muted-foreground font-medium mt-0.5">
            Consistency Level 7 • 3,450 / 5,000 XP
          </Text>

          <View className="mt-2 flex-row gap-2">
            <View className="flex-row items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 border border-orange-500/25">
              <Flame size={12} className="text-orange-500" fill="#F97316" />
              <Text size="xs" className="font-bold text-orange-600 dark:text-orange-400">
                7d Streak
              </Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 border border-indigo-500/25">
              <Sparkles size={12} className="text-indigo-500" />
              <Text size="xs" className="font-bold text-indigo-600 dark:text-indigo-400">
                Pro Unlocked
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

export default UserProfileHeader;
