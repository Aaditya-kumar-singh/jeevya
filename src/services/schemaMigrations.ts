export interface VersionedDocument<T = unknown> {
  schemaVersion: number;
  data: T;
}

export type SchemaMigration<T = unknown> = (data: T) => T;

export function versioned<T>(data: T, schemaVersion = 1): VersionedDocument<T> {
  return { schemaVersion, data };
}

export function migrateSchema<T>(
  document: VersionedDocument<T>,
  targetVersion: number,
  migrations: Record<number, SchemaMigration<T>>,
): VersionedDocument<T> {
  if (!Number.isInteger(document.schemaVersion) || document.schemaVersion < 1) {
    throw new Error('Invalid schema version.');
  }
  if (!Number.isInteger(targetVersion) || targetVersion < document.schemaVersion) {
    throw new Error('Target schema version must be >= current schema version.');
  }

  let data = document.data;
  let schemaVersion = document.schemaVersion;
  while (schemaVersion < targetVersion) {
    const migrate = migrations[schemaVersion + 1];
    if (!migrate) throw new Error(`Missing migration for schema version ${schemaVersion + 1}.`);
    data = migrate(data);
    schemaVersion += 1;
  }
  return { schemaVersion, data };
}

export function parseVersionedDocument<T>(input: unknown): VersionedDocument<T> {
  if (!input || typeof input !== 'object') throw new Error('Versioned document must be an object.');
  const value = input as Record<string, unknown>;
  if (typeof value.schemaVersion !== 'number' || !Number.isInteger(value.schemaVersion) || value.schemaVersion < 1) {
    throw new Error('Missing or invalid schemaVersion.');
  }
  return { schemaVersion: value.schemaVersion as number, data: value.data as T };
}
