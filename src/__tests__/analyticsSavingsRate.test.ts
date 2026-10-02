import { computePeriodSummary, getPeriodRange } from '@/lib/analytics';
import type { FinanceTransaction } from '@/types/finance';

const tx = (
  id: string,
  type: 'income' | 'expense',
  amount: number,
  date: string,
  paymentStatus?: FinanceTransaction['paymentStatus'],
): FinanceTransaction => ({
  id,
  accountId: 'account',
  type,
  amount,
  categoryId: 'general',
  title: type === 'income' ? 'Salary' : 'Expense',
  note: '',
  date,
  createdAt: date,
  updatedAt: date,
  ...(paymentStatus ? { paymentStatus } : {}),
});

describe('period savings rate', () => {
  test('calculates savings rate from income after expenses', () => {
    const range = getPeriodRange('month', new Date(2026, 8, 15));
    const summary = computePeriodSummary([
      tx('income', 'income', 10000, '2026-09-01'),
      tx('food', 'expense', 2500, '2026-09-02'),
      tx('travel', 'expense', 500, '2026-09-03'),
    ], range);

    expect(summary.totalIncome).toBe(10000);
    expect(summary.totalExpenses).toBe(3000);
    expect(summary.netCashFlow).toBe(7000);
    expect(summary.savingsRate).toBe(70);
  });

  test('excludes failed payments from savings rate', () => {
    const range = getPeriodRange('month', new Date(2026, 8, 15));
    const summary = computePeriodSummary([
      tx('income', 'income', 10000, '2026-09-01'),
      tx('expense', 'expense', 2000, '2026-09-02'),
      tx('failed', 'expense', 9000, '2026-09-03', 'failed'),
    ], range);

    expect(summary.totalExpenses).toBe(2000);
    expect(summary.savingsRate).toBe(80);
  });

  test('returns zero savings rate when there is no income', () => {
    const range = getPeriodRange('month', new Date(2026, 8, 15));
    expect(computePeriodSummary([
      tx('expense', 'expense', 500, '2026-09-02'),
    ], range).savingsRate).toBe(0);
  });
});
