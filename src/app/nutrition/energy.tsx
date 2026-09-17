// ─── Energy Balance Screen (Phase 1H + 1I) ───────────────────────────────────
// Daily energy IN vs OUT with manual activity logging.
// Phase 1I adds activity type, intensity, duration, distance, and calorie mode.
// Reuses existing Nutrition UI patterns exactly.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import type {
  ActivityIntensity,
  ActivityType,
  CaloriesSource,
  CreateEnergyActivityInput,
  DailyEnergySummary,
  EnergyActivity,
} from '@/types/nutrition';
import type { HealthSyncState } from '@/types/health';
import {
  ACTIVITY_INTENSITIES,
  ACTIVITY_TYPES,
  MET_TABLE,
  getTodayDate,
} from '@/types/nutrition';

// ─── Display Helpers ──────────────────────────────────────────────────────────

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr: string): string {
  const today = getTodayDate();
  if (dateStr === today) return 'Today';
  const yesterday = shiftDate(today, -1);
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-');
  return `${Number(d)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m) - 1]} ${y}`;
}

function statusLabel(status: DailyEnergySummary['status']): string {
  if (status === 'deficit') return 'Deficit';
  if (status === 'surplus') return 'Surplus';
  return 'Maintenance';
}

function statusColor(status: DailyEnergySummary['status']): string {
  if (status === 'deficit') return 'text-primary';
  if (status === 'surplus') return 'text-destructive';
  return 'text-muted-foreground';
}

