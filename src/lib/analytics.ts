import type {
  FinanceTransaction,
  FinanceCategory,
  FinanceBudget,
  FinanceAccount,
  FinanceSavingsGoal,
} from '@/types/finance';

// ─── Period Helpers ────────────────────────────────────────────────────────────

export type PeriodType = 'month' | 'year';

export interface PeriodRange {
  start: string; // inclusive ISO date string
  end: string; // inclusive ISO date string
  label: string; // display label
  key: string; // unique key for the period
}

/**
 * Get the display label for a period.
 */
export function getPeriodLabel(periodType: PeriodType, date: Date): string {
  if (periodType === 'month') {
    return date.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  }
  return date.getFullYear().toString();
}

/**
 * Get the unique key for a period.
 */
export function getPeriodKey(periodType: PeriodType, date: Date): string {
  if (periodType === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return date.getFullYear().toString();
}

/**
 * Get the start and end date strings for a period.
 */
export function getPeriodRange(
  periodType: PeriodType,
  date: Date,
): PeriodRange {
  if (periodType === 'month') {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // last day of month

    return {
      start: formatDateISO(start),
      end: formatDateISO(end),
      label: getPeriodLabel('month', date),
      key: getPeriodKey('month', date),
    };
  }

  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  return {
    start: formatDateISO(start),
    end: formatDateISO(end),
    label: year.toString(),
    key: year.toString(),
  };
}

/**
 * Navigate to the previous period.
 */
export function getPreviousDate(periodType: PeriodType, date: Date): Date {
  if (periodType === 'month') {
    return new Date(date.getFullYear(), date.getMonth() - 1, 1);
  }
  return new Date(date.getFullYear() - 1, 0, 1);
}

/**
 * Navigate to the next period.
 */
export function getNextDate(periodType: PeriodType, date: Date): Date {
  if (periodType === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }
  return new Date(date.getFullYear() + 1, 0, 1);
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateShort(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('en-IN', { month: 'short' });
}

// ─── Safe Math ────────────────────────────────────────────────────────────────

function safeDivide(numerator: number, denominator: number): number {
  if (!isFinite(denominator) || denominator === 0) return 0;
  const result = numerator / denominator;
  if (!isFinite(result) || isNaN(result)) return 0;
  return result;
}

function safePercentage(part: number, total: number): number {
  return Math.round(safeDivide(part, total) * 100);
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '₹0';
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

export function formatCurrencySigned(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '₹0';
  const prefix = amount >= 0 ? '+' : '-';
  return `${prefix}₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

// ─── Period Summary ───────────────────────────────────────────────────────────

export interface PeriodSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionCount: number;
  averageExpense: number;
  averageIncome: number;
}

/**
 * Compute summary for transactions within a date range.
 * Transfers are excluded from income/expense totals.
 */
export function computePeriodSummary(
  transactions: FinanceTransaction[],
  range: PeriodRange,
): PeriodSummary {
  const filtered = transactions.filter(
    (tx) => tx.date >= range.start && tx.date <= range.end,
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const tx of filtered) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeCount++;
    } else if (tx.type === 'expense') {
      totalExpenses += tx.amount;
      expenseCount++;
    }
    // transfers excluded
  }

  return {
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    transactionCount: filtered.length,
    averageExpense: safeDivide(totalExpenses, expenseCount),
    averageIncome: safeDivide(totalIncome, incomeCount),
  };
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
}

/**
 * Compute expense breakdown by category.
 */
export function computeExpenseByCategory(
  transactions: FinanceTransaction[],
  categories: FinanceCategory[],
  range: PeriodRange,
): CategoryBreakdown[] {
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.date < range.start || tx.date > range.end) continue;

    grandTotal += tx.amount;
    totals.set(tx.categoryId, (totals.get(tx.categoryId) || 0) + tx.amount);
  }

  const result: CategoryBreakdown[] = Array.from(totals.entries())
    .map(([categoryId, total]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId) || 'Uncategorized',
      total,
      percentage: safePercentage(total, grandTotal),
    }))
    .sort((a, b) => b.total - a.total);

  return result;
}

/**
 * Compute income breakdown by category.
 */
export function computeIncomeByCategory(
  transactions: FinanceTransaction[],
  categories: FinanceCategory[],
  range: PeriodRange,
): CategoryBreakdown[] {
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const tx of transactions) {
    if (tx.type !== 'income') continue;
    if (tx.date < range.start || tx.date > range.end) continue;

    grandTotal += tx.amount;
    totals.set(tx.categoryId, (totals.get(tx.categoryId) || 0) + tx.amount);
  }

  const result: CategoryBreakdown[] = Array.from(totals.entries())
    .map(([categoryId, total]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId) || 'Uncategorized',
      total,
      percentage: safePercentage(total, grandTotal),
    }))
    .sort((a, b) => b.total - a.total);

  return result;
}

// ─── Highest Transaction ──────────────────────────────────────────────────────

/**
 * Find the highest expense transaction in a period.
 */
export function getHighestExpenseTransaction(
  transactions: FinanceTransaction[],
  range: PeriodRange,
): FinanceTransaction | null {
  let highest: FinanceTransaction | null = null;

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.date < range.start || tx.date > range.end) continue;
    if (!highest || tx.amount > highest.amount) {
      highest = tx;
    }
  }

  return highest;
}

/**
 * Find the highest income transaction in a period.
 */
export function getHighestIncomeTransaction(
  transactions: FinanceTransaction[],
  range: PeriodRange,
): FinanceTransaction | null {
  let highest: FinanceTransaction | null = null;

  for (const tx of transactions) {
    if (tx.type !== 'income') continue;
    if (tx.date < range.start || tx.date > range.end) continue;
    if (!highest || tx.amount > highest.amount) {
      highest = tx;
    }
  }

  return highest;
}

// ─── Monthly Trend ────────────────────────────────────────────────────────────

export interface MonthlyTrend {
  monthKey: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

/**
 * Compute monthly income/expense/net trends from transaction history.
 * Returns the most recent 12 months with data.
 */
export function computeMonthlyTrends(
  transactions: FinanceTransaction[],
): MonthlyTrend[] {
  const monthData = new Map<
    string,
    { income: number; expenses: number; net: number }
  >();

  for (const tx of transactions) {
    const monthKey = tx.date.slice(0, 7); // "YYYY-MM"
    const existing = monthData.get(monthKey) || {
      income: 0,
      expenses: 0,
      net: 0,
    };

    if (tx.type === 'income') {
      existing.income += tx.amount;
    } else if (tx.type === 'expense') {
      existing.expenses += tx.amount;
    }
    existing.net = existing.income - existing.expenses;
    monthData.set(monthKey, existing);
  }

  // Sort by month key descending, take last 12
  const sorted = Array.from(monthData.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .reverse(); // chronological order

  return sorted.map(([monthKey, data]) => ({
    monthKey,
    label: formatMonthKey(monthKey),
    ...data,
  }));
}

// ─── Budget vs Actual ─────────────────────────────────────────────────────────

export interface BudgetActualItem {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  utilization: number; // 0-100+
  isOverBudget: boolean;
  overBudgetAmount: number;
}

export interface BudgetActualSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  totalUtilization: number;
  items: BudgetActualItem[];
  overBudgetCount: number;
}

/**
 * Compute budget vs actual for a given month key (YYYY-MM).
 */
export function computeBudgetVsActual(
  budgets: FinanceBudget[],
  transactions: FinanceTransaction[],
  categories: FinanceCategory[],
  monthKey: string,
): BudgetActualSummary {
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  // Get budgets for this month
  const monthBudgets = budgets.filter((b) => b.month === monthKey);

  // Compute spending by category for this month
  const spendingByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const txMonth = tx.date.slice(0, 7);
    if (txMonth !== monthKey) continue;
    spendingByCategory.set(
      tx.categoryId,
      (spendingByCategory.get(tx.categoryId) || 0) + tx.amount,
    );
  }

  const items: BudgetActualItem[] = monthBudgets.map((budget) => {
    const spent = spendingByCategory.get(budget.categoryId) || 0;
    const remaining = Math.max(0, budget.amount - spent);
    const utilization = safePercentage(spent, budget.amount);
    const isOverBudget = spent > budget.amount;
    const overBudgetAmount = isOverBudget ? spent - budget.amount : 0;

    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      categoryName: categoryMap.get(budget.categoryId) || 'Unknown',
      budgetAmount: budget.amount,
      spent,
      remaining,
      utilization,
      isOverBudget,
      overBudgetAmount,
    };
  });

  const totalBudget = items.reduce((sum, i) => sum + i.budgetAmount, 0);
  const totalSpent = items.reduce((sum, i) => sum + i.spent, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const totalUtilization = safePercentage(totalSpent, totalBudget);
  const overBudgetCount = items.filter((i) => i.isOverBudget).length;

  return {
    totalBudget,
    totalSpent,
    totalRemaining,
    totalUtilization,
    items,
    overBudgetCount,
  };
}

// ─── Account Analysis ─────────────────────────────────────────────────────────

export interface AccountAnalysisItem {
  account: FinanceAccount;
  balance: number;
  percentage: number;
  transactionCount: number;
}

export interface AccountAnalysisSummary {
  totalBalance: number;
  accounts: AccountAnalysisItem[];
}

/**
 * Compute account balance distribution.
 * Transfers don't artificially inflate total wealth.
 */
export function computeAccountAnalysis(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
): AccountAnalysisSummary {
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Count transactions per account (excluding transfers from wealth calculation)
  const txCountByAccount = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === 'transfer') continue;
    txCountByAccount.set(
      tx.accountId,
      (txCountByAccount.get(tx.accountId) || 0) + 1,
    );
  }

  const items: AccountAnalysisItem[] = accounts
    .map((account) => ({
      account,
      balance: account.balance,
      percentage: safePercentage(account.balance, totalBalance),
      transactionCount: txCountByAccount.get(account.id) || 0,
    }))
    .sort((a, b) => b.balance - a.balance);

  return { totalBalance, accounts: items };
}

// ─── Savings Analysis ─────────────────────────────────────────────────────────

export interface SavingsAnalysisSummary {
  totalTarget: number;
  totalSaved: number;
  overallProgress: number;
  completedCount: number;
  activeCount: number;
  goals: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
    isCompleted: boolean;
  }[];
}

/**
 * Compute savings goal progress.
 */
export function computeSavingsAnalysis(
  goals: FinanceSavingsGoal[],
): SavingsAnalysisSummary {
  let totalTarget = 0;
  let totalSaved = 0;
  let completedCount = 0;

  const goalDetails = goals.map((goal) => {
    totalTarget += goal.targetAmount;
    totalSaved += goal.currentAmount;
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    if (isCompleted) completedCount++;

    return {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      progress: safePercentage(goal.currentAmount, goal.targetAmount),
      isCompleted,
    };
  });

  return {
    totalTarget,
    totalSaved,
    overallProgress: safePercentage(totalSaved, totalTarget),
    completedCount,
    activeCount: goals.length - completedCount,
    goals: goalDetails,
  };
}

// ─── Report Insights ──────────────────────────────────────────────────────────

export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  message: string;
}

/**
 * Generate deterministic insights from actual data.
 */
export function computeInsights(
  transactions: FinanceTransaction[],
  currentRange: PeriodRange,
  previousRange: PeriodRange,
  expenseBreakdown: CategoryBreakdown[],
  budgetSummary: BudgetActualSummary | null,
  savingsAnalysis: SavingsAnalysisSummary | null,
): Insight[] {
  const insights: Insight[] = [];

  const currentSummary = computePeriodSummary(transactions, currentRange);
  const previousSummary = computePeriodSummary(transactions, previousRange);

  // Empty data insights
  if (currentSummary.transactionCount === 0) {
    insights.push({
      type: 'neutral',
      message: `No transactions found for ${currentRange.label}. Start tracking your spending to see insights.`,
    });
    return insights;
  }

  // Largest spending category
  if (expenseBreakdown.length > 0) {
    const top = expenseBreakdown[0];
    insights.push({
      type: 'neutral',
      message: `Your largest spending category is "${top.categoryName}" at ${formatCurrency(top.total)} (${top.percentage}% of expenses).`,
    });
  }

  // Income vs expenses comparison
  if (currentSummary.totalIncome > 0 && currentSummary.totalExpenses > 0) {
    const savingsRate = safePercentage(
      currentSummary.netCashFlow,
      currentSummary.totalIncome,
    );
    if (currentSummary.netCashFlow >= 0) {
      insights.push({
        type: 'positive',
        message: `You saved ${savingsRate}% of your income this period. Keep it up!`,
      });
    } else {
      insights.push({
        type: 'warning',
        message: `You spent ${Math.abs(savingsRate)}% more than you earned this period.`,
      });
    }
  }

  // Month-over-month trend
  if (previousSummary.totalExpenses > 0) {
    const change = safePercentage(
      currentSummary.totalExpenses - previousSummary.totalExpenses,
      previousSummary.totalExpenses,
    );
    if (change > 10) {
      insights.push({
        type: 'negative',
        message: `Expenses increased by ${change}% compared to ${previousRange.label}.`,
      });
    } else if (change < -10) {
      insights.push({
        type: 'positive',
        message: `Expenses decreased by ${Math.abs(change)}% compared to ${previousRange.label}.`,
      });
    } else {
      insights.push({
        type: 'neutral',
        message: `Spending is relatively stable compared to ${previousRange.label} (${change >= 0 ? '+' : ''}${change}%).`,
      });
    }
  }

  // Budget overages
  if (budgetSummary && budgetSummary.overBudgetCount > 0) {
    const overBudgetItems = budgetSummary.items.filter((i) => i.isOverBudget);
    const names = overBudgetItems.map((i) => i.categoryName).join(', ');
    insights.push({
      type: 'warning',
      message: `You're over budget in ${budgetSummary.overBudgetCount} ${budgetSummary.overBudgetCount === 1 ? 'category' : 'categories'}: ${names}.`,
    });
  }

  // Budget utilization
  if (budgetSummary && budgetSummary.totalBudget > 0) {
    if (budgetSummary.totalUtilization <= 80) {
      insights.push({
        type: 'positive',
        message: `Budget utilization is at ${budgetSummary.totalUtilization}%. You're on track.`,
      });
    } else if (budgetSummary.totalUtilization > 100) {
      insights.push({
        type: 'negative',
        message: `You've exceeded your total budget by ${formatCurrency(budgetSummary.totalSpent - budgetSummary.totalBudget)}.`,
      });
    }
  }

  // Savings progress
  if (savingsAnalysis && savingsAnalysis.goals.length > 0) {
    if (savingsAnalysis.completedCount > 0) {
      insights.push({
        type: 'positive',
        message: `${savingsAnalysis.completedCount} ${savingsAnalysis.completedCount === 1 ? 'goal has' : 'goals have'} been completed! Overall progress: ${savingsAnalysis.overallProgress}%.`,
      });
    } else if (savingsAnalysis.overallProgress > 0) {
      insights.push({
        type: 'neutral',
        message: `Savings goals are ${savingsAnalysis.overallProgress}% complete overall.`,
      });
    }
  }

  // Zero income warning
  if (currentSummary.totalIncome === 0 && currentSummary.totalExpenses > 0) {
    insights.push({
      type: 'warning',
      message: 'No income recorded this period. All spending is from existing funds.',
    });
  }

  // Average expense
  if (currentSummary.averageExpense > 0) {
    insights.push({
      type: 'neutral',
      message: `Average expense per transaction: ${formatCurrency(currentSummary.averageExpense)}.`,
    });
  }

  return insights;
}
