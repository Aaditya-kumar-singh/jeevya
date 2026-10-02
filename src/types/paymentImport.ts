export type PaymentProvider =
  | 'google_pay'
  | 'phonepe'
  | 'paytm'
  | 'sbi'
  | 'pnb'
  | 'bhim'
  | 'other';

export type PaymentImportStatus = 'new' | 'reviewed' | 'ignored' | 'duplicate';
export type PaymentTransactionStatus = 'success' | 'pending' | 'failed' | 'reversed' | 'refunded' | 'unknown';
export const PAYMENT_PARSER_VERSION = 1;

export interface PaymentImport {
  id: string;
  batchId?: string;
  sourceType?: 'notification' | 'paste' | 'manual' | 'statement' | 'share';
  provider: PaymentProvider;
  sourceLabel: string;
  sourcePackage?: string;
  rawText: string;
  amount: number;
  currency: string;
  direction: 'expense' | 'income' | 'transfer';
  merchant?: string;
  payee?: string;
  upiId?: string;
  referenceId?: string;
  transactionStatus: PaymentTransactionStatus;
  date: string;
  purpose?: string;
  note?: string;
  tags: string[];
  status: PaymentImportStatus;
  confidence: number;
  parserVersion: number;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentImportInput {
  provider: PaymentProvider;
  sourceLabel?: string;
  sourcePackage?: string;
  rawText: string;
  amount: number;
  currency?: string;
  direction?: PaymentImport['direction'];
  merchant?: string;
  payee?: string;
  upiId?: string;
  referenceId?: string;
  transactionStatus?: PaymentTransactionStatus;
  date?: string;
  purpose?: string;
  note?: string;
  tags?: string[];
  confidence?: number;
  parserVersion?: number;
  batchId?: string;
  sourceType?: 'notification' | 'paste' | 'manual' | 'statement' | 'share';
}

export interface UpdatePaymentImportInput {
  merchant?: string;
  payee?: string;
  sourceLabel?: string;
  sourcePackage?: string;
  purpose?: string;
  note?: string;
  tags?: string[];
  status?: PaymentImportStatus;
  transactionStatus?: PaymentTransactionStatus;
}

export const PAYMENT_PROVIDERS: { id: PaymentProvider; label: string }[] = [
  { id: 'google_pay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'sbi', label: 'SBI / YONO' },
  { id: 'pnb', label: 'PNB One' },
  { id: 'bhim', label: 'BHIM' },
  { id: 'other', label: 'Other UPI / Bank' },
];

