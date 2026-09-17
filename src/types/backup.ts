export const BACKUP_FORMAT = 'lifeos-backup' as const;
export const BACKUP_VERSION = 1 as const;

export type BackupDomainName =
  | 'tasks'
  | 'habits'
  | 'books'
  | 'journal'
  | 'finance'
  | 'nutrition'
  | 'health'
  | 'workout'
  | 'sleep'
  | 'recovery'
  | 'goals';

export interface BackupDomainPayload {
  [storageKey: string]: unknown;
}

export interface LifeOSBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  domains: Partial<Record<BackupDomainName, BackupDomainPayload>>;
}

export type BackupValidationCode =
  | 'invalid_json'
  | 'invalid_format'
  | 'unsupported_version'
  | 'malformed_backup'
  | 'malformed_domain'
  | 'invalid_domain'
  | 'invalid_id'
  | 'invalid_date'
  | 'invalid_relationship'
  | 'invalid_value';

export interface BackupValidationIssue {
  code: BackupValidationCode;
  domain?: string;
  message: string;
}

export interface BackupValidationResult {
  valid: boolean;
  backup: LifeOSBackup | null;
  issues: BackupValidationIssue[];
}

export interface BackupOperationResult {
  success: boolean;
  message: string;
  backup?: LifeOSBackup;
  validation?: BackupValidationResult;
}

export const BACKUP_STORAGE_KEYS = [
  'lifeos:tasks',
  'lifeos:habits',
  'lifeos:habit-logs',
  'lifeos:labels',
  'lifeos:books',
  'lifeos:book-goals',
  'lifeos:book-progress',
  'lifeos:journal',
  'lifeos:finance:accounts',
  'lifeos:finance:transactions',
  'lifeos:finance:categories',
  'lifeos:finance:budgets',
  'lifeos:finance:savings-goals',
  'lifeos:nutrition:foods',
  'lifeos:nutrition:food-logs',
  'lifeos:nutrition:recipes',
  'lifeos:nutrition:body-profile',
  'lifeos:nutrition:energy-activities',
  'lifeos:workouts:sessions',
  'lifeos:workouts:templates',
  'lifeos:workouts:programs',
  'lifeos:health:sleep',
] as const;

export const BACKUP_DOMAIN_KEYS: Record<BackupDomainName, readonly string[]> = {
  tasks: ['lifeos:tasks', 'lifeos:labels'],
  habits: ['lifeos:habits', 'lifeos:habit-logs'],
  books: ['lifeos:books', 'lifeos:book-goals', 'lifeos:book-progress'],
  journal: ['lifeos:journal'],
  finance: [
    'lifeos:finance:accounts',
    'lifeos:finance:transactions',
    'lifeos:finance:categories',
    'lifeos:finance:budgets',
    'lifeos:finance:savings-goals',
  ],
  nutrition: [
    'lifeos:nutrition:foods',
    'lifeos:nutrition:food-logs',
    'lifeos:nutrition:recipes',
    'lifeos:nutrition:body-profile',
    'lifeos:nutrition:energy-activities',
  ],
  health: [],
  workout: ['lifeos:workouts:sessions', 'lifeos:workouts:templates', 'lifeos:workouts:programs'],
  sleep: ['lifeos:health:sleep'],
  recovery: [],
  goals: [],
};
