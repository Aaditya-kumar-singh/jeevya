import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Repository<T> {
  get(fallback: T): Promise<T>;
  set(value: T): Promise<void>;
  remove(): Promise<void>;
}

/**
 * Minimal local persistence adapter. It owns storage mechanics only.
 * Parsing failures return the caller-provided fallback, matching the existing
 * lib/storage behavior. Writes/removals are serialized per repository instance.
 */
export class AsyncStorageRepository<T> implements Repository<T> {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly key: string) {}

  async get(fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(this.key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  async set(value: T): Promise<void> {
    return this.enqueue(async () => {
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(this.key, serialized);
    });
  }

  async remove(): Promise<void> {
    return this.enqueue(async () => {
      await AsyncStorage.removeItem(this.key);
    });
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const run = this.writeQueue.then(operation, operation);
    this.writeQueue = run.then(() => undefined, () => undefined);
    return run;
  }
}

export function createAsyncStorageRepository<T>(key: string): Repository<T> {
  return new AsyncStorageRepository<T>(key);
}
