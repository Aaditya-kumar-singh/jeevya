import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, BedDouble, Dumbbell, Moon, Activity } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { FadeInView } from '@/components/motion/FadeInView';
import { LineChart } from '@/components/charts/LineChart';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { useHealthAnalytics } from '@/hooks/useHealthAnalytics';
import type { HealthAnalyticsPeriod, HealthAnalyticsResult } from '@/services/healthAnalytics';

const PERIODS: { value: HealthAnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '365 days' },
  { value: 'all', label: 'All' },
];

function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-muted p-3">
      <Text size="xs" className="text-muted-foreground">{label}</Text>
      <Text size="md" className="mt-1 font-semibold">{value}</Text>
    </View>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Dumbbell; title: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={18} className="text-rose-500" />
      <Heading size="md" className="font-bold">{title}</Heading>
    </View>
  );
}

function EmptySection({ title, message }: { title: string; message: string }) {
  return (
    <Card className="w-full items-center p-6">
      <BarChart3 size={26} className="text-muted-foreground" />
      <Heading size="sm" className="mt-3">{title}</Heading>
      <Text size="sm" className="mt-1 text-center text-muted-foreground">{message}</Text>
    </Card>
  );
}

function WorkoutCard({ data }: { data: HealthAnalyticsResult }) {
  const workout = data.workout;
  if (!data.dataAvailability.hasWorkoutData) return <EmptySection title="No Workout Data" message="Completed workouts will appear here for this period." />;
  return (
    <Card className="w-full p-4">
      <SectionHeader icon={Dumbbell} title="Workout Analytics" />
      <View className="mt-4 gap-3">
        <View className="flex-row gap-3">
          <Metric label="Completed" value={formatNumber(workout.completedWorkoutCount)} />
          <Metric label="Active Days" value={formatNumber(workout.activeWorkoutDays)} />
          <Metric label="Sets" value={formatNumber(workout.totalCompletedSets)} />
        </View>
        <View className="flex-row gap-3">
          <Metric label="Duration" value={formatDuration(workout.totalWorkoutDurationSeconds)} />
          <Metric label="Volume" value={formatNumber(workout.totalWorkoutVolume, 1)} />
        </View>
        <View className="flex-row gap-3">
          <Metric label="Avg Duration" value={formatDuration(workout.averageWorkoutDurationSeconds)} />
          <Metric label="Avg Volume" value={formatNumber(workout.averageVolumePerCompletedWorkout, 1)} />
          <Metric label="/ Week" value={formatNumber(workout.averageWorkoutsPerWeek, 1)} />
        </View>
      </View>
    </Card>
  );
}

