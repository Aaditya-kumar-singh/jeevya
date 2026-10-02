import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  createPaymentImport,
  getPaymentProviderSettings,
  parsePaymentText,
} from '@/services/paymentImports';
import type { PaymentProvider } from '@/types/paymentImport';
import { quarantinePaymentPayload } from '@/services/paymentQuarantine';
import { withRetry } from '@/lib/retryPolicy';

const PAYMENT_NOTIFICATION_FILE = 'jeevya-payment-notifications.jsonl';

const PACKAGE_PROVIDER: Record<string, PaymentProvider> = {
  'com.google.android.apps.nbu.paisa.user': 'google_pay',
  'com.phonepe.app': 'phonepe',
  'net.one97.paytm': 'paytm',
  'in.org.npci.upiapp': 'bhim',
};

function providerFromEvent(event: { packageName?: string; appLabel?: string }): PaymentProvider | undefined {
  if (event.packageName && PACKAGE_PROVIDER[event.packageName]) return PACKAGE_PROVIDER[event.packageName];
  const label = (event.appLabel ?? '').toLowerCase();
  if (label.includes('yono') || label.includes('state bank of india')) return 'sbi';
  if (label.includes('pnb one') || label.includes('punjab national bank')) return 'pnb';
  return undefined;
}

export async function ingestNativePaymentNotifications(): Promise<number> {
  if (Platform.OS !== 'android' || !FileSystem.documentDirectory) return 0;

  const uri = FileSystem.documentDirectory + PAYMENT_NOTIFICATION_FILE;

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return 0;

    const content = await withRetry(() => FileSystem.readAsStringAsync(uri), { attempts: 2 });
    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const settings = await getPaymentProviderSettings();
    let imported = 0;
    const failed: string[] = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as {
          packageName?: string;
          appLabel?: string;
          text?: string;
          postedAt?: number;
        };
        const provider = providerFromEvent(event);

        if (!provider || !settings[provider] || !event.text) continue;

        const parsed = parsePaymentText(event.text, provider);
        await createPaymentImport({
          provider,
          sourceLabel: event.appLabel || parsed.sourceLabel,
          sourcePackage: event.packageName,
          rawText: event.text,
          ...parsed,
          date: event.postedAt ? new Date(event.postedAt).toISOString() : parsed.date,
          sourceType: 'notification',
        });
        imported += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Payment notification parsing failed.';
        failed.push(line);
        await quarantinePaymentPayload({ source: 'notification', raw: line, reason });
      }
    }

    if (failed.length) {
      await FileSystem.writeAsStringAsync(uri, failed.join('\n') + '\n');
    } else {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }

    return imported;
  } catch {
    return 0;
  }
}
