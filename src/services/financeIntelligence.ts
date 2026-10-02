import type { FinanceCategory, FinanceTransaction } from '@/types/finance';

export interface FinanceDateRange {
  start: string;
  end: string;
}

export interface FinanceSummary {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
  incomeExpenseRatio: number;
  transactionCount: number;
  largestPayment: FinanceTransaction | null;
  averageExpense: number;
}

export interface MerchantSummary {
  merchant: string;
  amount: number;
  count: number;
}

export interface RecurringPayment {
  merchant: string;
  averageAmount: number;
  occurrences: number;
  intervalDays: number;
  confidence: number;
  likelySubscription: boolean;
}

export interface RecurringIncome {
  source: string;
  averageAmount: number;
  occurrences: number;
  intervalDays: number;
  confidence: number;
  likelySalary: boolean;
}

export interface MonthlyFinanceReview {
  month: string;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
  previousMonthExpenses: number;
  expenseChangePercent: number;
  topMerchants: MerchantSummary[];
  recurringIncome: RecurringIncome[];
  anomalies: FinanceTransaction[];
  highlights: string[];
}

export interface FinanceInsight {
  id: string;
  kind: 'overspend' | 'frequent-small-payment' | 'largest-payment' | 'recurring' | 'refund' | 'anomaly' | 'weekday-weekend';
  title: string;
  detail: string;
  amount?: number;
  transactionIds: string[];
  sourceRefs?: { domain: 'finance'; recordIds: string[] }[];
}

const ALIASES: Record<string, string> = {
  'amazon pay': 'Amazon',
  'amazon in': 'Amazon',
  'flipkart internet': 'Flipkart',
  'uber india': 'Uber',
  'ola cabs': 'Ola',
  'zomato': 'Zomato',
  'swiggy': 'Swiggy',
  'blinkit': 'Blinkit',
  'zepto': 'Zepto',
};

