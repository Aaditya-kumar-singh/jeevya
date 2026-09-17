export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'auth_required' | 'error' | 'conflict_pending';

export type SyncComparison = 'local_newer' | 'remote_newer' | 'equal' | 'both_changed' | 'deletion_conflict' | 'local_only' | 'remote_only' | 'deleted' | 'invalid_remote' | 'unresolved';

export type SyncConflictStatus = 'pending' | 'resolved_local' | 'resolved_remote' | 'resolved_merged';

export type SyncResolution = 'keep_local' | 'keep_remote';

export type SyncDomain =
  | 'tasks'
  | 'habits'
  | 'books'
  | 'journal'
  | 'finance'
  | 'nutrition'
  | 'workout'
  | 'sleep';

export interface SyncRecord {
  id?: string;
  user_id: string;
  domain: SyncDomain;
  record_id: string;
  storage_key: string;
  payload: unknown;
  updated_at: string;
  deleted: boolean;
  sync_version: number;
  device_updated_at?: string | null;
}

export interface SyncMetadataEntry {
  fingerprint: string;
  updatedAt: string;
  deleted: boolean;
}

export interface SyncMetadata {
  version: 1;
  records: Record<string, SyncMetadataEntry>;
}

export interface SyncConflict {
  conflictId: string;
  domain: SyncDomain;
  storageKey: string;
  recordId: string;
  baselineUpdatedAt: string | null;
  baselineFingerprint: string | null;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  localPayload: unknown | null;
  remotePayload: unknown | null;
  localDeleted: boolean;
  remoteDeleted: boolean;
  detectedAt: string;
  status: SyncConflictStatus;
  reason: 'both_changed' | 'deletion_conflict' | 'local_changed_since_snapshot' | 'invalid_remote';
}

export interface SyncDomainResult {
  domain: SyncDomain;
  uploaded: number;
  downloaded: number;
  unchanged: number;
  conflicts: number;
  degraded: boolean;
  error?: string;
}

export interface SyncResult {
  state: SyncState;
  uploaded: number;
  downloaded: number;
  unchanged: number;
  conflicts: SyncConflict[];
  domains: SyncDomainResult[];
  message: string;
}

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: string | null;
  conflicts: number;
  message: string;
}

export interface SyncConflictResolutionResult {
  success: boolean;
  state: SyncState;
  conflict: SyncConflict | null;
  message: string;
}
