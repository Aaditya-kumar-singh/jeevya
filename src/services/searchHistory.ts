import { loadData, saveData } from '@/lib/storage';

const KEY = 'jeevya:search:recent:v1';
const MAX_RECENT = 12;

export async function getRecentSearches(): Promise<string[]> {
  const value = await loadData<string[]>(KEY, []);
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, MAX_RECENT) : [];
}

export async function recordRecentSearch(query: string): Promise<string[]> {
  const normalized = query.trim();
  if (!normalized) return getRecentSearches();
  const current = await getRecentSearches();
  const next = [normalized, ...current.filter((item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase())].slice(0, MAX_RECENT);
  await saveData(KEY, next);
  return next;
}

export async function removeRecentSearch(query: string): Promise<string[]> {
  const next = (await getRecentSearches()).filter((item) => item !== query);
  await saveData(KEY, next);
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await saveData(KEY, []);
}
