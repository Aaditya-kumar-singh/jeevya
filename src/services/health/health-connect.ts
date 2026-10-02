import type { HealthActivity, HealthProviderAdapter } from '@/types/health';
import type { RawHealthConnectRecord } from './types';
import { mapHCExerciseType, mapHCIntensity } from './types';

type PermissionRequest = {
  accessType: 'read' | 'write';
  recordType: string;
};

type HealthConnectModule = {
  SdkAvailabilityStatus: {
    SDK_UNAVAILABLE: number;
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: number;
    SDK_AVAILABLE: number;
  };
  initialize(providerPackageName?: string): Promise<boolean>;
  getSdkStatus(providerPackageName?: string): Promise<number>;
  openHealthConnectSettings(): void;
  requestPermission(permissions: PermissionRequest[]): Promise<PermissionRequest[]>;
  getGrantedPermissions(): Promise<PermissionRequest[]>;
  readRecords(
    recordType: string,
    options: { timeRangeFilter: { operator: 'between'; startTime: string; endTime: string }; ascendingOrder?: boolean; pageSize?: number },
  ): Promise<{ records: unknown[]; pageToken?: string }>;
  insertRecords(records: unknown[]): Promise<string[]>;
};

let HC: HealthConnectModule | null = null;

try {
  HC = require('react-native-health-connect') as HealthConnectModule;
} catch {
  HC = null;
}

export function getHealthConnectModule(): HealthConnectModule | null {
  return HC;
}

async function initialize(): Promise<boolean> {
  if (!HC) return false;
  try {
    return await HC.initialize();
  } catch {
    return false;
  }
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function energyKcal(record: unknown): number | undefined {
  const energy = (record as { energy?: { inKilocalories?: unknown; value?: unknown } })?.energy;
  return toFiniteNumber(energy?.inKilocalories) ?? toFiniteNumber(energy?.value);
}

function distanceKm(record: unknown): number | undefined {
  const distance = (record as { distance?: { inMeters?: unknown; value?: unknown } })?.distance;
  const meters = toFiniteNumber(distance?.inMeters);
  if (meters != null) return meters / 1000;
  const value = toFiniteNumber(distance?.value);
  return value != null ? value / 1000 : undefined;
}

function convertRecord(raw: RawHealthConnectRecord, calories?: number, distanceKmValue?: number): HealthActivity | null {
  const startMs = Date.parse(raw.startTime);
  const endMs = Date.parse(raw.endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;

  return {
    externalId: String(raw.metadata?.id ?? raw.metadata?.clientRecordId ?? ''),
    provider: 'health_connect',
    name: raw.title ?? 'Health Connect Activity',
    activityType: mapHCExerciseType(raw.exerciseType ?? 0),
    intensity: mapHCIntensity(),
    startAt: raw.startTime,
    endAt: raw.endTime,
    durationMinutes: Math.max(1, Math.round((endMs - startMs) / 60000)),
    calories,
    distanceKm: distanceKmValue,
    source: 'health_connect',
  };
}

async function readRecords(recordType: string, startTime: string, endTime: string): Promise<unknown[]> {
  if (!HC) return [];
  const response = await HC.readRecords(recordType, {
    timeRangeFilter: { operator: 'between', startTime, endTime },
    ascendingOrder: true,
    pageSize: 1000,
  });
  return response.records;
}

export const HEALTH_CONNECT_READ_PERMISSIONS: PermissionRequest[] = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'Steps' },
];

export const HEALTH_CONNECT_WRITE_PERMISSIONS: PermissionRequest[] = [
  { accessType: 'write', recordType: 'ExerciseSession' },
  { accessType: 'write', recordType: 'Distance' },
  { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'write', recordType: 'Speed' },
];

export async function getHealthConnectStatus(): Promise<'unavailable' | 'available' | 'update_required'> {
  if (!HC) return 'unavailable';
  try {
    const status = await HC.getSdkStatus();
    if (status === HC.SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (status === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update_required';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function getHealthConnectGrantedPermissions(): Promise<PermissionRequest[]> {
  if (!(await initialize()) || !HC) return [];
  try {
    return await HC.getGrantedPermissions();
  } catch {
    return [];
  }
}

export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (!(await initialize()) || !HC) return false;
  try {
    const requested: PermissionRequest[] = [
      ...HEALTH_CONNECT_READ_PERMISSIONS,
      ...HEALTH_CONNECT_WRITE_PERMISSIONS,
      { accessType: 'write', recordType: 'ExerciseRoute' },
    ];
    const granted = await HC.requestPermission(requested);
    return HEALTH_CONNECT_READ_PERMISSIONS.every((required) =>
      granted.some(
        (item) => item.accessType === required.accessType && item.recordType === required.recordType,
      ),
    );
  } catch {
    return false;
  }
}

export async function openHealthConnectSettings(): Promise<void> {
  if (!HC) return;
  try {
    HC.openHealthConnectSettings();
  } catch {
    // no-op
  }
}

export async function readHealthConnectActivities(startDate: string, endDate: string): Promise<HealthActivity[]> {
  if (!(await initialize()) || !HC) return [];

  const startTime = new Date(startDate + 'T00:00:00.000Z').toISOString();
  const endTime = new Date(endDate + 'T23:59:59.999Z').toISOString();
  const sessions = await readRecords('ExerciseSession', startTime, endTime);

  const activities = await Promise.all(
    sessions.map(async (session) => {
      const raw = session as RawHealthConnectRecord;
      const [calories, distances] = await Promise.all([
        readRecords('ActiveCaloriesBurned', raw.startTime, raw.endTime),
        readRecords('Distance', raw.startTime, raw.endTime),
      ]);
      const totalCalories = calories.reduce<number>((sum, record) => sum + (energyKcal(record) ?? 0), 0);
      const totalDistance = distances.reduce<number>((sum, record) => sum + (distanceKm(record) ?? 0), 0);
      return convertRecord(
        raw,
        totalCalories > 0 ? Math.round(totalCalories * 10) / 10 : undefined,
        totalDistance > 0 ? Math.round(totalDistance * 100) / 100 : undefined,
      );
    }),
  );

  return activities.filter(
    (activity): activity is HealthActivity => activity != null && activity.externalId !== '',
  );
}

export const healthConnectAdapter: HealthProviderAdapter = {
  provider: 'health_connect',

  async isAvailable(): Promise<boolean> {
    return (await getHealthConnectStatus()) === 'available' && (await initialize());
  },

  async getPermissionStatus(): Promise<'unavailable' | 'granted' | 'denied' | 'not_determined'> {
    const status = await getHealthConnectStatus();
    if (status === 'unavailable' || status === 'update_required') return 'unavailable';

    const granted = await getHealthConnectGrantedPermissions();
    const exerciseRead = granted.some(
      (permission) => permission.accessType === 'read' && permission.recordType === 'ExerciseSession',
    );
    return exerciseRead ? 'granted' : 'not_determined';
  },

  async requestPermissions(): Promise<boolean> {
    return requestHealthConnectPermissions();
  },

  async readActivities(startDate: string, endDate: string): Promise<HealthActivity[]> {
    try {
      return await readHealthConnectActivities(startDate, endDate);
    } catch {
      return [];
    }
  },
};
