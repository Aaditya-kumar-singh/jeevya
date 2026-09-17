import { loadData, saveData } from '@/lib/storage';
import { isValidDay } from '@/lib/journal-calendar';
import { uid } from '@/lib/uid';

export const SLEEP_KEY = 'lifeos:health:sleep';
export type SleepQuality = 'poor' | 'fair' | 'good' | 'excellent';

export interface SleepEntry {
  id: string;
  date: string;
  bedtime?: string;
  sleepStart: string;
  wakeTime?: string;
  sleepEnd: string;
  durationMinutes: number;
  quality: SleepQuality;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSleepEntryInput {
  date: string;
  bedtime?: string | null;
  sleepStart: string;
  wakeTime?: string | null;
  sleepEnd: string;
  durationMinutes?: number;
  quality: SleepQuality;
  notes?: string | null;
}

export type UpdateSleepEntryInput = Partial<Omit<CreateSleepEntryInput, 'date'>> & { date?: string };

const QUALITY_VALUES: SleepQuality[] = ['poor', 'fair', 'good', 'excellent'];
let storageQueue: Promise<void> = Promise.resolve();

function nowIso(): string { return new Date().toISOString(); }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function validTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || !value.includes('T')) return false;
  return Number.isFinite(Date.parse(value));
}
function validQuality(value: unknown): value is SleepQuality { return typeof value === 'string' && QUALITY_VALUES.includes(value as SleepQuality); }
function calculatedDurationMinutes(start: string, end: string): number {
  return (Date.parse(end) - Date.parse(start)) / 60000;
}
function validateInput(input: CreateSleepEntryInput, existingDuration?: number) {
  if (!isValidDay(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date');
  if (!validTimestamp(input.sleepStart)) throw new Error('Sleep start must be a valid timestamp');
  if (!validTimestamp(input.sleepEnd)) throw new Error('Sleep end must be a valid timestamp');
  const duration = calculatedDurationMinutes(input.sleepStart, input.sleepEnd);
  if (!finite(duration) || duration <= 0) throw new Error('Sleep end must be after sleep start');
  if (input.bedtime != null && !validTimestamp(input.bedtime)) throw new Error('Bedtime must be a valid timestamp');
  if (input.wakeTime != null && !validTimestamp(input.wakeTime)) throw new Error('Wake time must be a valid timestamp');
  if (!validQuality(input.quality)) throw new Error('Quality must be poor, fair, good, or excellent');
  if (input.durationMinutes != null && (!finite(input.durationMinutes) || input.durationMinutes <= 0 || Math.abs(input.durationMinutes - duration) > 1e-9)) {
    throw new Error('Duration must be positive and consistent with sleep start and sleep end');
  }
  if (existingDuration != null && (!finite(existingDuration) || existingDuration <= 0)) throw new Error('Stored duration is invalid');
  if (input.notes != null && typeof input.notes !== 'string') throw new Error('Notes must be text');
  return duration;
}

function normalizeEntry(raw: unknown): SleepEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SleepEntry> & { duration?: unknown };
  if (typeof r.id !== 'string' || !isValidDay(r.date) || !validTimestamp(r.sleepStart) || !validTimestamp(r.sleepEnd) || !validQuality(r.quality)) return null;
  const duration = calculatedDurationMinutes(r.sleepStart, r.sleepEnd);
  if (!finite(duration) || duration <= 0) return null;
  if (r.bedtime != null && !validTimestamp(r.bedtime)) return null;
  if (r.wakeTime != null && !validTimestamp(r.wakeTime)) return null;
  // Legacy duration is intentionally ignored when timestamps are valid. The canonical
  // value is always derived from the actual interval so older records remain usable.
  const createdAt = validTimestamp(r.createdAt) ? r.createdAt : nowIso();
  const updatedAt = validTimestamp(r.updatedAt) ? r.updatedAt : createdAt;
  return {
    id: r.id,
    date: r.date,
    bedtime: r.bedtime ?? undefined,
    sleepStart: r.sleepStart,
    wakeTime: r.wakeTime ?? undefined,
    sleepEnd: r.sleepEnd,
    durationMinutes: duration,
    quality: r.quality,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
    createdAt,
    updatedAt,
  };
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

async function readAll(): Promise<SleepEntry[]> {
  const raw = await loadData<unknown>(SLEEP_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeEntry).filter((entry): entry is SleepEntry => !!entry);
}
async function writeAll(entries: SleepEntry[]): Promise<void> { await saveData(SLEEP_KEY, entries); }
function locked<T>(operation: () => Promise<T>): Promise<T> {
  const previous = storageQueue;
  let release!: () => void;
  storageQueue = new Promise<void>((resolve) => { release = resolve; });
  return previous.then(operation).finally(release);
}
function sortEntries(entries: SleepEntry[]): SleepEntry[] {
  return entries.slice().sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff) return dateDiff;
    const startDiff = Date.parse(b.sleepStart) - Date.parse(a.sleepStart);
    if (startDiff) return startDiff;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id.localeCompare(a.id);
  });
}
function publicEntry(entry: SleepEntry): SleepEntry { return clone(entry); }

