import {
  buildMonthlyFinanceReview,
  detectExpenseAnomalies,
  findRecurringIncome,
} from '@/services/financeIntelligence';
import type { FinanceTransaction } from '@/types/finance';

const tx = (
  id: string,
  type: 'income' | 'expense',
  amount: number,
  date: string,
  merchant: string,
): FinanceTransaction => ({
  id,
  accountId: 'a',
  type,
  amount,
  categoryId: 'general',
  title: merchant,
  merchant,
  note: '',
  date,
  createdAt: date,
  updatedAt: date,
});

describe('advanced finance intelligence', () => {
  test('detects recurring income sources', () => {
    const result = findRecurringIncome([
      tx('i1', 'income', 50000, '2026-07-01', 'Salary'),
      tx('i2', 'income', 50000, '2026-08-01', 'Salary'),
      tx('i3', 'income', 51000, '2026-09-01', 'Salary'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('Salary');
    expect(result[0].likelySalary).toBe(true);
  });

  test('detects an unusually large expense without flagging failed payments', () => {
    const expenses = [
      tx('1', 'expense', 100, '2026-09-01', 'Cafe'),
      tx('2', 'expense', 120, '2026-09-02', 'Cafe'),
      tx('3', 'expense', 90, '2026-09-03', 'Cafe'),
      tx('4', 'expense', 110, '2026-09-04', 'Cafe'),
      tx('5', 'expense', 130, '2026-09-05', 'Cafe'),
      tx('6', 'expense', 1000, '2026-09-06', 'Laptop'),
      { ...tx('7', 'expense', 9000, '2026-09-07', 'Failed'), paymentStatus: 'failed' as const },
    ];
    expect(detectExpenseAnomalies(expenses).map((item) => item.id)).toEqual(['6']);
  });

  test('builds a monthly finance review with month-over-month change', () => {
    const result = buildMonthlyFinanceReview([
      tx('p1', 'income', 10000, '2026-08-01', 'Salary'),
      tx('p2', 'expense', 2000, '2026-08-02', 'Rent'),
      tx('c1', 'income', 12000, '2026-09-01', 'Salary'),
      tx('c2', 'expense', 4000, '2026-09-02', 'Rent'),
    ], '2026-09');
    expect(result.income).toBe(12000);
    expect(result.expenses).toBe(4000);
    expect(result.savingsRate).toBe(67);
    expect(result.expenseChangePercent).toBe(100);
    expect(result.topMerchants[0].merchant).toBe('Rent');
  });
});
