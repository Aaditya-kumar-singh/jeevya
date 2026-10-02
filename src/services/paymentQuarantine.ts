import * as FileSystem from 'expo-file-system/legacy';

const QUARANTINE_FILE = 'jeevya-payment-quarantine.jsonl';

export interface PaymentQuarantineEntry {
  at: string;
  source: 'notification' | 'statement' | 'manual';
  raw: string;
  reason: string;
}

function uri(): string | null {
  return FileSystem.documentDirectory ? FileSystem.documentDirectory + QUARANTINE_FILE : null;
}

export async function quarantinePaymentPayload(entry: Omit<PaymentQuarantineEntry, 'at'>): Promise<void> {
  const path = uri();
  if (!path) return;
  const line = JSON.stringify({ ...entry, at: new Date().toISOString() }) + '\n';
  try {
    const existing = await FileSystem.getInfoAsync(path);
    const previous = existing.exists ? await FileSystem.readAsStringAsync(path) : '';
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const retained = previous
      .split(/\r?\n/)
      .filter(Boolean)
      .map((raw) => {
        try {
          const parsed = JSON.parse(raw) as Partial<PaymentQuarantineEntry>;
          return typeof parsed.at === 'string' && Date.parse(parsed.at) >= cutoff ? raw : null;
        } catch {
          return null;
        }
      })
      .filter((raw): raw is string => raw !== null)
      .slice(-99);
    await FileSystem.writeAsStringAsync(path, [...retained, line].join('\n') + '\n');
  } catch {
    // Quarantine is best-effort and must never block the primary import flow.
  }
}

export async function getPaymentQuarantineCount(): Promise<number> {
  const path = uri();
  if (!path) return 0;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return 0;
    const text = await FileSystem.readAsStringAsync(path);
    return text.split(/\r?\n/).filter(Boolean).length;
  } catch {
    return 0;
  }
}

export async function clearPaymentQuarantine(): Promise<void> {
  const path = uri();
  if (path) await FileSystem.deleteAsync(path, { idempotent: true });
}
