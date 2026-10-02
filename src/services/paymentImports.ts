import { loadData, saveData } from '@/lib/storage';
import { findMerchantMemory } from '@/services/financeMerchantMemory';
import { shouldAskForPurpose, suggestPurpose } from '@/services/financeIntelligence';
import { uid } from '@/lib/uid';
import {
  PAYMENT_PARSER_VERSION,
  type CreatePaymentImportInput,
  type PaymentImport,
  type PaymentProvider,
  type PaymentTransactionStatus,
  type UpdatePaymentImportInput,
} from '@/types/paymentImport';

export const PAYMENT_IMPORTS_KEY = 'jeevya:finance:payment-imports';
export const PAYMENT_IMPORT_AUDIT_KEY = 'jeevya:finance:payment-import-audit';
export const PAYMENT_IMPORT_BATCH_KEY = 'jeevya:finance:payment-import-batches';
export const PAYMENT_PROVIDER_SETTINGS_KEY = 'jeevya:finance:payment-provider-settings';

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  google_pay: 'Google Pay',
  phonepe: 'PhonePe',
  paytm: 'Paytm',
  sbi: 'SBI / YONO',
  pnb: 'PNB One',
  bhim: 'BHIM',
  other: 'Other UPI / Bank',
};

export interface PaymentImportAuditEntry {
  id: string;
  importId: string;
  action: 'created' | 'reviewed' | 'ignored' | 'edited' | 'deleted' | 'duplicate';
  at: string;
  changes?: Record<string, unknown>;
}

export interface PaymentImportBatch {
  id: string;
  source: 'notification' | 'paste' | 'manual' | 'statement' | 'share';
  createdAt: string;
  importIds: string[];
}

export type PaymentProviderSettings = Record<PaymentProvider, boolean>;

export const DEFAULT_PAYMENT_PROVIDER_SETTINGS: PaymentProviderSettings = {
  google_pay: true,
  phonepe: true,
  paytm: true,
  sbi: true,
  pnb: true,
  bhim: true,
  other: true,
};

export async function getPaymentImports(): Promise<PaymentImport[]> {
  return loadData<PaymentImport[]>(PAYMENT_IMPORTS_KEY, []);
}

export async function getPendingPaymentImports(): Promise<PaymentImport[]> {
  return (await getPaymentImports()).filter((item) => item.status === 'new');
}

export async function getPaymentImportAudit(): Promise<PaymentImportAuditEntry[]> {
  return loadData<PaymentImportAuditEntry[]>(PAYMENT_IMPORT_AUDIT_KEY, []);
}

export async function getPaymentImportBatches(): Promise<PaymentImportBatch[]> {
  return loadData<PaymentImportBatch[]>(PAYMENT_IMPORT_BATCH_KEY, []);
}

export async function getPaymentProviderSettings(): Promise<PaymentProviderSettings> {
  return loadData<PaymentProviderSettings>(
    PAYMENT_PROVIDER_SETTINGS_KEY,
    DEFAULT_PAYMENT_PROVIDER_SETTINGS,
  );
}

