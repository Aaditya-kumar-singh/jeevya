import AsyncStorage from '@react-native-async-storage/async-storage';
import { withStorageLock } from '@/services/storageReliability';
import {
  BACKUP_DOMAIN_KEYS,
  BACKUP_FORMAT,
  BACKUP_STORAGE_KEYS,
  BACKUP_VERSION,
  type BackupDomainName,
  type BackupValidationIssue,
  type BackupValidationResult,
  type LifeOSBackup,
} from '@/types/backup';

const DOMAIN_ORDER: BackupDomainName[] = [
  'tasks', 'habits', 'books', 'journal', 'finance', 'nutrition', 'health', 'workout', 'sleep', 'recovery', 'goals',
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;
const ID_FIELDS = new Set(['id', 'accountId', 'categoryId', 'bookId', 'habitId', 'taskId', 'templateId', 'programId', 'fromAccountId', 'toAccountId']);
const DATE_FIELDS = new Set(['date', 'dueDate', 'startDate', 'endDate', 'deadline', 'month', 'createdAt', 'updatedAt', 'completedAt', 'startedAt', 'finishedAt', 'recordedAt']);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function addIssue(issues: BackupValidationIssue[], issue: BackupValidationIssue): void {
  const fingerprint = `${issue.code}|${issue.domain ?? ''}|${issue.message}`;
  if (!issues.some((existing) => `${existing.code}|${existing.domain ?? ''}|${existing.message}` === fingerprint)) issues.push(issue);
}

function validateDates(value: unknown, domain: string, issues: BackupValidationIssue[], field?: string): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => validateDates(entry, domain, issues, field));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (DATE_FIELDS.has(key) && child != null) {
      const text = String(child);
      const valid = key === 'month' ? /^\d{4}-\d{2}$/.test(text) : (ISO_DATE.test(text) || ISO_DATE_TIME.test(text));
      if (!valid) addIssue(issues, { code: 'invalid_date', domain, message: `Invalid ${key} value in ${domain}.` });
    }
    validateDates(child, domain, issues, field);
  }
}

function validateIds(value: unknown, domain: string, issues: BackupValidationIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => validateIds(entry, domain, issues));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (ID_FIELDS.has(key) && child != null && (typeof child !== 'string' || child.trim() === '')) {
      addIssue(issues, { code: 'invalid_id', domain, message: `Invalid ${key} reference in ${domain}.` });
    }
    validateIds(child, domain, issues);
  }
}

function validateRecords(domain: BackupDomainName, payload: Record<string, unknown>, issues: BackupValidationIssue[]): void {
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      const seen = new Set<string>();
      for (const record of value) {
        if (!record || typeof record !== 'object') {
          addIssue(issues, { code: 'malformed_domain', domain, message: `Malformed record in ${key}.` });
          continue;
        }
        const id = (record as Record<string, unknown>).id;
        if (id !== undefined) {
          if (typeof id !== 'string' || id.trim() === '') addIssue(issues, { code: 'invalid_id', domain, message: `Invalid record ID in ${key}.` });
          else if (seen.has(id)) addIssue(issues, { code: 'invalid_id', domain, message: `Duplicate record ID ${id} in ${key}.` });
          else seen.add(id);
        }
      }
    } else if (typeof value !== 'object') {
      addIssue(issues, { code: 'malformed_domain', domain, message: `Malformed payload for ${key}.` });
    }
    validateIds(value, domain, issues);
    validateDates(value, domain, issues);
  }
}