export async function createSleepEntry(input: CreateSleepEntryInput): Promise<SleepEntry> {
  return locked(async () => {
    const duration = validateInput(input);
    const list = await readAll();
    const duplicate = list.find((entry) => entry.date === input.date);
    if (duplicate) throw new Error('A sleep entry already exists for this date');
    const timestamp = nowIso();
    const entry: SleepEntry = {
      id: uid('sleep_'),
      date: input.date,
      bedtime: input.bedtime ?? undefined,
      sleepStart: input.sleepStart,
      wakeTime: input.wakeTime ?? undefined,
      sleepEnd: input.sleepEnd,
      durationMinutes: duration,
      quality: input.quality,
      notes: input.notes ?? undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await writeAll([entry, ...list]);
    return publicEntry(entry);
  });
}

export async function getSleepEntry(id: string): Promise<SleepEntry | null> {
  const entry = (await readAll()).find((item) => item.id === id);
  return entry ? publicEntry(entry) : null;
}

export async function listSleepEntries(): Promise<SleepEntry[]> {
  return sortEntries(await readAll()).map(publicEntry);
}

export async function updateSleepEntry(id: string, patch: UpdateSleepEntryInput): Promise<SleepEntry> {
  return locked(async () => {
    const list = await readAll();
    const index = list.findIndex((entry) => entry.id === id);
    if (index < 0) throw new Error('Sleep entry not found');
    const current = list[index];
    const nextInput: CreateSleepEntryInput = {
      date: patch.date ?? current.date,
      bedtime: patch.bedtime === null ? undefined : (patch.bedtime ?? current.bedtime),
      sleepStart: patch.sleepStart ?? current.sleepStart,
      wakeTime: patch.wakeTime === null ? undefined : (patch.wakeTime ?? current.wakeTime),
      sleepEnd: patch.sleepEnd ?? current.sleepEnd,
      durationMinutes: patch.durationMinutes,
      quality: patch.quality ?? current.quality,
      notes: patch.notes === null ? undefined : (patch.notes ?? current.notes),
    };
    const duration = validateInput(nextInput);
    const duplicate = list.find((entry) => entry.date === nextInput.date && entry.id !== id);
    if (duplicate) throw new Error('A sleep entry already exists for this date');
    const updated: SleepEntry = {
      ...current,
      date: nextInput.date,
      bedtime: nextInput.bedtime ?? undefined,
      sleepStart: nextInput.sleepStart,
      wakeTime: nextInput.wakeTime ?? undefined,
      sleepEnd: nextInput.sleepEnd,
      durationMinutes: duration,
      quality: nextInput.quality,
      notes: nextInput.notes ?? undefined,
      updatedAt: nowIso(),
    };
    const next = list.slice();
    next[index] = updated;
    await writeAll(next);
    return publicEntry(updated);
  });
}

export async function deleteSleepEntry(id: string): Promise<void> {
  return locked(async () => {
    const list = await readAll();
    await writeAll(list.filter((entry) => entry.id !== id));
  });
}

export async function getSleepEntryByDate(date: string): Promise<SleepEntry | null> {
  if (!isValidDay(date)) return null;
  const matches = (await readAll()).filter((entry) => entry.date === date);
  if (!matches.length) return null;
  return publicEntry(matches.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id.localeCompare(a.id))[0]);
}

export async function getSleepEntriesByDateRange(startDate: string, endDate: string): Promise<SleepEntry[]> {
  if (!isValidDay(startDate) || !isValidDay(endDate) || startDate > endDate) return [];
  return sortEntries((await readAll()).filter((entry) => entry.date >= startDate && entry.date <= endDate)).map(publicEntry);
}