function SleepCard({ data }: { data: HealthAnalyticsResult }) {
  const sleep = data.sleep;
  if (!data.dataAvailability.hasSleepData) return <EmptySection title="No Sleep Data" message="Sleep entries will appear here when they are recorded." />;
  return (
    <Card className="w-full p-4">
      <SectionHeader icon={BedDouble} title="Sleep Analytics" />
      <View className="mt-4 gap-3">
        <View className="flex-row gap-3">
          <Metric label="Sleep Days" value={formatNumber(sleep.sleepDays)} />
          <Metric label="Average" value={formatDuration((sleep.averageSleepDurationMinutes ?? 0) * 60)} />
          <Metric label="Consistency" value={`${formatNumber(sleep.sleepConsistencyPercentage, 0)}%`} />
        </View>
        <View className="flex-row gap-3">
          <Metric label="Minimum" value={formatDuration((sleep.minimumSleepDurationMinutes ?? 0) * 60)} />
          <Metric label="Maximum" value={formatDuration((sleep.maximumSleepDurationMinutes ?? 0) * 60)} />
          <Metric label="Quality" value={formatNumber(sleep.averageSleepQuality, 1)} />
        </View>
        <View className="rounded-2xl bg-muted p-3">
          <Text size="xs" className="text-muted-foreground">Quality distribution</Text>
          <Text size="sm" className="mt-1">
            Poor {sleep.qualityDistribution.poor} · Fair {sleep.qualityDistribution.fair} · Good {sleep.qualityDistribution.good} · Excellent {sleep.qualityDistribution.excellent}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function RecoveryCard({ data }: { data: HealthAnalyticsResult }) {
  const recovery = data.recovery;
  if (!data.dataAvailability.hasRecoveryData) return <EmptySection title="No Recovery Data" message="Readiness requires the existing Recovery inputs to be available." />;
  return (
    <Card className="w-full p-4">
      <SectionHeader icon={Activity} title="Recovery Analytics" />
      <View className="mt-4 gap-3">
        <View className="flex-row gap-3">
          <Metric label="Readiness Days" value={formatNumber(recovery.daysWithAvailableReadiness)} />
          <Metric label="Average" value={formatNumber(recovery.averageReadiness, 0)} />
          <Metric label="Minimum" value={formatNumber(recovery.minimumReadiness, 0)} />
        </View>
        <View className="flex-row gap-3">
          <Metric label="Maximum" value={formatNumber(recovery.maximumReadiness, 0)} />
          <Metric label="Sleep Contribution" value={formatNumber(recovery.averageSleepContribution, 1)} />
        </View>
        <View className="flex-row gap-3">
          <Metric label="Training Contribution" value={formatNumber(recovery.averageTrainingLoadContribution, 1)} />
          <Metric label="Consistency Contribution" value={formatNumber(recovery.averageConsistencyContribution, 1)} />
        </View>
        <View className="rounded-2xl bg-muted p-3">
          <Text size="xs" className="text-muted-foreground">Readiness levels</Text>
          <Text size="sm" className="mt-1">
            Low {recovery.readinessLevelDistribution.low} · Moderate {recovery.readinessLevelDistribution.moderate} · Good {recovery.readinessLevelDistribution.good} · Excellent {recovery.readinessLevelDistribution.excellent}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function TrendCard({ data }: { data: HealthAnalyticsResult }) {
  const trend = data.trend;
  const charts = useMemo(() => {
    const make = (label: string, key: 'workoutDurationSeconds' | 'workoutVolume' | 'sleepDurationMinutes' | 'readinessScore') => {
      const points = trend.filter((point) => point[key] != null && Number.isFinite(point[key]));
      return { label, labels: points.map((point) => point.date.slice(5)), values: points.map((point) => point[key]!) };
    };
    return [
      make('Workout duration', 'workoutDurationSeconds'),
      make('Workout volume', 'workoutVolume'),
      make('Sleep duration', 'sleepDurationMinutes'),
      make('Readiness', 'readinessScore'),
    ];
  }, [trend]);

  if (!trend.length) return <EmptySection title="No Trend Data" message="Daily trend points appear when measurements exist for a date." />;
  return (
    <Card className="w-full p-4">
      <SectionHeader icon={BarChart3} title="Health Trends" />
      <View className="mt-4 gap-6">
        {charts.filter((chart) => chart.values.length > 0).map((chart) => (
          <View key={chart.label}>
            <Text size="sm" className="mb-2 font-medium">{chart.label}</Text>
            <LineChart
              labels={chart.labels}
              series={[{ label: chart.label, color: '#F43F5E', data: chart.values }]}
              height={180}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function HealthAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { period, data, loading, error, load, setPeriod } = useHealthAnalytics('7d');
  const topPadding = Math.max(insets.top + 12, 48);

  return (
    <View className="relative flex-1 bg-rose-50/40 dark:bg-slate-950">
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#F43F5E" color2="#38BDF8" width={450} height={300} />
      </View>
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(period)} />}
      >
        <View className="gap-4 px-5 pb-12" style={{ zIndex: 1, paddingTop: topPadding }}>
          <FadeInView delay={0}>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-card/90 border border-border/50">
                <ArrowLeft size={20} className="text-foreground" />
              </Pressable>
              <View className="flex-1">
                <Text size="xs" className="font-semibold uppercase tracking-wider text-rose-500">Health & Vitality Hub</Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight">Health Analytics</Heading>
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
            {data?.dateRange.start && data.dateRange.end ? (
              <Text size="xs" className="mt-3 text-muted-foreground">{data.dateRange.start} to {data.dateRange.end}</Text>
            ) : null}
          </Card>

          {loading && !data ? (
            <Card className="w-full items-center p-8"><ActivityIndicator /><Text size="sm" className="mt-3 text-muted-foreground">Loading analytics…</Text></Card>
          ) : error ? (
            <Card className="w-full p-5"><Heading size="sm">Unable to load analytics</Heading><Text size="sm" className="mt-1 text-muted-foreground">{error}</Text></Card>
          ) : data ? (
            <>
              <WorkoutCard data={data} />
              <SleepCard data={data} />
              <RecoveryCard data={data} />
              <TrendCard data={data} />
              <Card className="w-full p-4">
                <View className="flex-row items-center gap-2"><Moon size={16} className="text-muted-foreground" /><Text size="xs" className="text-muted-foreground">Analytics are derived from existing Health records at read time. No analytics data is stored.</Text></View>
              </Card>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
