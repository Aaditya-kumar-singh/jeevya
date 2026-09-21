export const BACKUP_FORMAT = 'jeevya-backup' as const;
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

export interface JeevyaBackup {
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
  backup: JeevyaBackup | null;
  issues: BackupValidationIssue[];
}

export interface BackupOperationResult {
  success: boolean;
  message: string;
  backup?: JeevyaBackup;
  validation?: BackupValidationResult;
}

export const BACKUP_STORAGE_KEYS = [
  'jeevya:tasks',
  'jeevya:habits',
  'jeevya:habit-logs',
  'jeevya:labels',
  'jeevya:books',
  'jeevya:book-goals',
  'jeevya:book-progress',
  'jeevya:journal',
  'jeevya:finance:accounts',
  'jeevya:finance:transactions',
  'jeevya:finance:categories',
  'jeevya:finance:budgets',
  'jeevya:finance:savings-goals',
  'jeevya:nutrition:foods',
  'jeevya:nutrition:food-logs',
  'jeevya:nutrition:recipes',
  'jeevya:nutrition:body-profile',
  'jeevya:nutrition:energy-activities',
  'jeevya:workouts:sessions',
  'jeevya:workouts:templates',
  'jeevya:workouts:programs',
  'jeevya:health:sleep',
] as const;

export const BACKUP_DOMAIN_KEYS: Record<BackupDomainName, readonly string[]> = {
  tasks: ['jeevya:tasks', 'jeevya:labels'],
  habits: ['jeevya:habits', 'jeevya:habit-logs'],
  books: ['jeevya:books', 'jeevya:book-goals', 'jeevya:book-progress'],
  journal: ['jeevya:journal'],
  finance: [
    'jeevya:finance:accounts',
    'jeevya:finance:transactions',
    'jeevya:finance:categories',
    'jeevya:finance:budgets',
    'jeevya:finance:savings-goals',
  ],
  nutrition: [
    'jeevya:nutrition:foods',
    'jeevya:nutrition:food-logs',
    'jeevya:nutrition:recipes',
    'jeevya:nutrition:body-profile',
    'jeevya:nutrition:energy-activities',
  ],
  health: [],
  workout: ['jeevya:workouts:sessions', 'jeevya:workouts:templates', 'jeevya:workouts:programs'],
  sleep: ['jeevya:health:sleep'],
  recovery: [],
  goals: [],
};
