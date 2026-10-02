jest.mock('@/services/finance', () => ({ getTransactions: jest.fn() }));

import { getFinanceTransactionPage } from '@/services/financeAdvanced';
import { getTransactions } from '@/services/finance';

const mockedGetTransactions = getTransactions as jest.MockedFunction<typeof getTransactions>;

describe('finance advanced pagination and filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetTransactions.mockResolvedValue([
      { id: '1', accountId: 'a', type: 'expense', amount: 100, categoryId: 'food', title: 'Coffee', note: '', date: '2026-09-20T10:00:00.000Z', source: 'manual', merchant: 'Cafe', createdAt: '2026-09-20', updatedAt: '2026-09-20' },
      { id: '2', accountId: 'a', type: 'expense', amount: 500, categoryId: 'shopping', title: 'Shoes', note: '', date: '2026-09-19T10:00:00.000Z', source: 'statement_import', merchant: 'Store', createdAt: '2026-09-19', updatedAt: '2026-09-19' },
      { id: '3', accountId: 'a', type: 'income', amount: 1000, categoryId: 'salary', title: 'Salary', note: '', date: '2026-09-18T10:00:00.000Z', source: 'api', merchant: 'Employer', createdAt: '2026-09-18', updatedAt: '2026-09-18' },
    ]);
  });

  test('paginates after filtering and calculates filtered totals', async () => {
    const result = await getFinanceTransactionPage({ page: 1, pageSize: 1, type: 'expense', minAmount: 100 }, []);
    expect(result.filteredTotal).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(true);
    expect(result.totals.expenses).toBe(600);
  });

  test('combines source, category, date and search filters', async () => {
    const result = await getFinanceTransactionPage({
      source: 'statement_import',
      categoryId: 'shopping',
      startDate: '2026-09-19',
      endDate: '2026-09-19',
      search: 'store',
    }, []);
    expect(result.filteredTotal).toBe(1);
    expect(result.items[0].id).toBe('2');
  });
});
