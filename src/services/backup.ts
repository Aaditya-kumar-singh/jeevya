import AsyncStorage from '@react-native-async-storage/async-storage';
import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { withStorageLock } from '@/services/storageReliability';
import {
  BACKUP_DOMAIN_KEYS, BACKUP_FORMAT, BACKUP_STORAGE_KEYS, BACKUP_VERSION, BACKUP_SCHEMA_VERSION,
  type BackupDomainName, type BackupValidationIssue, type BackupValidationResult, type BackupRestorePreview,
  type EncryptedJeevyaBackup, type JeevyaBackup, type SelectiveRestoreOptions,
} from '@/types/backup';

const DOMAIN_ORDER: BackupDomainName[] = ['tasks','habits','books','journal','finance','nutrition','health','workout','sleep','recovery','goals'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;
const ID_FIELDS = new Set(['id','accountId','categoryId','bookId','habitId','taskId','templateId','programId','fromAccountId','toAccountId']);
const DATE_FIELDS = new Set(['date','dueDate','startDate','endDate','deadline','month','createdAt','updatedAt','completedAt','startedAt','finishedAt','recordedAt']);
const PBKDF2_ITERATIONS = 210_000;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function bytesToHex(bytes: Uint8Array): string { return Array.from(bytes, (v) => v.toString(16).padStart(2,'0')).join(''); }
function hexToBytes(value: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2) throw new Error('Invalid encrypted backup encoding.');
  const out = new Uint8Array(value.length / 2);
  for (let i=0;i<out.length;i++) out[i]=parseInt(value.slice(i*2,i*2+2),16);
  return out;
}
function canonicalForIntegrity(backup: JeevyaBackup): string {
  const copy = clone(backup) as JeevyaBackup;
  delete copy.integrity;
  return JSON.stringify(copy);
}
export function computeBackupIntegrity(backup: JeevyaBackup): string {
  return bytesToHex(sha256(new TextEncoder().encode(canonicalForIntegrity(backup))));
}
export function attachBackupIntegrity(backup: JeevyaBackup): JeevyaBackup {
  return { ...backup, integrity: { algorithm: 'sha256', hash: computeBackupIntegrity(backup) } };
}

