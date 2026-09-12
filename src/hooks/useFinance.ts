import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategory,
  FinanceBudget,
  FinanceSavingsGoal,
} from '@/types/finance';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createTransfer,
  updateTransfer,
  getTransactionsByAccount,
  getCategories,
  seedDefaultCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBudgets,
  getBudgetsByMonth,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetSpending,
  getTotalBudgetSpending,
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  type CreateAccountInput,
  type UpdateAccountInput,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type CreateTransferInput,
  type UpdateTransferInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type CreateSavingsGoalInput,
  type UpdateSavingsGoalInput,
  type BudgetSpending,
} from '@/services/finance';

export function useFinance() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<FinanceSavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadFinance = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      // Seed default categories if needed
      await seedDefaultCategories();

      const [accountsData, transactionsData, categoriesData, budgetsData, goalsData] =
        await Promise.all([
          getAccounts(),
          getTransactions(),
          getCategories(),
          getBudgets(),
          getSavingsGoals(),
        ]);

      if (requestId !== requestIdRef.current) return;

      setAccounts(accountsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);
      setBudgets(budgetsData);
      setSavingsGoals(goalsData);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load finance data');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadFinance();
  }, [loadFinance]);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    await loadFinance();
    busyRef.current = false;
  }, [loadFinance]);

  // ─── Account Operations ───────────────────────────────────────────────────

  const addAccount = useCallback(async (input: CreateAccountInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const newAccount = await createAccount(input);
      if (requestId !== requestIdRef.current) return;
      setAccounts((prev) => [newAccount, ...prev]);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const editAccount = useCallback(async (id: string, input: UpdateAccountInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateAccount(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Account not found');
      setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeAccount = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteAccount(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        // Reload transactions since some may have been deleted
        const updatedTransactions = await getTransactions();
        if (requestId === requestIdRef.current) {
          setTransactions(updatedTransactions);
        }
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  // ─── Transaction Operations ───────────────────────────────────────────────

  const addTransaction = useCallback(async (input: CreateTransactionInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const newTransaction = await createTransaction(input);
      if (requestId !== requestIdRef.current) return;
      setTransactions((prev) => [newTransaction, ...prev]);
      // Reload accounts since balance changed
      const updatedAccounts = await getAccounts();
      if (requestId === requestIdRef.current) {
        setAccounts(updatedAccounts);
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const editTransaction = useCallback(async (id: string, input: UpdateTransactionInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateTransaction(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Transaction not found');
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      // Reload accounts since balance may have changed
      const updatedAccounts = await getAccounts();
      if (requestId === requestIdRef.current) {
        setAccounts(updatedAccounts);
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteTransaction(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        // Reload accounts since balance changed
        const updatedAccounts = await getAccounts();
        if (requestId === requestIdRef.current) {
          setAccounts(updatedAccounts);
        }
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  // ─── Transfer Operations ──────────────────────────────────────────────────

  const addTransfer = useCallback(async (input: CreateTransferInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const newTransfer = await createTransfer(input);
      if (requestId !== requestIdRef.current) return;
      setTransactions((prev) => [newTransfer, ...prev]);
      const updatedAccounts = await getAccounts();
      if (requestId === requestIdRef.current) {
        setAccounts(updatedAccounts);
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const editTransfer = useCallback(async (id: string, input: UpdateTransferInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateTransfer(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Transfer not found');
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      const updatedAccounts = await getAccounts();
      if (requestId === requestIdRef.current) {
        setAccounts(updatedAccounts);
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const getTransactionsForAccount = useCallback(async (accountId: string) => {
    return getTransactionsByAccount(accountId);
  }, []);

  // ─── Category Operations ──────────────────────────────────────────────────

  const addCategory = useCallback(async (input: CreateCategoryInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const newCategory = await createCategory(input);
      if (requestId !== requestIdRef.current) return;
      setCategories((prev) => [newCategory, ...prev]);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const editCategory = useCallback(async (id: string, input: UpdateCategoryInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateCategory(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Category not found');
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteCategory(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  // ─── Budget Operations ────────────────────────────────────────────────────

  const addBudget = useCallback(async (input: CreateBudgetInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const newBudget = await createBudget(input);
      if (requestId !== requestIdRef.current) return;
      setBudgets((prev) => [newBudget, ...prev]);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const editBudget = useCallback(async (id: string, input: UpdateBudgetInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateBudget(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Budget not found');
      setBudgets((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeBudget = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteBudget(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setBudgets((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const getBudgetsForMonth = useCallback(async (month: string) => {
    return getBudgetsByMonth(month);
  }, []);

  const getBudgetSpendingForMonth = useCallback(async (month: string): Promise<BudgetSpending[]> => {
    return getBudgetSpending(month);
  }, []);

  const getTotalBudgetSpendingForMonth = useCallback(async (month: string) => {
    return getTotalBudgetSpending(month);
  }, []);

  // ─── Savings Goal Operations ──────────────────────────────────────────────

  const addSavingsGoal = useCallback(async (input: CreateSavingsGoalInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const newGoal = await createSavingsGoal(input);
      if (requestId !== requestIdRef.current) return;
      setSavingsGoals((prev) => [newGoal, ...prev]);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const editSavingsGoal = useCallback(async (id: string, input: UpdateSavingsGoalInput) => {
    const requestId = ++requestIdRef.current;
    try {
      const updated = await updateSavingsGoal(id, input);
      if (requestId !== requestIdRef.current) return;
      if (!updated) throw new Error('Savings goal not found');
      setSavingsGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  const removeSavingsGoal = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const success = await deleteSavingsGoal(id);
      if (requestId !== requestIdRef.current) return;
      if (success) {
        setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      throw e;
    }
  }, []);

  return {
    // Data
    accounts,
    transactions,
    categories,
    budgets,
    savingsGoals,
    // State
    loading,
    refreshing,
    error,
    // Actions
    refresh,
    // Accounts
    addAccount,
    editAccount,
    removeAccount,
    // Transactions
    addTransaction,
    editTransaction,
    removeTransaction,
    // Transfers
    addTransfer,
    editTransfer,
    getTransactionsForAccount,
    // Categories
    addCategory,
    editCategory,
    removeCategory,
    // Budgets
    addBudget,
    editBudget,
    removeBudget,
    getBudgetsForMonth,
    getBudgetSpendingForMonth,
    getTotalBudgetSpendingForMonth,
    // Savings Goals
    addSavingsGoal,
    editSavingsGoal,
    removeSavingsGoal,
  };
}
