// Type declarations for optional health packages.
// These packages may not be installed — the adapter handles this gracefully.

declare module 'react-native-health-connect' {
  export function isAvailable(): Promise<boolean>;
  export function checkPermission(
    recordType: string,
    accessType: string,
  ): Promise<string>;
  export function requestPermission(
    recordType: string,
    accessType: string,
  ): Promise<string>;
  export function readRecords(
    recordType: string,
    options: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]>;
}
