// ─── Nutrition Analytics Screen (Phase 1K) ───────────────────────────────
// Historical analytics from persisted logs + activities.
// Reuses existing Nutrition patterns and LineChart only.
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Flame, Target, TrendingUp, Zap } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { LineChart } from '@/components/charts/LineChart';
import { useNutrition } from '@/hooks/useNutrition';
import { NUTRITION_ANALYTICS_PERIODS, type NutritionAnalyticsPeriod } from '@/types/nutrition';
function fmt(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const r = Math.round(value * 10) / 10;
  return Number.isInteger(r) ? String(r) : String(r);
}
function periodLabel(p: NutritionAnalyticsPeriod): string {
  if (p === 'all') return 'All';
  if (p === 365) return '1Y';
  return `${p}D`;
}
function shortDayLabel(date: string): string {
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}
function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center rounded-xl bg-muted p-3" accessibilityRole="text" accessibilityLabel={`${label}: ${value}`}>
      <Text size="xl" className="font-bold">{value}</Text>
      <Text size="xs" className="text-center text-muted-foreground">{label}</Text>
    </View>
  );
}
export default function NutritionAnalyticsScreen() {
  const router = useRouter();
  const { bodyProfile, loading, refreshing, error, refresh, getNutritionAnalytics } = useNutrition();
  const [period, setPeriod] = useState<NutritionAnalyticsPeriod>(30);
  const result = useMemo(() => getNutritionAnalytics(period), [getNutritionAnalytics, period]);
  const { points, summary } = result;
  const hasData = summary.daysWithData > 0;
  const rangeLabel = `${result.startDate} → ${result.endDate}`;
  const labels = useMemo(() => points.map((p) => shortDayLabel(p.date)), [points]);
  const energySeries = useMemo(() => [
    { label: 'Calories IN', color: 'rgb(249,115,22)', data: points.map((p) => p.caloriesIn) },
    { label: 'Calories OUT', color: 'rgb(59,130,246)', data: points.map((p) => p.caloriesOut) },
    { label: 'Net', color: 'rgb(34,197,94)', data: points.map((p) => p.netCalories) },
  ], [points]);
  const macroSeries = useMemo(() => [
    { label: 'Protein', color: 'rgb(239,68,68)', data: points.map((p) => p.proteinG) },
    { label: 'Carbs', color: 'rgb(234,179,8)', data: points.map((p) => p.carbsG) },
    { label: 'Fat', color: 'rgb(168,85,247)', data: points.map((p) => p.fatG) },
  ], [points]);
  const activitySeries = useMemo(() => [
    { label: 'Activity kcal', color: 'rgb(20,184,166)', data: points.map((p) => p.activityCalories) },
  ], [points]);
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">Loading analytics...</Text>
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
            <Heading size="xl" className="mt-1">Analytics</Heading>
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
        {!hasData ? (
          <Card className="w-full items-center p-6">
            <Heading size="md" className="text-center">No analytics yet</Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">Log food or activities to see trends for this period.</Text>
          </Card>
        ) : (
          <>
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <Flame size={14} className="text-muted-foreground" />
                <Heading size="sm">Summary</Heading>
              </View>
              <View className="flex-row gap-2">
                <StatTile value={`${fmt(summary.averageCaloriesIn)}`} label="Avg kcal IN" />
                <StatTile value={`${fmt(summary.averageCaloriesOut)}`} label="Avg kcal OUT" />
              </View>
              <View className="mt-2 flex-row gap-2">
                <StatTile value={`${fmt(summary.averageNetCalories)}`} label="Avg net kcal" />
                <StatTile value={`${fmt(summary.averageProteinG)}`} label="Avg protein g" />
              </View>
              <View className="mt-2 flex-row gap-2">
                <StatTile value={`${fmt(summary.averageActivityCalories)}`} label="Avg activity kcal" />
                <StatTile value={`${summary.daysWithData}`} label="Days with data" />
              </View>
            </Card>
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <TrendingUp size={14} className="text-muted-foreground" />
                <Heading size="sm">Trends</Heading>
              </View>
              <Text size="xs" className="mb-2 text-muted-foreground">Calories IN · OUT · Net energy</Text>
              <LineChart labels={labels} series={energySeries} />
              <Text size="xs" className="mb-2 mt-4 text-muted-foreground">Protein · Carbs · Fat (g)</Text>
              <LineChart labels={labels} series={macroSeries} />
            </Card>
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <Zap size={14} className="text-muted-foreground" />
                <Heading size="sm">Activity</Heading>
              </View>
              <View className="flex-row gap-2">
                <StatTile value={`${fmt(summary.totalActivityCalories)}`} label="Total activity kcal" />
                <StatTile value={`${summary.activeDays}`} label="Active days" />
              </View>
              <View className="mt-3">
                <LineChart labels={labels} series={activitySeries} />
              </View>
            </Card>
            <Card className="w-full p-4">
              <View className="mb-2 flex-row items-center gap-1.5">
                <Target size={14} className="text-muted-foreground" />
                <Heading size="sm">Goal</Heading>
              </View>
              <View className="flex-row gap-2">
                <StatTile value={summary.targetAdherencePercent != null ? `${summary.targetAdherencePercent}%` : '—'} label="Target adherence" />
                <StatTile value={`${summary.deficitDays}`} label="Deficit days" />
              </View>
              <View className="mt-2 flex-row gap-2">
                <StatTile value={`${summary.maintenanceDays}`} label="Maintenance days" />
                <StatTile value={`${summary.surplusDays}`} label="Surplus days" />
              </View>
              {bodyProfile == null ? (
                <Text size="xs" className="mt-2 text-muted-foreground">No body profile — BMR/target metrics show unavailable. Set one in Nutrition Targets.</Text>
              ) : null}
              <Text size="xs" className="mt-2 text-muted-foreground">{`Totals: ${fmt(summary.totalCaloriesIn)} kcal in · ${fmt(summary.totalCaloriesOut)} kcal out · ${summary.nutritionDays} nutrition days`}</Text>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}



