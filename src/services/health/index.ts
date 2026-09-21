// ─── Health Integration Layer (Phase 1J) ─────────────────────────────────────
// Provider-independent abstraction for reading external health data.
// All functions are pure or use existing storage patterns.

import type { EnergyActivity } from '@/types/nutrition';
import { getNowISO, getTodayDate } from '@/types/nutrition';
import type {
  HealthActivity,
  HealthProvider,
  HealthProviderAdapter,
  HealthSyncState,
} from '@/types/health';
import { importEnergyActivities } from '@/services/nutrition';
import { healthConnectAdapter } from './health-connect';

export type {
  HealthActivity,
  HealthActivitySource,
  HealthProvider,
  HealthProviderAdapter,
  HealthSyncState,
  HealthSyncStatus,
} from '@/types/health';
export { getNowISO, getTodayDate };


// ─── Adapter Registry ─────────────────────────────────────────────────────────

const adapters: Record<HealthProvider, HealthProviderAdapter> = {
  health_connect: healthConnectAdapter,
};

/** Get adapter for a specific provider. */
export function getHealthAdapter(provider: HealthProvider): HealthProviderAdapter {
  return adapters[provider];
}

/** Get all registered adapters. */
export function getAllAdapters(): HealthProviderAdapter[] {
  return Object.values(adapters);
}

/** Get the first available adapter, or null if none. */
export async function getAvailableAdapter(): Promise<HealthProviderAdapter | null> {
  for (const adapter of getAllAdapters()) {
    if (await adapter.isAvailable()) return adapter;
  }
  return null;
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a raw HealthActivity into the EnergyActivity shape.
 * Pure — no storage access.
 * Never fabricates calories; uses 'estimated' source when provider doesn't supply them
 * so the existing MET estimation can calculate them at summary time.
 */
export function normalizeHealthActivity(record: HealthActivity): EnergyActivity {
  const hasCalories =
    typeof record.calories === 'number' && Number.isFinite(record.calories) && record.calories > 0;

  return {
    id: `eact_hc_${record.provider}_${record.externalId}`,
    name: record.name,
    activityType: record.activityType,
    intensity: record.intensity,
    durationMinutes: record.durationMinutes > 0 ? record.durationMinutes : null,
    calories: hasCalories ? record.calories! : 0,
    caloriesSource: hasCalories ? 'manual' : 'estimated',
    distanceKm:
      typeof record.distanceKm === 'number' && Number.isFinite(record.distanceKm) && record.distanceKm >= 0
        ? record.distanceKm
        : null,
    date: record.startAt.slice(0, 10),
    createdAt: getNowISO(),
    updatedAt: getNowISO(),
    source: 'health_connect',
    externalId: record.externalId,
    provider: record.provider,
  };
}

// ─── Sync State Storage ───────────────────────────────────────────────────────

const HEALTH_SYNC_KEY = 'jeevya:nutrition:health-sync';

export async function getHealthSyncState(): Promise<HealthSyncState> {
  try {
    const { loadData } = await import('@/lib/storage');
    const raw = await loadData<Record<string, unknown> | null>(HEALTH_SYNC_KEY, null);
    if (!raw || typeof raw !== 'object') {
      return { provider: 'health_connect', status: 'unavailable' };
    }
    return {
      provider: (raw.provider as HealthProvider) ?? 'health_connect',
      status: (raw.status as HealthSyncState['status']) ?? 'unavailable',
      lastSyncAt: typeof raw.lastSyncAt === 'string' ? raw.lastSyncAt : undefined,
      error: typeof raw.error === 'string' ? raw.error : undefined,
    };
  } catch {
    return { provider: 'health_connect', status: 'unavailable' };
  }
}

export async function saveHealthSyncState(state: HealthSyncState): Promise<void> {
  try {
    const { saveData } = await import('@/lib/storage');
    await saveData(HEALTH_SYNC_KEY, state);
  } catch {
    // Storage failure doesn't block sync
  }
}

// ─── Import / Dedup ──────────────────────────────────────────────────────────

/**
 * Import health activities into the existing EnergyActivity store.
 * Deduplicates by provider + externalId.
 * Existing manual activities are never deleted or overwritten.
 * Returns the number of new activities imported.
 */
export async function importHealthActivities(
  records: HealthActivity[],
): Promise<{ imported: number; updated: number }> {
  const normalized = records
    .map(normalizeHealthActivity)
    .filter((activity) => activity.externalId && activity.externalId !== '');

  // Nutrition owns EnergyActivity persistence. Health supplies normalized data
  // through this explicit domain boundary and never writes the storage key itself.
  return importEnergyActivities(normalized);
}

// ─── Sync Orchestrator ────────────────────────────────────────────────────────

/**
 * Sync activities from a health provider for a date range.
 * Read-only: never writes to the external provider.
 * Returns the sync state after completion.
 */
export async function syncHealthActivities(
  startDate: string,
  endDate: string,
): Promise<HealthSyncState> {
  const adapter = await getAvailableAdapter();
  if (!adapter) {
    const state: HealthSyncState = {
      provider: 'health_connect',
      status: 'unavailable',
      error: 'No health provider available',
    };
    await saveHealthSyncState(state);
    return state;
  }

  // Check permissions
  const permStatus = await adapter.getPermissionStatus();
  if (permStatus === 'unavailable') {
    const state: HealthSyncState = {
      provider: adapter.provider,
      status: 'unavailable',
    };
    await saveHealthSyncState(state);
    return state;
  }
  if (permStatus === 'denied') {
    const state: HealthSyncState = {
      provider: adapter.provider,
      status: 'error',
      error: 'Health Connect permission denied',
    };
    await saveHealthSyncState(state);
    return state;
  }
  if (permStatus === 'not_determined') {
    const state: HealthSyncState = {
      provider: adapter.provider,
      status: 'permission_required',
    };
    await saveHealthSyncState(state);
    return state;
  }

  // Syncing
  const syncingState: HealthSyncState = {
    provider: adapter.provider,
    status: 'syncing',
  };
  await saveHealthSyncState(syncingState);

  try {
    const activities = await adapter.readActivities(startDate, endDate);
    await importHealthActivities(activities);

    const state: HealthSyncState = {
      provider: adapter.provider,
      status: 'ready',
      lastSyncAt: getNowISO(),
    };
    await saveHealthSyncState(state);
    return state;
  } catch (e) {
    const state: HealthSyncState = {
      provider: adapter.provider,
      status: 'error',
      error: e instanceof Error ? e.message : 'Sync failed',
    };
    await saveHealthSyncState(state);
    return state;
  }
}