export function normalizeMerchant(value?: string): string {
  const raw = (value ?? '').trim().replace(/\s+/g, ' ');
  if (!raw) return 'Unknown merchant';
  const key = raw.toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  return ALIASES[key] ?? raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function suggestCategory(
  transaction: Pick<FinanceTransaction, 'title' | 'merchant' | 'note' | 'purpose'>,
  categories: FinanceCategory[],
): string | null {
  const haystack = [transaction.title, transaction.merchant, transaction.note, transaction.purpose]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const rules: Array<[string[], string[]]> = [
    [['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'pizza', 'burger'], ['food']],
    [['uber', 'ola', 'metro', 'bus', 'transport', 'fuel', 'petrol'], ['transport', 'travel']],
    [['amazon', 'flipkart', 'shopping', 'myntra', 'mall'], ['shopping']],
    [['electricity', 'recharge', 'bill', 'internet', 'airtel', 'jio'], ['bills']],
    [['pharmacy', 'hospital', 'doctor', 'health'], ['health']],
    [['college', 'course', 'book', 'education'], ['education']],
    [['flight', 'hotel', 'travel'], ['travel']],
  ];

  for (const [keywords, names] of rules) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      const category = categories.find((candidate) =>
        candidate.type === 'expense' && names.includes(candidate.name.toLowerCase()),
      );
      if (category) return category.id;
    }
  }
  return null;
}

export function suggestPurpose(transaction: Pick<FinanceTransaction, 'title' | 'merchant' | 'note' | 'categoryId'>): string | null {
  const haystack = [transaction.title, transaction.merchant, transaction.note].filter(Boolean).join(' ').toLowerCase();
  if (/college|tuition|course|exam|education/.test(haystack)) return 'College';
  if (/food|swiggy|zomato|restaurant|cafe|lunch|dinner|breakfast/.test(haystack)) return 'Food';
  if (/uber|ola|metro|bus|travel|flight|hotel/.test(haystack)) return 'Travel';
  if (/amazon|flipkart|myntra|shopping/.test(haystack)) return 'Shopping';
  if (/bill|recharge|electricity|internet/.test(haystack)) return 'Bills';
  if (/friend/.test(haystack)) return 'Friend';
  if (/family/.test(haystack)) return 'Family';
  return null;
}

export function shouldAskForPurpose(
  transaction: Pick<FinanceTransaction, 'amount' | 'merchant' | 'title' | 'note' | 'purpose' | 'categoryId'>,
  merchantMemoryPurpose?: string | null,
): boolean {
  if (transaction.purpose?.trim() || merchantMemoryPurpose?.trim()) return false;
  if (suggestPurpose(transaction)) return false;
  const text = [transaction.merchant, transaction.title, transaction.note].filter(Boolean).join(' ').trim();
  if (!text) return true;
  if (transaction.amount <= 100) return false;
  if (transaction.categoryId) return false;
  return true;
}

export function summarizeFinance(
  transactions: FinanceTransaction[],
  range?: FinanceDateRange,
): FinanceSummary {
  const filtered = range
    ? transactions.filter((transaction) => transaction.date >= range.start && transaction.date <= range.end)
    : transactions;

  const income = filtered.filter((item) => item.type === 'income' && item.paymentStatus !== 'failed').reduce((sum, item) => sum + item.amount, 0);
  const expenses = filtered.filter((item) => item.type === 'expense' && item.paymentStatus !== 'failed').reduce((sum, item) => sum + item.amount, 0);
  const expenseItems = filtered.filter((item) => item.type === 'expense' && item.paymentStatus !== 'failed');
  const largestPayment = expenseItems.reduce<FinanceTransaction | null>((largest, item) => !largest || item.amount > largest.amount ? item : largest, null);

  return {
    income,
    expenses,
    net: income - expenses,
    savingsRate: income > 0 ? (income - expenses) / income : 0,
    incomeExpenseRatio: expenses > 0 ? income / expenses : income > 0 ? Infinity : 0,
    transactionCount: filtered.length,
    largestPayment,
    averageExpense: expenseItems.length ? expenses / expenseItems.length : 0,
  };
}

export function summarizeByMerchant(transactions: FinanceTransaction[]): MerchantSummary[] {
  const map = new Map<string, MerchantSummary>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || transaction.paymentStatus === 'failed') continue;
    const merchant = normalizeMerchant(transaction.merchant || transaction.title);
    const current = map.get(merchant) ?? { merchant, amount: 0, count: 0 };
    current.amount += transaction.amount;
    current.count += 1;
    map.set(merchant, current);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function findRecurringIncome(transactions: FinanceTransaction[]): RecurringIncome[] {
  const groups = new Map<string, FinanceTransaction[]>();
  for (const transaction of transactions) {
    if (transaction.type !== 'income' || transaction.paymentStatus === 'failed') continue;
    const source = normalizeMerchant(transaction.merchant || transaction.payee || transaction.title);
    groups.set(source, [...(groups.get(source) ?? []), transaction]);
  }
  const result: RecurringIncome[] = [];
  for (const [source, items] of groups) {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 3) continue;
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const days = (Date.parse(sorted[i].date) - Date.parse(sorted[i - 1].date)) / 86400000;
      if (days > 0) gaps.push(days);
    }
    if (gaps.length < 2) continue;
    const intervalDays = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const stableGaps = gaps.filter((gap) => Math.abs(gap - intervalDays) <= Math.max(4, intervalDays * 0.2)).length / gaps.length;
    const averageAmount = sorted.reduce((sum, item) => sum + item.amount, 0) / sorted.length;
    const amountSpread = Math.max(...sorted.map((item) => item.amount)) - Math.min(...sorted.map((item) => item.amount));
    const amountStability = averageAmount > 0 ? Math.max(0, 1 - amountSpread / averageAmount) : 0;
    const confidence = Math.min(1, 0.45 + stableGaps * 0.3 + amountStability * 0.25);
    result.push({
      source,
      averageAmount,
      occurrences: sorted.length,
      intervalDays: Math.round(intervalDays),
      confidence,
      likelySalary: confidence >= 0.78 && intervalDays >= 25 && intervalDays <= 35,
    });
  }
  return result.sort((a, b) => b.confidence - a.confidence);
}

