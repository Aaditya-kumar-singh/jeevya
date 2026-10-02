import { shouldAskForPurpose,
  buildFinanceInsights,
  findRecurringPayments,
  matchRefunds,
  normalizeMerchant,
  summarizeFinance,
  summarizeWeekendWeekday,
} from '@/services/financeIntelligence';
import type { FinanceTransaction } from '@/types/finance';

const tx = (id: string, date: string, amount: number, merchant: string): FinanceTransaction => ({
  id,
  accountId: 'a',
  type: 'expense',
  amount,
  categoryId: 'food',
  title: merchant,
  merchant,
  note: '',
  date,
  createdAt: date,
  updatedAt: date,
});

describe('finance intelligence', () => {
  test('normalizes common merchant aliases', () => {
    expect(normalizeMerchant('amazon.in')).toBe('Amazon');
    expect(normalizeMerchant('  local   cafe ')).toBe('Local Cafe');
  });

  test('summarizes income, expenses and savings rate', () => {
    const income: FinanceTransaction = { ...tx('i', '2026-09-01', 10000, 'Salary'), type: 'income' };
    const expenses = [tx('e', '2026-09-02', 2000, 'Food'), tx('e2', '2026-09-03', 1000, 'Travel')];
    const result = summarizeFinance([income, ...expenses]);
    expect(result.income).toBe(10000);
    expect(result.expenses).toBe(3000);
    expect(result.savingsRate).toBe(0.7);
  });

  test('detects stable recurring payments', () => {
    const items = [
      tx('1', '2026-01-01', 499, 'Example Subscription'),
      tx('2', '2026-02-01', 499, 'Example Subscription'),
      tx('3', '2026-03-01', 499, 'Example Subscription'),
    ];
    const result = findRecurringPayments(items);
    expect(result[0].likelySubscription).toBe(true);
  });

  test('builds non-causal finance insights', () => {
    const result = buildFinanceInsights([tx('1', '2026-09-01', 100, 'Cafe'), tx('2', '2026-09-02', 100, 'Cafe'), tx('3', '2026-09-03', 100, 'Cafe'), tx('4', '2026-09-04', 100, 'Cafe'), tx('5', '2026-09-05', 100, 'Cafe')]);
    expect(result.some((item) => item.kind === 'frequent-small-payment')).toBe(true);
  });

  test('matches an exact refund by reference and merchant', () => {
    const original = tx('expense-1', '2026-09-01', 850, 'Amazon');
    original.referenceId = 'RRN-123';
    const refund: FinanceTransaction = {
      ...tx('refund-1', '2026-09-05', 850, 'Amazon'),
      type: 'income',
      paymentStatus: 'refunded',
      referenceId: 'RRN-123',
    };
    const result = matchRefunds([original, refund]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ original, refund, kind: 'refund', partial: false, amountMatched: 850 });
    expect(result[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('separates weekend and weekday expenses', () => {
    const result = summarizeWeekendWeekday([
      tx('mon', '2026-09-21', 100, 'Cafe'),
      tx('sat', '2026-09-19', 250, 'Store'),
      tx('sun', '2026-09-20', 50, 'Market'),
      { ...tx('failed', '2026-09-20', 500, 'Failed'), paymentStatus: 'failed' },
    ]);
    expect(result).toEqual({
      weekdayExpense: 100,
      weekendExpense: 300,
      weekdayCount: 1,
      weekendCount: 2,
    });
  });

  test('matches a partial refund but does not reuse an original expense', () => {
    const original = tx('expense-1', '2026-09-01', 1000, 'Store');
    const refund: FinanceTransaction = {
      ...tx('refund-1', '2026-09-03', 250, 'Store'),
      type: 'income',
      paymentStatus: 'refunded',
      title: 'Refund from Store',
    };
    const unrelatedRefund: FinanceTransaction = {
      ...tx('refund-2', '2026-09-04', 100, 'Store'),
      type: 'income',
      paymentStatus: 'refunded',
      title: 'Refund from Store',
    };
    const result = matchRefunds([original, refund, unrelatedRefund]);
    expect(result).toHaveLength(2);
    expect(result[0].partial).toBe(true);
    expect(result[0].amountMatched).toBe(250);
    expect(result[0].cumulativeAmountMatched).toBe(250);
    expect(result[0].remainingAfter).toBe(750);
    expect(result[1].amountMatched).toBe(100);
    expect(result[1].cumulativeAmountMatched).toBe(350);
    expect(result[1].remainingAfter).toBe(650);
  });

  test('matches multiple partial refunds against the same original until fully refunded', () => {
    const original = tx('expense-1', '2026-09-01', 1000, 'Store');
    const firstRefund: FinanceTransaction = {
      ...tx('refund-1', '2026-09-03', 250, 'Store'),
      type: 'income',
      paymentStatus: 'refunded',
      title: 'Refund from Store',
    };
    const secondRefund: FinanceTransaction = {
      ...tx('refund-2', '2026-09-06', 750, 'Store'),
      type: 'income',
      paymentStatus: 'refunded',
      title: 'Refund from Store',
    };
    const result = matchRefunds([original, firstRefund, secondRefund]);
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.original.id)).toEqual(['expense-1', 'expense-1']);
    expect(result[0].remainingAfter).toBe(750);
    expect(result[1].cumulativeAmountMatched).toBe(1000);
    expect(result[1].remainingAfter).toBe(0);
    expect(result[1].partial).toBe(false);
  });

  test('matches a reversed payment separately from the original expense', () => {
    const original = tx('expense-1', '2026-09-01', 500, 'Cafe');
    const reversal: FinanceTransaction = {
      ...tx('reversal-1', '2026-09-02', 500, 'Cafe'),
      paymentStatus: 'reversed',
      title: 'Payment reversed - Cafe',
    };
    const result = matchRefunds([original, reversal]);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('reversal');
    expect(result[0].original.id).toBe('expense-1');
  });
});
