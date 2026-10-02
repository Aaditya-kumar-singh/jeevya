import {
  filterFinanceTransactions,
  generateFilteredTransactionsCsv,
  generateFilteredTransactionsExcel,
} from '@/services/financeExport';
import type { FinanceTransaction } from '@/types/finance';

const tx = (id: string, type: 'income' | 'expense', amount: number, date: string, categoryId = 'food'): FinanceTransaction => ({
  id,
  accountId: 'a',
  type,
  amount,
  categoryId,
  title: id,
  note: '',
  date,
  createdAt: date,
  updatedAt: date,
});

describe('filtered finance exports', () => {
  const transactions = [
    tx('food-1', 'expense', 500, '2026-09-01'),
    tx('food-2', 'expense', 1500, '2026-09-02'),
    tx('income-1', 'income', 10000, '2026-09-03'),
  ];

  test('filters by date, type and amount', () => {
    const result = filterFinanceTransactions(transactions, {
      type: 'expense',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      minAmount: 1000,
    });
    expect(result.map((item) => item.id)).toEqual(['food-2']);
  });

  test('generates filtered CSV', () => {
    const result = generateFilteredTransactionsCsv(transactions, [], [], { type: 'expense' });
    expect(result.filename).toMatch(/filtered.*\.csv$/);
    expect(result.csv).toContain('food-1');
    expect(result.csv).toContain('food-2');
    expect(result.csv).not.toContain('income-1');
  });

  test('generates a real XLSX base64 payload', () => {
    const result = generateFilteredTransactionsExcel(transactions, [], [], { type: 'expense' });
    expect(result.filename).toMatch(/filtered.*\.xlsx$/);
    expect(result.base64.length).toBeGreaterThan(100);
    expect(result.base64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
