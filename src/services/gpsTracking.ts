import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { getBodyProfile, importEnergyActivities } from '@/services/nutrition';
import { getNowISO } from '@/types/nutrition';
import type { ActivityType } from '@/types/nutrition';
import { appendGpsPoint, calculateRouteDistanceKm, haversineKm } from '@/services/gpsTrackingCore';
import type { GpsPoint, OutdoorWorkout, StartOutdoorWorkoutInput } from '@/types/outdoorWorkout';
import { saveData, loadData, removeData } from '@/lib/storage';
import { writeOutdoorWorkoutToHealthConnect } from '@/services/health/health-connect-workouts';

export const GPS_LOCATION_TASK = 'jeevya-outdoor-workout-location';
const ACTIVE_KEY = 'jeevya:outdoor-workout:active';
const HISTORY_KEY = 'jeevya:outdoor-workout:history';
const MAX_ACCURACY_METERS = 60;
const MAX_JUMP_METERS = 250;

let foregroundSubscription: Location.LocationSubscription | null = null;

async function appendLocationBatch(locations: Location.LocationObject[]) {
  const active = await loadData<OutdoorWorkout | null>(ACTIVE_KEY, null);
  if (!active || active.status !== 'active') return;

  let route = active.route;
  for (const location of locations) {
    route = appendGpsPoint(route, {
      timestamp: location.timestamp,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy,
      speedMps: location.coords.speed,
      heading: location.coords.heading,
    });
  }

  if (route.length === active.route.length) return;
  const distanceKm = calculateRouteDistanceKm(route);
  const durationSeconds = Math.max(0, Math.round((Date.now() - Date.parse(active.startedAt)) / 1000));
  const averageSpeedKmh = durationSeconds > 0 ? distanceKm / (durationSeconds / 3600) : 0;

  await saveData(ACTIVE_KEY, {
    ...active,
    route,
    distanceKm,
    durationSeconds,
    averageSpeedKmh,
    updatedAt: getNowISO(),
  } satisfies OutdoorWorkout);
}

if (!TaskManager.isTaskDefined(GPS_LOCATION_TASK)) {
  TaskManager.defineTask(GPS_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
    if (locations?.length) await appendLocationBatch(locations);
  });
}

export async function getLocationPermissionState() {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = Platform.OS === 'android'
    ? await Location.getBackgroundPermissionsAsync()
    : foreground;
  return {
    foregroundGranted: foreground.granted,
    backgroundGranted: background.granted,
    foregroundStatus: foreground.status,
    backgroundStatus: background.status,
  };
}

export async function requestOutdoorLocationPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return { granted: false, backgroundGranted: false };

  if (Platform.OS === 'android') {
    const background = await Location.requestBackgroundPermissionsAsync();
    return { granted: true, backgroundGranted: background.granted };
  }

  return { granted: true, backgroundGranted: foreground.granted };
}

export async function getActiveOutdoorWorkout(): Promise<OutdoorWorkout | null> {
  const active = await loadData<OutdoorWorkout | null>(ACTIVE_KEY, null);
  return active?.status === 'active' ? active : null;
}

export async function getOutdoorWorkoutHistory(): Promise<OutdoorWorkout[]> {
  return loadData<OutdoorWorkout[]>(HISTORY_KEY, []);
}

export async function startOutdoorWorkout(input: StartOutdoorWorkoutInput): Promise<OutdoorWorkout> {
  const existing = await getActiveOutdoorWorkout();
  if (existing) return existing;

  const permissions = await requestOutdoorLocationPermissions();
  if (!permissions.granted) {
    throw new Error('Location permission is required to start an outdoor workout.');
  }

  const now = getNowISO();
  const workout: OutdoorWorkout = {
    id: `outdoor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    activityType: input.activityType,
    name: input.name?.trim() || `${input.activityType.replace('_', ' ')} workout`,
    startedAt: now,
    status: 'active',
    durationSeconds: 0,
    distanceKm: 0,
    averageSpeedKmh: 0,
    route: [],
    backgroundTracking: permissions.backgroundGranted,
    healthConnectStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await saveData(ACTIVE_KEY, workout);

  if (permissions.backgroundGranted) {
    await Location.startLocationUpdatesAsync(GPS_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      deferredUpdatesDistance: 20,
      deferredUpdatesInterval: 5000,
      foregroundService: {
        notificationTitle: 'Jeevya workout tracking',
        notificationBody: 'GPS is tracking your outdoor workout.',
        killServiceOnDestroy: false,
      },
    });
  } else {
    foregroundSubscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      (location) => void appendLocationBatch([location]),
    );
  }

  return workout;
}

async function stopLocationTracking() {
  foregroundSubscription?.remove();
  foregroundSubscription = null;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(GPS_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(GPS_LOCATION_TASK);
    }
  } catch {
    // Android may already have stopped the service.
  }
}

export async function cancelOutdoorWorkout(): Promise<void> {
  await stopLocationTracking();
  await removeData(ACTIVE_KEY);
}

export async function finishOutdoorWorkout(): Promise<OutdoorWorkout | null> {
  await stopLocationTracking();

  const active = await getActiveOutdoorWorkout();
  if (!active) return null;

  const endedAt = getNowISO();
  const distanceKm = calculateRouteDistanceKm(active.route);
  const durationSeconds = Math.max(
    0,
    Math.round((Date.parse(endedAt) - Date.parse(active.startedAt)) / 1000),
  );
  const averageSpeedKmh = durationSeconds > 0 ? distanceKm / (durationSeconds / 3600) : 0;

  const bodyProfile = await getBodyProfile().catch(() => null);
  const metByActivity: Record<ActivityType, number> = {
    walking: 3.5,
    running: 9.8,
    cycling: 7.5,
    swimming: 7,
    strength_training: 5,
    sports: 7,
    other: 5,
  };
  const calories = bodyProfile
    ? Math.round(
        (metByActivity[active.activityType] * 3.5 * bodyProfile.weightKg * (durationSeconds / 60)) / 200,
      )
    : undefined;

  const completed: OutdoorWorkout = {
    ...active,
    endedAt,
    status: 'completed',
    durationSeconds,
    distanceKm,
    averageSpeedKmh,
    calories,
    updatedAt: endedAt,
  };

  let synced = completed;
  try {
    const result = await writeOutdoorWorkoutToHealthConnect(completed);
    synced = {
      ...completed,
      healthConnectStatus: result.status === 'synced' ? 'synced' : result.status,
      healthConnectRecordIds: result.recordIds.length ? result.recordIds : completed.healthConnectRecordIds,
      updatedAt: getNowISO(),
    };
  } catch {
    synced = { ...completed, healthConnectStatus: 'error', updatedAt: getNowISO() };
  }

  await importEnergyActivities([
    {
      id: `eact_gps_${synced.id}`,
      name: synced.name,
      activityType: synced.activityType,
      intensity: 'moderate',
      durationMinutes: Math.max(1, Math.round(synced.durationSeconds / 60)),
      calories: synced.calories ?? 0,
      caloriesSource: 'estimated',
      distanceKm: synced.distanceKm,
      date: synced.startedAt.slice(0, 10),
      createdAt: synced.createdAt,
      updatedAt: synced.updatedAt,
      source: 'manual',
      externalId: synced.id,
    },
  ]).catch(() => ({ imported: 0, updated: 0 }));

  const history = await getOutdoorWorkoutHistory();
  await saveData(HISTORY_KEY, [synced, ...history].slice(0, 200));
  await removeData(ACTIVE_KEY);
  return synced;
}

export { haversineKm };