function validateRelationships(backup: LifeOSBackup, issues: BackupValidationIssue[]): void {
  const tasks = backup.domains.tasks ?? {};
  const labels = Array.isArray(tasks['lifeos:labels']) ? tasks['lifeos:labels'] as Record<string, unknown>[] : [];
  const labelIds = new Set(labels.map((x) => x?.id).filter((x): x is string => typeof x === 'string'));
  const taskRecords = Array.isArray(tasks['lifeos:tasks']) ? tasks['lifeos:tasks'] as Record<string, unknown>[] : [];
  taskRecords.forEach((task) => {
    const ids = Array.isArray(task.labelIds) ? task.labelIds : [];
    ids.forEach((id) => { if (typeof id === 'string' && !labelIds.has(id)) addIssue(issues, { code: 'invalid_relationship', domain: 'tasks', message: `Task ${String(task.id)} references missing label ${id}.` }); });
  });

  const books = backup.domains.books ?? {};
  const bookIds = new Set((Array.isArray(books['lifeos:books']) ? books['lifeos:books'] as Record<string, unknown>[] : []).map((x) => x?.id).filter((x): x is string => typeof x === 'string'));
  const progress = Array.isArray(books['lifeos:book-progress']) ? books['lifeos:book-progress'] as Record<string, unknown>[] : [];
  progress.forEach((entry) => { if (typeof entry.bookId === 'string' && !bookIds.has(entry.bookId)) addIssue(issues, { code: 'invalid_relationship', domain: 'books', message: `Book progress ${String(entry.id)} references missing book ${entry.bookId}.` }); });

  const finance = backup.domains.finance ?? {};
  const accountIds = new Set((Array.isArray(finance['lifeos:finance:accounts']) ? finance['lifeos:finance:accounts'] as Record<string, unknown>[] : []).map((x) => x?.id).filter((x): x is string => typeof x === 'string'));
  const categoryIds = new Set((Array.isArray(finance['lifeos:finance:categories']) ? finance['lifeos:finance:categories'] as Record<string, unknown>[] : []).map((x) => x?.id).filter((x): x is string => typeof x === 'string'));
  const transactions = Array.isArray(finance['lifeos:finance:transactions']) ? finance['lifeos:finance:transactions'] as Record<string, unknown>[] : [];
  transactions.forEach((tx) => {
    for (const field of ['accountId', 'fromAccountId', 'toAccountId']) if (typeof tx[field] === 'string' && !accountIds.has(tx[field])) addIssue(issues, { code: 'invalid_relationship', domain: 'finance', message: `Transaction ${String(tx.id)} references missing account ${tx[field]}.` });
    if (typeof tx.categoryId === 'string' && !categoryIds.has(tx.categoryId)) addIssue(issues, { code: 'invalid_relationship', domain: 'finance', message: `Transaction ${String(tx.id)} references missing category ${tx.categoryId}.` });
  });
  const budgets = Array.isArray(finance['lifeos:finance:budgets']) ? finance['lifeos:finance:budgets'] as Record<string, unknown>[] : [];
  budgets.forEach((budget) => { if (typeof budget.categoryId === 'string' && !categoryIds.has(budget.categoryId)) addIssue(issues, { code: 'invalid_relationship', domain: 'finance', message: `Budget ${String(budget.id)} references missing category ${budget.categoryId}.` }); });

  const nutrition = backup.domains.nutrition ?? {};
  const foodIds = new Set((Array.isArray(nutrition['lifeos:nutrition:foods']) ? nutrition['lifeos:nutrition:foods'] as Record<string, unknown>[] : []).map((x) => x?.id).filter((x): x is string => typeof x === 'string'));
  const foodLogs = Array.isArray(nutrition['lifeos:nutrition:food-logs']) ? nutrition['lifeos:nutrition:food-logs'] as Record<string, unknown>[] : [];
  foodLogs.forEach((log) => { if (typeof log.foodId === 'string' && !foodIds.has(log.foodId)) addIssue(issues, { code: 'invalid_relationship', domain: 'nutrition', message: `Food log ${String(log.id)} references missing food ${log.foodId}.` }); });
}

export async function exportBackup(): Promise<LifeOSBackup> {
  const raw = await AsyncStorage.multiGet([...BACKUP_STORAGE_KEYS]);
  const byKey = new Map(raw);
  const dynamicKeys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith('lifeos:exercise-completed:')).sort();
  const domains: LifeOSBackup['domains'] = {};
  for (const domain of DOMAIN_ORDER) {
    const payload: Record<string, unknown> = {};
    for (const key of BACKUP_DOMAIN_KEYS[domain]) {
      const rawValue = byKey.get(key);
      if (rawValue == null) continue;
      try { payload[key] = JSON.parse(rawValue); } catch { payload[key] = null; }
    }
    if (domain === 'workout') {
      for (const key of dynamicKeys) {
        const rawValue = await AsyncStorage.getItem(key);
        if (rawValue != null) { try { payload[key] = JSON.parse(rawValue); } catch { payload[key] = null; } }
      }
    }
    if (Object.keys(payload).length > 0) domains[domain] = payload;
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    domains,
  };
}

export function serializeBackup(backup: LifeOSBackup): string {
  return JSON.stringify(backup, null, 2);
}

