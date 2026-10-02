// JEEVYA ADVANCED BACKUP: encryption, integrity, preview and selective restore.
const memory=new Map<string,string>();
Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{
  getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,value),
  removeItem:(key:string)=>memory.delete(key),clear:()=>memory.clear(),get length(){return memory.size;},
  key:(index:number)=>Array.from(memory.keys())[index]??null,
}}});
(async () => {
  const assert=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);};
  const AsyncStorage=(await import('@react-native-async-storage/async-storage')).default;
  const { encryptBackup, decryptBackup, computeBackupIntegrity, validateBackup, previewRestore }=await import('@/services/backup');
  await AsyncStorage.clear();
  const backup={
    format:'jeevya-backup' as const, version:1 as const, schemaVersion:1,
    createdAt:'2026-09-24T10:00:00.000Z', appVersion:'1.0.0',
    domains:{tasks:{'jeevya:tasks':[{id:'task-1',title:'Secure restore'}]},finance:{'jeevya:finance:transactions':[{id:'tx-1',amount:100,date:'2026-09-24'}]}},
  };
  let passed=0;
  const check=async(name:string,fn:()=>Promise<void>|void)=>{await fn();passed++;console.log('PASS '+name);};
  await check('integrity hash detects tampering',async()=>{
    const signed={...backup,integrity:{algorithm:'sha256' as const,hash:computeBackupIntegrity(backup)}};
    assert(validateBackup(signed).valid,'valid signed backup rejected');
    const tampered={...signed,domains:{...signed.domains,tasks:{'jeevya:tasks':[{id:'changed'}]}}};
    assert(!validateBackup(tampered).valid,'tampered backup accepted');
  });
  await check('AES-256-GCM password encryption round trip',async()=>{
    const encrypted=await encryptBackup(backup,'correct horse battery');
    assert(encrypted.includes('jeevya-encrypted-backup')&&!encrypted.includes('Secure restore'),'plaintext leaked into encrypted envelope');
    const decrypted=await decryptBackup(encrypted,'correct horse battery');
    assert((decrypted.domains.tasks?.['jeevya:tasks'] as any[])[0].id==='task-1','decryption failed');
    let rejected=false;try{await decryptBackup(encrypted,'wrong password');}catch{rejected=true;}assert(rejected,'wrong password accepted');
  });
  await check('selected-domain restore preview is non-mutating',async()=>{
    await AsyncStorage.setItem('jeevya:tasks',JSON.stringify([{id:'local'}]));
    const before=await AsyncStorage.getItem('jeevya:tasks');
    const preview=await previewRestore(backup,{domains:['tasks']});
    const after=await AsyncStorage.getItem('jeevya:tasks');
    assert(preview.valid&&preview.selectedDomains.length===1&&preview.domains[0].recordCount===1,'preview incorrect');
    assert(before===after,'preview mutated local data');
  });
  await AsyncStorage.clear();
  console.log('JEEVYA ADVANCED BACKUP: '+passed+' passed, 0 failed');
})().catch((error)=>{console.error(error);process.exitCode=1;});
