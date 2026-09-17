import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Info, ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { FadeInView } from '@/components/motion/FadeInView';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { useHealthIntelligence } from '@/hooks/useHealthIntelligence';
import type { HealthAnalyticsPeriod } from '@/services/healthAnalytics';
import type { HealthInsight } from '@/services/healthIntelligence';

const PERIODS: { value: HealthAnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '365 days' },
  { value: 'all', label: 'All' },
];

function InsightCard({ insight }: { insight: HealthInsight }) {
  return (
    <Card className="w-full p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
          {insight.severity === 'warning' ? <ShieldAlert size={19} className="text-foreground" /> : insight.severity === 'positive' ? <CheckCircle2 size={19} className="text-foreground" /> : <Info size={19} className="text-foreground" />}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Heading size="sm" className="flex-1 font-bold">{insight.title}</Heading>
            <Text size="xs" className="capitalize text-muted-foreground">{insight.severity}</Text>
          </View>
          <Text size="sm" className="mt-2 text-muted-foreground">{insight.message}</Text>
          {insight.evidence.length ? (
            <View className="mt-3 rounded-2xl bg-muted p-3 gap-1">
              <Text size="xs" className="font-semibold text-muted-foreground">Evidence</Text>
              {insight.evidence.map((item, index) => (
                <Text key={`${insight.id}-evidence-${index}`} size="xs" className="text-muted-foreground">
                  {item.metric}: {item.currentValue}{item.comparisonValue != null ? ` vs ${item.comparisonValue}` : ''} · {item.period}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export default function HealthInsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { period, insights, loading, error, loadInsights, setPeriod } = useHealthIntelligence('30d');
  const topPadding = Math.max(insets.top + 12, 48);

  return (
    <View className="relative flex-1 bg-rose-50/40 dark:bg-slate-950">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#F43F5E" color2="#38BDF8" width={450} height={300} />
      </View>
      <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadInsights(period)} />}>
        <View className="gap-4 px-5 pb-12" style={{ zIndex: 1, paddingTop: topPadding }}>
          <FadeInView delay={0}>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-card/90 border border-border/50">
                <ArrowLeft size={20} className="text-foreground" />
              </Pressable>
              <View className="flex-1">
                <Text size="xs" className="font-semibold uppercase tracking-wider text-rose-500">Health & Vitality Hub</Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight">Health Insights</Heading>
              </View>
            </View>
          </FadeInView>

          <Card className="w-full p-4">
            <View className="flex-row flex-wrap gap-2">
              {PERIODS.map((option) => (
                <Pressable key={option.value} onPress={() => setPeriod(option.value)} className={`rounded-xl px-3 py-2 ${period === option.value ? 'bg-primary' : 'bg-muted'}`}>
                  <Text size="xs" className={`font-medium ${period === option.value ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {loading && !insights.length ? (
            <Card className="w-full items-center p-8"><ActivityIndicator /><Text size="sm" className="mt-3 text-muted-foreground">Loading insights…</Text></Card>
          ) : error ? (
            <Card className="w-full p-5"><Heading size="sm">Unable to load insights</Heading><Text size="sm" className="mt-1 text-muted-foreground">{error}</Text></Card>
          ) : insights.length ? (
            insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
          ) : (
            <Card className="w-full items-center p-6"><Info size={24} className="text-muted-foreground" /><Heading size="sm" className="mt-3">No insights for this period</Heading><Text size="sm" className="mt-1 text-center text-muted-foreground">Insights appear when the selected data supports a deterministic observation.</Text></Card>
          )}

          <Card className="w-full p-4">
            <Text size="xs" className="text-muted-foreground">Wellness observations only. These insights do not diagnose conditions, provide treatment, or establish medical causation.</Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