export async function setPaymentProviderEnabled(
  provider: PaymentProvider,
  enabled: boolean,
): Promise<PaymentProviderSettings> {
  const settings = await getPaymentProviderSettings();
  const next = { ...settings, [provider]: enabled };
  await saveData(PAYMENT_PROVIDER_SETTINGS_KEY, next);
  return next;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hash(value: string): string {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

export function getPaymentImportFingerprint(
  input: Pick<CreatePaymentImportInput, 'provider' | 'amount' | 'merchant' | 'referenceId' | 'date' | 'rawText'>,
): string {
  const stable = input.referenceId
    ? input.provider + '|ref|' + normalize(input.referenceId)
    : [
        input.provider,
        Math.abs(input.amount).toFixed(2),
        normalize(input.merchant ?? ''),
        input.date?.slice(0, 10) ?? '',
        normalize(input.rawText),
      ].join('|');
  return hash(stable);
}

function parseProviderText(text: string, provider: PaymentProvider): Omit<CreatePaymentImportInput, 'rawText' | 'provider'> {
  if (provider === 'google_pay') {
    text = text.replace(/Google Pay|GPay/gi, 'UPI');
  }
  if (provider === 'phonepe') {
    text = text
      .replace(/PhonePe/gi, 'UPI')
      .replace(/You paid\s+₹/i, 'Paid INR ')
      .replace(/Paid\s+₹/i, 'Paid INR ')
      .replace(/₹/g, 'INR ');
  }
  if (provider === 'paytm') {
    text = text
      .replace(/Paytm/gi, 'UPI')
      .replace(/You paid\s+₹/i, 'Paid INR ')
      .replace(/Paid\s+₹/i, 'Paid INR ')
      .replace(/₹/g, 'INR ')
      .replace(/UPI Transaction ID/gi, 'UPI Ref');
  }
  if (provider === 'sbi') {
    text = text
      .replace(/SBI|YONO/gi, 'Bank')
      .replace(/debited by/gi, 'debited')
      .replace(/credited by/gi, 'credited')
      .replace(/transaction reference/gi, 'UTR')
      .replace(/reference number/gi, 'UTR');
  }
  if (provider === 'pnb') {
    text = text
      .replace(/PNB One|Punjab National Bank/gi, 'Bank')
      .replace(/transaction reference/gi, 'UTR')
      .replace(/reference number/gi, 'UTR')
      .replace(/transaction id/gi, 'UTR');
  }
  if (provider === 'other' || provider === 'bhim') {
    text = text
      .replace(/BHIM/gi, 'UPI')
      .replace(/transaction reference/gi, 'UPI Ref')
      .replace(/transaction id/gi, 'UPI Ref');
  }
  const amountMatch =
    text.match(/(?:INR|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ??
    text.match(/(?:paid|debited|credited|sent|received|amount)\D{0,30}([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) throw new Error('Could not find a payment amount in the text');

  const amount = Number(amountMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Payment amount is invalid');

  const direction: CreatePaymentImportInput['direction'] =
    /credited|received|refund|cashback|added to/i.test(text) ? 'income' :
    /transfer(ed)?\s+to|sent\s+to/i.test(text) ? 'transfer' : 'expense';
  const transactionStatus: PaymentTransactionStatus =
    /failed|failure|declined/i.test(text) ? 'failed' :
    /pending|processing/i.test(text) ? 'pending' :
    /revers(ed|al)/i.test(text) ? 'reversed' :
    /refund(ed)?/i.test(text) ? 'refunded' : 'success';
  const upiMatch = text.match(/(?:upi|vpa|to)\s*[:\-]?\s*([a-z0-9._-]+@[a-z0-9.-]+)/i);
  const referenceMatch = text.match(/(?:utr|rrn|upi ref(?:erence)?|reference(?: no| number)?|txn(?: id|id)?)\s*[:#-]?\s*([a-z0-9-]{6,})/i);
  const merchantMatch = text.match(/(?:to|at|merchant|for|from)\s+([A-Za-z][A-Za-z0-9 &.'_-]{1,60}?)(?=\s+(?:on|via|using|for|from|ref|upi|inr|rs\.?|is|was|failed|pending|processing|reversed|refunded|refund)\b|[.,]|$)/i) ?? text.match(/paid\s+(?:to\s+)?([A-Za-z][A-Za-z0-9 &.'_-]{1,60}?)(?=\s+(?:on|via|using|for|from|ref|upi|inr|rs\.?|is|was|failed|pending|processing|reversed|refunded|refund)\b|[.,]|$)/i);
  const merchantCandidate = merchantMatch?.[1]?.trim();
  const merchant = merchantCandidate && !/^(your account|account|your bank account)$/i.test(merchantCandidate)
    ? merchantCandidate
    : undefined;
  return {
    sourceLabel: PROVIDER_LABELS[provider], amount, currency: 'INR', direction,
    ...(merchant ? { merchant, payee: merchant } : {}),
    ...(upiMatch ? { upiId: upiMatch[1] } : {}),
    ...(referenceMatch ? { referenceId: referenceMatch[1] } : {}),
    transactionStatus, date: new Date().toISOString(), tags: [],
    confidence: merchant || upiMatch || referenceMatch ? 0.88 : 0.65,
  };
}

export function parsePaymentText(
  rawText: string,
  provider: PaymentProvider = 'other',
): Omit<CreatePaymentImportInput, 'rawText' | 'provider'> {
  const text = rawText.trim();
  if (!text) throw new Error('Payment text is required');
  return parseProviderText(text, provider);
}

async function audit(
  importId: string,
  action: PaymentImportAuditEntry['action'],
  changes?: Record<string, unknown>,
): Promise<void> {
  const entries = await getPaymentImportAudit();
  await saveData(PAYMENT_IMPORT_AUDIT_KEY, [
    {
      id: uid('payaudit_'),
      importId,
      action,
      at: new Date().toISOString(),
      ...(changes ? { changes } : {}),
    },
    ...entries,
  ]);
}

export async function createPaymentImport(input: CreatePaymentImportInput): Promise<PaymentImport> {
  const rawText = input.rawText.trim();
  if (!rawText) throw new Error('Payment text is required');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }

  const now = new Date().toISOString();
  const normalizedInput = {
    ...input,
    amount: Math.abs(input.amount),
    currency: input.currency ?? 'INR',
    direction: input.direction ?? 'expense',
    sourceLabel: input.sourceLabel ?? PROVIDER_LABELS[input.provider],
    transactionStatus: input.transactionStatus ?? 'success',
    date: input.date ?? now,
    tags: input.tags ?? [],
    confidence: Math.max(0, Math.min(1, input.confidence ?? 0.5)),
    parserVersion: input.parserVersion ?? PAYMENT_PARSER_VERSION,
  };

  const fp = getPaymentImportFingerprint(normalizedInput);
  const existing = await getPaymentImports();
  const duplicate = existing.find((item) => item.fingerprint === fp);
  if (duplicate) {
    await audit(duplicate.id, 'duplicate', { fingerprint: fp });
    return duplicate;
  }

  if (!normalizedInput.purpose) {
    const remembered = await findMerchantMemory(normalizedInput.merchant);
    const suggested = remembered?.purpose ?? suggestPurpose({
      title: normalizedInput.sourceLabel,
      merchant: normalizedInput.merchant,
      note: normalizedInput.note ?? '',
      categoryId: '',
    });
    if (suggested) normalizedInput.purpose = suggested;
    else if (shouldAskForPurpose({
      amount: normalizedInput.amount,
      merchant: normalizedInput.merchant,
      title: normalizedInput.sourceLabel,
      note: normalizedInput.note ?? '',
      purpose: normalizedInput.purpose,
      categoryId: '',
    }, remembered?.purpose)) {
      normalizedInput.confidence = Math.min(normalizedInput.confidence, 0.75);
    }
  }
  const batchId = input.batchId ?? uid('paybatch_');
  const item: PaymentImport = {
    id: uid('payimp_'),
    ...normalizedInput,
    rawText,
    fingerprint: fp,
    status: 'new',
    batchId,
    sourceType: input.sourceType ?? 'manual',
    createdAt: now,
    updatedAt: now,
  };

  await saveData(PAYMENT_IMPORTS_KEY, [item, ...existing]);

  const batches = await getPaymentImportBatches();
  const existingBatch = batches.find((entry) => entry.id === batchId);
  if (existingBatch) {
    existingBatch.importIds = [...new Set([item.id, ...existingBatch.importIds])];
    await saveData(PAYMENT_IMPORT_BATCH_KEY, batches);
  } else {
    await saveData(PAYMENT_IMPORT_BATCH_KEY, [
      {
        id: batchId,
        source: input.sourceType ?? 'manual',
        createdAt: now,
        importIds: [item.id],
      },
      ...batches,
    ]);
  }

  await audit(item.id, duplicate ? 'duplicate' : 'created');
  return item;
}

export async function updatePaymentImport(
  id: string,
  input: UpdatePaymentImportInput,
): Promise<PaymentImport | null> {
  const items = await getPaymentImports();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const updated: PaymentImport = {
    ...items[index],
    ...input,
    ...(input.merchant !== undefined ? { merchant: input.merchant.trim() || undefined } : {}),
    ...(input.payee !== undefined ? { payee: input.payee.trim() || undefined } : {}),
    ...(input.purpose !== undefined ? { purpose: input.purpose.trim() || undefined } : {}),
    ...(input.note !== undefined ? { note: input.note.trim() } : {}),
    updatedAt: new Date().toISOString(),
  };

  items[index] = updated;
  await saveData(PAYMENT_IMPORTS_KEY, items);
  await audit(
    id,
    input.status === 'reviewed'
      ? 'reviewed'
      : input.status === 'ignored'
        ? 'ignored'
        : 'edited',
    input as Record<string, unknown>,
  );
  return updated;
}

export async function deletePaymentImport(id: string): Promise<boolean> {
  const items = await getPaymentImports();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  await saveData(PAYMENT_IMPORTS_KEY, next);
  await audit(id, 'deleted');
  return true;
}

export async function undoPaymentImportBatch(batchId: string): Promise<number> {
  const [items, batches] = await Promise.all([getPaymentImports(), getPaymentImportBatches()]);
  const batch = batches.find((entry) => entry.id === batchId);
  if (!batch) return 0;

  const ids = new Set(batch.importIds);
  const removed = items.filter((item) => ids.has(item.id));
  await saveData(PAYMENT_IMPORTS_KEY, items.filter((item) => !ids.has(item.id)));
  for (const item of removed) await audit(item.id, 'deleted', { batchId });
  return removed.length;
}

export async function clearPaymentImports(): Promise<void> {
  await saveData(PAYMENT_IMPORTS_KEY, []);
}