function activityTypeLabel(type: ActivityType): string {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

function intensityLabel(intensity: ActivityIntensity): string {
  return ACTIVITY_INTENSITIES.find((i) => i.value === intensity)?.label ?? intensity;
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({
  activity,
  onDelete,
}: {
  activity: EnergyActivity;
  onDelete: (id: string) => void;
}) {
  const source = activity.caloriesSource === 'estimated' ? 'Est.' : 'Manual';
  return (
    <Card className="w-full p-3">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text size="sm" className="font-medium">{activity.name}</Text>
          <Text size="xs" className="mt-0.5 text-muted-foreground">
            {activityTypeLabel(activity.activityType)} · {intensityLabel(activity.intensity)}
            {activity.durationMinutes != null ? ` · ${activity.durationMinutes} min` : ''}
            {activity.distanceKm != null ? ` · ${fmt(activity.distanceKm)} km` : ''}
          </Text>
          <Text size="xs" className="mt-0.5 text-muted-foreground">
            {fmt(activity.calories)} kcal · {source}
          </Text>
        </View>
        <Pressable
          onPress={() => onDelete(activity.id)}
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={`Delete ${activity.name} activity`}
        >
          <Trash2 size={14} className="text-destructive" />
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Health Sync Card (Phase 1J) ─────────────────────────────────────────────

function syncStatusLabel(status: HealthSyncState['status']): string {
  switch (status) {
    case 'unavailable': return 'Health Connect not available';
    case 'disconnected': return 'Disconnected';
    case 'permission_required': return 'Permission required';
    case 'ready': return 'Ready';
    case 'syncing': return 'Syncing...';
    case 'error': return 'Error';
    default: return 'Unknown';
  }
}

function syncStatusColor(status: HealthSyncState['status']): string {
  switch (status) {
    case 'ready': return 'text-primary';
    case 'syncing': return 'text-primary';
    case 'error': return 'text-destructive';
    case 'permission_required': return 'text-yellow-500';
    default: return 'text-muted-foreground';
  }
}

function HealthSyncCard({
  status,
  date,
  onSync,
}: {
  status: HealthSyncState;
  date: string;
  onSync: (startDate: string, endDate: string) => Promise<HealthSyncState>;
}) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setLastResult(null);
    try {
      const result = await onSync(date, date);
      if (result.status === 'ready') {
        setLastResult('Synced');
      } else if (result.error) {
        setLastResult(result.error);
      } else {
        setLastResult(syncStatusLabel(result.status));
      }
    } catch (e) {
      setLastResult(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [date, onSync]);

  const canSync = status.status === 'ready' || status.status === 'permission_required';

  return (
    <Card className="p-4">
      <View className="flex-row items-center gap-2 mb-2">
        <RefreshCw size={16} className="text-primary" />
        <Heading size="sm">Health Sync</Heading>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text size="sm" className={syncStatusColor(status.status)}>
            {syncing ? 'Syncing...' : syncStatusLabel(status.status)}
          </Text>
          {status.lastSyncAt && (
            <Text size="xs" className="mt-0.5 text-muted-foreground">
              Last synced: {formatDisplayDate(status.lastSyncAt.slice(0, 10))}
            </Text>
          )}
          {status.error && status.status === 'error' && (
            <Text size="xs" className="mt-0.5 text-destructive">{status.error}</Text>
          )}
          {lastResult && !syncing && (
            <Text size="xs" className="mt-0.5 text-muted-foreground">{lastResult}</Text>
          )}
        </View>
        <Button
          variant="outline"
          size="sm"
          onPress={handleSync}
          disabled={syncing || !canSync}
          accessibilityLabel="Sync health data"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          <ButtonText>{syncing ? 'Syncing' : 'Sync'}</ButtonText>
        </Button>
      </View>
      {status.status === 'permission_required' && (
        <Text size="xs" className="mt-2 text-muted-foreground">
          Grant Health Connect permission to import activities.
        </Text>
      )}
    </Card>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  unit,
  primary = false,
}: {
  label: string;
  value: string;
  unit: string;
  primary?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center">
      <Text size="sm" className={primary ? 'font-medium' : 'text-muted-foreground'}>
        {label}
      </Text>
      <Text size="sm" className={primary ? 'font-bold text-primary' : 'font-medium'}>
        {value} {unit}
      </Text>
    </View>
  );
}

// ─── Add Activity Form (Phase 1I) ────────────────────────────────────────────

function AddActivityForm({
  date,
  bodyProfile,
  onAdd,
  onCancel,
  estimateActivityCalories,
}: {
  date: string;
  bodyProfile: { weightKg: number } | null;
  onAdd: (input: CreateEnergyActivityInput) => Promise<void>;
  onCancel: () => void;
  estimateActivityCalories: (input: {
    activityType: ActivityType;
    intensity: ActivityIntensity;
    durationMinutes: number;
    weightKg: number;
  }) => number | null;
}) {
  const [name, setName] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('other');
  const [intensity, setIntensity] = useState<ActivityIntensity>('moderate');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [caloriesMode, setCaloriesMode] = useState<'manual' | 'estimated'>('manual');
  const [manualCalories, setManualCalories] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationNum = duration ? parseFloat(duration) : null;
  const estimatedCalories = useMemo(() => {
    if (caloriesMode !== 'estimated') return null;
    if (!bodyProfile || !durationNum || !Number.isFinite(durationNum) || durationNum <= 0) return null;
    return estimateActivityCalories({
      activityType,
      intensity,
      durationMinutes: durationNum,
      weightKg: bodyProfile.weightKg,
    });
  }, [caloriesMode, bodyProfile, durationNum, activityType, intensity, estimateActivityCalories]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!name.trim()) {
      setError('Activity name is required');
      return;
    }
    if (!Number.isFinite(durationNum ?? NaN) || (durationNum ?? 0) <= 0) {
      setError('Duration must be a positive number');
      return;
    }

    let calories: number;
    let caloriesSource: CaloriesSource;

    if (caloriesMode === 'estimated') {
      if (!bodyProfile) {
        setError('Body profile is required for calorie estimation. Set one in Nutrition Targets.');
        return;
      }
      if (estimatedCalories == null || estimatedCalories <= 0) {
        setError('Could not estimate calories. Check duration and body profile.');
        return;
      }
      calories = Math.round(estimatedCalories);
      caloriesSource = 'estimated';
    } else {
      const calNum = parseFloat(manualCalories);
      if (!Number.isFinite(calNum) || calNum <= 0) {
        setError('Calories must be a positive number');
        return;
      }
      calories = calNum;
      caloriesSource = 'manual';
    }

    const distNum = distance ? parseFloat(distance) : undefined;
    if (distNum !== undefined && (!Number.isFinite(distNum) || distNum < 0)) {
      setError('Distance must be a non-negative number');
      return;
    }

    try {
      setSaving(true);
      await onAdd({
        name: name.trim(),
        activityType,
        intensity,
        durationMinutes: durationNum,
        calories,
        caloriesSource,
        distanceKm: distNum,
        date,
      });
      setName('');
      setDuration('');
      setDistance('');
      setManualCalories('');
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add activity');
    } finally {
      setSaving(false);
    }
  }, [
    name, activityType, intensity, durationNum, distance,
    caloriesMode, manualCalories, estimatedCalories, bodyProfile,
    date, onAdd, onCancel,
  ]);

  return (
    <Card className="p-4 mb-4">
      <Heading size="sm" className="mb-3">Add Activity</Heading>
      {error && (
        <Text size="xs" className="mb-2 text-destructive">{error}</Text>
      )}

      <Text size="xs" className="mb-1 text-muted-foreground">Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g., Morning run"
        className="p-3 rounded-lg border border-border mb-3 text-foreground"
        accessibilityLabel="Activity name"
      />

      <Text size="xs" className="mb-1 text-muted-foreground">Activity Type</Text>
      <View className="flex-row flex-wrap gap-2 mb-3">
        {ACTIVITY_TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setActivityType(t.value)}
            className={`min-h-[36px] rounded-lg px-3 py-1.5 ${
              activityType === t.value ? 'bg-primary' : 'bg-muted'
            }`}
            accessibilityRole="button"
            accessibilityLabel={t.label}
          >
            <Text size="xs" className={activityType === t.value ? 'text-primary-foreground' : 'text-foreground'}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text size="xs" className="mb-1 text-muted-foreground">Intensity</Text>
      <View className="flex-row gap-2 mb-3">
        {ACTIVITY_INTENSITIES.map((i) => (
          <Pressable
            key={i.value}
            onPress={() => setIntensity(i.value)}
            className={`min-h-[36px] flex-1 items-center rounded-lg px-3 py-1.5 ${
              intensity === i.value ? 'bg-primary' : 'bg-muted'
            }`}
            accessibilityRole="button"
            accessibilityLabel={i.label}
          >
            <Text size="xs" className={intensity === i.value ? 'text-primary-foreground' : 'text-foreground'}>
              {i.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text size="xs" className="mb-1 text-muted-foreground">Duration (minutes)</Text>
      <TextInput
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        placeholder="e.g., 30"
        className="p-3 rounded-lg border border-border mb-3 text-foreground"
        accessibilityLabel="Duration in minutes"
      />

      <Text size="xs" className="mb-1 text-muted-foreground">Distance (km, optional)</Text>
      <TextInput
        value={distance}
        onChangeText={setDistance}
        keyboardType="numeric"
        placeholder="e.g., 5"
        className="p-3 rounded-lg border border-border mb-3 text-foreground"
        accessibilityLabel="Distance in kilometers"
      />

      <Text size="xs" className="mb-1 text-muted-foreground">Calories</Text>
      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={() => setCaloriesMode('manual')}
          className={`min-h-[36px] flex-1 items-center rounded-lg px-3 py-1.5 ${
            caloriesMode === 'manual' ? 'bg-primary' : 'bg-muted'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Manual calories"
        >
          <Text size="xs" className={caloriesMode === 'manual' ? 'text-primary-foreground' : 'text-foreground'}>
            Manual
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setCaloriesMode('estimated')}
          className={`min-h-[36px] flex-1 items-center rounded-lg px-3 py-1.5 ${
            caloriesMode === 'estimated' ? 'bg-primary' : 'bg-muted'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Estimated calories"
        >
          <Text size="xs" className={caloriesMode === 'estimated' ? 'text-primary-foreground' : 'text-foreground'}>
            Estimate
          </Text>
        </Pressable>
      </View>

      {caloriesMode === 'manual' ? (
        <>
          <Text size="xs" className="mb-1 text-muted-foreground">Calories burned</Text>
          <TextInput
            value={manualCalories}
            onChangeText={setManualCalories}
            keyboardType="numeric"
            placeholder="e.g., 300"
            className="p-3 rounded-lg border border-border mb-3 text-foreground"
            accessibilityLabel="Calories burned"
          />
        </>
      ) : (
        <Card className="p-3 mb-3 bg-muted/50">
          {bodyProfile ? (
            <Text size="sm" className="text-muted-foreground">
              {estimatedCalories != null
                ? `Estimated: ${fmt(estimatedCalories)} kcal`
                : 'Enter duration to estimate calories'}
            </Text>
          ) : (
            <Text size="sm" className="text-destructive">
              Body profile required for estimation. Set one in Nutrition Targets.
            </Text>
          )}
        </Card>
      )}

      <View className="flex-row gap-2">
        <Button variant="outline" size="sm" onPress={onCancel} className="flex-1">
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button size="sm" onPress={handleSubmit} disabled={saving} className="flex-1">
          <ButtonText>{saving ? 'Adding...' : 'Add'}</ButtonText>
        </Button>
      </View>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EnergyScreen() {
  const router = useRouter();
  const {
    foods,
    foodLogs,
    recipes,
    bodyProfile,
    energyActivities,
    loading,
    refreshing,
    refresh,
    removeEnergyActivity,
    addEnergyActivity,
    estimateActivityCalories,
    healthSyncStatus,
    syncHealthActivities,
  } = useNutrition();

  const [date, setDate] = useState(getTodayDate());
  const [dateInput, setDateInput] = useState(getTodayDate());
  const [showAddForm, setShowAddForm] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { getEnergySummary } = useNutrition();

  const summary = useMemo(
    () => getEnergySummary(date),
    [date, getEnergySummary],
  );

  const dayActivities = useMemo(
    () => energyActivities.filter((a) => a.date === date),
    [energyActivities, date],
  );

  const handleDateChange = (text: string) => {
    setDateInput(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      setDate(text);
    }
  };

  const shiftDay = (days: number) => {
    const next = shiftDate(date, days);
    setDate(next);
    setDateInput(next);
  };

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await removeEnergyActivity(id);
      } catch {
        // Error handled by hook
      }
    },
    [removeEnergyActivity],
  );

  const handleAdd = useCallback(
    async (input: CreateEnergyActivityInput) => {
      await addEnergyActivity(input);
    },
    [addEnergyActivity],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading energy data...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
      }
    >
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Nutrition
            </Text>
            <Heading size="xl" className="mt-1">
              Energy Balance
            </Heading>
          </View>
        </View>

        {/* Date navigator */}
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => shiftDay(-1)}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
            accessibilityRole="button"
            accessibilityLabel="Previous day"
          >
            <ChevronLeft size={18} className="text-muted-foreground" />
          </Pressable>
          <TextInput
            value={dateInput}
            onChangeText={handleDateChange}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            maxLength={10}
            className="min-h-[44px] flex-1 rounded-lg border border-border bg-card px-3 text-center text-foreground"
            accessibilityLabel="Date (YYYY-MM-DD)"
          />
          <Pressable
            onPress={() => shiftDay(1)}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted"
            accessibilityRole="button"
            accessibilityLabel="Next day"
          >
            <ChevronRight size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
        <Text size="xs" className="text-center text-muted-foreground">
          {formatDisplayDate(date)}
        </Text>

        {/* Energy IN */}
        <Card className="p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Flame size={16} className="text-primary" />
            <Heading size="sm">Energy IN</Heading>
          </View>
          <SummaryRow
            label="Calories consumed"
            value={fmt(summary.caloriesIn)}
            unit="kcal"
            primary
          />
        </Card>

        {/* Energy OUT */}
        <Card className="p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Zap size={16} className="text-primary" />
            <Heading size="sm">Energy OUT</Heading>
          </View>
          <View className="gap-2">
            <SummaryRow
              label="BMR"
              value={summary.bmr != null ? fmt(summary.bmr) : '—'}
              unit={summary.bmr != null ? 'kcal' : ''}
            />
            {summary.bmr == null && bodyProfile == null ? (
              <Text size="xs" className="text-muted-foreground mb-1">
                No body profile — set up in Nutrition Targets
              </Text>
            ) : null}
            <SummaryRow
              label="Activity calories"
              value={fmt(summary.activityCalories)}
              unit="kcal"
            />
            <View className="h-px bg-border my-1" />
            <SummaryRow
              label="Total calories out"
              value={fmt(summary.caloriesOut)}
              unit="kcal"
              primary
            />
          </View>
        </Card>

        {/* Balance */}
        <Card className="p-4">
          <Heading size="sm" className="mb-3">Balance</Heading>
          <View className="gap-2">
            <SummaryRow
              label="Net calories"
              value={fmt(summary.netCalories)}
              unit="kcal"
              primary
            />
            <View className="flex-row justify-between items-center">
              <Text size="sm" className="text-muted-foreground">Status</Text>
              <Badge variant={summary.status === 'maintenance' ? 'secondary' : 'outline'}>
                <BadgeText className={statusColor(summary.status)}>
                  {statusLabel(summary.status)}
                </BadgeText>
              </Badge>
            </View>
          </View>
        </Card>

        {/* Target */}
        {summary.calorieTarget != null ? (
          <Card className="p-4">
            <Heading size="sm" className="mb-3">Target</Heading>
            <View className="gap-2">
              <SummaryRow
                label="Daily calorie target"
                value={fmt(summary.calorieTarget)}
                unit="kcal"
              />
              <SummaryRow
                label="Calories remaining"
                value={summary.remainingCalories != null ? fmt(summary.remainingCalories) : '—'}
                unit="kcal"
                primary
              />
            </View>
          </Card>
        ) : null}

        {/* Health Sync */}
        <HealthSyncCard
          status={healthSyncStatus}
          date={date}
          onSync={syncHealthActivities}
        />

        {/* Activities */}
        <View className="flex-row items-center justify-between">
          <Heading size="sm">Activities</Heading>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => setShowAddForm(!showAddForm)}
            accessibilityLabel={showAddForm ? 'Cancel adding activity' : 'Add activity'}
          >
            <Plus size={20} />
          </Button>
        </View>

        {showAddForm ? (
          <AddActivityForm
            date={date}
            bodyProfile={bodyProfile}
            onAdd={handleAdd}
            onCancel={() => setShowAddForm(false)}
            estimateActivityCalories={estimateActivityCalories}
          />
        ) : null}

        {dayActivities.length > 0 ? (
          <View className="gap-2">
            {dayActivities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                onDelete={handleDelete}
              />
            ))}
          </View>
        ) : (
          <Card className="w-full items-center p-6">
            <Text size="sm" className="text-muted-foreground text-center">
              No activities logged for {formatDisplayDate(date)}.
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}