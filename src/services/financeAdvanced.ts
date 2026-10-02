import type { FinanceCategory, FinanceTransaction, TransactionType } from '@/types/finance';
import { getTransactions } from '@/services/finance';

export interface FinanceTransactionQuery {
  page?: number;
  pageSize?: number;
  type?: TransactionType | 'all';
  categoryId?: string | 'all';
  source?: string | 'all';
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface FinanceTransactionPage {
  items: FinanceTransaction[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filteredTotal: number;
  totals: { income: number; expenses: number; transfers: number; net: number };
}

function matches(tx: FinanceTransaction, query: FinanceTransactionQuery, categories: FinanceCategory[]): boolean {
  if (query.type && query.type !== 'all' && tx.type !== query.type) return false;
  if (query.categoryId && query.categoryId !== 'all' && tx.categoryId !== query.categoryId) return false;
  const source = tx.provider || tx.source || 'manual';
  if (query.source && query.source !== 'all' && source !== query.source) return false;
  if (query.minAmount !== undefined && Number.isFinite(query.minAmount) && tx.amount < query.minAmount) return false;
  if (query.maxAmount !== undefined && Number.isFinite(query.maxAmount) && tx.amount > query.maxAmount) return false;
  if (query.startDate && tx.date.slice(0, 10) < query.startDate) return false;
  if (query.endDate && tx.date.slice(0, 10) > query.endDate) return false;
  if (query.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    const category = categories.find((item) => item.id === tx.categoryId)?.name ?? '';
    const haystack = [
      tx.title, tx.note, tx.merchant, tx.payee, tx.referenceId, tx.purpose, category,
      tx.provider, tx.source, ...(tx.tags ?? []),
    ].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export async function getFinanceTransactionPage(
  query: FinanceTransactionQuery = {},
  categories: FinanceCategory[] = [],
): Promise<FinanceTransactionPage> {
  const started = Date.now();
  const all = await getTransactions(categories);
  const filtered = all.filter((tx) => matches(tx, query, categories)).sort((a, b) => {
    const date = b.date.localeCompare(a.date);
    return date || b.createdAt.localeCompare(a.createdAt);
  });
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 50));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  let income = 0;
  let expenses = 0;
  let transfers = 0;
  for (const tx of filtered) {
    if (tx.type === 'income') income += tx.amount;
    else if (tx.type === 'expense') expenses += tx.amount;
    else transfers += tx.amount;
  }
  const durationMs = Date.now() - started;
  financeQueryMetrics.lastDurationMs = durationMs;
  financeQueryMetrics.lastRowsScanned = all.length;
  financeQueryMetrics.lastRowsReturned = items.length;
  financeQueryMetrics.queryCount += 1;
  return {
    items,
    total: all.length,
    filteredTotal: filtered.length,
    page,
    pageSize,
    hasMore: start + items.length < filtered.length,
    totals: { income, expenses, transfers, net: income - expenses },
  };
}

export interface FinanceQueryMetrics {
  lastDurationMs: number;
  lastRowsScanned: number;
  lastRowsReturned: number;
  queryCount: number;
}
export const financeQueryMetrics: FinanceQueryMetrics = {
  lastDurationMs: 0,
  lastRowsScanned: 0,
  lastRowsReturned: 0,
  queryCount: 0,
};
