import { computeSpendHeatmap, getPeriodRange } from '@/lib/analytics';
import type { FinanceTransaction } from '@/types/finance';

function tx(id: string, date: string, amount: number, type: FinanceTransaction['type'] = 'expense'): FinanceTransaction {
  return {
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
    createdAt: date + 'T10:00:00.000Z',
    updatedAt: date + 'T10:00:00.000Z',
  };
}

describe('computeSpendHeatmap', () => {
  test('builds every day in the selected month and scales expense intensity', () => {
    const range = getPeriodRange('month', new Date(2026, 8, 15));
    const result = computeSpendHeatmap([
      tx('a', '2026-09-01', 100),
      tx('b', '2026-09-01', 50),
      tx('c', '2026-09-15', 300),
      tx('income', '2026-09-15', 10000, 'income'),
      tx('failed', '2026-09-20', 999),
    ].map((item) => item.id === 'failed' ? { ...item, paymentStatus: 'failed' } : item), range);

    expect(result).toHaveLength(30);
    expect(result.find((day) => day.date === '2026-09-01')).toMatchObject({ amount: 150, transactionCount: 2 });
    expect(result.find((day) => day.date === '2026-09-15')).toMatchObject({ amount: 300, intensity: 4 });
    expect(result.find((day) => day.date === '2026-09-20')).toMatchObject({ amount: 0, transactionCount: 0, intensity: 0 });
  });
});
