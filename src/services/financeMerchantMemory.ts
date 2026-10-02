import { loadData, saveData } from '@/lib/storage';

const KEY = 'jeevya:finance:merchant-memory';

export interface MerchantMemory {
  merchantKey: string;
  displayName: string;
  purpose?: string;
  categoryId?: string;
  updatedAt: string;
}

function key(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function getMerchantMemory(): Promise<MerchantMemory[]> {
  return loadData<MerchantMemory[]>(KEY, []);
}

export async function rememberMerchant(
  merchant: string,
  input: Omit<MerchantMemory, 'merchantKey' | 'displayName' | 'updatedAt'>,
): Promise<MerchantMemory> {
  const items = await getMerchantMemory();
  const merchantKey = key(merchant);
  const item: MerchantMemory = {
    merchantKey,
    displayName: merchant.trim(),
    ...input,
    updatedAt: new Date().toISOString(),
  };
  const next = [item, ...items.filter((entry) => entry.merchantKey !== merchantKey)];
  await saveData(KEY, next);
  return item;
}

export async function findMerchantMemory(merchant?: string): Promise<MerchantMemory | null> {
  if (!merchant) return null;
  const merchantKey = key(merchant);
  const items = await getMerchantMemory();
  return items.find((item) => item.merchantKey === merchantKey) ?? null;
}

export async function clearMerchantMemory(): Promise<void> {
  await saveData(KEY, []);
}
