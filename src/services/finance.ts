import { saveData, loadData, removeData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import { getISODateString } from '@/types/habit';
import {
  DEFAULT_CATEGORIES,
  type FinanceAccount,
  type FinanceTransaction,
  type FinanceCategory,
  type FinanceBudget,
  type FinanceSavingsGoal,
  type AccountType,
  type TransactionType,
  type CategoryType,
} from '@/types/finance';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const ACCOUNTS_KEY = 'jeevya:finance:accounts';
const TRANSACTIONS_KEY = 'jeevya:finance:transactions';
const CATEGORIES_KEY = 'jeevya:finance:categories';
const BUDGETS_KEY = 'jeevya:finance:budgets';
const SAVINGS_GOALS_KEY = 'jeevya:finance:savings-goals';

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance?: number;
  currency?: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  balance?: number;
  currency?: string;
}

export interface CreateTransactionInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  title: string;
  note?: string;
  date?: string;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  title?: string;
  note?: string;
  date?: string;
}

export interface UpdateTransferInput {
  fromAccountId?: string;
  toAccountId?: string;
  amount?: number;
  title?: string;
  note?: string;
  date?: string;
}

export interface UpdateTransactionInput {
  accountId?: string;
  type?: TransactionType;
  amount?: number;
  categoryId?: string;
  title?: string;
  note?: string;
  date?: string;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
  type: CategoryType;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  type?: CategoryType;
}

export interface CreateBudgetInput {
  categoryId: string;
  amount: number;
  month: string;
}

export interface UpdateBudgetInput {
  categoryId?: string;
  amount?: number;
  month?: string;
}

export interface CreateSavingsGoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline: string;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
}

// ─── Accounts CRUD ────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<FinanceAccount[]> {
  return loadData<FinanceAccount[]>(ACCOUNTS_KEY, []);
}

export async function getAccountById(id: string): Promise<FinanceAccount | null> {
  const accounts = await getAccounts();
  return accounts.find((a) => a.id === id) ?? null;
}