export function findRecurringPayments(transactions: FinanceTransaction[]): RecurringPayment[] {
  const groups = new Map<string, FinanceTransaction[]>();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || transaction.paymentStatus === 'failed') continue;
    const merchant = normalizeMerchant(transaction.merchant || transaction.title);
    groups.set(merchant, [...(groups.get(merchant) ?? []), transaction]);
  }

  const result: RecurringPayment[] = [];
  for (const [merchant, items] of groups) {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 3) continue;
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const days = (Date.parse(sorted[i].date) - Date.parse(sorted[i - 1].date)) / 86400000;
      if (days > 0) gaps.push(days);
    }
    if (gaps.length < 2) continue;
    const intervalDays = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const stableGaps = gaps.filter((gap) => Math.abs(gap - intervalDays) <= Math.max(4, intervalDays * 0.25)).length / gaps.length;
    const averageAmount = sorted.reduce((sum, item) => sum + item.amount, 0) / sorted.length;
    const amountSpread = Math.max(...sorted.map((item) => item.amount)) - Math.min(...sorted.map((item) => item.amount));
    const amountStability = averageAmount > 0 ? Math.max(0, 1 - amountSpread / averageAmount) : 0;
    const confidence = Math.min(1, 0.45 + stableGaps * 0.3 + amountStability * 0.25);
    result.push({
      merchant,
      averageAmount,
      occurrences: sorted.length,
      intervalDays: Math.round(intervalDays),
      confidence,
      likelySubscription: confidence >= 0.78 && intervalDays >= 25 && intervalDays <= 35,
    });
  }
  return result.sort((a, b) => b.confidence - a.confidence);
}

export type RefundMatchKind = 'refund' | 'reversal';

export interface RefundMatch {
  refund: FinanceTransaction;
  original: FinanceTransaction;
  confidence: number;
  kind: RefundMatchKind;
  amountMatched: number;
  /** Total refund/reversal amount linked to the original after this match. */
  cumulativeAmountMatched: number;
  /** Remaining original amount after applying this refund/reversal. */
  remainingAfter: number;
  partial: boolean;
}

function isRefundLike(transaction: FinanceTransaction): boolean {
  const text = [transaction.title, transaction.note, transaction.merchant, transaction.purpose].filter(Boolean).join(' ');
  return /refund|refunded|reversal|reversed|reverted|chargeback/i.test(text)
    || transaction.paymentStatus === 'refunded'
    || transaction.paymentStatus === 'reversed';
}

function transactionDateDistanceDays(a: FinanceTransaction, b: FinanceTransaction): number {
  const left = Date.parse(a.date);
  const right = Date.parse(b.date);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.POSITIVE_INFINITY;
  return Math.abs(left - right) / 86400000;
}

export function matchRefunds(transactions: FinanceTransaction[]): RefundMatch[] {
  const originals = transactions.filter((item) =>
    item.type === 'expense'
    && item.paymentStatus !== 'failed'
    && item.paymentStatus !== 'reversed'
    && !isRefundLike(item),
  );
  const refundCandidates = transactions.filter(isRefundLike);
  const matchedByOriginal = new Map<string, number>();

  return refundCandidates.flatMap((refund) => {
    const refundMerchant = normalizeMerchant(refund.merchant || refund.payee || refund.title);
    const candidates = originals
      .filter((original) => {
        if (original.id === refund.id) return false;
        const days = transactionDateDistanceDays(refund, original);
        if (days > 45) return false;

        const alreadyMatched = matchedByOriginal.get(original.id) ?? 0;
        const remaining = Math.round((original.amount - alreadyMatched) * 100) / 100;
        if (remaining <= 0 || refund.amount <= 0 || refund.amount > remaining) return false;

        const sameReference = !!refund.referenceId && !!original.referenceId && refund.referenceId === original.referenceId;
        const sameExternalId = !!refund.externalTransactionId
          && !!original.externalTransactionId
          && refund.externalTransactionId === original.externalTransactionId;
        const originalMerchant = normalizeMerchant(original.merchant || original.payee || original.title);
        const sameMerchant = !!refundMerchant && !!originalMerchant && refundMerchant === originalMerchant;
        return (sameReference || sameExternalId || (sameMerchant && refund.amount <= remaining));
      })
      .sort((a, b) => {
        const score = (item: FinanceTransaction) => {
          const sameReference = !!refund.referenceId && !!item.referenceId && refund.referenceId === item.referenceId;
          const sameExternalId = !!refund.externalTransactionId && !!item.externalTransactionId && refund.externalTransactionId === item.externalTransactionId;
          const sameMerchant = refundMerchant === normalizeMerchant(item.merchant || item.payee || item.title);
          const amountExact = refund.amount === item.amount;
          return (sameReference ? 100 : 0)
            + (sameExternalId ? 90 : 0)
            + (amountExact ? 30 : 0)
            + (sameMerchant ? 20 : 0)
            - transactionDateDistanceDays(refund, item);
        };
        return score(b) - score(a);
      });

    const original = candidates[0];
    if (!original) return [];

    const previouslyMatched = matchedByOriginal.get(original.id) ?? 0;
    const cumulativeAmountMatched = Math.round((previouslyMatched + refund.amount) * 100) / 100;
    matchedByOriginal.set(original.id, cumulativeAmountMatched);
    const remainingAfter = Math.max(0, Math.round((original.amount - cumulativeAmountMatched) * 100) / 100);
    const sameReference = !!refund.referenceId && refund.referenceId === original.referenceId;
    const sameExternalId = !!refund.externalTransactionId && refund.externalTransactionId === original.externalTransactionId;
    const sameMerchant = refundMerchant === normalizeMerchant(original.merchant || original.payee || original.title);
    const exactAmount = refund.amount === original.amount;
    const confidence = Math.min(0.99,
      (sameReference ? 0.65 : 0)
      + (sameExternalId ? 0.2 : 0)
      + (sameMerchant ? 0.12 : 0)
      + (exactAmount ? 0.08 : 0)
      + (transactionDateDistanceDays(refund, original) <= 7 ? 0.05 : 0),
    );

    return [{
      refund,
      original,
      confidence,
      kind: refund.paymentStatus === 'reversed' || /reversal|reversed|reverted/i.test([refund.title, refund.note].join(' ')) ? 'reversal' : 'refund',
      amountMatched: refund.amount,
      cumulativeAmountMatched,
      remainingAfter,
      partial: cumulativeAmountMatched < original.amount,
    }];
  });
}

