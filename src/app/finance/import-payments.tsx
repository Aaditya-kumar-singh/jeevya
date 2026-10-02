import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, FileText, Import, RotateCcw, Trash2 } from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { createPaymentImport, deletePaymentImport, getPendingPaymentImports, getPaymentProviderSettings, parsePaymentText, setPaymentProviderEnabled, updatePaymentImport } from '@/services/paymentImports';
import { PAYMENT_PROVIDERS, type PaymentImport, type PaymentProvider } from '@/types/paymentImport';
import { ingestNativePaymentNotifications } from '@/services/paymentNotificationBridge';
import { shouldAskForPurpose, suggestPurpose } from '@/services/financeIntelligence';
import { findMerchantMemory, rememberMerchant } from '@/services/financeMerchantMemory';
import { extractPdfStatementPreview, importStatementRows, previewCsvStatement, previewExcelStatement, previewStatementDuplicates, type StatementImportProgress, type StatementPreview } from '@/services/paymentStatementImport';

const PURPOSES = ['Food', 'Travel', 'College', 'Shopping', 'Bills', 'Family', 'Friend', 'Health', 'Work', 'Subscription', 'Personal', 'Other'];
function formatAmount(amount: number) { return `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function providerLabel(provider: PaymentProvider) { return PAYMENT_PROVIDERS.find((item) => item.id === provider)?.label ?? 'Other'; }

export default function PaymentImportScreen() {
  const { sharedText } = useLocalSearchParams<{ sharedText?: string }>();
  const [provider, setProvider] = useState<PaymentProvider>('google_pay');
  const [rawText, setRawText] = useState('');
  const [imports, setImports] = useState<PaymentImport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [providerSettings, setProviderSettings] = useState<Record<PaymentProvider, boolean> | null>(null);
  const [statementPreview, setStatementPreview] = useState<StatementPreview | null>(null);
  const [statementProgress, setStatementProgress] = useState<StatementImportProgress | null>(null);
  const [statementDuplicateCount, setStatementDuplicateCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');
  const [note, setNote] = useState('');
  const load = useCallback(async () => { await ingestNativePaymentNotifications(); setImports(await getPendingPaymentImports()); setProviderSettings(await getPaymentProviderSettings()); }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (typeof sharedText === 'string' && sharedText.trim()) {
      setRawText(sharedText);
      Alert.alert('Shared payment received', 'Review the shared transaction below, then import it.');
    }
  }, [sharedText]);

  const importPayment = async () => {
    if (!rawText.trim()) { Alert.alert('Payment text required', 'Paste a payment notification first.'); return; }
    setBusy(true);
    try {
      const parsed = parsePaymentText(rawText, provider);
      await createPaymentImport({ provider, rawText, ...parsed });
      setRawText(''); await load();
      Alert.alert('Payment imported', 'The payment is waiting for your review.');
    } catch (error) { Alert.alert('Could not import', error instanceof Error ? error.message : 'The payment could not be parsed.'); }
    finally { setBusy(false); }
  };

  const startReview = async (item: PaymentImport) => {
    const remembered = await findMerchantMemory(item.merchant);
    const suggested = item.purpose ?? remembered?.purpose ?? suggestPurpose({
      title: item.sourceLabel,
      merchant: item.merchant ?? '',
      note: item.note ?? '',
      categoryId: '',
    }) ?? '';
    setEditingId(item.id);
    setPurpose(suggested);
    setNote(item.note ?? '');
  };
  const saveReview = async () => {
    if (!editingId) return;
    setBusy(true);
    try {
      const current = imports.find((item) => item.id === editingId);
      const nextPurpose = purpose.trim() || 'Other';
      await updatePaymentImport(editingId, { purpose: nextPurpose, note: note.trim(), status: 'reviewed' });
      if (current?.merchant) await rememberMerchant(current.merchant, { purpose: nextPurpose });
      setEditingId(null); setPurpose(''); setNote(''); await load();
    }
    catch (error) { Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const ignore = async (id: string) => { await updatePaymentImport(id, { status: 'ignored' }); await load(); };
  const remove = async (id: string) => {
    Alert.alert('Delete imported payment?', 'This removes it from the Jeevya import inbox.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deletePaymentImport(id); await load(); } },
    ]);
  };

  const pickStatement = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const lowerName = asset.name.toLowerCase();
      const isCsv = lowerName.endsWith('.csv');
      const isPdf = lowerName.endsWith('.pdf') || asset.mimeType === 'application/pdf';
      let preview: StatementPreview;
      if (isPdf) {
        preview = await extractPdfStatementPreview(asset.uri);
      } else {
        const content = isCsv
          ? await FileSystem.readAsStringAsync(asset.uri)
          : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        preview = isCsv ? previewCsvStatement(content) : previewExcelStatement(content, true);
      }
      const duplicatePreview = await previewStatementDuplicates(preview.rows, provider);
      setStatementDuplicateCount(duplicatePreview.duplicateCount);
      setStatementPreview(preview);
    } catch (error) {
      Alert.alert('Could not read statement', error instanceof Error ? error.message : 'Choose a valid CSV, Excel, or text-based PDF statement.');
    }
  };

  const confirmStatementImport = async () => {
    if (!statementPreview) return;
    setBusy(true);
    try {
      setStatementProgress({ processed: 0, total: statementPreview.rows.length, imported: 0, errors: 0 });
      const result = await importStatementRows(statementPreview.rows, provider, setStatementProgress);
      setStatementPreview(null);
      setStatementDuplicateCount(0);
      setStatementProgress(null);
      await load();
      const message = result.errors.length || result.duplicates.length
        ? result.imported.length + ' imported, ' + result.duplicates.length + ' duplicates skipped, ' + result.errors.length + ' rows need attention.'
        : result.imported.length + ' payments imported.';
      Alert.alert('Statement imported', message);
    } catch (error) {
      setStatementProgress(null);
      Alert.alert('Statement import failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40, gap: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} >
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-muted"><ArrowLeft size={20} /></Pressable>
          <View className="flex-1"><Heading size="xl">Import Payments</Heading><Text size="sm" className="mt-1 text-muted-foreground">Track spending without connecting a bank account.</Text></View>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15"><Import size={21} className="text-emerald-500" /></View>
        </View>
        {Platform.OS === 'android' ? <Card className="border-emerald-500/20 bg-emerald-500/5 p-4"><Heading size="md">Set up automatic payment collection</Heading><Text size="xs" className="mt-1 text-muted-foreground">Android notification access lets Jeevya collect payment notifications without bank login or UPI credentials.</Text><View className="mt-3 gap-2"><View className="rounded-xl bg-background/70 p-3"><Text size="xs" className="font-semibold">What Jeevya can read</Text><Text size="xs" className="mt-1 text-muted-foreground">Payment-app notification title, visible notification text, app package, and notification time. Only providers you enable below are processed.</Text></View><View className="rounded-xl bg-background/70 p-3"><Text size="xs" className="font-semibold">What Jeevya cannot read</Text><Text size="xs" className="mt-1 text-muted-foreground">Bank passwords, UPI PINs, private app databases, private chats, or other apps&apos; unrelated notifications.</Text></View><View className="rounded-xl bg-background/70 p-3"><Text size="xs" className="font-semibold">You stay in control</Text><Text size="xs" className="mt-1 text-muted-foreground">You can disable notification access in Android Settings at any time. Provider switches below further limit which payment apps Jeevya accepts.</Text></View></View><Button variant="outline" className="mt-3" onPress={() => void Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS')}><ButtonText>Open Android notification access</ButtonText></Button></Card> : null}
        <Card className="p-4"><Heading size="md">Automatic provider controls</Heading><Text size="xs" className="mt-1 text-muted-foreground">Only enabled providers are accepted from Android notification collection.</Text><View className="mt-3 gap-2">{PAYMENT_PROVIDERS.map((item) => <View key={item.id} className="flex-row items-center justify-between rounded-xl bg-muted/50 px-3 py-2"><Text size="sm">{item.label}</Text><Switch value={providerSettings?.[item.id] ?? true} onValueChange={(value) => void (async () => { const next = await setPaymentProviderEnabled(item.id, value); setProviderSettings(next); })()} /></View>)}</View></Card>
        <Card className="p-4"><Heading size="md">Payment source</Heading><Text size="xs" className="mt-1 text-muted-foreground">Choose the app that produced the payment message.</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">{PAYMENT_PROVIDERS.map((item) => <Pressable key={item.id} onPress={() => setProvider(item.id)} className={item.id === provider ? 'rounded-full bg-emerald-500 px-3 py-2' : 'rounded-full bg-muted px-3 py-2'}><Text size="xs" className={item.id === provider ? 'font-semibold text-white' : 'font-medium'}>{item.label}</Text></Pressable>)}</View>
        </Card>
        <Card className="p-4"><Heading size="md">Paste a payment notification</Heading><Text size="xs" className="mt-1 text-muted-foreground">Example: Paid INR 350 to ABC Store via UPI. UPI Ref 1234567890.</Text>
          <Input className="mt-3 min-h-24"><InputField multiline textAlignVertical="top" value={rawText} onChangeText={setRawText} placeholder="Paste payment text here..." /></Input>
          <Button className="mt-3" onPress={() => void importPayment()} disabled={busy}><ButtonText>{busy ? 'Importing...' : 'Import payment'}</ButtonText></Button>
        </Card>
        <Card className="p-4"><Heading size="md">Statement import</Heading><Text size="xs" className="mt-1 text-muted-foreground">Import CSV, Excel, or text-based PDF statements without connecting a bank account. Review the preview before saving. Scanned/image-only PDFs use on-device OCR when the native OCR build is available.</Text><Button variant="outline" className="mt-3" onPress={() => void pickStatement()} disabled={busy}><ButtonText>Choose CSV / Excel / PDF</ButtonText></Button>{statementProgress ? <View className="mt-3 rounded-xl bg-emerald-500/10 p-3"><Text size="sm" className="font-semibold">Importing {statementProgress.processed} of {statementProgress.total} rows</Text><View className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><View className="h-2 rounded-full bg-emerald-500" style={{ width: (statementProgress.total ? (statementProgress.processed / statementProgress.total) * 100 + '%' : '0%') as `${number}%` }} /></View><Text size="xs" className="mt-2 text-muted-foreground">{statementProgress.imported} imported, {statementProgress.errors} errors</Text></View> : null}{statementPreview ? <View className="mt-3 rounded-xl bg-muted/50 p-3"><Text size="sm" className="font-semibold">{statementPreview.validCount} valid rows, {statementPreview.errorCount} row errors</Text>{statementDuplicateCount > 0 ? <View className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"><Text size="sm" className="font-semibold">{statementDuplicateCount} duplicate {statementDuplicateCount === 1 ? 'row' : 'rows'} detected</Text><Text size="xs" className="mt-1 text-muted-foreground">These rows match payments already stored in Jeevya. They will be shown here and skipped explicitly when you continue, so existing payments are never silently discarded.</Text>{statementPreview.rows.filter((row) => row.duplicate).slice(0, 5).map((row) => <Text key={row.rowNumber} size="xs" className="mt-1 text-muted-foreground">Row {row.rowNumber}: {row.merchant || 'Payment'} • INR {row.amount?.toLocaleString('en-IN') ?? '0'}</Text>)}</View> : null}<Text size="xs" className="mt-1 text-muted-foreground">Rows are not saved until you confirm.</Text><View className="mt-3 flex-row gap-2"><Button className="flex-1" onPress={() => void confirmStatementImport()} disabled={busy}><ButtonText>{busy ? 'Importing...' : statementDuplicateCount ? 'Import non-duplicates' : 'Import preview'}</ButtonText></Button><Button variant="outline" onPress={() => { setStatementPreview(null); setStatementDuplicateCount(0); }}><ButtonText>Cancel</ButtonText></Button></View></View> : null}</Card>
        <Card className="p-4"><View className="flex-row items-center justify-between"><View><Heading size="md">Review inbox</Heading><Text size="xs" className="mt-1 text-muted-foreground">Confirm the reason before tracked spending.</Text></View><Badge variant={imports.length ? 'default' : 'outline'}><BadgeText>{imports.length}</BadgeText></Badge></View>
          {imports.length === 0 ? <View className="mt-4 items-center rounded-2xl bg-muted/60 p-6"><FileText size={24} className="text-muted-foreground" /><Text size="sm" className="mt-2 font-medium">No payments waiting for review</Text><Text size="xs" className="mt-1 text-center text-muted-foreground">Imported payments will appear here.</Text></View> :
          <View className="mt-4 gap-3">{imports.map((item) => { const editing = editingId === item.id; return <View key={item.id} className="rounded-2xl border border-border bg-background p-3">
            <View className="flex-row items-start gap-3"><View className="flex-1"><Text size="sm" className="font-bold">{item.merchant || item.sourceLabel}</Text><Text size="xs" className="mt-1 text-muted-foreground">{providerLabel(item.provider)} | {new Date(item.date).toLocaleString('en-IN')}</Text>{item.upiId ? <Text size="xs" className="mt-1 text-muted-foreground">{item.upiId}</Text> : null}</View><Text size="md" className="font-bold">INR {item.amount.toLocaleString('en-IN')}</Text></View>
            <Text size="xs" className="mt-2 text-muted-foreground" numberOfLines={2}>{item.rawText}</Text>
            {editing ? <View className="mt-3 gap-2"><Text size="xs" className="font-semibold">{shouldAskForPurpose({ amount: item.amount, merchant: item.merchant ?? '', title: item.sourceLabel, note: item.note ?? '', purpose: item.purpose, categoryId: '' }) ? 'What was this payment for?' : 'Review purpose (optional)'}</Text><View className="flex-row flex-wrap gap-2">{PURPOSES.map((value) => <Pressable key={value} onPress={() => setPurpose(value)} className={purpose === value ? 'rounded-full bg-emerald-500 px-3 py-2' : 'rounded-full bg-muted px-3 py-2'}><Text size="xs" className={purpose === value ? 'text-white font-semibold' : 'font-medium'}>{value}</Text></Pressable>)}</View><Input><InputField value={purpose} onChangeText={setPurpose} placeholder="Custom purpose" /></Input><Input><InputField value={note} onChangeText={setNote} placeholder="Payment note, e.g. college lunch" /></Input><View className="flex-row gap-2"><Button className="flex-1" onPress={() => void saveReview()} disabled={busy}><Check size={16} color="white" /><ButtonText>Save review</ButtonText></Button><Button variant="outline" onPress={() => setEditingId(null)}><ButtonText>Cancel</ButtonText></Button></View></View> :
            <View className="mt-3 flex-row gap-2"><Button className="flex-1" onPress={() => startReview(item)}><Check size={16} color="white" /><ButtonText>Review</ButtonText></Button><Button variant="outline" onPress={() => void ignore(item.id)}><RotateCcw size={16} /><ButtonText>Ignore</ButtonText></Button><Pressable onPress={() => void remove(item.id)} className="h-10 w-10 items-center justify-center rounded-xl bg-red-500/10"><Trash2 size={17} className="text-red-500" /></Pressable></View>}</View>; })}</View>}
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5 p-4"><Heading size="sm">Privacy model</Heading><Text size="xs" className="mt-1 text-muted-foreground">No bank password, UPI PIN, or bank connection is needed for this tracking flow.</Text></Card>
      </ScrollView>
    </View>
  );
}
