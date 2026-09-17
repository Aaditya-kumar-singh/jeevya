// ─── Nutrition Insights Screen (Phase 1L) ───────────────────────────────
// Deterministic insights from persisted logs + analytics.
// Reuses existing Nutrition patterns only.
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Info, Lightbulb, TriangleAlert } from 'lucide-react-native';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import { NUTRITION_ANALYTICS_PERIODS, type NutritionAnalyticsPeriod, type NutritionInsight } from '@/types/nutrition';
function periodLabel(p: NutritionAnalyticsPeriod): string {
  if (p === 'all') return 'All';
  if (p === 365) return '1Y';
  return `${p}D`;
}
function severityLabel(s: NutritionInsight['severity']): string {
  if (s === 'warning') return 'Warning';
  if (s === 'positive') return 'Positive';
  return 'Info';
}
function InsightCard({ insight }: { insight: NutritionInsight }) {
  const Icon = insight.severity === 'warning' ? TriangleAlert : insight.severity === 'positive' ? Lightbulb : Info;
  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <Icon size={14} className="text-muted-foreground" />
        <Heading size="sm" className="flex-1">{insight.title}</Heading>
        <Badge variant={insight.severity === 'positive' ? 'secondary' : 'outline'}>
          <BadgeText>{severityLabel(insight.severity)}</BadgeText>
        </Badge>
      </View>
      <Text size="sm" className="mt-2 text-muted-foreground">{insight.message}</Text>
      <Text size="sm" className="mt-2">{insight.recommendation}</Text>
      <Text size="xs" className="mt-2 text-muted-foreground">{`${insight.type} · ${insight.dateRangeStart} → ${insight.dateRangeEnd}`}</Text>
    </Card>
  );
}
export default function NutritionInsightsScreen() {
  const router = useRouter();
  const { loading, refreshing, error, refresh, getNutritionAnalytics, getNutritionInsights } = useNutrition();
  const [period, setPeriod] = useState<NutritionAnalyticsPeriod>(30);
  const result = useMemo(() => getNutritionAnalytics(period), [getNutritionAnalytics, period]);
  const insights = useMemo(() => getNutritionInsights(period), [getNutritionInsights, period]);
  const rangeLabel = `${result.startDate} → ${result.endDate}`;
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">Loading insights...</Text>
      </View>
    );
  }
  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">Nutrition</Text>
            <Heading size="xl" className="mt-1">Insights</Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">{rangeLabel}</Text>
          </View>
        </View>
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
          {NUTRITION_ANALYTICS_PERIODS.map((p) => {
            const active = period === p;
            return (
              <Pressable key={String(p)} onPress={() => setPeriod(p)} className={`min-h-[44px] flex-1 items-center justify-center rounded-lg ${active ? 'bg-primary' : 'bg-muted'}`} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={p === 'all' ? 'All time' : `Last ${p} days`}>
                <Text size="sm" className={`font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{periodLabel(p)}</Text>
              </Pressable>
            );
          })}
        </View>
        {error ? (
          <Card className="w-full border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">{error}</Text>
              <Pressable onPress={() => void refresh()}>
                <Text size="xs" className="font-medium text-red-600 dark:text-red-400">Retry</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}
        {insights.length === 0 ? (
          <Card className="w-full items-center p-6">
            <Heading size="md" className="text-center">No insights yet</Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">Log food or activities to generate insights for this period.</Text>
          </Card>
        ) : (
          <View className="gap-3">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