export interface WeekendWeekdaySummary {
  weekdayExpense: number;
  weekendExpense: number;
  weekdayCount: number;
  weekendCount: number;
}

export function summarizeWeekendWeekday(transactions: FinanceTransaction[]): WeekendWeekdaySummary {
  return transactions.reduce((summary, item) => {
    if (item.type !== 'expense' || item.paymentStatus === 'failed') return summary;
    const day = new Date(item.date + 'T12:00:00Z').getUTCDay();
    if (day === 0 || day === 6) { summary.weekendExpense += item.amount; summary.weekendCount += 1; }
    else { summary.weekdayExpense += item.amount; summary.weekdayCount += 1; }
    return summary;
  }, { weekdayExpense: 0, weekendExpense: 0, weekdayCount: 0, weekendCount: 0 });
}

export function detectExpenseAnomalies(transactions: FinanceTransaction[]): FinanceTransaction[] {
  const expenses = transactions.filter((item) => item.type === 'expense' && item.paymentStatus !== 'failed');
  if (expenses.length < 5) return [];
  const sorted = [...expenses].sort((a, b) => a.amount - b.amount);
  const median = sorted[Math.floor(sorted.length / 2)].amount;
  const deviations = sorted.map((item) => Math.abs(item.amount - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)];
  if (mad === 0) {
    const mean = expenses.reduce((sum, item) => sum + item.amount, 0) / expenses.length;
    const variance = expenses.reduce((sum, item) => sum + (item.amount - mean) ** 2, 0) / expenses.length;
    const deviation = Math.sqrt(variance);
    return expenses.filter((item) => deviation > 0 && item.amount > mean + 2 * deviation);
  }
  const threshold = median + 3 * 1.4826 * mad;
  return expenses.filter((item) => item.amount > threshold);
}

