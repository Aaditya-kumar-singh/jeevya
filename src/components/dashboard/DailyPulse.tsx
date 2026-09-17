import { Pressable, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import type { DailyPulseModel, DailyPulseItem } from '@/services/dailyPulse';
import type { DailyPlanItem, DailyPlanModel } from '@/types/dailyPlan';

interface DailyPulseProps {
  model: DailyPulseModel | null;
  loading?: boolean;
  error?: string | null;
  onAction?: (item: DailyPulseItem) => Promise<void> | void;
  plan?: DailyPlanModel | null;
  onPlanAction?: (item: DailyPlanItem) => Promise<void> | void;
}

function PulseItem({ item, onAction }: { item: DailyPulseItem; onAction?: (item: DailyPulseItem) => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const canMutate = item.actionType === 'complete_task' || item.actionType === 'complete_habit';

  const handleAction = async () => {
    if (!onAction || !canMutate || busy) return;
    setBusy(true);
    try {
      await onAction(item);
    } finally {
      setBusy(false);
    }
  };
  const content = (
    <View className="flex-row items-start gap-3 py-2">
      {item.category === 'attention' ? (
        <AlertCircle size={18} className="text-amber-300 mt-0.5" />
      ) : (
        <CheckCircle2 size={18} className="text-emerald-300 mt-0.5" />
      )}
      <View className="flex-1">
        <Text className="text-sm font-bold text-white">{item.title}</Text>
        <Text className="mt-0.5 text-xs text-indigo-100/80">{item.description}</Text>
        {item.actionLabel ? (
          <Pressable
            className="mt-1 self-start"
            disabled={busy}
            onPress={() => void handleAction()}
          >
            <Text className="text-[11px] font-semibold text-indigo-100">
              {busy ? 'Working…' : `${item.actionLabel} →`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  if (!item.navigationTarget || canMutate) return content;
  return <Pressable onPress={() => router.push(item.navigationTarget as never)}>{content}</Pressable>;
}

function PlanItem({ item, onAction }: { item: DailyPlanItem; onAction?: (item: DailyPlanItem) => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const canExecute = item.actionType === 'complete_task' || item.actionType === 'complete_habit';
  const handlePress = async () => {
    if (busy) return;
    if (canExecute && onAction) {
      setBusy(true);
      try { await onAction(item); } finally { setBusy(false); }
      return;
    }
    if (item.navigationTarget) router.push(item.navigationTarget as never);
  };
  const content = (
    <View className="flex-row items-start gap-3 py-2">
      <View className="mt-1 h-2 w-2 rounded-full bg-white/70" />
      <View className="flex-1">
        <Text className="text-sm font-bold text-white">{item.title}</Text>
        {item.description ? <Text className="mt-0.5 text-xs text-indigo-100/80">{item.description}</Text> : null}
        {item.actionLabel ? <Text className="mt-1 text-[11px] font-semibold text-indigo-100">{busy ? 'Working…' : `${item.actionLabel} →`}</Text> : null}
      </View>
    </View>
  );
  return item.navigationTarget || canExecute ? <Pressable disabled={busy} onPress={() => void handlePress()}>{content}</Pressable> : content;
}

export function DailyPulse({ model, loading = false, error = null, onAction, plan = null, onPlanAction }: DailyPulseProps) {
  const focus = model?.focus ?? [];
  const progress = model?.progress ?? [];
  const summary = model?.summary ?? [];
  const planItems = plan?.items.filter((item) => item.status !== 'completed').slice(0, 5) ?? [];

  return (
    <View className="rounded-3xl bg-indigo-600 dark:bg-indigo-900 p-6 shadow-xl shadow-indigo-500/20 overflow-hidden relative border border-indigo-400/30">
      <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/30 blur-xl" />
      <View className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-xl" />

      <View className="flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-white/20">
          <Zap size={14} className="text-amber-300" fill="#FCD34D" />
        </View>
        <Text className="text-xs font-bold tracking-wider text-indigo-100 uppercase">Daily Pulse</Text>
      </View>

      <Heading className="mt-4 text-2xl font-black text-white">What matters today</Heading>

      {loading ? (
        <Text className="mt-3 text-sm text-indigo-100/80">Loading today&apos;s state…</Text>
      ) : error ? (
        <Text className="mt-3 text-sm text-indigo-100/80">Daily Pulse is unavailable right now.</Text>
      ) : !model ? (
        <Text className="mt-3 text-sm text-indigo-100/80">No daily data available.</Text>
      ) : (
        <>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {summary.map((line) => (
              <View key={line} className="rounded-full bg-white/10 px-3 py-1 border border-white/10">
                <Text className="text-xs font-semibold text-indigo-100">{line}</Text>
              </View>
            ))}
          </View>

          {focus.length > 0 && (
            <View className="mt-4 border-t border-white/10 pt-3">
              <Text className="text-xs font-bold tracking-wider text-indigo-100 uppercase">Focus</Text>
              {focus.slice(0, 3).map((item) => <PulseItem key={item.id} item={item} onAction={onAction} />)}
            </View>
          )}

          {planItems.length > 0 && (
            <View className="mt-3 border-t border-white/10 pt-3">
              <Text className="text-xs font-bold tracking-wider text-indigo-100 uppercase">Daily Plan</Text>
              {planItems.map((item) => <PlanItem key={item.id} item={item} onAction={onPlanAction} />)}
            </View>
          )}

          {progress.length > 0 && (
            <View className="mt-3 border-t border-white/10 pt-3">
              <Text className="text-xs font-bold tracking-wider text-indigo-100 uppercase">Progress</Text>
              {progress.slice(0, 3).map((item) => <PulseItem key={item.id} item={item} onAction={onAction} />)}
            </View>
          )}

          {focus.length === 0 && progress.length === 0 && (
            <Text className="mt-4 text-sm text-indigo-100/80">No additional attention items from today&apos;s available data.</Text>
          )}
        </>
      )}
    </View>
  );
}

export default DailyPulse;
