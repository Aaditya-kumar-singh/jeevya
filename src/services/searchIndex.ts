let version = 0;

export function getUnifiedSearchIndexVersion(): number {
  return version;
}

export function invalidateUnifiedSearchIndex(): void {
  version += 1;
}
