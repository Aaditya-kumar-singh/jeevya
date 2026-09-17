// ─── Health Integration Types (Phase 1J / A2) ────────────────────────────────
// Canonical provider/integration types for the Health domain.
// These types do not own nutrition persistence.

import type { ActivityIntensity, ActivityType } from '@/types/nutrition';

export type HealthProvider = 'health_connect';

export type HealthSyncStatus =
  | 'unavailable'
  | 'disconnected'
  | 'permission_required'
  | 'ready'
  | 'syncing'
  | 'error';

export type HealthActivitySource = 'health_connect';

/** Normalized activity record produced by an external health provider. */
export interface HealthActivity {
  externalId: string;
  provider: HealthProvider;
  name: string;
  activityType: ActivityType;
  intensity: ActivityIntensity;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  calories?: number;
  distanceKm?: number;
  source: HealthActivitySource;
}

export interface HealthSyncState {
  provider: HealthProvider;
  status: HealthSyncStatus;
  lastSyncAt?: string;
  error?: string;
}

/** Provider-neutral adapter interface. */
export interface HealthProviderAdapter {
  readonly provider: HealthProvider;
  isAvailable(): Promise<boolean>;
  getPermissionStatus(): Promise<'unavailable' | 'granted' | 'denied' | 'not_determined'>;
  requestPermissions(): Promise<boolean>;
  readActivities(startDate: string, endDate: string): Promise<HealthActivity[]>;
}
