import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, ArrowLeft, MapPin, Play, Square, HeartPulse, ShieldCheck } from 'lucide-react-native';
import Svg, { Polyline } from 'react-native-svg';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import {
  getActiveOutdoorWorkout,
  getOutdoorWorkoutHistory,
  getLocationPermissionState,
  startOutdoorWorkout,
  finishOutdoorWorkout,
  cancelOutdoorWorkout,
} from '@/services/gpsTracking';
import { requestHealthConnectPermissions, getHealthConnectStatus } from '@/services/health/health-connect';
import type { ActivityType } from '@/types/nutrition';
import type { OutdoorWorkout } from '@/types/outdoorWorkout';

const ACTIVITIES: { value: ActivityType; label: string }[] = [
  { value: 'walking', label: 'Walk' },
  { value: 'running', label: 'Run' },
  { value: 'cycling', label: 'Cycle' },
  { value: 'sports', label: 'Sport' },
];

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function RoutePreview({ route }: { route: OutdoorWorkout['route'] }) {
  if (route.length < 2) {
    return (
      <View className="h-44 items-center justify-center rounded-3xl bg-muted/50">
        <MapPin size={26} className="text-muted-foreground" />
        <Text size="xs" className="mt-2 text-muted-foreground">Move outside to build your GPS route.</Text>
      </View>
    );
  }

  const minLat = Math.min(...route.map((p) => p.latitude));
  const maxLat = Math.max(...route.map((p) => p.latitude));
  const minLon = Math.min(...route.map((p) => p.longitude));
  const maxLon = Math.max(...route.map((p) => p.longitude));
  const width = 320;
  const height = 176;
  const pad = 14;
  const latSpan = Math.max(maxLat - minLat, 0.00001);
  const lonSpan = Math.max(maxLon - minLon, 0.00001);
  const points = route
    .map((p) => {
      const x = pad + ((p.longitude - minLon) / lonSpan) * (width - pad * 2);
      const y = height - pad - ((p.latitude - minLat) / latSpan) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-muted/40">
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={points} fill="none" stroke="#F43F5E" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function OutdoorWorkoutScreen() {
  const router = useRouter();
  const [active, setActive] = useState<OutdoorWorkout | null>(null);
  const [history, setHistory] = useState<OutdoorWorkout[]>([]);
  const [activityType, setActivityType] = useState<ActivityType>('walking');
  const [loading, setLoading] = useState(false);
  const [locationState, setLocationState] = useState<{ foregroundGranted: boolean; backgroundGranted: boolean } | null>(null);
  const [healthStatus, setHealthStatus] = useState<'unavailable' | 'available' | 'update_required'>('unavailable');

  const refresh = useCallback(async () => {
    const [current, past, permissions, hc] = await Promise.all([
      getActiveOutdoorWorkout(),
      getOutdoorWorkoutHistory(),
      getLocationPermissionState(),
      getHealthConnectStatus(),
    ]);
    setActive(current);
    setHistory(past);
    setLocationState({
      foregroundGranted: permissions.foregroundGranted,
      backgroundGranted: permissions.backgroundGranted,
    });
    setHealthStatus(hc);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  const start = useCallback(async () => {
    setLoading(true);
    try {
      const workout = await startOutdoorWorkout({ activityType });
      setActive(workout);
      await refresh();
    } catch (error) {
      Alert.alert('GPS permission needed', error instanceof Error ? error.message : 'Could not start workout.');
    } finally {
      setLoading(false);
    }
  }, [activityType, refresh]);

  const finish = useCallback(async () => {
    setLoading(true);
    try {
      await finishOutdoorWorkout();
      await refresh();
    } catch (error) {
      Alert.alert('Could not finish workout', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const cancel = useCallback(() => {
    Alert.alert('Cancel workout?', 'The current GPS route will be discarded.', [
      { text: 'Keep tracking', style: 'cancel' },
      {
        text: 'Cancel workout',
        style: 'destructive',
        onPress: () => {
          void cancelOutdoorWorkout().then(refresh);
        },
      },
    ]);
  }, [refresh]);

  const connectHealth = useCallback(async () => {
    const granted = await requestHealthConnectPermissions();
    await refresh();
    if (!granted) {
      Alert.alert('Health Connect', 'Some permissions were not granted. You can manage them in Health Connect settings.');
    }
  }, []);

  const activeStats = useMemo(() => {
    if (!active) return null;
    return {
      duration: formatDuration(active.durationSeconds),
      distance: active.distanceKm.toFixed(2),
      speed: active.averageSpeedKmh.toFixed(1),
      points: active.route.length,
    };
  }, [active]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1">
        <View className="gap-4 px-5 pt-14">
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-muted">
              <ArrowLeft size={20} />
            </Pressable>
            <View className="flex-1">
              <Text size="xs" className="font-semibold uppercase tracking-wider text-primary">GPS + Health Connect</Text>
              <Heading size="xl" className="mt-1">Outdoor Workout</Heading>
            </View>
          </View>

          <Card className="gap-3 rounded-3xl p-4">
            <View className="flex-row items-center gap-2">
              <ShieldCheck size={18} className={locationState?.backgroundGranted ? 'text-primary' : 'text-amber-500'} />
              <Heading size="sm">Tracking permissions</Heading>
            </View>
            <Text size="xs" className="text-muted-foreground">
              {locationState?.foregroundGranted
                ? locationState.backgroundGranted
                  ? 'Precise location + background workout tracking are enabled.'
                  : 'Precise location is enabled. Background tracking is not enabled, so tracking pauses when the app is stopped.'
                : 'Location access is not enabled yet.'}
            </Text>
            <View className="flex-row items-center gap-2">
              <HeartPulse size={16} className={healthStatus === 'available' ? 'text-primary' : 'text-muted-foreground'} />
              <Text size="xs" className="text-muted-foreground">
                {healthStatus === 'available'
                  ? 'Health Connect is available.'
                  : healthStatus === 'update_required'
                    ? 'Health Connect needs an update.'
                    : 'Health Connect is not available on this device.'}
              </Text>
            </View>
            <Button variant="outline" size="sm" onPress={connectHealth}>
              <ButtonText>Connect Health Connect</ButtonText>
            </Button>
          </Card>

          {!active ? (
            <Card className="gap-4 rounded-3xl p-5">
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary/15">
                  <Activity size={28} className="text-primary" />
                </View>
                <Heading size="lg" className="mt-3">Start outdoor tracking</Heading>
                <Text size="xs" className="mt-1 text-center text-muted-foreground">
                  Jeevya records your route, distance, speed and workout duration, then can save the workout to Health Connect.
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {ACTIVITIES.map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => setActivityType(item.value)}
                    className={`rounded-full border px-4 py-2 ${activityType === item.value ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                  >
                    <Text size="xs" className={activityType === item.value ? 'font-bold text-primary' : 'text-foreground'}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Button size="lg" onPress={() => void start()} disabled={loading}>
                <Play size={17} className="text-primary-foreground" />
                <ButtonText>{loading ? 'Starting…' : 'Start GPS Workout'}</ButtonText>
              </Button>
            </Card>
          ) : (
            <Card className="gap-4 rounded-3xl p-4">
              <View className="items-center">
                <Text size="xs" className="font-semibold uppercase tracking-wider text-primary">Live workout</Text>
                <Text className="mt-1 text-5xl font-bold tabular-nums text-foreground">{activeStats?.duration}</Text>
              </View>

              <View className="flex-row gap-2">
                <Stat label="Distance" value={`${activeStats?.distance} km`} />
                <Stat label="Avg speed" value={`${activeStats?.speed} km/h`} />
                <Stat label="GPS points" value={String(activeStats?.points ?? 0)} />
              </View>

              <RoutePreview route={active.route} />

              <View className="flex-row gap-2">
                <Button variant="outline" size="lg" onPress={cancel} className="flex-1">
                  <ButtonText>Discard</ButtonText>
                </Button>
                <Button size="lg" onPress={() => void finish()} disabled={loading} className="flex-1">
                  <Square size={16} className="text-primary-foreground" />
                  <ButtonText>{loading ? 'Saving…' : 'Finish'}</ButtonText>
                </Button>
              </View>
            </Card>
          )}

          <View className="gap-3">
            <Heading size="md">Recent outdoor workouts</Heading>
            {history.length === 0 ? (
              <Text size="sm" className="text-muted-foreground">Completed GPS workouts will appear here.</Text>
            ) : history.slice(0, 8).map((workout) => (
              <Card key={workout.id} className="rounded-2xl p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text size="sm" className="font-bold">{workout.name}</Text>
                    <Text size="xs" className="mt-1 text-muted-foreground">
                      {workout.distanceKm.toFixed(2)} km · {formatDuration(workout.durationSeconds)}
                    </Text>
                  </View>
                  <Text size="xs" className={workout.healthConnectStatus === 'synced' ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                    {workout.healthConnectStatus === 'synced' ? 'Health synced' : 'Local'}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-muted/50 p-3">
      <Text size="xs" className="text-muted-foreground">{label}</Text>
      <Text size="sm" className="mt-1 font-bold">{value}</Text>
    </View>
  );
}
