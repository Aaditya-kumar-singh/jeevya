import { useCallback, useMemo, useState } from 'react';
import { useFinance } from './useFinance';
import {
  computePeriodSummary,
  computeExpenseByCategory,
  computeIncomeByCategory,
  computeMonthlyTrends,
  computeBudgetVsActual,
  computeAccountAnalysis,
  computeSavingsAnalysis,
  computeInsights,
  getHighestExpenseTransaction,
  getHighestIncomeTransaction,
  getPeriodRange,
  getPreviousDate,
  getNextDate,
  type PeriodType,
  type PeriodRange,
  type PeriodSummary,
  type CategoryBreakdown,
  type MonthlyTrend,
  type BudgetActualSummary,
  type AccountAnalysisSummary,
  type SavingsAnalysisSummary,
  type Insight,
} from '@/lib/analytics';

export interface UseAnalyticsResult {
  // Period controls
  periodType: PeriodType;
  periodDate: Date;
  periodRange: PeriodRange;
  previousPeriodRange: PeriodRange;
  setPeriodType: (type: PeriodType) => void;
  goToPreviousPeriod: () => void;
  goToNextPeriod: () => void;
  goToCurrentPeriod: () => void;

  // Data
  summary: PeriodSummary;
  expenseByCategory: CategoryBreakdown[];
  incomeByCategory: CategoryBreakdown[];
  monthlyTrends: MonthlyTrend[];
  budgetVsActual: BudgetActualSummary | null;
  accountAnalysis: AccountAnalysisSummary;
  savingsAnalysis: SavingsAnalysisSummary;
  insights: Insight[];
  highestExpense: ReturnType<typeof getHighestExpenseTransaction>;
  highestIncome: ReturnType<typeof getHighestIncomeTransaction>;

  // Loading state
  loading: boolean;
  error: string | null;
}

export function useAnalytics(): UseAnalyticsResult {
  const {
    accounts,
    transactions,
    categories,
    budgets,
    savingsGoals,
    loading,
    error,
  } = useFinance();

  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [periodDate, setPeriodDate] = useState<Date>(() => new Date());

  // Period range
  const periodRange = useMemo(
    () => getPeriodRange(periodType, periodDate),
    [periodType, periodDate],
  );

  // Previous period range (for comparison)
  const previousPeriodRange = useMemo(() => {
    const prevDate = getPreviousDate(periodType, periodDate);
    return getPeriodRange(periodType, prevDate);
  }, [periodType, periodDate]);

  // Period navigation
  const goToPreviousPeriod = useCallback(() => {
    setPeriodDate((prev) => getPreviousDate(periodType, prev));
  }, [periodType]);

  const goToNextPeriod = useCallback(() => {
    setPeriodDate((prev) => getNextDate(periodType, prev));
  }, [periodType]);

  const goToCurrentPeriod = useCallback(() => {
    setPeriodDate(new Date());
  }, []);

  // Summary
  const summary = useMemo(
    () => computePeriodSummary(transactions, periodRange),
    [transactions, periodRange],
  );

  // Expense by category
  const expenseByCategory = useMemo(
    () => computeExpenseByCategory(transactions, categories, periodRange),
    [transactions, categories, periodRange],
  );

  // Income by category
  const incomeByCategory = useMemo(
    () => computeIncomeByCategory(transactions, categories, periodRange),
    [transactions, categories, periodRange],
  );

  // Monthly trends
  const monthlyTrends = useMemo(
    () => computeMonthlyTrends(transactions),
    [transactions],
  );

  // Budget vs Actual (only for month periods)
  const budgetVsActual = useMemo<BudgetActualSummary | null>(() => {
    if (periodType !== 'month') return null;
    return computeBudgetVsActual(
      budgets,
      transactions,
      categories,
      periodRange.key,
    );
  }, [periodType, budgets, transactions, categories, periodRange.key]);

  // Account analysis
  const accountAnalysis = useMemo(
    () => computeAccountAnalysis(accounts, transactions),
    [accounts, transactions],
  );

  // Savings analysis
  const savingsAnalysis = useMemo(
    () => computeSavingsAnalysis(savingsGoals),
    [savingsGoals],
  );

  // Highest transactions
  const highestExpense = useMemo(
    () => getHighestExpenseTransaction(transactions, periodRange),
    [transactions, periodRange],
  );

  const highestIncome = useMemo(
    () => getHighestIncomeTransaction(transactions, periodRange),
    [transactions, periodRange],
  );

  // Insights
  const insights = useMemo(
    () =>
      computeInsights(
        transactions,
        periodRange,
        previousPeriodRange,
        expenseByCategory,
        budgetVsActual,
        savingsAnalysis,
      ),
    [
      transactions,
      periodRange,
      previousPeriodRange,
      expenseByCategory,
      budgetVsActual,
      savingsAnalysis,
    ],
  );

  return {
    periodType,
    periodDate,
    periodRange,
    previousPeriodRange,
    setPeriodType,
    goToPreviousPeriod,
    goToNextPeriod,
    goToCurrentPeriod,
    summary,
    expenseByCategory,
    incomeByCategory,
    monthlyTrends,
    budgetVsActual,
    accountAnalysis,
    savingsAnalysis,
    insights,
    highestExpense,
    highestIncome,
    loading,
    error,
  };
}
