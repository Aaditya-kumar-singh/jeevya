import AsyncStorage from '@react-native-async-storage/async-storage';
import { withStorageLock } from '@/services/storageReliability';
import { BACKUP_STORAGE_KEYS } from '@/types/backup';
import type { FinanceTransaction } from '@/types/finance';

const PAYMENT_KEYS = BACKUP_STORAGE_KEYS.filter((key) => key.startsWith('jeevya:finance:payment-'));
const PRIVACY_SETTINGS_KEY = 'jeevya:privacy:settings';
const NOTIFICATION_CACHE_FILE = 'jeevya-payment-notifications.jsonl';

export interface PrivacySettings {
  paymentNotificationsEnabled: boolean;
  enabledPaymentProviders: string[];
  retentionDays: 30 | 90 | 365 | 0;
  analyticsEnabled: boolean;
  aiInsightsEnabled: boolean;
  healthDataEnabled: boolean;
  widgetSensitiveData: boolean;
}
export interface SensitiveDataAudit {
  financeTransactionCount: number;
  importedTransactionCount: number;
  rawNotificationCachePresent: boolean;
  providerSettingPresent: boolean;
  sensitiveStorageKeys: string[];
}
const DEFAULT_SETTINGS: PrivacySettings = {
  paymentNotificationsEnabled: false,
  enabledPaymentProviders: ['google_pay','phonepe','paytm','sbi','pnb'],
  retentionDays: 365,
  analyticsEnabled: true,
  aiInsightsEnabled: false,
  healthDataEnabled: true,
  widgetSensitiveData: false,
};

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const raw=await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
  if(!raw)return DEFAULT_SETTINGS;
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PrivacySettings>) }; }
  catch { return DEFAULT_SETTINGS; }
}
export async function updatePrivacySettings(patch: Partial<PrivacySettings>): Promise<PrivacySettings> {
  const next={...(await getPrivacySettings()),...patch};
  await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY,JSON.stringify(next));
  return next;
}
export async function getPrivacyDataSummary() {
  const keys=await AsyncStorage.getAllKeys();
  return {
    storageKeys: keys.filter((key)=>key.startsWith('jeevya:')).length,
    financeKeys: keys.filter((key)=>key.startsWith('jeevya:finance:')).length,
    hasPaymentImportData: PAYMENT_KEYS.some((key)=>keys.includes(key)),
  };
}
export async function getSensitiveDataAudit():Promise<SensitiveDataAudit>{
  const keys=await AsyncStorage.getAllKeys();
  const raw=await AsyncStorage.getItem('jeevya:finance:transactions');
  let transactions:FinanceTransaction[]=[];
  try{transactions=raw?JSON.parse(raw):[];}catch{}
  const sensitiveStorageKeys=keys.filter((key)=>/finance|payment|auth|token|session|notification/i.test(key));
  return {
    financeTransactionCount:transactions.length,
    importedTransactionCount:transactions.filter((tx)=>tx.source&&tx.source!=='manual').length,
    rawNotificationCachePresent:keys.some((key)=>key.includes('notification')),
    providerSettingPresent:keys.includes('jeevya:finance:payment-provider-settings'),
    sensitiveStorageKeys,
  };
}
export async function clearPaymentImportData():Promise<void>{
  await withStorageLock(PAYMENT_KEYS,async()=>{await AsyncStorage.multiRemove([...PAYMENT_KEYS]);});
}
export async function deleteImportedTransactions(provider?: string):Promise<number>{
  const key='jeevya:finance:transactions';
  return withStorageLock([key],async()=>{
    const raw=await AsyncStorage.getItem(key); if(!raw)return 0;
    let transactions:FinanceTransaction[]; try{transactions=JSON.parse(raw);}catch{return 0;}
    const kept=transactions.filter((tx)=>!tx.source||tx.source==='manual'||(provider&&!String(tx.source).toLowerCase().includes(provider.toLowerCase())));
    const removed=transactions.length-kept.length;
    await AsyncStorage.setItem(key,JSON.stringify(kept));
    return removed;
  });
}
export async function clearRawNotificationCache():Promise<boolean>{
  try{
    const FileSystem=await import('expo-file-system/legacy');
    if(!FileSystem.documentDirectory)return false;
    const uri=FileSystem.documentDirectory+NOTIFICATION_CACHE_FILE;
    const info=await FileSystem.getInfoAsync(uri);
    if(!info.exists)return false;
    await FileSystem.deleteAsync(uri,{idempotent:true}); return true;
  }catch{return false;}
}
export async function clearJeevyaLocalData():Promise<void>{
  const keys=(await AsyncStorage.getAllKeys()).filter((key)=>key.startsWith('jeevya:'));
  if(!keys.length)return;
  await withStorageLock(keys,()=>AsyncStorage.multiRemove(keys));
}
