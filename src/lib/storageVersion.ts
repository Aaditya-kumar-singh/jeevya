let version = 0;
const keyVersions = new Map<string, number>();

export function getStorageVersion(key?: string): number {
  return key ? (keyVersions.get(key) ?? 0) : version;
}

export function markStorageChanged(keys: string[]): void {
  if (!keys.length) return;
  version += 1;
  for (const key of keys) keyVersions.set(key, version);
}