function addIssue(issues: BackupValidationIssue[], issue: BackupValidationIssue): void {
  const fingerprint = `${issue.code}|${issue.domain ?? ''}|${issue.message}`;
  if (!issues.some((x) => `${x.code}|${x.domain ?? ''}|${x.message}` === fingerprint)) issues.push(issue);
}
function validateDates(value: unknown, domain: string, issues: BackupValidationIssue[]): void {
  if (Array.isArray(value)) { value.forEach((x) => validateDates(x,domain,issues)); return; }
  if (!value || typeof value !== 'object') return;
  for (const [key,child] of Object.entries(value as Record<string,unknown>)) {
    if (DATE_FIELDS.has(key) && child != null) {
      const text = String(child);
      const valid = key === 'month' ? /^\d{4}-\d{2}$/.test(text) : ISO_DATE.test(text) || ISO_DATE_TIME.test(text);
      if (!valid) addIssue(issues,{code:'invalid_date',domain,message:`Invalid ${key} value in ${domain}.`});
    }
    validateDates(child,domain,issues);
  }
}
function validateIds(value: unknown, domain: string, issues: BackupValidationIssue[]): void {
  if (Array.isArray(value)) { value.forEach((x) => validateIds(x,domain,issues)); return; }
  if (!value || typeof value !== 'object') return;
  for (const [key,child] of Object.entries(value as Record<string,unknown>)) {
    if (ID_FIELDS.has(key) && child != null && (typeof child !== 'string' || child.trim()==='')) addIssue(issues,{code:'invalid_id',domain,message:`Invalid ${key} reference in ${domain}.`});
    validateIds(child,domain,issues);
  }
}
function validateRecords(domain: BackupDomainName, payload: Record<string,unknown>, issues: BackupValidationIssue[]): void {
  for (const [key,value] of Object.entries(payload)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      const seen=new Set<string>();
      for (const record of value) {
        if (!record || typeof record !== 'object') { addIssue(issues,{code:'malformed_domain',domain,message:`Malformed record in ${key}.`}); continue; }
        const id=(record as Record<string,unknown>).id;
        if (id!==undefined) {
          if(typeof id!=='string'||!id.trim()) addIssue(issues,{code:'invalid_id',domain,message:`Invalid record ID in ${key}.`});
          else if(seen.has(id)) addIssue(issues,{code:'invalid_id',domain,message:`Duplicate record ID ${id} in ${key}.`});
          else seen.add(id);
        }
      }
    } else if(typeof value!=='object') addIssue(issues,{code:'malformed_domain',domain,message:`Malformed payload for ${key}.`});
    validateIds(value,domain,issues); validateDates(value,domain,issues);
  }
}
function validateRelationships(backup:JeevyaBackup,issues:BackupValidationIssue[]):void {
  const tasks=backup.domains.tasks??{};
  const labels=Array.isArray(tasks['jeevya:labels'])?tasks['jeevya:labels'] as Record<string,unknown>[]:[];
  const labelIds=new Set(labels.map(x=>x.id).filter((x):x is string=>typeof x==='string'));
  for(const task of (Array.isArray(tasks['jeevya:tasks'])?tasks['jeevya:tasks'] as Record<string,unknown>[]:[])){
    for(const id of (Array.isArray(task.labelIds)?task.labelIds:[])) if(typeof id==='string'&&!labelIds.has(id)) addIssue(issues,{code:'invalid_relationship',domain:'tasks',message:`Task ${String(task.id)} references missing label ${id}.`});
  }
  const books=backup.domains.books??{};
  const bookIds=new Set((Array.isArray(books['jeevya:books'])?books['jeevya:books'] as Record<string,unknown>[]:[]).map(x=>x.id).filter((x):x is string=>typeof x==='string'));
  for(const entry of (Array.isArray(books['jeevya:book-progress'])?books['jeevya:book-progress'] as Record<string,unknown>[]:[])) if(typeof entry.bookId==='string'&&!bookIds.has(entry.bookId)) addIssue(issues,{code:'invalid_relationship',domain:'books',message:`Book progress ${String(entry.id)} references missing book ${entry.bookId}.`});
  const finance=backup.domains.finance??{};
  const accountIds=new Set((Array.isArray(finance['jeevya:finance:accounts'])?finance['jeevya:finance:accounts'] as Record<string,unknown>[]:[]).map(x=>x.id).filter((x):x is string=>typeof x==='string'));
  const categoryIds=new Set((Array.isArray(finance['jeevya:finance:categories'])?finance['jeevya:finance:categories'] as Record<string,unknown>[]:[]).map(x=>x.id).filter((x):x is string=>typeof x==='string'));
  for(const tx of (Array.isArray(finance['jeevya:finance:transactions'])?finance['jeevya:finance:transactions'] as Record<string,unknown>[]:[])){
    for(const field of ['accountId','fromAccountId','toAccountId']) if(typeof tx[field]==='string'&&!accountIds.has(tx[field])) addIssue(issues,{code:'invalid_relationship',domain:'finance',message:`Transaction ${String(tx.id)} references missing account ${tx[field]}.`});
    if(typeof tx.categoryId==='string'&&!categoryIds.has(tx.categoryId)) addIssue(issues,{code:'invalid_relationship',domain:'finance',message:`Transaction ${String(tx.id)} references missing category ${tx.categoryId}.`});
  }
}
export async function exportBackup():Promise<JeevyaBackup>{
  const raw=await AsyncStorage.multiGet([...BACKUP_STORAGE_KEYS]); const byKey=new Map(raw);
  const dynamic=(await AsyncStorage.getAllKeys()).filter(k=>k.startsWith('jeevya:exercise-completed:')).sort();
  const domains:JeevyaBackup['domains']={};
  for(const domain of DOMAIN_ORDER){
    const payload:Record<string,unknown>={};
    for(const key of BACKUP_DOMAIN_KEYS[domain]){
      const rawValue=byKey.get(key); if(rawValue==null) continue;
      try{payload[key]=JSON.parse(rawValue);}catch{payload[key]=null;}
    }
    if(domain==='workout') for(const key of dynamic){const rawValue=await AsyncStorage.getItem(key); if(rawValue!=null){try{payload[key]=JSON.parse(rawValue);}catch{payload[key]=null;}}}
    if(Object.keys(payload).length) domains[domain]=payload;
  }
  return attachBackupIntegrity({format:BACKUP_FORMAT,version:BACKUP_VERSION,schemaVersion:BACKUP_SCHEMA_VERSION,createdAt:new Date().toISOString(),appVersion:'1.0.0',domains});
}
export function serializeBackup(backup:JeevyaBackup):string{return JSON.stringify(backup,null,2);}
export function validateBackup(input:string|unknown):BackupValidationResult{
  const issues:BackupValidationIssue[]=[]; let parsed:unknown=input;
  if(typeof input==='string'){try{parsed=JSON.parse(input);}catch{return{valid:false,backup:null,issues:[{code:'invalid_json',message:'Backup is not valid JSON.'}]};}}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) return{valid:false,backup:null,issues:[{code:'malformed_backup',message:'Backup root must be an object.'}]};
  const root=parsed as Record<string,unknown>;
  if(root.format!==BACKUP_FORMAT) issues.push({code:'invalid_format',message:'Unsupported backup format.'});
  if(root.version!==BACKUP_VERSION) issues.push({code:'unsupported_version',message:'Unsupported backup version.'});
  if(root.schemaVersion!==undefined&&(typeof root.schemaVersion!=='number'||!Number.isInteger(root.schemaVersion)||root.schemaVersion<1)) issues.push({code:'unsupported_version',message:'Backup schemaVersion is invalid.'});
  if(typeof root.createdAt!=='string'||!ISO_DATE_TIME.test(root.createdAt)) issues.push({code:'invalid_date',message:'Backup creation timestamp is invalid.'});
  if(typeof root.appVersion!=='string') issues.push({code:'malformed_backup',message:'Backup appVersion is missing or invalid.'});
  if(!root.domains||typeof root.domains!=='object'||Array.isArray(root.domains)) issues.push({code:'malformed_backup',message:'Backup domains payload is invalid.'});
  if(issues.length===0){
    const domains=root.domains as Record<string,unknown>;
    for(const domain of Object.keys(domains)){
      if(!DOMAIN_ORDER.includes(domain as BackupDomainName)){addIssue(issues,{code:'invalid_domain',domain,message:`Unsupported backup domain ${domain}.`});continue;}
      const payload=domains[domain];
      if(!payload||typeof payload!=='object'||Array.isArray(payload)){addIssue(issues,{code:'malformed_domain',domain,message:`Malformed ${domain} payload.`});continue;}
      const allowed=new Set(BACKUP_DOMAIN_KEYS[domain as BackupDomainName]);
      for(const key of Object.keys(payload as object)) if(!allowed.has(key)&&!(domain==='workout'&&key.startsWith('jeevya:exercise-completed:'))) addIssue(issues,{code:'invalid_domain',domain,message:`Unsupported storage key ${key} in ${domain}.`});
      validateRecords(domain as BackupDomainName,payload as Record<string,unknown>,issues);
    }
    validateRelationships({...root,domains} as unknown as JeevyaBackup,issues);
    const backup=root as unknown as JeevyaBackup;
    if(backup.integrity?.algorithm==='sha256'&&typeof backup.integrity.hash==='string'&&backup.integrity.hash!==computeBackupIntegrity(backup)) addIssue(issues,{code:'integrity_mismatch',message:'Backup integrity hash does not match its contents.'});
  }
  return{valid:issues.length===0,backup:issues.length===0?clone(parsed as JeevyaBackup):null,issues};
}
function recordCount(payload:Record<string,unknown>):number{return Object.values(payload).reduce<number>((sum,v)=>sum+(Array.isArray(v)?v.length:0),0);}
export async function previewRestore(input:string|JeevyaBackup,options:SelectiveRestoreOptions={}):Promise<BackupRestorePreview>{
  const validation=validateBackup(input); const selected=options.domains?.length?[...new Set(options.domains)]:DOMAIN_ORDER;
  const currentKeys=await AsyncStorage.getAllKeys();
  if(!validation.valid||!validation.backup)return{valid:false,domains:[],selectedDomains:selected,keysToReplace:[],keysToRemove:[],warnings:validation.issues.map(x=>x.message),validation};
  const domains=selected.filter(d=>!!validation.backup?.domains[d]).map(domain=>({domain,recordCount:recordCount(validation.backup!.domains[domain]!),storageKeys:Object.keys(validation.backup!.domains[domain]!)}));
  const selectedKeys=new Set(domains.flatMap(d=>d.storageKeys));
  const keysToRemove=options.replaceSelectedDomains===false?[]:currentKeys.filter(k=>Array.from(selected).some(d=>BACKUP_DOMAIN_KEYS[d].includes(k)));
  const warnings:string[]=[];
  if(selected.length<DOMAIN_ORDER.length) warnings.push('Only selected domains will be restored; unrelated local domains remain unchanged.');
  if(selected.includes('tasks')&&!selected.includes('goals')) warnings.push('Goal projections are derived and will be recalculated from restored source records.');
  return{valid:true,domains,selectedDomains:selected,keysToReplace:[...selectedKeys],keysToRemove,warnings,validation};
}
export async function restoreBackup(input:string|JeevyaBackup,options:SelectiveRestoreOptions={}):Promise<{success:boolean;message:string;validation:BackupValidationResult}>{
  const validation=validateBackup(input); if(!validation.valid||!validation.backup)return{success:false,message:'Backup validation failed. Existing data was preserved.',validation};
  const selected=options.domains?.length?[...new Set(options.domains)]:DOMAIN_ORDER;
  const replace=options.replaceSelectedDomains!==false;
  const existingKeys=await AsyncStorage.getAllKeys();
  const supportedKeys=[...new Set([...BACKUP_STORAGE_KEYS,...existingKeys.filter(k=>k.startsWith('jeevya:exercise-completed:'))])];
  return withStorageLock(supportedKeys,async()=>{
    const snapshot=await AsyncStorage.multiGet(supportedKeys); const writes:[string,string][]=[]; const selectedSet=new Set(selected);
    const backupKeys=new Set<string>();
    for(const domain of selected){
      const payload=validation.backup!.domains[domain]; if(!payload) continue;
      for(const [key,value] of Object.entries(payload)){backupKeys.add(key);writes.push([key,JSON.stringify(value)]);}
    }
    try{
      const toRemove = replace
        ? supportedKeys.filter((key) => Array.from(selectedSet).some((d) => BACKUP_DOMAIN_KEYS[d].includes(key)) && !backupKeys.has(key))
        : [];
      if(toRemove.length) await AsyncStorage.multiRemove(toRemove);
      if(writes.length) await AsyncStorage.multiSet(writes);
      return{success:true,message:selected.length===DOMAIN_ORDER.length?'Restore completed successfully.':`Restored ${selected.length} selected domain(s) successfully.`,validation};
    }catch{
      try{const current=await AsyncStorage.getAllKeys();const restoreKeys=[...new Set([...supportedKeys,...current.filter(k=>k.startsWith('jeevya:exercise-completed:'))])];await AsyncStorage.multiRemove(restoreKeys);const original=snapshot.filter((x):x is [string,string]=>x[1]!=null);if(original.length)await AsyncStorage.multiSet(original);}
      catch{return{success:false,message:'Restore failed and rollback could not be completed.',validation};}
      return{success:false,message:'Restore failed. Existing data was restored from the preflight snapshot.',validation};
    }
  });
}
export async function preflightBackup(input:string|JeevyaBackup):Promise<BackupValidationResult>{return validateBackup(input);}
export async function migrateBackup(input:string|JeevyaBackup):Promise<JeevyaBackup>{
  const validation=validateBackup(input); if(!validation.valid||!validation.backup)throw new Error(validation.issues.map(x=>x.message).join(' '));
  const backup=clone(validation.backup); backup.schemaVersion=BACKUP_SCHEMA_VERSION; return attachBackupIntegrity(backup);
}
export async function encryptBackup(input:string|JeevyaBackup,passphrase:string):Promise<string>{
  if(passphrase.trim().length<8)throw new Error('Backup passphrase must contain at least 8 characters.');
  const backup=typeof input==='string'?validateBackup(input).backup:input; if(!backup)throw new Error('Cannot encrypt an invalid backup.');
  const salt=randomBytes(16); const nonce=randomBytes(12); const key=await pbkdf2Async(sha256,passphrase,salt,{c:PBKDF2_ITERATIONS,dkLen:32,asyncTick:8});
  const aad=new TextEncoder().encode('jeevya-encrypted-backup:v1'); const cipher=gcm(key,nonce,aad).encrypt(new TextEncoder().encode(serializeBackup(backup)));
  const envelope:EncryptedJeevyaBackup={format:'jeevya-encrypted-backup',version:1,cipher:'aes-256-gcm',kdf:'pbkdf2-sha256',iterations:PBKDF2_ITERATIONS,salt:bytesToHex(salt),nonce:bytesToHex(nonce),ciphertext:bytesToHex(cipher)};
  return JSON.stringify(envelope,null,2);
}
export async function decryptBackup(input:string,passphrase:string):Promise<JeevyaBackup>{
  if(passphrase.trim().length<8)throw new Error('Backup passphrase must contain at least 8 characters.');
  let envelope:EncryptedJeevyaBackup; try{envelope=JSON.parse(input) as EncryptedJeevyaBackup;}catch{throw new Error('Encrypted backup is not valid JSON.');}
  if(envelope.format!=='jeevya-encrypted-backup'||envelope.version!==1||envelope.cipher!=='aes-256-gcm'||envelope.kdf!=='pbkdf2-sha256')throw new Error('Unsupported encrypted backup format.');
  const key=await pbkdf2Async(sha256,passphrase,hexToBytes(envelope.salt),{c:envelope.iterations,dkLen:32,asyncTick:8});
  try{const plain=gcm(key,hexToBytes(envelope.nonce),new TextEncoder().encode('jeevya-encrypted-backup:v1')).decrypt(hexToBytes(envelope.ciphertext));const backup=validateBackup(new TextDecoder().decode(plain));if(!backup.valid||!backup.backup)throw new Error('Encrypted backup contains invalid Jeevya data.');return backup.backup;}catch{throw new Error('Unable to decrypt backup. Check the passphrase or backup integrity.');}
}
