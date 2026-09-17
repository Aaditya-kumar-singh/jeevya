import AsyncStorage from '@react-native-async-storage/async-storage';
import { readStorage, updateStorage, withStorageLock } from '@/services/storageReliability';
import { supabase } from '@/lib/supabase';
import { BACKUP_STORAGE_KEYS } from '@/types/backup';
import type {
  SyncConflict,
  SyncConflictResolutionResult,
  SyncDomain,
  SyncDomainResult,
  SyncMetadata,
  SyncRecord,
  SyncResolution,
  SyncResult,
  SyncState,
  SyncStatus,
} from '@/types/sync';

const SYNC_METADATA_KEY = 'lifeos:sync:metadata';
const SYNC_CONFLICTS_KEY = 'lifeos:sync:conflicts';
const SYNC_STATE_KEY = 'lifeos:sync:status';
const SYNC_KEYS = [...BACKUP_STORAGE_KEYS];
const SYNC_DOMAIN_BY_KEY: Record<string, SyncDomain> = {
  'lifeos:tasks': 'tasks', 'lifeos:labels': 'tasks', 'lifeos:habits': 'habits', 'lifeos:habit-logs': 'habits',
  'lifeos:books': 'books', 'lifeos:book-goals': 'books', 'lifeos:book-progress': 'books', 'lifeos:journal': 'journal',
  'lifeos:finance:accounts': 'finance', 'lifeos:finance:transactions': 'finance', 'lifeos:finance:categories': 'finance',
  'lifeos:finance:budgets': 'finance', 'lifeos:finance:savings-goals': 'finance', 'lifeos:nutrition:foods': 'nutrition',
  'lifeos:nutrition:food-logs': 'nutrition', 'lifeos:nutrition:recipes': 'nutrition', 'lifeos:nutrition:body-profile': 'nutrition',
  'lifeos:nutrition:energy-activities': 'nutrition', 'lifeos:workouts:sessions': 'workout', 'lifeos:workouts:templates': 'workout',
  'lifeos:workouts:programs': 'workout', 'lifeos:health:sleep': 'sleep',
};
const SINGLETON_KEYS = new Set(['lifeos:nutrition:body-profile']);
const SYNCABLE_DOMAINS = new Set(Object.values(SYNC_DOMAIN_BY_KEY));
let syncPromise: { userId: string; promise: Promise<SyncResult> } | null = null;
const resolvingConflictIds = new Set<string>();
const resolutionPromises = new Map<string, Promise<SyncConflictResolutionResult>>();

