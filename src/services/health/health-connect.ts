// ─── Health Connect Adapter (Phase 1J) ───────────────────────────────────────
// Read-only adapter for Android Health Connect.
// Uses react-native-health-connect (v4.1.3+, Expo config plugin).
// Falls back gracefully if the package is not installed.

import type {
  HealthActivity,
  HealthProviderAdapter,
} from '@/types/health';
import type { RawHealthConnectRecord } from './types';
import { mapHCExerciseType, mapHCIntensity } from './types';

/* eslint-disable @typescript-eslint/no-var-requires */
let HC: typeof import('react-native-health-connect') | null = null;

try {
  // Dynamic import — package may not be installed
  HC = require('react-native-health-connect');
} catch {
  HC = null;
}

function toISO(ms: number): string {
  return new Date(ms).toISOString();
}

/** Convert a raw HC record into a normalized HealthActivity. */
function convertRecord(raw: RawHealthConnectRecord): HealthActivity | null {
  try {
    const durationMs =
      typeof raw.duration === 'number' && raw.duration > 0
        ? raw.duration
        : new Date(raw.endTime).getTime() - new Date(raw.startTime).getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    if (durationMinutes <= 0) return null;

    return {
      externalId: String(raw.metadata?.id ?? ''),
      provider: 'health_connect',
      name: raw.title ?? 'Health Connect Activity',
      activityType: mapHCExerciseType(raw.exerciseType ?? 0),
      intensity: mapHCIntensity(raw.intensity),
      startAt: raw.startTime,
      endAt: raw.endTime,
      durationMinutes,
      calories:
        typeof raw.energy?.energy === 'number' && raw.energy.energy > 0
          ? raw.energy.energy
          : undefined,
      distanceKm:
        typeof raw.distance?.distance === 'number' && raw.distance.distance > 0
          ? Math.round((raw.distance.distance / 1000) * 100) / 100
          : undefined,
      source: 'health_connect',
    };
  } catch {
    return null;
  }
}

export const healthConnectAdapter: HealthProviderAdapter = {
  provider: 'health_connect',

  async isAvailable(): Promise<boolean> {
    if (!HC) return false;
    try {
      const available = await HC.isAvailable?.();
      return available === true;
    } catch {
      return false;
    }
  },

  async getPermissionStatus(): Promise<'unavailable' | 'granted' | 'denied' | 'not_determined'> {
    if (!HC) return 'unavailable';
    try {
      const granted = await HC.checkPermission?.('ExerciseSession', 'read');
      if (granted === 'granted' || granted === 'whole_day') return 'granted';
      if (granted === 'denied') return 'denied';
      return 'not_determined';
    } catch {
      return 'unavailable';
    }
  },

  async requestPermissions(): Promise<boolean> {
    if (!HC) return false;
    try {
      const result = await HC.requestPermission?.('ExerciseSession', 'read');
      return result === 'granted' || result === 'whole_day';
    } catch {
      return false;
    }
  },

  async readActivities(startDate: string, endDate: string): Promise<HealthActivity[]> {
    if (!HC) return [];
    try {
      const startMs = new Date(startDate + 'T00:00:00').getTime();
      const endMs = new Date(endDate + 'T23:59:59.999').getTime();

      const rawRecords: unknown[] = await HC.readRecords?.('ExerciseSession', {
        startTime: { operator: 'greaterThan', value: startMs },
        endTime: { operator: 'lessThan', value: endMs },
      }) ?? [];

      return rawRecords
        .map((r) => {
          try {
            return convertRecord(r as RawHealthConnectRecord);
          } catch {
            return null;
          }
        })
        .filter((a): a is HealthActivity => a != null && a.externalId !== '');
    } catch {
      return [];
    }
  },
};
