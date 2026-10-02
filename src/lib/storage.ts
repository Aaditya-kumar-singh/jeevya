import AsyncStorage from '@react-native-async-storage/async-storage';
import { readStorage, readStorageMany, withStorageLock, writeStorage } from '@/services/storageReliability';
import { markStorageChanged } from '@/lib/storageVersion';

export async function saveData<T>(key: string, data: T): Promise<void> {
  await writeStorage(key, data);
  markStorageChanged([key]);
}

export async function loadData<T>(key: string, fallback: T): Promise<T> {
  const result = await readStorage(key, fallback);
  return result.value;
}

export async function loadDataBatch(entries: Array<{ key: string; fallback: unknown }>): Promise<Record<string, unknown>> {
  return readStorageMany(entries);
}

export async function saveDataBatch(entries: Array<{ key: string; data: unknown }>): Promise<void> {
  const serialized = entries.map(({ key, data }) => [key, JSON.stringify(data)] as [string, string]);
  await withStorageLock(entries.map(({ key }) => key), async () => { await AsyncStorage.multiSet(serialized); markStorageChanged(entries.map(({ key }) => key)); });
}

export async function removeData(key: string): Promise<void> {
  await withStorageLock([key], async () => { await AsyncStorage.removeItem(key); markStorageChanged([key]); });
}