interface LocalRecord {
  domain: SyncDomain; storageKey: string; recordId: string; payload: unknown; updatedAt: string | null; fingerprint: string;
}
interface LocalSnapshot { records: LocalRecord[]; degradedDomains: Set<SyncDomain>; errors: Partial<Record<SyncDomain, string>>; }

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(',')}}`;
}
function fingerprint(value: unknown): string { return stableSerialize(value); }
function updatedAtOf(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const object = value as Record<string, unknown>;
  for (const field of ['updatedAt', 'updated_at', 'completedAt', 'loggedAt', 'recordedAt', 'finishedAt', 'startedAt', 'createdAt']) {
    if (typeof object[field] === 'string' && object[field]) return object[field];
  }
  return null;
}
function recordIdOf(value: unknown, fallback: string): string | null {
  if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
    const id = (value as Record<string, unknown>).id as string;
    return id.trim() ? id : null;
  }
  return fallback;
}
function isObject(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function dynamicCompletionKeys(keys: string[]): string[] { return keys.filter((key) => key.startsWith('lifeos:exercise-completed:')).sort(); }
function metadataKey(record: Pick<LocalRecord, 'domain' | 'storageKey' | 'recordId'>): string { return `${record.domain}|${record.storageKey}|${record.recordId}`; }
function remoteKey(row: Pick<SyncRecord, 'domain' | 'storage_key' | 'record_id'>): string { return `${row.domain}|${row.storage_key}|${row.record_id}`; }
function conflictIdentity(conflict: Pick<SyncConflict, 'domain' | 'storageKey' | 'recordId'>): string { return `${conflict.domain}|${conflict.storageKey}|${conflict.recordId}`; }
function conflictIdFor(key: string, baselineFingerprint: string | null): string { return `lifeos-conflict:${key}:${fingerprint(baselineFingerprint)}`; }
function isNetworkFailure(error: unknown): boolean { return /network|fetch|offline|failed to fetch|connection|timeout/i.test(error instanceof Error ? error.message : String(error ?? '')); }

async function getCurrentSessionUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    const userId = data.session?.user?.id;
    return typeof userId === 'string' && userId.trim() ? userId : null;
  } catch {
    return null;
  }
}

async function assertSessionIdentity(expectedUserId: string): Promise<boolean> {
  return (await getCurrentSessionUserId()) === expectedUserId;
}

function staleSyncResult(message = 'Synchronization stopped because the authenticated session changed.'): SyncResult {
  return { state: 'auth_required', uploaded: 0, downloaded: 0, unchanged: 0, conflicts: [], domains: [], message };
}

async function snapshotLocal(): Promise<LocalSnapshot> {
  const errors: Partial<Record<SyncDomain, string>> = {};
  const degradedDomains = new Set<SyncDomain>();
  const records: LocalRecord[] = [];
  let allKeys: string[] = [];
  try { allKeys = Array.from(await AsyncStorage.getAllKeys()); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to inspect local storage.';
    for (const domain of SYNCABLE_DOMAINS) { degradedDomains.add(domain); errors[domain] = message; }
    return { records, degradedDomains, errors };
  }
  for (const key of [...new Set([...SYNC_KEYS, ...dynamicCompletionKeys(allKeys)])]) {
    const domain = key.startsWith('lifeos:exercise-completed:') ? 'workout' : SYNC_DOMAIN_BY_KEY[key];
    if (!domain) continue;
    const fallback: unknown = key.startsWith('lifeos:exercise-completed:') ? false : SINGLETON_KEYS.has(key) ? null : [];
    const result = await readStorage<unknown>(key, fallback);
    if (result.status === 'missing') continue;
    if (result.status === 'malformed' || result.status === 'unavailable') {
      degradedDomains.add(domain); errors[domain] = result.status === 'malformed' ? `Malformed local payload for ${key}.` : `Local storage unavailable for ${key}.`; continue;
    }
    if (key.startsWith('lifeos:exercise-completed:')) {
      if (typeof result.value !== 'boolean') { degradedDomains.add(domain); errors[domain] = `Invalid exercise completion payload for ${key}.`; continue; }
      records.push({ domain, storageKey: key, recordId: key.slice('lifeos:exercise-completed:'.length), payload: result.value, updatedAt: null, fingerprint: fingerprint(result.value) });
    } else if (Array.isArray(result.value)) {
      for (const item of result.value) {
        if (!isObject(item)) { degradedDomains.add(domain); errors[domain] = `Malformed record in ${key}.`; continue; }
        const id = recordIdOf(item, '');
        if (!id) { degradedDomains.add(domain); errors[domain] = `Invalid record ID in ${key}.`; continue; }
        records.push({ domain, storageKey: key, recordId: id, payload: item, updatedAt: updatedAtOf(item), fingerprint: fingerprint(item) });
      }
    } else if (isObject(result.value)) {
      records.push({ domain, storageKey: key, recordId: `${key}:singleton`, payload: result.value, updatedAt: updatedAtOf(result.value), fingerprint: fingerprint(result.value) });
    } else {
      degradedDomains.add(domain); errors[domain] = `Invalid payload for ${key}.`;
    }
  }
  return { records, degradedDomains, errors };
}

async function getMetadata(): Promise<SyncMetadata> {
  const result = await readStorage<SyncMetadata>(SYNC_METADATA_KEY, { version: 1, records: {} });
  if (result.status !== 'ok' || !result.value || result.value.version !== 1 || !isObject(result.value.records)) return { version: 1, records: {} };
  return result.value;
}
async function persistMetadata(metadata: SyncMetadata): Promise<void> { await updateStorage(SYNC_METADATA_KEY, { version: 1, records: {} }, () => metadata); }
async function getConflicts(): Promise<SyncConflict[]> {
  const result = await readStorage<SyncConflict[]>(SYNC_CONFLICTS_KEY, []);
  if (result.status !== 'ok' || !Array.isArray(result.value)) return [];
  return result.value.filter(isValidConflict);
}
function isValidConflict(value: unknown): value is SyncConflict {
  if (!isObject(value) || typeof value.conflictId !== 'string' || typeof value.domain !== 'string' || !SYNCABLE_DOMAINS.has(value.domain as SyncDomain)) return false;
  return typeof value.storageKey === 'string' && typeof value.recordId === 'string' && typeof value.detectedAt === 'string'
    && ['pending', 'resolved_local', 'resolved_remote', 'resolved_merged'].includes(String(value.status))
    && ['both_changed', 'deletion_conflict', 'local_changed_since_snapshot', 'invalid_remote'].includes(String(value.reason));
}
async function persistConflicts(conflicts: SyncConflict[]): Promise<void> { await updateStorage(SYNC_CONFLICTS_KEY, [], () => conflicts); }
async function persistStatus(status: SyncStatus): Promise<void> { await updateStorage(SYNC_STATE_KEY, { state: 'idle', lastSyncedAt: null, conflicts: 0, message: '' }, () => status); }
export async function getSyncStatus(): Promise<SyncStatus> {
  const result = await readStorage<SyncStatus>(SYNC_STATE_KEY, { state: 'idle', lastSyncedAt: null, conflicts: 0, message: 'Ready to synchronize.' });
  if (result.status !== 'ok' || !result.value || typeof result.value.state !== 'string') return { state: 'idle', lastSyncedAt: null, conflicts: 0, message: 'Ready to synchronize.' };
  return result.value;
}
export function getSyncStorageKeys(): readonly string[] { return SYNC_KEYS; }
export async function getPendingConflicts(): Promise<SyncConflict[]> { return (await getConflicts()).filter((conflict) => conflict.status === 'pending'); }

export interface SyncConflictDiagnostics {
  malformed: number;
  duplicateIds: number;
  unsupportedDomains: number;
  invalidStatuses: number;
  stalePending: number;
}

export async function getSyncConflictDiagnostics(): Promise<SyncConflictDiagnostics> {
  const result = await readStorage<unknown>(SYNC_CONFLICTS_KEY, []);
  if (result.status === 'missing') return { malformed: 0, duplicateIds: 0, unsupportedDomains: 0, invalidStatuses: 0, stalePending: 0 };
  if (result.status !== 'ok' || !Array.isArray(result.value)) return { malformed: 1, duplicateIds: 0, unsupportedDomains: 0, invalidStatuses: 0, stalePending: 0 };
  const seen = new Set<string>(); let malformed = 0; let duplicateIds = 0; let unsupportedDomains = 0; let invalidStatuses = 0; let stalePending = 0;
  const staleCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const value of result.value) {
    if (!isObject(value)) { malformed++; continue; }
    if (typeof value.conflictId !== 'string' || seen.has(value.conflictId)) { if (typeof value.conflictId === 'string') duplicateIds++; else malformed++; }
    if (typeof value.conflictId === 'string') seen.add(value.conflictId);
    if (typeof value.domain !== 'string' || !SYNCABLE_DOMAINS.has(value.domain as SyncDomain)) unsupportedDomains++;
    if (!['pending', 'resolved_local', 'resolved_remote', 'resolved_merged'].includes(String(value.status))) invalidStatuses++;
    if (value.status === 'pending' && typeof value.detectedAt === 'string' && Number.isFinite(Date.parse(value.detectedAt)) && Date.parse(value.detectedAt) < staleCutoff) stalePending++;
    if (!isValidConflict(value)) malformed++;
  }
  return { malformed, duplicateIds, unsupportedDomains, invalidStatuses, stalePending };
}

function validateRemoteRecord(row: unknown): row is SyncRecord {
  return isObject(row) && typeof row.domain === 'string' && SYNCABLE_DOMAINS.has(row.domain as SyncDomain)
    && typeof row.record_id === 'string' && !!row.record_id.trim() && typeof row.storage_key === 'string'
    && SYNC_DOMAIN_BY_KEY[row.storage_key] === row.domain && typeof row.updated_at === 'string' && Number.isFinite(Date.parse(row.updated_at))
    && typeof row.deleted === 'boolean' && 'payload' in row && (row.deleted || row.storage_key.startsWith('lifeos:exercise-completed:') || isObject(row.payload));
}
function safeRemotePayload(row: SyncRecord | null): unknown | null {
  if (!row) return null;
  if (row.deleted) return null;
  if (row.storage_key.startsWith('lifeos:exercise-completed:')) return typeof row.payload === 'boolean' ? row.payload : null;
  return isObject(row.payload) ? row.payload : null;
}
function buildConflict(local: LocalRecord | null, remote: SyncRecord | null, baseline: SyncMetadata['records'][string] | undefined, reason: SyncConflict['reason'], detectedAt: string): SyncConflict {
  const domain = (local?.domain ?? remote?.domain) as SyncDomain;
  const storageKey = local?.storageKey ?? remote?.storage_key ?? '';
  const recordId = local?.recordId ?? remote?.record_id ?? '';
  const baselineFingerprint = baseline?.fingerprint ?? null;
  return {
    conflictId: conflictIdFor(`${domain}|${storageKey}|${recordId}`, baselineFingerprint), domain, storageKey, recordId,
    baselineUpdatedAt: baseline?.updatedAt ?? null, baselineFingerprint, localUpdatedAt: local?.updatedAt ?? null,
    remoteUpdatedAt: remote?.updated_at ?? null, localPayload: local?.payload ?? null, remotePayload: safeRemotePayload(remote as SyncRecord),
    localDeleted: !local, remoteDeleted: !!remote?.deleted, detectedAt, status: 'pending', reason,
  };
}
function upsertConflict(list: SyncConflict[], conflict: SyncConflict): void {
  const identity = conflictIdentity(conflict);
  const existing = list.findIndex((item) => item.status === 'pending' && conflictIdentity(item) === identity);
  if (existing >= 0) list[existing] = { ...conflict, conflictId: list[existing].conflictId };
  else list.push(conflict);
}
function applyRecordToValue(current: unknown, record: Pick<LocalRecord, 'storageKey' | 'recordId'>, payload: unknown, deleted: boolean): unknown {
  if (record.storageKey.startsWith('lifeos:exercise-completed:')) return deleted ? false : payload;
  if (Array.isArray(current)) {
    const filtered = current.filter((item) => !(isObject(item) && item.id === record.recordId));
    return deleted ? filtered : [...filtered, payload];
  }
  return deleted ? null : payload;
}
async function applyRemoteRecord(record: LocalRecord, remote: SyncRecord): Promise<{ applied: boolean; concurrentChange: boolean }> {
  return withStorageLock([record.storageKey], async () => {
    const fallback = record.storageKey.startsWith('lifeos:exercise-completed:') ? false : SINGLETON_KEYS.has(record.storageKey) ? null : [];
    const currentResult = await readStorage<unknown>(record.storageKey, fallback);
    if (currentResult.status === 'malformed' || currentResult.status === 'unavailable') return { applied: false, concurrentChange: false };
    const current = currentResult.value;
    const currentPayload = record.storageKey.startsWith('lifeos:exercise-completed:') ? current : Array.isArray(current) ? current.find((item) => isObject(item) && item.id === record.recordId) : current;
    if (fingerprint(currentPayload ?? null) !== record.fingerprint) return { applied: false, concurrentChange: true };
    const next = applyRecordToValue(current, record, safeRemotePayload(remote), remote.deleted);
    await AsyncStorage.setItem(record.storageKey, JSON.stringify(next));
    return { applied: true, concurrentChange: false };
  });
}

async function performSynchronization(): Promise<SyncResult> {
  let sessionUserId: string | null = null;
  try { sessionUserId = (await supabase.auth.getSession()).data.session?.user?.id ?? null; }
  catch (error) {
    const state: SyncState = isNetworkFailure(error) ? 'offline' : 'error'; const message = state === 'offline' ? 'Supabase is currently offline.' : 'Unable to check Supabase session.';
    await persistStatus({ state, lastSyncedAt: null, conflicts: (await getPendingConflicts()).length, message });
    return { state, uploaded: 0, downloaded: 0, unchanged: 0, conflicts: [], domains: [], message };
  }
  if (!sessionUserId) {
    const message = 'Synchronization requires an authenticated Supabase session.';
    await persistStatus({ state: 'auth_required', lastSyncedAt: null, conflicts: (await getPendingConflicts()).length, message });
    return { state: 'auth_required', uploaded: 0, downloaded: 0, unchanged: 0, conflicts: [], domains: [], message };
  }
  if (!(await assertSessionIdentity(sessionUserId))) {
    const message = 'Synchronization stopped because the authenticated session changed.';
    await persistStatus({ state: 'auth_required', lastSyncedAt: null, conflicts: (await getPendingConflicts()).length, message });
    return staleSyncResult(message);
  }
  await persistStatus({ state: 'syncing', lastSyncedAt: null, conflicts: (await getPendingConflicts()).length, message: 'Synchronizing local data with Supabase.' });
  const local = await snapshotLocal(); const metadata = await getMetadata(); const existingConflicts = await getConflicts();
  if (!(await assertSessionIdentity(sessionUserId))) {
    const message = 'Synchronization stopped because the authenticated session changed.';
    await persistStatus({ state: 'auth_required', lastSyncedAt: null, conflicts: (await getPendingConflicts()).length, message });
    return staleSyncResult(message);
  }
  const storedConflicts = [...existingConflicts];
  const conflicts = [...existingConflicts.filter((item) => item.status === 'pending' && !resolvingConflictIds.has(item.conflictId))];
  const domainResults = new Map<SyncDomain, SyncDomainResult>(); const uploadedRows: SyncRecord[] = []; let downloaded = 0; let unchanged = 0; let invalidRemoteCount = 0;
  try {
    const { data: remoteRows, error } = await supabase.from('lifeos_sync_records').select('id,user_id,domain,record_id,storage_key,payload,updated_at,deleted,sync_version,device_updated_at').eq('user_id', sessionUserId);
    if (error) throw error;
    if (!Array.isArray(remoteRows)) throw new Error('Malformed Supabase sync response.');
    if (!(await assertSessionIdentity(sessionUserId))) {
      const message = 'Synchronization stopped because the authenticated session changed.';
      await persistStatus({ state: 'auth_required', lastSyncedAt: null, conflicts: (await getPendingConflicts()).length, message });
      return staleSyncResult(message);
    }
    const invalidRemote = remoteRows.filter((row: unknown) => !validateRemoteRecord(row));
    invalidRemoteCount = invalidRemote.length;
    for (const row of invalidRemote) {
      if (!isObject(row) || typeof row.domain !== 'string' || !SYNCABLE_DOMAINS.has(row.domain as SyncDomain) || typeof row.storage_key !== 'string' || typeof row.record_id !== 'string' || !row.record_id.trim()) continue;
      const localRecord = local.records.find((item) => metadataKey(item) === `${row.domain}|${row.storage_key}|${row.record_id}`) ?? null;
      const invalidConflict = buildConflict(localRecord, null, metadata.records[`${row.domain}|${row.storage_key}|${row.record_id}`], 'invalid_remote', new Date().toISOString());
      invalidConflict.remotePayload = 'payload' in row ? row.payload : null;
      invalidConflict.remoteUpdatedAt = typeof row.updated_at === 'string' ? row.updated_at : null;
      invalidConflict.remoteDeleted = row.deleted === true;
      upsertConflict(conflicts, invalidConflict);
    }
    const remoteByKey = new Map((remoteRows.filter((row: unknown): row is SyncRecord => validateRemoteRecord(row))).map((row) => [remoteKey(row), row]));
    const localByKey = new Map(local.records.map((record) => [metadataKey(record), record]));
    const nextMetadata: SyncMetadata = { version: 1, records: { ...metadata.records } }; const now = new Date().toISOString();

    const allKeys = new Set([...Object.keys(metadata.records), ...localByKey.keys(), ...remoteByKey.keys()]);
    for (const key of allKeys) {
      const localRecord = localByKey.get(key) ?? null; const remote = remoteByKey.get(key) ?? null; const baseline = metadata.records[key];
      if (!baseline) {
        if (localRecord && !remote) { uploadedRows.push({ user_id: sessionUserId, domain: localRecord.domain, record_id: localRecord.recordId, storage_key: localRecord.storageKey, payload: localRecord.payload, updated_at: localRecord.updatedAt ?? now, deleted: false, sync_version: 1, device_updated_at: now }); nextMetadata.records[key] = { fingerprint: localRecord.fingerprint, updatedAt: localRecord.updatedAt ?? now, deleted: false }; continue; }
        if (!localRecord && remote) {
          if (!remote.deleted) {
            if (!(await assertSessionIdentity(sessionUserId))) return staleSyncResult();
            const synthetic: LocalRecord = { domain: remote.domain, storageKey: remote.storage_key, recordId: remote.record_id, payload: null, updatedAt: null, fingerprint: fingerprint(null) };
            const applied = await applyRemoteRecord(synthetic, remote);
            if (applied.applied) downloaded++;
          }
          nextMetadata.records[key] = { fingerprint: remote.deleted ? fingerprint(null) : fingerprint(remote.payload), updatedAt: remote.updated_at, deleted: remote.deleted }; continue;
        }
        if (localRecord && remote) {
          const remotePayload = safeRemotePayload(remote); if (!remote.deleted && localRecord.fingerprint === fingerprint(remotePayload)) { unchanged++; nextMetadata.records[key] = { fingerprint: localRecord.fingerprint, updatedAt: remote.updated_at, deleted: false }; }
          else upsertConflict(conflicts, buildConflict(localRecord, remote, undefined, remote.deleted ? 'deletion_conflict' : 'both_changed', now));
        }
        continue;
      }
      const localMatchesRemote = (!localRecord && !!remote?.deleted) || (!!localRecord && !!remote && !remote.deleted && localRecord.fingerprint === fingerprint(remote.payload));
      if (localMatchesRemote) {
        unchanged++;
        const staleConflict = storedConflicts.find((item) => item.status === 'pending' && conflictIdentity(item) === key);
        if (staleConflict) staleConflict.status = 'resolved_merged';
        const pendingIndex = conflicts.findIndex((item) => conflictIdentity(item) === key);
        if (pendingIndex >= 0) conflicts.splice(pendingIndex, 1);
        nextMetadata.records[key] = { fingerprint: remote?.deleted ? fingerprint(null) : localRecord?.fingerprint ?? fingerprint(null), updatedAt: remote?.updated_at ?? baseline.updatedAt, deleted: !!remote?.deleted };
        continue;
      }
      const localChanged = baseline.deleted !== !localRecord || (!!localRecord && baseline.fingerprint !== localRecord.fingerprint);
      const remoteChanged = !remote ? !baseline.deleted : remote.deleted !== baseline.deleted || fingerprint(remote.deleted ? null : remote.payload) !== baseline.fingerprint;
      if (!localChanged && !remoteChanged) { unchanged++; continue; }
      if (localChanged && remoteChanged) {
        if (!localRecord && !remote) { nextMetadata.records[key] = { ...baseline, deleted: true, fingerprint: fingerprint(null), updatedAt: now }; continue; }
        if (!localRecord && remote?.deleted) { nextMetadata.records[key] = { fingerprint: fingerprint(null), updatedAt: remote.updated_at, deleted: true }; unchanged++; continue; }
        if (localRecord && remote?.deleted) upsertConflict(conflicts, buildConflict(localRecord, remote, baseline, 'deletion_conflict', now));
        else if (!localRecord || !remote) upsertConflict(conflicts, buildConflict(localRecord, remote, baseline, 'deletion_conflict', now));
        else upsertConflict(conflicts, buildConflict(localRecord, remote, baseline, 'both_changed', now));
        continue;
      }
      if (localChanged) {
        if (localRecord) {
          uploadedRows.push({ user_id: sessionUserId, domain: localRecord.domain, record_id: localRecord.recordId, storage_key: localRecord.storageKey, payload: localRecord.payload, updated_at: localRecord.updatedAt ?? now, deleted: false, sync_version: (remote?.sync_version ?? 0) + 1, device_updated_at: now });
          nextMetadata.records[key] = { fingerprint: localRecord.fingerprint, updatedAt: localRecord.updatedAt ?? now, deleted: false };
        } else {
          uploadedRows.push({ user_id: sessionUserId, domain: baselineKeyDomain(key), record_id: baselineKeyRecordId(key), storage_key: baselineKeyStorageKey(key), payload: null, updated_at: now, deleted: true, sync_version: (remote?.sync_version ?? 0) + 1, device_updated_at: now });
          nextMetadata.records[key] = { fingerprint: fingerprint(null), updatedAt: now, deleted: true };
        }
        continue;
      }
      if (remoteChanged && remote) {
        if (remote.deleted) {
          const synthetic: LocalRecord = localRecord ?? { domain: remote.domain, storageKey: remote.storage_key, recordId: remote.record_id, payload: null, updatedAt: null, fingerprint: fingerprint(null) };
          if (localRecord) {
            if (!(await assertSessionIdentity(sessionUserId))) return staleSyncResult();
            const applied = await applyRemoteRecord(synthetic, remote);
            if (applied.applied) downloaded++; else if (applied.concurrentChange) upsertConflict(conflicts, buildConflict(localRecord, remote, baseline, 'local_changed_since_snapshot', now));
          } else downloaded++;
        } else {
          const synthetic = localRecord ?? { domain: remote.domain, storageKey: remote.storage_key, recordId: remote.record_id, payload: null, updatedAt: null, fingerprint: fingerprint(null) };
          if (!(await assertSessionIdentity(sessionUserId))) return staleSyncResult();
          const applied = await applyRemoteRecord(synthetic, remote); if (applied.applied) downloaded++; else if (applied.concurrentChange) upsertConflict(conflicts, buildConflict(localRecord, remote, baseline, 'local_changed_since_snapshot', now));
        }
        nextMetadata.records[key] = { fingerprint: remote.deleted ? fingerprint(null) : fingerprint(remote.payload), updatedAt: remote.updated_at, deleted: remote.deleted };
      }
    }
    if (uploadedRows.length) {
      const fresh = await snapshotLocal(); const freshByKey = new Map(fresh.records.map((record) => [metadataKey(record), record]));
      const safeRows = uploadedRows.filter((row) => row.deleted ? !freshByKey.has(remoteKey(row)) : freshByKey.get(remoteKey(row))?.fingerprint === fingerprint(row.payload));
      for (const row of uploadedRows) if (!safeRows.includes(row)) upsertConflict(conflicts, buildConflict(freshByKey.get(remoteKey(row)) ?? null, remoteByKey.get(remoteKey(row)) ?? row, metadata.records[remoteKey(row)], 'local_changed_since_snapshot', now));
      if (safeRows.length) {
        if (!(await assertSessionIdentity(sessionUserId))) return staleSyncResult();
        if (safeRows.some((row) => row.user_id !== sessionUserId)) throw new Error('Refusing to upload a record outside the active authenticated identity.');
        const { error: uploadError } = await supabase.from('lifeos_sync_records').upsert(safeRows, { onConflict: 'user_id,domain,storage_key,record_id' });
        if (uploadError) throw uploadError;
        if (!(await assertSessionIdentity(sessionUserId))) return staleSyncResult('Synchronization completed a remote request before the authenticated session changed. Local state was not committed from the stale operation.');
      }
      uploadedRows.length = 0; uploadedRows.push(...safeRows);
    }
    const persistedConflicts = storedConflicts.filter((item) => item.status !== 'pending' || conflicts.some((pending) => conflictIdentity(pending) === conflictIdentity(item)));
    for (const pending of conflicts) upsertConflict(persistedConflicts, pending);
    if (!(await assertSessionIdentity(sessionUserId))) return staleSyncResult();
    await persistMetadata(nextMetadata); await persistConflicts(persistedConflicts);
    for (const row of uploadedRows) addDomain(domainResults, row.domain, 'uploaded');
    for (let i = 0; i < downloaded; i++) { /* aggregate below */ }
    for (const record of local.records) addDomain(domainResults, record.domain, 'unchanged');
    for (const conflict of conflicts) addDomain(domainResults, conflict.domain, 'conflicts');
    for (const [domain, message] of Object.entries(local.errors)) { const existing = domainResults.get(domain as SyncDomain) ?? emptyDomain(domain as SyncDomain); existing.degraded = true; existing.error = message; domainResults.set(domain as SyncDomain, existing); }
    const state: SyncState = invalidRemoteCount > 0 ? 'error' : conflicts.length ? 'conflict_pending' : local.degradedDomains.size ? 'error' : 'synced';
    const message = invalidRemoteCount > 0 ? `${invalidRemoteCount} invalid remote record${invalidRemoteCount === 1 ? '' : 's'} were rejected safely.` : conflicts.length ? `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} pending review.` : local.degradedDomains.size ? 'Synchronization completed with degraded local domains.' : 'LifeOS synchronization completed.';
    await persistStatus({ state, lastSyncedAt: new Date().toISOString(), conflicts: conflicts.length, message });
    return { state, uploaded: uploadedRows.length, downloaded, unchanged, conflicts, domains: [...domainResults.values()], message };
  } catch (error) {
    const state: SyncState = isNetworkFailure(error) ? 'offline' : 'error'; const message = error instanceof Error ? error.message : 'Synchronization failed.';
    await persistStatus({ state, lastSyncedAt: null, conflicts: conflicts.length, message });
    return { state, uploaded: 0, downloaded: 0, unchanged, conflicts, domains: [...domainResults.values()], message };
  }
}
function baselineKeyDomain(key: string): SyncDomain { return key.split('|')[0] as SyncDomain; }
function baselineKeyStorageKey(key: string): string { return key.split('|')[1] ?? ''; }
function baselineKeyRecordId(key: string): string { return key.split('|').slice(2).join('|'); }
function emptyDomain(domain: SyncDomain): SyncDomainResult { return { domain, uploaded: 0, downloaded: 0, unchanged: 0, conflicts: 0, degraded: false }; }
function addDomain(map: Map<SyncDomain, SyncDomainResult>, domain: SyncDomain, kind: 'uploaded' | 'downloaded' | 'unchanged' | 'conflicts'): void { const value = map.get(domain) ?? emptyDomain(domain); value[kind] += 1; map.set(domain, value); }

export async function synchronizeLifeOS(): Promise<SyncResult> {
  const currentUserId = await getCurrentSessionUserId();
  if (!currentUserId) {
    const message = 'Synchronization requires an authenticated Supabase session.';
    await persistStatus({ state: 'auth_required', lastSyncedAt: null, conflicts: (await getPendingConflicts()).length, message });
    return staleSyncResult(message);
  }
  if (syncPromise) {
    if (syncPromise.userId === currentUserId) return syncPromise.promise;
    return staleSyncResult('Synchronization is already active for a different authenticated account. Please retry after the current operation finishes.');
  }
  const promise = performSynchronization();
  syncPromise = { userId: currentUserId, promise };
  try { return await promise; } finally {
    if (syncPromise?.promise === promise) syncPromise = null;
  }
}

async function resolveConflictInternal(conflictId: string, resolution: SyncResolution): Promise<SyncConflictResolutionResult> {
  const session = await supabase.auth.getSession(); if (!session.data.session?.user?.id) return { success: false, state: 'auth_required', conflict: null, message: 'Conflict resolution requires an authenticated Supabase session.' };
  const conflicts = await getConflicts(); const conflict = conflicts.find((item) => item.conflictId === conflictId);
  if (!conflict) return { success: false, state: 'error', conflict: null, message: 'Conflict was not found.' };
  if (conflict.status !== 'pending') return { success: true, state: 'synced', conflict, message: 'Conflict was already resolved.' };
  if (conflict.reason === 'invalid_remote') return { success: false, state: 'error', conflict, message: 'The remote record is invalid or unsupported. The valid local record was preserved.' };
  const targetDeleted = resolution === 'keep_local' ? conflict.localDeleted : conflict.remoteDeleted;
  const targetPayload = resolution === 'keep_local' ? conflict.localPayload : conflict.remotePayload;
  const record: LocalRecord = { domain: conflict.domain, storageKey: conflict.storageKey, recordId: conflict.recordId, payload: targetPayload, updatedAt: resolution === 'keep_local' ? conflict.localUpdatedAt : conflict.remoteUpdatedAt, fingerprint: fingerprint(targetPayload) };
  try {
    await withStorageLock([conflict.storageKey], async () => {
      const currentResult = await readStorage<unknown>(conflict.storageKey, conflict.storageKey.startsWith('lifeos:exercise-completed:') ? false : SINGLETON_KEYS.has(conflict.storageKey) ? null : []);
      if (currentResult.status === 'malformed' || currentResult.status === 'unavailable') throw new Error(`Unable to safely resolve ${conflict.storageKey}.`);
      const next = applyRecordToValue(currentResult.value, record, targetPayload, targetDeleted);
      await AsyncStorage.setItem(conflict.storageKey, JSON.stringify(next));
    });
    const remoteBaselineFingerprint = fingerprint(conflict.remoteDeleted ? null : conflict.remotePayload);
    await updateStorage<SyncMetadata>(SYNC_METADATA_KEY, { version: 1, records: {} }, (current) => ({
      version: 1,
      records: {
        ...current.records,
        [conflictIdentity(conflict)]: {
          fingerprint: remoteBaselineFingerprint,
          updatedAt: conflict.remoteUpdatedAt ?? new Date().toISOString(),
          deleted: conflict.remoteDeleted,
        },
      },
    }));
    resolvingConflictIds.add(conflict.conflictId);
    const syncResult = await synchronizeLifeOS();
    resolvingConflictIds.delete(conflict.conflictId);
    if (syncResult.state === 'offline' || syncResult.state === 'error' || syncResult.state === 'auth_required' || syncResult.conflicts.some((item) => item.conflictId === conflict.conflictId)) {
      await persistStatus({ state: syncResult.state, lastSyncedAt: null, conflicts: (await getPendingConflicts()).length, message: `Resolution saved locally but cloud synchronization is pending: ${syncResult.message}` });
      return { success: false, state: syncResult.state, conflict, message: `Resolution could not be confirmed remotely. ${syncResult.message}` };
    }
    const resolvedStatus = resolution === 'keep_local' ? 'resolved_local' as const : 'resolved_remote' as const;
    const nextConflicts: SyncConflict[] = conflicts.map((item) => item.conflictId === conflict.conflictId ? { ...item, status: resolvedStatus } : item);
    await persistConflicts(nextConflicts);
    await persistStatus({ state: 'synced', lastSyncedAt: new Date().toISOString(), conflicts: nextConflicts.filter((item) => item.status === 'pending').length, message: 'Conflict resolved and synchronized.' });
    return { success: true, state: 'synced', conflict: { ...conflict, status: resolution === 'keep_local' ? 'resolved_local' : 'resolved_remote' }, message: 'Conflict resolved and synchronized.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Conflict resolution failed.';
    return { success: false, state: isNetworkFailure(error) ? 'offline' : 'error', conflict, message };
  }
}
function resolveConflictOnce(conflictId: string, resolution: SyncResolution): Promise<SyncConflictResolutionResult> {
  const key = `${conflictId}|${resolution}`;
  const existing = resolutionPromises.get(key);
  if (existing) return existing;
  const promise = resolveConflictInternal(conflictId, resolution);
  resolutionPromises.set(key, promise);
  void promise.then(() => { if (resolutionPromises.get(key) === promise) resolutionPromises.delete(key); }, () => { if (resolutionPromises.get(key) === promise) resolutionPromises.delete(key); });
  return promise;
}
export async function resolveConflictKeepLocal(conflictId: string): Promise<SyncConflictResolutionResult> { return resolveConflictOnce(conflictId, 'keep_local'); }
export async function resolveConflictKeepRemote(conflictId: string): Promise<SyncConflictResolutionResult> { return resolveConflictOnce(conflictId, 'keep_remote'); }
export async function resolveConflict(conflictId: string, resolution: SyncResolution): Promise<SyncConflictResolutionResult> { return resolveConflictOnce(conflictId, resolution); }
export async function retrySync(): Promise<SyncResult> { return synchronizeLifeOS(); }
