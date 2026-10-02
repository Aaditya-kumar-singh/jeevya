// ─── Finance Types ────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';

export type CategoryType = 'income' | 'expense';

export type FinanceTransactionSource =
  | 'manual'
  | 'payment_notification'
  | 'statement_import'
  | 'share_import'
  | 'api'
  | 'other';

export type FinanceTransactionState = 'new' | 'reviewed' | 'ignored' | 'duplicate';
export type FinancePaymentStatus = 'success' | 'pending' | 'failed' | 'reversed' | 'refunded' | 'unknown';

export interface FinanceReceiptAttachment {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface FinanceTransactionSplit {
  id: string;
  amount: number;
  categoryId: string;
  title?: string;
  purpose?: string;
  note?: string;
  tags?: string[];
}

export interface FinanceAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  title: string;
  note: string;
  date: string;
  source?: FinanceTransactionSource;
  provider?: string;
  externalTransactionId?: string;
  referenceId?: string;
  merchant?: string;
  payee?: string;
  paymentStatus?: FinancePaymentStatus;
  paymentMethod?: string;
  purpose?: string;
  tags?: string[];
  receiptAttachment?: FinanceReceiptAttachment;
  confidence?: number;
  importedAt?: string;
  reviewedAt?: string;
  importBatchId?: string;
  importFingerprint?: string;
  importState?: FinanceTransactionState;
  /** Shared identifier for a transaction and its category-allocation children. */
  splitGroupId?: string;
  /** Category-level allocations for a transaction. Their amounts must sum to amount. */
  splitItems?: FinanceTransactionSplit[];
  originalImport?: {
    title?: string;
    merchant?: string;
    payee?: string;
    note?: string;
    purpose?: string;
    amount?: number;
    date?: string;
  };
  /** For transfers: source account */
  fromAccountId?: string;
  /** For transfers: destination account */
  toAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  icon: string;
  type: CategoryType;
  createdAt: string;
}

export interface FinanceBudget {
  id: string;
  categoryId: string;
  amount: number;
  month: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CATEGORIES: Omit<FinanceCategory, 'id' | 'createdAt'>[] = [
  { name: 'Salary', icon: 'briefcase', type: 'income' },
  { name: 'Freelance', icon: 'laptop', type: 'income' },
  { name: 'Business', icon: 'building', type: 'income' },
  { name: 'Investment', icon: 'trending-up', type: 'income' },
  { name: 'Other Income', icon: 'plus-circle', type: 'income' },
  { name: 'Food', icon: 'utensils', type: 'expense' },
  { name: 'Transport', icon: 'car', type: 'expense' },
  { name: 'Shopping', icon: 'shopping-bag', type: 'expense' },
  { name: 'Bills', icon: 'file-text', type: 'expense' },
  { name: 'Entertainment', icon: 'film', type: 'expense' },
  { name: 'Health', icon: 'heart', type: 'expense' },
  { name: 'Education', icon: 'book', type: 'expense' },
  { name: 'Travel', icon: 'plane', type: 'expense' },
  { name: 'Other', icon: 'more-horizontal', type: 'expense' },
];
