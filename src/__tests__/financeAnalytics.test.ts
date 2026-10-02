import { calculateFinanceAnalytics } from '@/services/financeAnalytics';
import type { FinanceTransaction } from '@/types/finance';

const item = (id: string, type: 'income' | 'expense', amount: number, date: string): FinanceTransaction => ({
  id, accountId: 'a', type, amount, categoryId: 'food', title: 'Test', note: '', date,
  purpose: type === 'expense' ? 'Food' : undefined, provider: 'google_pay',
  createdAt: date, updatedAt: date,
});

test('builds finance buckets without duplicating transaction records', () => {
  const result = calculateFinanceAnalytics([
    item('1', 'income', 10000, '2026-09-01'),
    item('2', 'expense', 1000, '2026-09-02'),
    item('3', 'expense', 500, '2026-09-10'),
  ]);
  expect(result.summary.income).toBe(10000);
  expect(result.summary.expenses).toBe(1500);
  expect(result.byPurpose.find((bucket) => bucket.key === 'food')?.expenses).toBe(1500);
  expect(result.byProvider[0].count).toBe(3);
  expect(result.monthly).toHaveLength(1);
});
