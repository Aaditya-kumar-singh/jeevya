import { validateTransactionSplits } from '@/services/finance';

describe('finance transaction splits', () => {
  test('normalizes valid splits whose amounts equal the parent', () => {
    const result = validateTransactionSplits(1000, [
      { categoryId: 'food', amount: 650, title: 'Dinner' },
      { categoryId: 'travel', amount: 350, title: 'Cab' },
    ]);
    expect(result).toHaveLength(2);
    expect(result.reduce((sum, item) => sum + item.amount, 0)).toBe(1000);
    expect(result[0].categoryId).toBe('food');
  });

  test('rejects splits that do not add up to the parent', () => {
    expect(() => validateTransactionSplits(1000, [
      { categoryId: 'food', amount: 600 },
      { categoryId: 'travel', amount: 300 },
    ])).toThrow('Split amounts must add up exactly to the transaction amount');
  });

  test('rejects empty or invalid split amounts', () => {
    expect(() => validateTransactionSplits(1000, [])).toThrow('At least one split is required');
    expect(() => validateTransactionSplits(1000, [{ categoryId: 'food', amount: 0 }])).toThrow('Split 1 amount must be greater than 0');
  });
});
