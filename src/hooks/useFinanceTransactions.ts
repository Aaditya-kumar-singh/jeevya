import { useCallback, useEffect, useRef, useState } from 'react';
import type { FinanceAccount, FinanceCategory, FinanceTransaction, TransactionType } from '@/types/finance';
import { getAccounts, getCategories, seedDefaultCategories } from '@/services/finance';
import { getFinanceTransactionPage } from '@/services/financeAdvanced';

export interface FinanceTransactionFilters {
  type: TransactionType | 'all';
  categoryId: string;
  source: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
  search: string;
}

const DEFAULT_FILTERS: FinanceTransactionFilters = {
  type: 'all', categoryId: 'all', source: 'all', minAmount: '', maxAmount: '', startDate: '', endDate: '', search: '',
};

export function useFinanceTransactions(pageSize = 50) {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totals, setTotals] = useState({ income: 0, expenses: 0, transfers: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (targetPage: number, replace: boolean) => {
    const requestId = ++requestRef.current;
    if (replace) setLoading(targetPage === 1);
    else setLoadingMore(true);
    try {
      await seedDefaultCategories();
      const [nextCategories, nextAccounts] = await Promise.all([getCategories(), getAccounts()]);
      const query = {
        page: targetPage,
        pageSize,
        type: filters.type,
        categoryId: filters.categoryId,
        source: filters.source,
        minAmount: filters.minAmount.trim() ? Number(filters.minAmount) : undefined,
        maxAmount: filters.maxAmount.trim() ? Number(filters.maxAmount) : undefined,
        startDate: filters.startDate.trim() || undefined,
        endDate: filters.endDate.trim() || undefined,
        search: filters.search,
      };
      const result = await getFinanceTransactionPage(query, nextCategories);
      if (requestId !== requestRef.current) return;
      setCategories(nextCategories);
      setAccounts(nextAccounts);
      setTransactions((current) => replace ? result.items : [...current, ...result.items]);
      setPage(targetPage);
      setTotal(result.total);
      setFilteredTotal(result.filteredTotal);
      setHasMore(result.hasMore);
      setTotals(result.totals);
      setError(null);
    } catch (cause) {
      if (requestId === requestRef.current) setError(cause instanceof Error ? cause.message : 'Failed to load transactions');
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [filters, pageSize]);

  useEffect(() => { void load(1, true); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(1, true);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    await load(page + 1, false);
  }, [hasMore, load, loading, loadingMore, page]);

  const updateFilters = useCallback((next: Partial<FinanceTransactionFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
  }, []);

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return {
    accounts, categories, transactions, filters, updateFilters, clearFilters,
    loading, refreshing, loadingMore, error, refresh, loadMore,
    page, total, filteredTotal, hasMore, totals,
  };
}
