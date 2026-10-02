export const BACKUP_FORMAT = 'jeevya-backup' as const;
export const BACKUP_VERSION = 1 as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;

export type BackupDomainName =
  | 'tasks' | 'habits' | 'books' | 'journal' | 'finance' | 'nutrition'
  | 'health' | 'workout' | 'sleep' | 'recovery' | 'goals';

export interface BackupDomainPayload {
  [storageKey: string]: unknown;
}

export interface BackupIntegrity {
  algorithm: 'sha256';
  hash: string;
}

export interface JeevyaBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  schemaVersion?: number;
  createdAt: string;
  appVersion: string;
  domains: Partial<Record<BackupDomainName, BackupDomainPayload>>;
  integrity?: BackupIntegrity;
}

export interface EncryptedJeevyaBackup {
  format: 'jeevya-encrypted-backup';
  version: 1;
  cipher: 'aes-256-gcm';
  kdf: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
}

export type BackupValidationCode =
  | 'invalid_json' | 'invalid_format' | 'unsupported_version' | 'malformed_backup'
  | 'malformed_domain' | 'invalid_domain' | 'invalid_id' | 'invalid_date'
  | 'invalid_relationship' | 'invalid_value' | 'integrity_mismatch';

export interface BackupValidationIssue {
  code: BackupValidationCode;
  domain?: string;
  message: string;
}

export interface BackupValidationResult {
  valid: boolean;
  backup: JeevyaBackup | null;
  issues: BackupValidationIssue[];
}

export interface BackupOperationResult {
  success: boolean;
  message: string;
  backup?: JeevyaBackup;
  validation?: BackupValidationResult;
}

export interface BackupRestorePreview {
  valid: boolean;
  domains: Array<{
    domain: BackupDomainName;
    recordCount: number;
    storageKeys: string[];
  }>;
  selectedDomains: BackupDomainName[];
  keysToReplace: string[];
  keysToRemove: string[];
  warnings: string[];
  validation: BackupValidationResult;
}

export interface SelectiveRestoreOptions {
  domains?: BackupDomainName[];
  replaceSelectedDomains?: boolean;
}

export const BACKUP_STORAGE_KEYS = [
  'jeevya:tasks', 'jeevya:habits', 'jeevya:habit-logs', 'jeevya:labels',
  'jeevya:books', 'jeevya:book-goals', 'jeevya:book-progress', 'jeevya:journal',
  'jeevya:finance:accounts', 'jeevya:finance:transactions', 'jeevya:finance:categories',
  'jeevya:finance:budgets', 'jeevya:finance:savings-goals',
  'jeevya:finance:payment-imports', 'jeevya:finance:payment-import-audit',
  'jeevya:finance:payment-import-batches', 'jeevya:finance:payment-provider-settings',
  'jeevya:nutrition:foods', 'jeevya:nutrition:food-logs', 'jeevya:nutrition:recipes',
  'jeevya:nutrition:body-profile', 'jeevya:nutrition:energy-activities',
  'jeevya:workouts:sessions', 'jeevya:workouts:templates', 'jeevya:workouts:programs',
  'jeevya:health:sleep',
] as const;

export const BACKUP_DOMAIN_KEYS: Record<BackupDomainName, readonly string[]> = {
  tasks: ['jeevya:tasks', 'jeevya:labels'],
  habits: ['jeevya:habits', 'jeevya:habit-logs'],
  books: ['jeevya:books', 'jeevya:book-goals', 'jeevya:book-progress'],
  journal: ['jeevya:journal'],
  finance: [
    'jeevya:finance:accounts', 'jeevya:finance:transactions', 'jeevya:finance:categories',
    'jeevya:finance:budgets', 'jeevya:finance:savings-goals', 'jeevya:finance:payment-imports',
    'jeevya:finance:payment-import-audit', 'jeevya:finance:payment-import-batches',
    'jeevya:finance:payment-provider-settings',
  ],
  nutrition: [
    'jeevya:nutrition:foods', 'jeevya:nutrition:food-logs', 'jeevya:nutrition:recipes',
    'jeevya:nutrition:body-profile', 'jeevya:nutrition:energy-activities',
  ],
  health: [],
  workout: ['jeevya:workouts:sessions', 'jeevya:workouts:templates', 'jeevya:workouts:programs'],
  sleep: ['jeevya:health:sleep'],
  recovery: [],
  goals: [],
};
