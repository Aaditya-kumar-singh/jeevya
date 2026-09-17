import AsyncStorage from '@react-native-async-storage/async-storage';
import { readStorage, withStorageLock, writeStorage } from '@/services/storageReliability';

export async function saveData<T>(key: string, data: T): Promise<void> {
  await writeStorage(key, data);
}

export async function loadData<T>(key: string, fallback: T): Promise<T> {
  const result = await readStorage(key, fallback);
  return result.value;
}

export async function removeData(key: string): Promise<void> {
  await withStorageLock([key], () => AsyncStorage.removeItem(key));
}
