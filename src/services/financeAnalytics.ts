import type { FinanceTransaction } from '@/types/finance';
import { summarizeFinance, summarizeByMerchant, buildFinanceInsights, matchRefunds, summarizeWeekendWeekday, detectExpenseAnomalies } from '@/services/financeIntelligence';

export interface FinanceBucket {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  count: number;
}

export interface FinanceAnalytics {
  summary: ReturnType<typeof summarizeFinance>;
  byMerchant: ReturnType<typeof summarizeByMerchant>;
  byPurpose: FinanceBucket[];
  byCategory: FinanceBucket[];
  byProvider: FinanceBucket[];
  weekly: FinanceBucket[];
  monthly: FinanceBucket[];
  insights: ReturnType<typeof buildFinanceInsights>;
  weekendWeekday: ReturnType<typeof summarizeWeekendWeekday>;
  refundMatches: ReturnType<typeof matchRefunds>;
  anomalies: FinanceTransaction[];
  budgetActual?: BudgetActualSummary;
}

export interface BudgetActualSummary {
  budgeted: number;
  actual: number;
  variance: number;
  utilizationRate: number;
}

function bucket(
  transactions: FinanceTransaction[],
  keyFor: (transaction: FinanceTransaction) => string,
  labelFor: (transaction: FinanceTransaction) => string,
): FinanceBucket[] {
  const map = new Map<string, FinanceBucket>();
  for (const transaction of transactions) {
    if (transaction.paymentStatus === 'failed') continue;
    const key = keyFor(transaction);
    const current = map.get(key) ?? { key, label: labelFor(transaction), income: 0, expenses: 0, net: 0, count: 0 };
    if (transaction.type === 'income') current.income += transaction.amount;
    if (transaction.type === 'expense') current.expenses += transaction.amount;
    current.net = current.income - current.expenses;
    current.count += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => (b.expenses + b.income) - (a.expenses + a.income));
}

function weekKey(date: string): string {
  const value = new Date(date);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

export function calculateFinanceAnalytics(transactions: FinanceTransaction[]): FinanceAnalytics {
  return {
    summary: summarizeFinance(transactions),
    byMerchant: summarizeByMerchant(transactions),
    byPurpose: bucket(transactions, (item) => item.purpose?.trim().toLowerCase() || 'uncategorized', (item) => item.purpose?.trim() || 'Uncategorized'),
    byCategory: bucket(transactions, (item) => item.categoryId, (item) => item.categoryId),
    byProvider: bucket(transactions, (item) => item.provider || item.source || 'unknown', (item) => item.provider || item.source || 'Unknown'),
    weekly: bucket(transactions, (item) => weekKey(item.date), (item) => weekKey(item.date)),
    monthly: bucket(transactions, (item) => item.date.slice(0, 7), (item) => item.date.slice(0, 7)),
    insights: buildFinanceInsights(transactions),
    weekendWeekday: summarizeWeekendWeekday(transactions),
    refundMatches: matchRefunds(transactions),
    anomalies: detectExpenseAnomalies(transactions),
  };
}
