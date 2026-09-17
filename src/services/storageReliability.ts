import AsyncStorage from '@react-native-async-storage/async-storage';

export type StorageReadStatus = 'missing' | 'ok' | 'malformed' | 'unavailable';

export interface StorageReadResult<T> {
  value: T;
  status: StorageReadStatus;
  error?: unknown;
}

const locks = new Map<string, Promise<void>>();
let acquisitionQueue: Promise<void> = Promise.resolve();

function normalizedKeys(keys: string[]): string[] {
  return [...new Set(keys.filter(Boolean))].sort();
}

/**
 * Run a local storage operation under an exclusive lock for the supplied keys.
 * Locks are process-local and intentionally provide no database/transaction
 * semantics. They only prevent overlapping LifeOS operations from interleaving.
 */
export async function withStorageLock<T>(keys: string[], operation: () => Promise<T>): Promise<T> {
  const lockKeys = normalizedKeys(keys);
  if (lockKeys.length === 0) return operation();

  let releaseAcquisition!: () => void;
  const acquisitionGate = new Promise<void>((resolve) => { releaseAcquisition = resolve; });
  const previousAcquisition = acquisitionQueue;
  acquisitionQueue = acquisitionQueue.then(() => acquisitionGate, () => acquisitionGate);
  await previousAcquisition;

  const waitFor = lockKeys.map((key) => locks.get(key)).filter((p): p is Promise<void> => !!p);
  const previousLocks = Promise.all(waitFor);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  for (const key of lockKeys) locks.set(key, gate);
  releaseAcquisition();
  await previousLocks;

  try {
    return await operation();
  } finally {
    release();
    for (const key of lockKeys) {
      if (locks.get(key) === gate) locks.delete(key);
    }
  }
}

export async function readStorage<T>(key: string, fallback: T): Promise<StorageReadResult<T>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return { value: fallback, status: 'missing' };
    try {
      return { value: JSON.parse(raw) as T, status: 'ok' };
    } catch (error) {
      return { value: fallback, status: 'malformed', error };
    }
  } catch (error) {
    return { value: fallback, status: 'unavailable', error };
  }
}

export async function writeStorage<T>(key: string, data: T): Promise<void> {
  const serialized = JSON.stringify(data);
  await withStorageLock([key], () => AsyncStorage.setItem(key, serialized));
}

export async function updateStorage<T>(
  key: string,
  fallback: T,
  updater: (current: T) => T | Promise<T>,
): Promise<T> {
  return withStorageLock([key], async () => {
    const result = await readStorage<T>(key, fallback);
    if (result.status === 'malformed' || result.status === 'unavailable') {
      throw result.error instanceof Error ? result.error : new Error(`Unable to read ${key}`);
    }
    const next = await updater(result.value);
    const serialized = JSON.stringify(next);
    await AsyncStorage.setItem(key, serialized);
    return next;
  });
}