export async function createAccount(input: CreateAccountInput): Promise<FinanceAccount> {
  const accounts = await getAccounts();
  const now = getISODateString();

  const account: FinanceAccount = {
    id: uid('acct_'),
    name: input.name.trim(),
    type: input.type,
    balance: input.balance ?? 0,
    currency: input.currency ?? 'INR',
    createdAt: now,
    updatedAt: now,
  };

  if (!account.name) {
    throw new Error('Account name is required');
  }

  await saveData(ACCOUNTS_KEY, [account, ...accounts]);
  return account;
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<FinanceAccount | null> {
  const accounts = await getAccounts();
  const index = accounts.findIndex((a) => a.id === id);

  if (index === -1) return null;

  const account = accounts[index];
  const now = getISODateString();

  const updated: FinanceAccount = {
    ...account,
    ...input,
    updatedAt: now,
  };

  if (!updated.name.trim()) {
    throw new Error('Account name is required');
  }

  accounts[index] = updated;
  await saveData(ACCOUNTS_KEY, accounts);

  return updated;
}

export async function deleteAccount(id: string): Promise<boolean> {
  const accounts = await getAccounts();
  const filtered = accounts.filter((a) => a.id !== id);

  if (filtered.length === accounts.length) return false;

  await saveData(ACCOUNTS_KEY, filtered);

  // Also delete all transactions for this account
  const transactions = await getTransactions();
  const filteredTransactions = transactions.filter((t) => t.accountId !== id);
  if (filteredTransactions.length !== transactions.length) {
    await saveData(TRANSACTIONS_KEY, filteredTransactions);
  }

  return true;
}

// ─── Transactions CRUD ────────────────────────────────────────────────────────

export async function getTransactions(): Promise<FinanceTransaction[]> {
  return loadData<FinanceTransaction[]>(TRANSACTIONS_KEY, []);
}

export async function getTransactionsByAccount(
  accountId: string,
): Promise<FinanceTransaction[]> {
  const transactions = await getTransactions();
  return transactions.filter((t) => t.accountId === accountId);
}

export async function getTransactionById(
  id: string,
): Promise<FinanceTransaction | null> {
  const transactions = await getTransactions();
  return transactions.find((t) => t.id === id) ?? null;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<FinanceTransaction> {
  const transactions = await getTransactions();
  const now = getISODateString();

  const transaction: FinanceTransaction = {
    id: uid('txn_'),
    accountId: input.accountId,
    type: input.type,
    amount: Math.abs(input.amount),
    categoryId: input.categoryId,
    title: input.title.trim(),
    note: input.note?.trim() ?? '',
    date: input.date ?? now,
    createdAt: now,
    updatedAt: now,
  };

  if (!transaction.title) {
    throw new Error('Transaction title is required');
  }

  if (transaction.amount <= 0) {
    throw new Error('Transaction amount must be greater than 0');
  }

  // Update account balance
  const accounts = await getAccounts();
  const accountIndex = accounts.findIndex((a) => a.id === transaction.accountId);

  if (accountIndex === -1) {
    throw new Error('Account not found');
  }

  const account = accounts[accountIndex];
  let newBalance = account.balance;

  if (transaction.type === 'income') {
    newBalance += transaction.amount;
  } else if (transaction.type === 'expense') {
    newBalance -= transaction.amount;
  }
  // transfer balance changes handled separately

  accounts[accountIndex] = {
    ...account,
    balance: newBalance,
    updatedAt: now,
  };

  await saveData(TRANSACTIONS_KEY, [transaction, ...transactions]);
  await saveData(ACCOUNTS_KEY, accounts);

  return transaction;
}

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<FinanceTransaction | null> {
  const transactions = await getTransactions();
  const index = transactions.findIndex((t) => t.id === id);

  if (index === -1) return null;

  const oldTransaction = transactions[index];
  const now = getISODateString();

  // If amount or type changed, we need to adjust account balances
  const amountChanged = input.amount !== undefined && input.amount !== oldTransaction.amount;
  const typeChanged = input.type !== undefined && input.type !== oldTransaction.type;

  if (amountChanged || typeChanged) {
    const accounts = await getAccounts();

    // Reverse old transaction effect on old account
    const oldAccountIndex = accounts.findIndex((a) => a.id === oldTransaction.accountId);
    if (oldAccountIndex !== -1) {
      let oldBalance = accounts[oldAccountIndex].balance;
      if (oldTransaction.type === 'income') {
        oldBalance -= oldTransaction.amount;
      } else if (oldTransaction.type === 'expense') {
        oldBalance += oldTransaction.amount;
      }
      accounts[oldAccountIndex] = {
        ...accounts[oldAccountIndex],
        balance: oldBalance,
        updatedAt: now,
      };
    }

    // Apply new transaction effect
    const newAmount = input.amount ?? oldTransaction.amount;
    const newType = input.type ?? oldTransaction.type;
    const newAccountId = input.accountId ?? oldTransaction.accountId;

    const newAccountIndex = accounts.findIndex((a) => a.id === newAccountId);
    if (newAccountIndex === -1) {
      throw new Error('Account not found');
    }

    let newBalance = accounts[newAccountIndex].balance;
    if (newType === 'income') {
      newBalance += newAmount;
    } else if (newType === 'expense') {
      newBalance -= newAmount;
    }

    accounts[newAccountIndex] = {
      ...accounts[newAccountIndex],
      balance: newBalance,
      updatedAt: now,
    };

    await saveData(ACCOUNTS_KEY, accounts);
  }

  const updated: FinanceTransaction = {
    ...oldTransaction,
    ...input,
    amount: Math.abs(input.amount ?? oldTransaction.amount),
    updatedAt: now,
  };

  if (!updated.title.trim()) {
    throw new Error('Transaction title is required');
  }

  if (updated.amount <= 0) {
    throw new Error('Transaction amount must be greater than 0');
  }

  transactions[index] = updated;
  await saveData(TRANSACTIONS_KEY, transactions);

  return updated;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const transactions = await getTransactions();
  const transaction = transactions.find((t) => t.id === id);

  if (!transaction) return false;

  // Reverse the transaction effect on account balance
  const accounts = await getAccounts();

  if (transaction.type === 'transfer' && transaction.fromAccountId && transaction.toAccountId) {
    // Reverse transfer: add back to source, subtract from destination
    const fromIndex = accounts.findIndex((a) => a.id === transaction.fromAccountId);
    const toIndex = accounts.findIndex((a) => a.id === transaction.toAccountId);
    const now = getISODateString();

    if (fromIndex !== -1) {
      accounts[fromIndex] = {
        ...accounts[fromIndex],
        balance: accounts[fromIndex].balance + transaction.amount,
        updatedAt: now,
      };
    }
    if (toIndex !== -1) {
      accounts[toIndex] = {
        ...accounts[toIndex],
        balance: accounts[toIndex].balance - transaction.amount,
        updatedAt: now,
      };
    }
  } else {
    const accountIndex = accounts.findIndex((a) => a.id === transaction.accountId);
    if (accountIndex !== -1) {
      const account = accounts[accountIndex];
      let newBalance = account.balance;

      if (transaction.type === 'income') {
        newBalance -= transaction.amount;
      } else if (transaction.type === 'expense') {
        newBalance += transaction.amount;
      }

      accounts[accountIndex] = {
        ...account,
        balance: newBalance,
        updatedAt: getISODateString(),
      };
    }
  }

  await saveData(ACCOUNTS_KEY, accounts);
  const filtered = transactions.filter((t) => t.id !== id);
  await saveData(TRANSACTIONS_KEY, filtered);

  return true;
}

// ─── Transfers ────────────────────────────────────────────────────────────────

export async function createTransfer(
  input: CreateTransferInput,
): Promise<FinanceTransaction> {
  if (input.fromAccountId === input.toAccountId) {
    throw new Error('Source and destination accounts must be different');
  }

  if (input.amount <= 0) {
    throw new Error('Transfer amount must be greater than 0');
  }

  const accounts = await getAccounts();
  const fromAccount = accounts.find((a) => a.id === input.fromAccountId);
  const toAccount = accounts.find((a) => a.id === input.toAccountId);

  if (!fromAccount) throw new Error('Source account not found');
  if (!toAccount) throw new Error('Destination account not found');

  // Check sufficient funds for non-credit source accounts
  if (fromAccount.type !== 'credit' && fromAccount.balance < input.amount) {
    throw new Error('Insufficient funds in source account');
  }

  const now = getISODateString();
  const title = input.title?.trim() || `Transfer to ${toAccount.name}`;

  // Create transfer transaction using accountId for backward compat
  const transaction: FinanceTransaction = {
    id: uid('txn_'),
    accountId: input.fromAccountId,
    type: 'transfer',
    amount: Math.abs(input.amount),
    categoryId: '',
    title,
    note: input.note?.trim() ?? '',
    date: input.date ?? now,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    createdAt: now,
    updatedAt: now,
  };

  // Update both account balances
  const updatedAccounts = accounts.map((a) => {
    if (a.id === input.fromAccountId) {
      return { ...a, balance: a.balance - input.amount, updatedAt: now };
    }
    if (a.id === input.toAccountId) {
      return { ...a, balance: a.balance + input.amount, updatedAt: now };
    }
    return a;
  });

  await saveData(TRANSACTIONS_KEY, [transaction, ...await getTransactions()]);
  await saveData(ACCOUNTS_KEY, updatedAccounts);

  return transaction;
}

export async function updateTransfer(
  id: string,
  input: UpdateTransferInput,
): Promise<FinanceTransaction | null> {
  const transactions = await getTransactions();
  const index = transactions.findIndex((t) => t.id === id);

  if (index === -1) return null;

  const oldTx = transactions[index];
  if (oldTx.type !== 'transfer') return null;

  const now = getISODateString();
  const accounts = await getAccounts();

  // Reverse old transfer
  const oldFromIdx = accounts.findIndex((a) => a.id === oldTx.fromAccountId);
  const oldToIdx = accounts.findIndex((a) => a.id === oldTx.toAccountId);

  if (oldFromIdx !== -1) {
    accounts[oldFromIdx] = {
      ...accounts[oldFromIdx],
      balance: accounts[oldFromIdx].balance + oldTx.amount,
      updatedAt: now,
    };
  }
  if (oldToIdx !== -1) {
    accounts[oldToIdx] = {
      ...accounts[oldToIdx],
      balance: accounts[oldToIdx].balance - oldTx.amount,
      updatedAt: now,
    };
  }

  // Apply new transfer
  const newFromId = input.fromAccountId ?? oldTx.fromAccountId!;
  const newToId = input.toAccountId ?? oldTx.toAccountId!;
  const newAmount = input.amount ?? oldTx.amount;

  if (newFromId === newToId) {
    throw new Error('Source and destination accounts must be different');
  }

  if (newAmount <= 0) {
    throw new Error('Transfer amount must be greater than 0');
  }

  const fromAccount = accounts.find((a) => a.id === newFromId);
  if (!fromAccount) throw new Error('Source account not found');
  if (fromAccount.type !== 'credit' && fromAccount.balance < newAmount) {
    throw new Error('Insufficient funds in source account');
  }

  const toAccount = accounts.find((a) => a.id === newToId);
  if (!toAccount) throw new Error('Destination account not found');

  const newFromIdx = accounts.findIndex((a) => a.id === newFromId);
  const newToIdx = accounts.findIndex((a) => a.id === newToId);

  if (newFromIdx !== -1) {
    accounts[newFromIdx] = {
      ...accounts[newFromIdx],
      balance: accounts[newFromIdx].balance - newAmount,
      updatedAt: now,
    };
  }
  if (newToIdx !== -1) {
    accounts[newToIdx] = {
      ...accounts[newToIdx],
      balance: accounts[newToIdx].balance + newAmount,
      updatedAt: now,
    };
  }

  const updated: FinanceTransaction = {
    ...oldTx,
    accountId: newFromId,
    fromAccountId: newFromId,
    toAccountId: newToId,
    amount: Math.abs(newAmount),
    title: (input.title?.trim() || oldTx.title),
    note: input.note?.trim() ?? oldTx.note,
    date: input.date ?? oldTx.date,
    updatedAt: now,
  };

  transactions[index] = updated;
  await saveData(TRANSACTIONS_KEY, transactions);
  await saveData(ACCOUNTS_KEY, accounts);

  return updated;
}

// ─── Categories CRUD ──────────────────────────────────────────────────────────

export async function getCategories(): Promise<FinanceCategory[]> {
  return loadData<FinanceCategory[]>(CATEGORIES_KEY, []);
}

export async function getCategoryById(
  id: string,
): Promise<FinanceCategory | null> {
  const categories = await getCategories();
  return categories.find((c) => c.id === id) ?? null;
}

export async function getCategoriesByType(
  type: CategoryType,
): Promise<FinanceCategory[]> {
  const categories = await getCategories();
  return categories.filter((c) => c.type === type);
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<FinanceCategory> {
  const categories = await getCategories();

  const category: FinanceCategory = {
    id: uid('cat_'),
    name: input.name.trim(),
    icon: input.icon,
    type: input.type,
    createdAt: getISODateString(),
  };

  if (!category.name) {
    throw new Error('Category name is required');
  }

  await saveData(CATEGORIES_KEY, [category, ...categories]);
  return category;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<FinanceCategory | null> {
  const categories = await getCategories();
  const index = categories.findIndex((c) => c.id === id);

  if (index === -1) return null;

  const category = categories[index];

  const updated: FinanceCategory = {
    ...category,
    ...input,
  };

  if (!updated.name.trim()) {
    throw new Error('Category name is required');
  }

  categories[index] = updated;
  await saveData(CATEGORIES_KEY, categories);

  return updated;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const categories = await getCategories();
  const filtered = categories.filter((c) => c.id !== id);

  if (filtered.length === categories.length) return false;

  await saveData(CATEGORIES_KEY, filtered);
  return true;
}

// ─── Seed Categories ──────────────────────────────────────────────────────────

export async function seedDefaultCategories(): Promise<FinanceCategory[]> {
  const existing = await getCategories();

  // Don't seed if categories already exist
  if (existing.length > 0) return existing;

  const now = getISODateString();
  const seeded: FinanceCategory[] = DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    id: uid('cat_'),
    createdAt: now,
  }));

  await saveData(CATEGORIES_KEY, seeded);
  return seeded;
}

// ─── Budgets CRUD ─────────────────────────────────────────────────────────────

export async function getBudgets(): Promise<FinanceBudget[]> {
  return loadData<FinanceBudget[]>(BUDGETS_KEY, []);
}

export async function getBudgetsByMonth(
  month: string,
): Promise<FinanceBudget[]> {
  const budgets = await getBudgets();
  return budgets.filter((b) => b.month === month);
}

export async function getBudgetById(
  id: string,
): Promise<FinanceBudget | null> {
  const budgets = await getBudgets();
  return budgets.find((b) => b.id === id) ?? null;
}

export async function createBudget(
  input: CreateBudgetInput,
): Promise<FinanceBudget> {
  const budgets = await getBudgets();
  const now = getISODateString();

  // Check if budget already exists for this category and month
  const existing = budgets.find(
    (b) => b.categoryId === input.categoryId && b.month === input.month,
  );
  if (existing) {
    throw new Error('Budget already exists for this category and month');
  }

  const budget: FinanceBudget = {
    id: uid('bud_'),
    categoryId: input.categoryId,
    amount: input.amount,
    month: input.month,
    createdAt: now,
    updatedAt: now,
  };

  if (budget.amount <= 0) {
    throw new Error('Budget amount must be greater than 0');
  }

  await saveData(BUDGETS_KEY, [budget, ...budgets]);
  return budget;
}

export async function updateBudget(
  id: string,
  input: UpdateBudgetInput,
): Promise<FinanceBudget | null> {
  const budgets = await getBudgets();
  const index = budgets.findIndex((b) => b.id === id);

  if (index === -1) return null;

  const budget = budgets[index];
  const now = getISODateString();

  const updated: FinanceBudget = {
    ...budget,
    ...input,
    updatedAt: now,
  };

  if (updated.amount <= 0) {
    throw new Error('Budget amount must be greater than 0');
  }

  budgets[index] = updated;
  await saveData(BUDGETS_KEY, budgets);

  return updated;
}

export async function deleteBudget(id: string): Promise<boolean> {
  const budgets = await getBudgets();
  const filtered = budgets.filter((b) => b.id !== id);

  if (filtered.length === budgets.length) return false;

  await saveData(BUDGETS_KEY, filtered);
  return true;
}

// ─── Budget Spending Calculation ─────────────────────────────────────────────

export interface BudgetSpending {
  budgetId: string;
  categoryId: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
}

export async function getBudgetSpending(month: string): Promise<BudgetSpending[]> {
  const budgets = await getBudgetsByMonth(month);
  const transactions = await getTransactions();
  const categories = await getCategories();

  // Build category lookup
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  // Calculate spending per category for the given month
  const spendingByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const txMonth = tx.date.slice(0, 7);
    if (txMonth !== month) continue;
    const prev = spendingByCategory.get(tx.categoryId) || 0;
    spendingByCategory.set(tx.categoryId, prev + tx.amount);
  }

  // Build spending results for each budget
  const results: BudgetSpending[] = budgets.map((budget) => {
    const spent = spendingByCategory.get(budget.categoryId) || 0;
    const remaining = Math.max(0, budget.amount - spent);
    const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
    const isOverBudget = spent > budget.amount;
    const overBudgetAmount = isOverBudget ? spent - budget.amount : 0;

    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      budgetAmount: budget.amount,
      spent,
      remaining,
      percentage,
      isOverBudget,
      overBudgetAmount,
    };
  });

  return results;
}