export function buildMonthlyFinanceReview(transactions: FinanceTransaction[], month: string): MonthlyFinanceReview {
  const [year, monthNumber] = month.split('-').map(Number);
  const currentStart = month + '-01';
  const currentEndDate = new Date(year, monthNumber, 0);
  const currentEnd = month + '-' + String(currentEndDate.getDate()).padStart(2, '0');
  const previousDate = new Date(year, monthNumber - 2, 1);
  const previousMonth = previousDate.getFullYear() + '-' + String(previousDate.getMonth() + 1).padStart(2, '0');
  const previousStart = previousMonth + '-01';
  const previousEndDate = new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, 0);
  const previousEnd = previousMonth + '-' + String(previousEndDate.getDate()).padStart(2, '0');
  const current = transactions.filter((tx) => tx.date >= currentStart && tx.date <= currentEnd && tx.paymentStatus !== 'failed');
  const previous = transactions.filter((tx) => tx.date >= previousStart && tx.date <= previousEnd && tx.paymentStatus !== 'failed');
  const income = current.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
  const expenses = current.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  const previousMonthExpenses = previous.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  const expenseChangePercent = previousMonthExpenses > 0 ? Math.round(((expenses - previousMonthExpenses) / previousMonthExpenses) * 100) : 0;
  const anomalies = detectExpenseAnomalies(current);
  const topMerchants = summarizeByMerchant(current).slice(0, 5);
  const recurringIncome = findRecurringIncome(transactions);
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const highlights: string[] = [];
  if (income > 0) highlights.push('Income: ' + income.toFixed(2) + ', expenses: ' + expenses.toFixed(2) + ', savings rate: ' + savingsRate + '%.');
  if (previousMonthExpenses > 0 && expenseChangePercent > 10) highlights.push('Expenses were ' + expenseChangePercent + '% higher than the previous month.');
  if (previousMonthExpenses > 0 && expenseChangePercent < -10) highlights.push('Expenses were ' + Math.abs(expenseChangePercent) + '% lower than the previous month.');
  if (anomalies.length) highlights.push(anomalies.length + ' unusual expense' + (anomalies.length === 1 ? '' : 's') + ' detected.');
  if (recurringIncome.length) highlights.push(recurringIncome.length + ' recurring income source' + (recurringIncome.length === 1 ? '' : 's') + ' detected.');
  return { month, income, expenses, net: income - expenses, savingsRate, previousMonthExpenses, expenseChangePercent, topMerchants, recurringIncome, anomalies, highlights };
}

export function buildFinanceInsights(transactions: FinanceTransaction[]): FinanceInsight[] {
  const expenses = transactions.filter((item) => item.type === 'expense' && item.paymentStatus !== 'failed');
  const insights: FinanceInsight[] = [];
  const largest = expenses.reduce<FinanceTransaction | null>((current, item) => !current || item.amount > current.amount ? item : current, null);
  if (largest) {
    insights.push({
      id: 'largest-payment',
      kind: 'largest-payment',
      title: 'Largest payment in this dataset',
      detail: (largest.merchant || largest.title) + ' was ' + largest.amount.toFixed(2),
      amount: largest.amount,
      transactionIds: [largest.id],
    });
  }

  const small = expenses.filter((item) => item.amount <= 200);
  if (small.length >= 5) {
    insights.push({
      id: 'frequent-small-payments',
      kind: 'frequent-small-payment',
      title: 'Frequent small payments',
      detail: small.length + ' payments were INR 200 or less.',
      amount: small.reduce((sum, item) => sum + item.amount, 0),
      transactionIds: small.map((item) => item.id),
    });
  }

  for (const recurring of findRecurringPayments(expenses).slice(0, 3)) {
    insights.push({
      id: 'recurring-' + recurring.merchant.toLowerCase().replace(/\W+/g, '-'),
      kind: 'recurring',
      title: recurring.likelySubscription ? 'Possible subscription' : 'Recurring payment',
      detail: recurring.merchant + ' appears about every ' + recurring.intervalDays + ' days.',
      amount: recurring.averageAmount,
      transactionIds: [],
    });
  }

  for (const income of findRecurringIncome(transactions).slice(0, 3)) {
    insights.push({
      id: 'recurring-income-' + income.source.toLowerCase().replace(/\W+/g, '-'),
      kind: 'recurring',
      title: income.likelySalary ? 'Recurring income' : 'Regular income',
      detail: income.source + ' averages ' + income.averageAmount.toFixed(2) + ' about every ' + income.intervalDays + ' days.',
      amount: income.averageAmount,
      transactionIds: [],
    });
  }

  for (const anomaly of detectExpenseAnomalies(expenses).slice(0, 3)) {
    insights.push({
      id: 'anomaly-' + anomaly.id,
      kind: 'anomaly',
      title: 'Unusual expense',
      detail: (anomaly.merchant || anomaly.title) + ' was ' + anomaly.amount.toFixed(2) + ', unusually high compared with other expenses.',
      amount: anomaly.amount,
      transactionIds: [anomaly.id],
    });
  }

  return insights.map((item) => item.transactionIds.length
    ? { ...item, sourceRefs: [{ domain: 'finance' as const, recordIds: [...new Set(item.transactionIds)] }] }
    : item);
}
