import { View } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Zap } from 'lucide-react-native';

interface DailyPulseProps {
  score: number;
  change: number;
}

export function DailyPulse({ score, change }: DailyPulseProps) {
  return (
    <View className="rounded-3xl bg-indigo-600 dark:bg-indigo-900 p-6 shadow-xl shadow-indigo-500/20 overflow-hidden relative border border-indigo-400/30">
      {/* Decorative background glow circle */}
      <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/30 blur-xl" />
      <View className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-xl" />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <Zap size={14} className="text-amber-300" fill="#FCD34D" />
          </View>
          <Text className="text-xs font-bold tracking-wider text-indigo-100 uppercase">
            Your Life Score
          </Text>
        </View>

        <View className="rounded-full bg-emerald-500/20 px-3 py-1 border border-emerald-400/30">
          <Text className="text-xs font-bold text-emerald-300">
            ↑ +{change}% today
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-baseline">
        <Heading className="text-6xl font-black text-white tracking-tight">
          {score}
        </Heading>
        <Text className="ml-2 text-xl font-bold text-indigo-200">
          / 100
        </Text>
      </View>

      <Text className="mt-2 text-xs font-medium text-indigo-100/80">
        ⚡ You are in top 5% consistency this week. Keep going!
      </Text>
    </View>
  );
}

export default DailyPulse;