export async function getTotalBudgetSpending(month: string): Promise<{
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  totalPercentage: number;
}> {
  const spending = await getBudgetSpending(month);
  const totalBudget = spending.reduce((sum, s) => sum + s.budgetAmount, 0);
  const totalSpent = spending.reduce((sum, s) => sum + s.spent, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const totalPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return { totalBudget, totalSpent, totalRemaining, totalPercentage };
}

// ─── Savings Goals CRUD ───────────────────────────────────────────────────────

export async function getSavingsGoals(): Promise<FinanceSavingsGoal[]> {
  return loadData<FinanceSavingsGoal[]>(SAVINGS_GOALS_KEY, []);
}

export async function getSavingsGoalById(
  id: string,
): Promise<FinanceSavingsGoal | null> {
  const goals = await getSavingsGoals();
  return goals.find((g) => g.id === id) ?? null;
}

export async function createSavingsGoal(
  input: CreateSavingsGoalInput,
): Promise<FinanceSavingsGoal> {
  const goals = await getSavingsGoals();
  const now = getISODateString();

  const goal: FinanceSavingsGoal = {
    id: uid('goal_'),
    name: input.name.trim(),
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount ?? 0,
    deadline: input.deadline,
    createdAt: now,
    updatedAt: now,
  };

  if (!goal.name) {
    throw new Error('Savings goal name is required');
  }

  if (goal.targetAmount <= 0) {
    throw new Error('Target amount must be greater than 0');
  }

  if (goal.currentAmount < 0) {
    throw new Error('Current amount cannot be negative');
  }

  await saveData(SAVINGS_GOALS_KEY, [goal, ...goals]);
  return goal;
}

export async function updateSavingsGoal(
  id: string,
  input: UpdateSavingsGoalInput,
): Promise<FinanceSavingsGoal | null> {
  const goals = await getSavingsGoals();
  const index = goals.findIndex((g) => g.id === id);

  if (index === -1) return null;

  const goal = goals[index];
  const now = getISODateString();

  const updated: FinanceSavingsGoal = {
    ...goal,
    ...input,
    updatedAt: now,
  };

  if (!updated.name.trim()) {
    throw new Error('Savings goal name is required');
  }

  if (updated.targetAmount <= 0) {
    throw new Error('Target amount must be greater than 0');
  }

  if (updated.currentAmount < 0) {
    throw new Error('Current amount cannot be negative');
  }

  goals[index] = updated;
  await saveData(SAVINGS_GOALS_KEY, goals);

  return updated;
}

export async function deleteSavingsGoal(id: string): Promise<boolean> {
  const goals = await getSavingsGoals();
  const filtered = goals.filter((g) => g.id !== id);

  if (filtered.length === goals.length) return false;

  await saveData(SAVINGS_GOALS_KEY, filtered);
  return true;
}
