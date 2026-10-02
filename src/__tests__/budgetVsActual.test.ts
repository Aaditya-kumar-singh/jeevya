import { computeBudgetVsActual } from '@/lib/analytics';
import type { FinanceBudget, FinanceCategory, FinanceTransaction } from '@/types/finance';

const categories: FinanceCategory[] = [
  { id: 'food', name: 'Food', icon: 'utensils', type: 'expense', createdAt: '2026-09-01T00:00:00.000Z' },
  { id: 'travel', name: 'Travel', icon: 'car', type: 'expense', createdAt: '2026-09-01T00:00:00.000Z' },
];

const budgets: FinanceBudget[] = [
  { id: 'b1', categoryId: 'food', amount: 5000, month: '2026-09', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
  { id: 'b2', categoryId: 'travel', amount: 3000, month: '2026-09', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
];

const tx = (id: string, amount: number, date: string, type: FinanceTransaction['type'] = 'expense'): FinanceTransaction => ({
  id,
  accountId: 'test',
  type,
  amount,
  categoryId: 'food',
  title: id,
  note: '',
  date,
  source: 'manual',
  paymentStatus: 'success',
  createdAt: date,
  updatedAt: date,
});

test('computes budget vs actual for the selected month', () => {
  const result = computeBudgetVsActual(
    budgets,
    [
      tx('food-1', 2500, '2026-09-05'),
      tx('food-2', 3500, '2026-09-12'),
      { ...tx('travel-1', 1000, '2026-09-15'), categoryId: 'travel' },
      tx('other-month', 9999, '2026-08-20'),
      tx('income', 100000, '2026-09-10', 'income'),
    ],
    categories,
    '2026-09',
  );

  expect(result.totalBudget).toBe(8000);
  expect(result.totalSpent).toBe(7000);
  expect(result.totalRemaining).toBe(1000);
  expect(result.totalUtilization).toBe(88);
  expect(result.overBudgetCount).toBe(1);
  expect(result.items).toEqual(expect.arrayContaining([
    expect.objectContaining({
      categoryId: 'food',
      spent: 6000,
      isOverBudget: true,
      overBudgetAmount: 1000,
    }),
    expect.objectContaining({
      categoryId: 'travel',
      spent: 1000,
      remaining: 2000,
      isOverBudget: false,
    }),
  ]));
});