export function validateBackup(input: string | unknown): BackupValidationResult {
  const issues: BackupValidationIssue[] = [];
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try { parsed = JSON.parse(input); } catch { return { valid: false, backup: null, issues: [{ code: 'invalid_json', message: 'Backup is not valid JSON.' }] }; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { valid: false, backup: null, issues: [{ code: 'malformed_backup', message: 'Backup root must be an object.' }] };
  const root = parsed as Record<string, unknown>;
  if (root.format !== BACKUP_FORMAT) issues.push({ code: 'invalid_format', message: 'Unsupported backup format.' });
  if (root.version !== BACKUP_VERSION) issues.push({ code: 'unsupported_version', message: 'Unsupported backup version.' });
  if (typeof root.createdAt !== 'string' || !ISO_DATE_TIME.test(root.createdAt)) issues.push({ code: 'invalid_date', message: 'Backup creation timestamp is invalid.' });
  if (typeof root.appVersion !== 'string') issues.push({ code: 'malformed_backup', message: 'Backup appVersion is missing or invalid.' });
  if (!root.domains || typeof root.domains !== 'object' || Array.isArray(root.domains)) issues.push({ code: 'malformed_backup', message: 'Backup domains payload is invalid.' });
  if (issues.length === 0) {
    const domains = root.domains as Record<string, unknown>;
    for (const domain of Object.keys(domains)) {
      if (!DOMAIN_ORDER.includes(domain as BackupDomainName)) { addIssue(issues, { code: 'invalid_domain', domain, message: `Unsupported backup domain ${domain}.` }); continue; }
      const payload = domains[domain];
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) { addIssue(issues, { code: 'malformed_domain', domain, message: `Malformed ${domain} payload.` }); continue; }
      const allowed = new Set(BACKUP_DOMAIN_KEYS[domain as BackupDomainName]);
      for (const key of Object.keys(payload as object)) {
        if (!allowed.has(key) && !(domain === 'workout' && key.startsWith('lifeos:exercise-completed:'))) addIssue(issues, { code: 'invalid_domain', domain, message: `Unsupported storage key ${key} in ${domain}.` });
      }
      validateRecords(domain as BackupDomainName, payload as Record<string, unknown>, issues);
    }
    validateRelationships({ ...root, domains } as LifeOSBackup, issues);
  }
  return { valid: issues.length === 0, backup: issues.length === 0 ? clone(parsed as LifeOSBackup) : null, issues };
}

export async function restoreBackup(input: string | LifeOSBackup): Promise<{ success: boolean; message: string; validation: BackupValidationResult }> {
  const validation = validateBackup(input);
  if (!validation.valid || !validation.backup) return { success: false, message: 'Backup validation failed. Existing data was preserved.', validation };
  const backup = validation.backup;
  const existingKeys = await AsyncStorage.getAllKeys();
  const lockKeys = [...new Set([
    ...BACKUP_STORAGE_KEYS,
    ...existingKeys.filter((key) => key.startsWith('lifeos:exercise-completed:')),
  ])];
  return withStorageLock(lockKeys, async () => {
    const supportedKeys = new Set<string>(BACKUP_STORAGE_KEYS);
    existingKeys.filter((key) => key.startsWith('lifeos:exercise-completed:')).forEach((key) => supportedKeys.add(key));
    const snapshot = await AsyncStorage.multiGet([...supportedKeys]);
    const writes: [string, string][] = [];
    const backupKeys = new Set<string>();
    for (const domain of DOMAIN_ORDER) {
      const payload = backup.domains[domain];
      if (!payload) continue;
      for (const [key, value] of Object.entries(payload)) { backupKeys.add(key); writes.push([key, JSON.stringify(value)]); }
    }
    try {
      const toRemove = [...supportedKeys].filter((key) => !backupKeys.has(key));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
      if (writes.length) await AsyncStorage.multiSet(writes);
      return { success: true, message: 'Restore completed successfully.', validation };
    } catch {
      try {
        const current = await AsyncStorage.getAllKeys();
        const restoreKeys = [...new Set([...supportedKeys, ...current.filter((key) => key.startsWith('lifeos:exercise-completed:'))])];
        await AsyncStorage.multiRemove(restoreKeys);
        const originalWrites = snapshot.filter((entry): entry is [string, string] => entry[1] != null);
        if (originalWrites.length) await AsyncStorage.multiSet(originalWrites);
      } catch {
        return { success: false, message: 'Restore failed and rollback could not be completed.', validation };
      }
      return { success: false, message: 'Restore failed. Existing data was restored from the preflight snapshot.', validation };
    }
  });
}

export async function preflightBackup(input: string | LifeOSBackup): Promise<BackupValidationResult> {
  return validateBackup(input);
}
