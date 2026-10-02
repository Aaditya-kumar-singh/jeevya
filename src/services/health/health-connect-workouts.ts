import type { OutdoorWorkout } from '@/types/outdoorWorkout';
import {
  getHealthConnectModule,
  getHealthConnectGrantedPermissions,
} from './health-connect';
import { HC_EXERCISE_TYPE_BY_ACTIVITY } from './types';

export async function writeOutdoorWorkoutToHealthConnect(
  workout: OutdoorWorkout,
): Promise<{ status: 'synced' | 'skipped' | 'error'; recordIds: string[]; error?: string }> {
  const HC = getHealthConnectModule();
  if (!HC || workout.status !== 'completed') {
    return { status: 'skipped', recordIds: [] };
  }

  try {
    if (!(await HC.initialize())) {
      return { status: 'skipped', recordIds: [] };
    }

    const granted = await getHealthConnectGrantedPermissions();
    const canWriteSession = granted.some(
      (p) => p.accessType === 'write' && p.recordType === 'ExerciseSession',
    );
    if (!canWriteSession) {
      return { status: 'skipped', recordIds: [] };
    }

    const startTime = new Date(workout.startedAt).toISOString();
    const endTime = new Date(workout.endedAt ?? workout.startedAt).toISOString();
    const metadata = {
      clientRecordId: workout.id,
      recordingMethod: 1,
      device: { type: 2 },
    };

    const records: unknown[] = [];

    const canWriteRoute = granted.some(
      (p) => p.accessType === 'write' && p.recordType === 'ExerciseRoute',
    );

    const route =
      canWriteRoute && workout.route.length > 0
        ? {
            route: workout.route.map((point) => ({
              time: new Date(point.timestamp).toISOString(),
              latitude: point.latitude,
              longitude: point.longitude,
              ...(point.accuracy != null
                ? { horizontalAccuracy: { value: point.accuracy, unit: 'meters' as const } }
                : {}),
              ...(point.altitude != null
                ? { altitude: { value: point.altitude, unit: 'meters' as const } }
                : {}),
            })),
          }
        : undefined;

    records.push({
      recordType: 'ExerciseSession',
      startTime,
      endTime,
      exerciseType: HC_EXERCISE_TYPE_BY_ACTIVITY[workout.activityType],
      title: workout.name,
      exerciseRoute: route,
      metadata,
    });

    const canWriteDistance = granted.some(
      (p) => p.accessType === 'write' && p.recordType === 'Distance',
    );
    if (canWriteDistance && workout.distanceKm > 0) {
      records.push({
        recordType: 'Distance',
        startTime,
        endTime,
        distance: { value: workout.distanceKm, unit: 'kilometers' },
        metadata: { ...metadata },
      });
    }

    const canWriteCalories = granted.some(
      (p) => p.accessType === 'write' && p.recordType === 'ActiveCaloriesBurned',
    );
    if (canWriteCalories && workout.calories != null && workout.calories > 0) {
      records.push({
        recordType: 'ActiveCaloriesBurned',
        startTime,
        endTime,
        energy: { value: workout.calories, unit: 'kilocalories' },
        metadata: { ...metadata },
      });
    }

    const canWriteSpeed = granted.some(
      (p) => p.accessType === 'write' && p.recordType === 'Speed',
    );
    const speedSamples = workout.route
      .filter((point) => point.speedMps != null && Number.isFinite(point.speedMps) && point.speedMps >= 0)
      .map((point) => ({
        time: new Date(point.timestamp).toISOString(),
        speed: { value: point.speedMps!, unit: 'metersPerSecond' as const },
      }));

    if (canWriteSpeed && speedSamples.length > 0) {
      records.push({
        recordType: 'Speed',
        startTime,
        endTime,
        samples: speedSamples,
        metadata: { ...metadata },
      });
    }

    const recordIds: string[] = [];
    for (const record of records) {
      const ids = await HC.insertRecords([record]);
      recordIds.push(...ids);
    }
    return { status: 'synced', recordIds };
  } catch (error) {
    return {
      status: 'error',
      recordIds: [],
      error: error instanceof Error ? error.message : 'Health Connect write failed',
    };
  }
}

