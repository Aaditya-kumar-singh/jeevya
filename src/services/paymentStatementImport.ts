import * as XLSX from 'xlsx';
import { extractText, isAvailable as isPdfTextExtractionAvailable } from 'expo-pdf-text-extract';
type MlkitOcrModule = typeof import('expo-mlkit-ocr');

function getMlkitOcrModule(): MlkitOcrModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-mlkit-ocr') as MlkitOcrModule;
  } catch {
    throw new Error('On-device OCR requires a Jeevya development build with the ML Kit native module.');
  }
}
import * as FileSystem from 'expo-file-system/legacy';
import { createPaymentImport, getPaymentImportFingerprint, getPaymentImports, parsePaymentText } from '@/services/paymentImports';
import type { PaymentImport, PaymentProvider } from '@/types/paymentImport';
import { quarantinePaymentPayload } from '@/services/paymentQuarantine';
import { detectBankStatementProfile, getBankProfileConfidence } from '@/services/bankStatementProfiles';
type PdfToImageModule = typeof import('@uzimandias/react-native-pdf-to-image');

function getPdfToImageModule(): PdfToImageModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@uzimandias/react-native-pdf-to-image') as PdfToImageModule;
  } catch {
    throw new Error('Scanned PDF OCR requires a Jeevya development build with the PDF rendering native module. Text-based PDF import remains available when PDF text extraction is supported.');
  }
}

export interface StatementRow {
  rowNumber: number;
  rawText: string;
  amount?: number;
  date?: string;
  merchant?: string;
  referenceId?: string;
  direction?: 'expense' | 'income' | 'transfer';
  error?: string;
  duplicate?: boolean;
  duplicateImportId?: string;
}

export interface StatementPreview {
  format: 'csv' | 'xlsx' | 'xls' | 'pdf';
  rows: StatementRow[];
  validCount: number;
  errorCount: number;
  bankProfileId?: string;
  bankProfileName?: string;
  bankProfileConfidence?: number;
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\\n' || char === '\\r') && !quoted) {
      if (char === '\\r' && next === '\\n') i += 1;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalized.indexOf(normalizeHeader(candidate));
    if (index !== -1) return index;
  }
  return -1;
}

