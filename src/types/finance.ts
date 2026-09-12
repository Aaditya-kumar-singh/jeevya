// ─── Finance Types ────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment';

export type CategoryType = 'income' | 'expense';

// ─── Models ───────────────────────────────────────────────────────────────────

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
  month: string; // "YYYY-MM" format
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

// ─── Seed Categories ──────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: Omit<FinanceCategory, 'id' | 'createdAt'>[] = [
  // Income
  { name: 'Salary', icon: 'briefcase', type: 'income' },
  { name: 'Freelance', icon: 'laptop', type: 'income' },
  { name: 'Business', icon: 'building', type: 'income' },
  { name: 'Investment', icon: 'trending-up', type: 'income' },
  { name: 'Other Income', icon: 'plus-circle', type: 'income' },
  // Expense
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
