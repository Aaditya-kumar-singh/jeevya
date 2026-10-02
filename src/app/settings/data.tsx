import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Check, ChevronLeft, Download, LockKeyhole, ShieldCheck, Trash2, Upload } from 'lucide-react-native';
import { Button, ButtonText, Card, Heading, Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  decryptBackup, encryptBackup, exportBackup, previewRestore, restoreBackup, serializeBackup,
} from '@/services/backup';
import {
  clearJeevyaLocalData, clearPaymentImportData, clearRawNotificationCache,
  deleteImportedTransactions, getPrivacyDataSummary, getPrivacySettings, getSensitiveDataAudit,
  updatePrivacySettings, type PrivacySettings,
} from '@/services/privacyData';
import type { BackupDomainName, BackupRestorePreview, JeevyaBackup } from '@/types/backup';

const DOMAINS: BackupDomainName[]=['tasks','habits','books','journal','finance','nutrition','health','workout','sleep','recovery','goals'];

export default function DataPrivacyScreen(){
  const insets=useSafeAreaInsets();
  const [settings,setSettings]=useState<PrivacySettings|null>(null);
  const [summary,setSummary]=useState<{storageKeys:number;financeKeys:number;hasPaymentImportData:boolean}|null>(null);
  const [audit,setAudit]=useState<Awaited<ReturnType<typeof getSensitiveDataAudit>>|null>(null);
  const [busy,setBusy]=useState(false);
  const [password,setPassword]=useState('');
  const [selected,setSelected]=useState<BackupDomainName[]>(DOMAINS);
  const [preview,setPreview]=useState<BackupRestorePreview|null>(null);
  const refresh=useCallback(async()=>{
    const [s,sm,a]=await Promise.all([getPrivacySettings(),getPrivacyDataSummary(),getSensitiveDataAudit()]);
    setSettings(s);setSummary(sm);setAudit(a);
  },[]);
  useEffect(()=>{void refresh();},[refresh]);

  const shareFile=async(uri:string,mime='application/json',title='Jeevya backup')=>{
    if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{mimeType:mime,dialogTitle:title});
  };
  const exportNormal=async()=>{
    setBusy(true);try{
      const backup=await exportBackup();const uri=`${FileSystem.cacheDirectory??FileSystem.documentDirectory??''}jeevya-backup-${backup.createdAt.slice(0,10)}.json`;
      await FileSystem.writeAsStringAsync(uri,serializeBackup(backup));await shareFile(uri);
    }catch(error){Alert.alert('Export failed',error instanceof Error?error.message:'Unable to export backup.');}finally{setBusy(false);}
  };
  const exportEncrypted=async()=>{
    if(password.length<8){Alert.alert('Password required','Use at least 8 characters for encrypted backups.');return;}
    setBusy(true);try{
      const encrypted=await encryptBackup(await exportBackup(),password);const uri=`${FileSystem.cacheDirectory??FileSystem.documentDirectory??''}jeevya-encrypted-backup.json`;
      await FileSystem.writeAsStringAsync(uri,encrypted);await shareFile(uri,'application/json','Jeevya encrypted backup');
    }catch(error){Alert.alert('Encryption failed',error instanceof Error?error.message:'Unable to create encrypted backup.');}finally{setBusy(false);}
  };
  const pickAndPreview=async()=>{
    setBusy(true);try{
      const picked=await DocumentPicker.getDocumentAsync({type:'application/json',copyToCacheDirectory:true,multiple:false});
      if(picked.canceled)return;
      const content=await FileSystem.readAsStringAsync(picked.assets[0].uri);
      let backup:JeevyaBackup;
      try{backup=content.includes('jeevya-encrypted-backup')?await decryptBackup(content,password):JSON.parse(content) as JeevyaBackup;}
      catch(error){Alert.alert('Backup locked',error instanceof Error?error.message:'Enter the correct password and try again.');return;}
      const next=await previewRestore(backup,{domains:selected});
      setPreview(next);
    }catch(error){Alert.alert('Preview failed',error instanceof Error?error.message:'Unable to inspect backup.');}finally{setBusy(false);}
  };
  const restoreSelected=async()=>{
    if(!preview?.valid)return;
    setBusy(true);try{
      const result=await restoreBackup(preview.validation.backup!,{domains:selected});
      if(!result.success){Alert.alert('Restore failed',result.message);return;}
      Alert.alert('Restore complete',result.message);setPreview(null);await refresh();
    }finally{setBusy(false);}
  };
  const toggleDomain=(domain:BackupDomainName)=>{
    setSelected((current)=>current.includes(domain)?current.filter((x)=>x!==domain):[...current,domain]);
    setPreview(null);
  };
  if(!settings||!summary||!audit)return <View className="flex-1 items-center justify-center"><ActivityIndicator/></View>;

  return <View className="flex-1 bg-sky-50/40 dark:bg-slate-950" style={{paddingTop:insets.top}}>
    <ScrollView contentContainerStyle={{padding:20,paddingBottom:48}} className="flex-1">
      <View className="flex-row items-center gap-3 mb-5">
        <Button variant="ghost" onPress={()=>router.back()}><ChevronLeft size={22}/></Button>
        <View className="flex-1"><Heading size="xl" className="font-bold">Data & Privacy</Heading><Text size="sm" className="text-muted-foreground">Backups, permissions, retention and local-data controls</Text></View>
        <ShieldCheck size={25} className="text-emerald-500"/>
      </View>

      <Card className="p-4 rounded-3xl gap-3 mb-4">
        <Heading size="sm">Privacy controls</Heading>
        {([
          ['paymentNotificationsEnabled','Payment notification import'],
          ['analyticsEnabled','Analytics and insights'],
          ['aiInsightsEnabled','AI-assisted insights'],
          ['healthDataEnabled','Health data processing'],
          ['widgetSensitiveData','Show sensitive finance data in widgets'],
        ] as const).map(([key,label])=><Button key={key} variant="outline" onPress={async()=>{const next=await updatePrivacySettings({[key]:!settings[key]});setSettings(next);}}>
          <ButtonText>{settings[key]?'On':'Off'} • {label}</ButtonText>
        </Button>)}
        <Text size="xs" className="text-muted-foreground">Retention: {settings.retentionDays===0?'Forever':`${settings.retentionDays} days`}</Text>
      </Card>

      <Card className="p-4 rounded-3xl gap-3 mb-4">
        <View className="flex-row items-center gap-3"><LockKeyhole size={20} className="text-sky-500"/><Heading size="sm">Backup & restore</Heading></View>
        <Button variant="outline" disabled={busy} onPress={()=>void exportNormal()}><Download size={18}/><ButtonText>Export portable backup</ButtonText></Button>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Encryption password (8+ characters)" className="rounded-2xl border border-border bg-background px-4 py-3 text-foreground"/>
        <Button variant="outline" disabled={busy} onPress={()=>void exportEncrypted()}><LockKeyhole size={18}/><ButtonText>Export encrypted backup</ButtonText></Button>
        <Button variant="outline" disabled={busy} onPress={()=>void pickAndPreview()}><Upload size={18}/><ButtonText>Choose backup and preview</ButtonText></Button>
        {preview?<View className="rounded-2xl border border-border p-3 gap-2">
          <Text size="xs" className="font-bold">Restore preview</Text>
          <Text size="xs" className="text-muted-foreground">{preview.domains.map(x=>`${x.domain}: ${x.recordCount} records`).join(' • ')||'No selected records'}</Text>
          {preview.warnings.map(w=><Text key={w} size="xs" className="text-amber-600">{w}</Text>)}
          <Button disabled={busy||selected.length===0} onPress={()=>void restoreSelected()}><ButtonText>Restore selected domains</ButtonText></Button>
        </View>:null}
      </Card>

      <Card className="p-4 rounded-3xl gap-2 mb-4">
        <Heading size="sm">Restore domains</Heading>
        <Text size="xs" className="text-muted-foreground">Select exactly what a restore is allowed to replace.</Text>
        <View className="flex-row flex-wrap gap-2">{DOMAINS.map(domain=><Button key={domain} variant={selected.includes(domain)?'default':'outline'} onPress={()=>toggleDomain(domain)}>
          {selected.includes(domain)?<Check size={16}/>:null}<ButtonText>{domain}</ButtonText>
        </Button>)}</View>
      </Card>

      <Card className="p-4 rounded-3xl gap-2 mb-4">
        <Heading size="sm">Data audit</Heading>
        <Text size="xs" className="text-muted-foreground">Jeevya keys: {summary.storageKeys} • Finance keys: {summary.financeKeys}</Text>
        <Text size="xs" className="text-muted-foreground">Transactions: {audit.financeTransactionCount} • Imported: {audit.importedTransactionCount}</Text>
        <Text size="xs" className="text-muted-foreground">Raw notification cache: {audit.rawNotificationCachePresent?'present':'clear'} • Provider settings: {audit.providerSettingPresent?'present':'not set'}</Text>
      </Card>

      <Card className="p-4 rounded-3xl gap-3">
        <Heading size="sm">Data deletion</Heading>
        <Button variant="outline" disabled={busy} onPress={()=>Alert.alert('Delete imported transactions?','Manual transactions will be preserved.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{const n=await deleteImportedTransactions();Alert.alert('Deleted',`${n} imported transaction(s) removed.`);await refresh();}}])}><Trash2 size={18}/><ButtonText>Delete imported transactions</ButtonText></Button>
        <Button variant="outline" disabled={busy} onPress={async()=>{const removed=await clearRawNotificationCache();Alert.alert(removed?'Cleared':'Already clear',removed?'Raw notification cache deleted.':'No raw notification cache was present.');await refresh();}}><ButtonText>Clear raw notification cache</ButtonText></Button>
        <Button variant="outline" disabled={busy} onPress={()=>Alert.alert('Clear all local data?','This removes Jeevya local data from this device. Export a backup first if you need it.',[{text:'Cancel',style:'cancel'},{text:'Clear',style:'destructive',onPress:async()=>{await clearPaymentImportData();await clearJeevyaLocalData();router.replace('/(tabs)');}}])}><ButtonText>Clear all local Jeevya data</ButtonText></Button>
      </Card>
    </ScrollView>
  </View>;
}
