import React from 'react';
import { View } from 'react-native';
import { Card, Heading, Text } from '@/components/ui';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Sparkles } from 'lucide-react-native';

interface VirtualAccountCardProps {
  totalBalance?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
}

export function VirtualAccountCard({
  totalBalance = 124500,
  monthlyIncome = 45000,
  monthlyExpenses = 18200,
}: VirtualAccountCardProps) {
  const net = monthlyIncome - monthlyExpenses;

  return (
    <Card className="w-full p-6 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 shadow-xl shadow-emerald-500/10 rounded-3xl overflow-hidden relative">
      {/* Background ambient light */}
      <View className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/15 blur-2xl" />
      <View className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal-500/15 blur-2xl" />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <CreditCard size={22} className="text-emerald-400" />
          <Text className="text-xs font-bold tracking-wider text-emerald-200 uppercase">
            LifeOS Wealth Account
          </Text>
        </View>
        <View className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 border border-emerald-400/30">
          <Text className="text-xs font-bold text-emerald-300">
            Active Card
          </Text>
        </View>
      </View>

      <View className="mt-5">
        <Text className="text-xs font-medium text-emerald-100/70">
          Total Net Worth
        </Text>
        <Heading className="text-4xl font-black text-white tracking-tight mt-1">
          ₹{totalBalance.toLocaleString('en-IN')}
        </Heading>
      </View>

      {/* Income / Expense pills */}
      <View className="mt-5 flex-row gap-2.5">
        <View className="flex-1 rounded-2xl bg-white/10 p-3 border border-white/10">
          <View className="flex-row items-center gap-1">
            <ArrowDownLeft size={14} className="text-emerald-400" />
            <Text size="xs" className="text-emerald-200 font-medium">Income</Text>
          </View>
          <Text size="md" className="mt-1 font-bold text-emerald-400">
            +₹{monthlyIncome.toLocaleString('en-IN')}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl bg-white/10 p-3 border border-white/10">
          <View className="flex-row items-center gap-1">
            <ArrowUpRight size={14} className="text-rose-400" />
            <Text size="xs" className="text-rose-200 font-medium">Expenses</Text>
          </View>
          <Text size="md" className="mt-1 font-bold text-rose-400">
            -₹{monthlyExpenses.toLocaleString('en-IN')}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl bg-white/10 p-3 border border-white/10">
          <View className="flex-row items-center gap-1">
            <Sparkles size={13} className="text-amber-400" fill="#FBBF24" />
            <Text size="xs" className="text-amber-200 font-medium">Net Growth</Text>
          </View>
          <Text size="md" className="mt-1 font-bold text-amber-300">
            +₹{net.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default VirtualAccountCard;