function amountValue(value: unknown): number | undefined {
  const number = Number(String(value ?? '').replace(/[₹,\\s]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function rowToStatement(values: unknown[], headers: string[], rowNumber: number): StatementRow {
  const merchantIndex = findColumn(headers, ['merchant', 'payee', 'description', 'particulars', 'narration', 'transactiondetails', 'name']);
  const dateIndex = findColumn(headers, ['date', 'transactiondate', 'valuedate', 'transactiondatetime', 'txn date']);
  const refIndex = findColumn(headers, ['utr', 'rrn', 'reference', 'referencenumber', 'transactionid', 'txnid', 'chqno', 'chequeno']);
  const debitIndex = findColumn(headers, ['debit', 'withdrawal', 'withdrawals', 'debitamount', 'paid', 'dr']);
  const creditIndex = findColumn(headers, ['credit', 'deposit', 'deposits', 'creditamount', 'received', 'cr']);
  const amountIndex = findColumn(headers, ['amount', 'transactionamount']);
  const merchant = merchantIndex >= 0 ? String(values[merchantIndex] ?? '').trim() : undefined;
  const date = dateIndex >= 0 ? String(values[dateIndex] ?? '').trim() : undefined;
  const referenceId = refIndex >= 0 ? String(values[refIndex] ?? '').trim() : undefined;
  const debit = debitIndex >= 0 ? amountValue(values[debitIndex]) : undefined;
  const credit = creditIndex >= 0 ? amountValue(values[creditIndex]) : undefined;
  const genericAmount = amountIndex >= 0 ? amountValue(values[amountIndex]) : undefined;
  const amount = debit ?? credit ?? genericAmount;
  const direction = debit ? 'expense' : credit ? 'income' : undefined;
  if (!amount) return { rowNumber, rawText: values.map((value) => String(value ?? '')).join(' | '), merchant, date, referenceId, error: 'No positive amount column/value found.' };
  const rawText = (direction === 'income' ? 'Received INR ' : 'Paid INR ') + amount +
    (merchant ? ' to ' + merchant : '') + (referenceId ? ' UPI Ref ' + referenceId : '') + (date ? ' on ' + date : '');
  return { rowNumber, rawText, amount, merchant, date, referenceId, direction };
}

function findTabularHeader(values: unknown[][]): { header: string[]; index: number } | undefined {
  let best: { header: string[]; index: number; score: number } | undefined;
  for (let index = 0; index < Math.min(values.length, 25); index += 1) {
    const header = values[index].map((value) => String(value ?? '').trim());
    const normalized = header.map(normalizeHeader);
    const hasDate = normalized.some((value) => ['date', 'transactiondate', 'valuedate', 'txndate'].includes(value));
    const hasNarration = normalized.some((value) => ['description', 'particulars', 'narration', 'transactiondetails', 'merchant', 'payee'].includes(value));
    const hasAmount = normalized.some((value) => ['amount', 'transactionamount', 'debit', 'credit', 'withdrawal', 'deposit'].includes(value));
    const score = Number(hasDate) + Number(hasNarration) + Number(hasAmount);
    if (score >= 2 && (!best || score > best.score)) best = { header, index, score };
  }
  return best;
}

function buildTabularPreview(values: unknown[][], format: 'csv' | 'xlsx' | 'xls'): StatementPreview {
  const headerMatch = findTabularHeader(values);
  if (!headerMatch) return { format, rows: [], validCount: 0, errorCount: 1 };
  const parsed = values.slice(headerMatch.index + 1)
    .filter((row) => row.some((value) => String(value ?? '').trim()))
    .map((row, index) => rowToStatement(row, headerMatch.header, headerMatch.index + index + 2));
  return { format, rows: parsed, validCount: parsed.filter((row) => !row.error).length, errorCount: parsed.filter((row) => !!row.error).length };
}

export function previewCsvStatement(text: string): StatementPreview {
  return buildTabularPreview(csvRows(text), 'csv');
}

export function previewExcelStatement(data: ArrayBuffer | string, isBase64 = false): StatementPreview {
  const workbook = XLSX.read(data, { type: isBase64 ? 'base64' : 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { format: 'xlsx', rows: [], validCount: 0, errorCount: 1 };
  const values = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });
  return buildTabularPreview(values, 'xlsx');
}

const PDF_DATE_PATTERNS = [
  /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/,
  /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/,
  /\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/,
];

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9,
  october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function pdfDate(value: string): string | undefined {
  for (const pattern of PDF_DATE_PATTERNS) {
    const match = value.match(pattern);
    if (!match) continue;
    let year: number;
    let month: number;
    let day: number;
    if (pattern === PDF_DATE_PATTERNS[1]) {
      day = Number(match[1]);
      month = MONTHS[match[2].toLowerCase()];
      year = Number(match[3]);
    } else if (pattern === PDF_DATE_PATTERNS[2]) {
      year = Number(match[1]);
      month = Number(match[2]) - 1;
      day = Number(match[3]);
    } else {
      day = Number(match[1]);
      month = Number(match[2]) - 1;
      year = Number(match[3]);
      if (year < 100) year += year >= 70 ? 1900 : 2000;
    }
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return year.toString().padStart(4, '0') + '-' +
        String(month + 1).padStart(2, '0') + '-' +
        String(day).padStart(2, '0') + 'T00:00:00.000Z';
    }
  }
  return undefined;
}

function pdfAmount(value: string): number | undefined {
  const decimalMatches = [...value.matchAll(/(?:₹|INR|Rs\.?\s*)?([\d,]+\.\d{1,2})(?![\d.])/gi)]
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  if (decimalMatches.length >= 2) return decimalMatches[0];
  if (decimalMatches.length === 1) return decimalMatches[0];

  const integerMatches = [...value.matchAll(/(?:₹|INR|Rs\.?\s*)([\d,]+)(?![\d.,])/gi)]
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  if (integerMatches.length >= 2) return integerMatches[0];
  return integerMatches[0];
}

function pdfDirection(value: string): StatementRow['direction'] {
  if (/\b(?:credit|credited|cr|deposit|received|refund|cashback)\b/i.test(value)) return 'income';
  if (/\b(?:transfer(?:red)?|sent)\s+to\b/i.test(value)) return 'transfer';
  return 'expense';
}

function pdfMerchant(value: string, dateText: string, amount: number): string | undefined {
  let merchant = value
    .replace(dateText, ' ')
    .replace(/(?:₹|INR|Rs\.?|Amount|Debit|Credit|Withdrawal|Deposit)/gi, ' ')
    .replace(/(?:UPI|IMPS|NEFT|RTGS)\s*[/:-]?\s*/gi, ' ')
    .replace(/(?:UTR|RRN|Txn(?:\s*ID)?|Transaction(?:\s*(?:ID|Ref(?:erence)?))?)\s*[:#-]?\s*[A-Z0-9-]+/gi, ' ')
    .replace(/\b(?:DR|CR)\b/gi, ' ')
    .replace(new RegExp('\\b' + amount.toFixed(2).replace('.', '\\.') + '\\b', 'g'), ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[|,:;\-\s]+|[|,:;\-\s]+$/g, '')
    .trim();
  if (!merchant || /^(opening|closing|available|balance|total|date|particulars|description|transaction)$/i.test(merchant)) return undefined;
  return merchant.slice(0, 100);
}

function parsePdfStatementLines(text: string): StatementRow[] {
  const rows: StatementRow[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (const [index, line] of lines.entries()) {
    const dateMatch = line.match(PDF_DATE_PATTERNS[0]) ?? line.match(PDF_DATE_PATTERNS[1]) ?? line.match(PDF_DATE_PATTERNS[2]);
    if (!dateMatch) continue;
    const dateText = dateMatch[0];
    const amount = pdfAmount(line);
    if (!amount) continue;
    if (/\b(?:opening|closing|available|total)\s+balance\b/i.test(line)) continue;
    const direction = pdfDirection(line);
    const merchant = pdfMerchant(line, dateText, amount);
    const rawText = (direction === 'income' ? 'Received INR ' : direction === 'transfer' ? 'Transferred INR ' : 'Paid INR ') +
      amount +
      (merchant ? ' to ' + merchant : '') +
      ' on ' + dateText;
    rows.push({
      rowNumber: index + 1,
      rawText,
      amount,
      date: pdfDate(dateText),
      merchant,
      direction,
    });
  }
  return rows;
}

export function previewPdfStatement(text: string): StatementPreview {
  if (!text.trim()) return { format: 'pdf', rows: [], validCount: 0, errorCount: 1 };
  const profile = detectBankStatementProfile(text);
  const rows = parsePdfStatementLines(text);
  if (!rows.length) {
    return {
      format: 'pdf',
      rows: [{ rowNumber: 1, rawText: '', error: 'No transaction rows with recognizable dates and amounts were found. Scanned/image-only PDFs are not supported yet.' }],
      validCount: 0,
      errorCount: 1,
      ...(profile ? { bankProfileId: profile.id, bankProfileName: profile.name, bankProfileConfidence: getBankProfileConfidence(text) } : {}),
    };
  }
  return {
    format: 'pdf',
    rows,
    validCount: rows.filter((row) => !row.error).length,
    errorCount: rows.filter((row) => !!row.error).length,
    ...(profile ? { bankProfileId: profile.id, bankProfileName: profile.name, bankProfileConfidence: getBankProfileConfidence(text) } : {}),
  };
}

export function canExtractPdfText(): boolean {
  return isPdfTextExtractionAvailable();
}

export async function extractPdfStatementPreviewWithOcr(uri: string, maxPages = 20): Promise<StatementPreview> {
  try {
    const { recognizeText, isSupported: isOcrSupported } = getMlkitOcrModule();
    if (!isOcrSupported()) throw new Error('On-device OCR is unavailable on this device/build.');
    const { getPdfInfo, convertPages } = getPdfToImageModule();
    const info = await getPdfInfo(uri);
    if (info.isEncrypted) throw new Error('This PDF is password protected. Export an unlocked statement PDF and try again.');
    const pageCount = Math.min(info.pageCount, Math.max(1, maxPages));
    const pages = await convertPages(uri, 0, pageCount - 1, {
      format: 'jpeg',
      quality: 0.88,
      maxWidth: 2200,
      output: 'file',
      filePrefix: 'jeevya-statement-ocr',
    });
    const texts: string[] = [];
    try {
      for (const page of pages) {
        const result = await recognizeText(page.uri);
        if (result.text.trim()) texts.push(result.text.trim());
      }
    } finally {
      await Promise.all(pages.map((page) => FileSystem.deleteAsync(page.uri, { idempotent: true }).catch(() => undefined)));
    }
    const preview = previewPdfStatement(texts.join('\n'));
    if (preview.validCount === 0) {
      return {
        ...preview,
        rows: [{ rowNumber: 1, rawText: '', error: pageCount < info.pageCount
          ? `OCR could not find transaction rows in the first ${pageCount} pages. Try a shorter statement or import a text-based PDF.`
          : 'OCR could not find transaction rows with recognizable dates and amounts.' }],
        errorCount: 1,
      };
    }
    return preview;
  } catch (error) {
    if (error instanceof Error && /password protected|OCR is unavailable|OCR could not|development build/i.test(error.message)) throw error;
    throw new Error('Could not render or OCR this scanned PDF. It may be corrupted, encrypted, or unsupported by the device.');
  }
}
export async function extractPdfStatementPreview(uri: string): Promise<StatementPreview> {
  if (!isPdfTextExtractionAvailable()) {
    throw new Error('PDF text extraction is unavailable in this build. Rebuild Jeevya with the native PDF module.');
  }
  try {
    const text = await extractText(uri);
    const preview = previewPdfStatement(text);
    if (preview.validCount > 0) return preview;
    return await extractPdfStatementPreviewWithOcr(uri);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : '';
    if (code === 'PASSWORD_REQUIRED' || code === 'INCORRECT_PASSWORD') {
      throw new Error('This PDF is password protected. Export an unlocked statement PDF and try again.');
    }
    throw new Error('Could not extract text from this PDF. It may be corrupted or image-only.');
  }
}

export interface StatementDuplicatePreview {
  duplicateCount: number;
  duplicateRows: StatementRow[];
}

export async function previewStatementDuplicates(
  rows: StatementRow[],
  provider: PaymentProvider = 'other',
): Promise<StatementDuplicatePreview> {
  const existing = await getPaymentImports();
  const byFingerprint = new Map(existing.map((item) => [item.fingerprint, item.id]));
  const duplicateRows: StatementRow[] = [];

  for (const row of rows) {
    if (row.error || !row.amount) continue;
    try {
      const parsed = parsePaymentText(row.rawText, provider);
      const date = row.date && !Number.isNaN(Date.parse(row.date))
        ? new Date(row.date).toISOString()
        : parsed.date;
      const fingerprint = getPaymentImportFingerprint({
        provider,
        rawText: row.rawText,
        amount: row.amount,
        merchant: row.merchant ?? parsed.merchant,
        referenceId: row.referenceId ?? parsed.referenceId,
        date,
      });
      const duplicateImportId = byFingerprint.get(fingerprint);
      if (duplicateImportId) {
        row.duplicate = true;
        row.duplicateImportId = duplicateImportId;
        duplicateRows.push(row);
      }
    } catch {
      // Parsing errors remain represented by the row's existing error state.
    }
  }

  return { duplicateCount: duplicateRows.length, duplicateRows };
}

export interface StatementImportProgress {
  processed: number;
  total: number;
  imported: number;
  errors: number;
}

export async function importStatementRows(
  rows: StatementRow[],
  provider: PaymentProvider = 'other',
  onProgress?: (progress: StatementImportProgress) => void,
): Promise<{ imported: PaymentImport[]; errors: StatementRow[]; duplicates: StatementRow[] }> {
  const batchId = 'paybatch_statement_' + Date.now();
  const imported: PaymentImport[] = [];
  const errors: StatementRow[] = [];
  const duplicates: StatementRow[] = [];
  const total = rows.length;
  onProgress?.({ processed: 0, total, imported: 0, errors: 0 });
  for (const [index, row] of rows.entries()) {
    if (row.error || !row.amount) { errors.push(row); continue; }
    if (row.duplicate) {
      duplicates.push(row);
      onProgress?.({
        processed: index + 1,
        total,
        imported: imported.length,
        errors: errors.length,
      });
      continue;
    }
    try {
      const parsed = parsePaymentText(row.rawText, provider);
      imported.push(await createPaymentImport({
        provider,
        rawText: row.rawText,
        ...parsed,
        ...(row.direction ? { direction: row.direction } : {}),
        amount: row.amount,
        merchant: row.merchant ?? parsed.merchant,
        referenceId: row.referenceId ?? parsed.referenceId,
        date: row.date && !Number.isNaN(Date.parse(row.date)) ? new Date(row.date).toISOString() : parsed.date,
        batchId,
        sourceType: 'statement',
      }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Import failed.';
      errors.push({ ...row, error: reason });
      await quarantinePaymentPayload({ source: 'statement', raw: row.rawText, reason });
    }
    onProgress?.({
      processed: index + 1,
      total,
      imported: imported.length,
      errors: errors.length,
    });
  }
  return { imported, errors, duplicates };
}



