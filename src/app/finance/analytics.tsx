import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { FadeInView } from '@/components/motion/FadeInView';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useFinance } from '@/hooks/useFinance';
import {
  formatCurrency,
  formatCurrencySigned,
  type PeriodType,
} from '@/lib/analytics';

import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { LineChart } from '@/components/charts/LineChart';

// ─── Period Selector ──────────────────────────────────────────────────────────

function PeriodSelector({
  periodType,
  periodLabel,
  onPrevious,
  onNext,
  onSetPeriodType,
  onGoToCurrent,
}: {
  periodType: PeriodType;
  periodLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onSetPeriodType: (type: PeriodType) => void;
  onGoToCurrent: () => void;
}) {
  return (
    <Card className="w-full p-4">
      {/* Period type toggle */}
      <View className="flex-row gap-2">
        {(['month', 'year'] as PeriodType[]).map((type) => (
          <Pressable
            key={type}
            onPress={() => onSetPeriodType(type)}
            className={`flex-1 items-center rounded-xl py-2 ${
              periodType === type
                ? 'bg-primary'
                : 'bg-muted'
            }`}>
            <Text
              size="sm"
              className={`font-medium ${
                periodType === type
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground'
              }`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Period navigation */}
      <View className="mt-3 flex-row items-center justify-between">
        <Pressable onPress={onPrevious} className="p-2" hitSlop={12}>
          <ChevronLeft size={20} className="text-muted-foreground" />
        </Pressable>
        <Pressable onPress={onGoToCurrent}>
          <Text size="md" className="font-medium">
            {periodLabel}
          </Text>
        </Pressable>
        <Pressable onPress={onNext} className="p-2" hitSlop={12}>
          <ChevronRight size={20} className="text-muted-foreground" />
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  summary,
}: {
  summary: ReturnType<typeof useAnalytics>['summary'];
}) {
  return (
    <Card className="w-full p-4">
      <Heading size="md">Summary</Heading>

      <View className="mt-3 gap-3">
        {/* Main totals row */}
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-muted p-3">
            <View className="flex-row items-center gap-1">
              <ArrowDownLeft size={12} className="text-green-600 dark:text-green-400" />
              <Text size="xs" className="text-muted-foreground">
                Income
              </Text>
            </View>
            <Text size="md" className="mt-1 font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalIncome)}
            </Text>
          </View>

          <View className="flex-1 rounded-2xl bg-muted p-3">
            <View className="flex-row items-center gap-1">
              <ArrowUpRight size={12} className="text-red-600 dark:text-red-400" />
              <Text size="xs" className="text-muted-foreground">
                Expenses
              </Text>
            </View>
            <Text size="md" className="mt-1 font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(summary.totalExpenses)}
            </Text>
          </View>

          <View className="flex-1 rounded-2xl bg-muted p-3">
            <View className="flex-row items-center gap-1">
              <CircleDollarSign size={12} />
              <Text size="xs" className="text-muted-foreground">
                Net
              </Text>
            </View>
            <Text
              size="md"
              className={`mt-1 font-semibold ${
                summary.netCashFlow >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
              {formatCurrencySigned(summary.netCashFlow)}
            </Text>
          </View>
        </View>

        {/* Secondary stats */}
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-muted p-3">
            <Text size="xs" className="text-muted-foreground">
              Transactions
            </Text>
            <Text size="md" className="mt-1 font-semibold">
              {summary.transactionCount}
            </Text>
          </View>

          <View className="flex-1 rounded-2xl bg-muted p-3">
            <Text size="xs" className="text-muted-foreground">
              Avg Expense
            </Text>
            <Text size="md" className="mt-1 font-semibold">
              {summary.averageExpense > 0
                ? formatCurrency(summary.averageExpense)
                : '—'}
            </Text>
          </View>

          <View className="flex-1 rounded-2xl bg-muted p-3">
            <Text size="xs" className="text-muted-foreground">
              Avg Income
            </Text>
            <Text size="md" className="mt-1 font-semibold">
              {summary.averageIncome > 0
                ? formatCurrency(summary.averageIncome)
                : '—'}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ─── Expense Analysis ─────────────────────────────────────────────────────────

function ExpenseAnalysisCard({
  expenseByCategory,
  highestExpense,
  formatCurrencyFn,
}: {
  expenseByCategory: ReturnType<typeof useAnalytics>['expenseByCategory'];
  highestExpense: ReturnType<typeof useAnalytics>['highestExpense'];
  formatCurrencyFn: typeof formatCurrency;
}) {
  if (expenseByCategory.length === 0) {
    return (
      <Card className="w-full items-center p-6">
        <TrendingDown size={28} className="text-muted-foreground" />
        <Heading size="sm" className="mt-3">
          No Expenses
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          No expenses recorded for this period.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
        <Heading size="md">Expense Analysis</Heading>
      </View>

      {/* Category chart */}
      <View className="mt-4">
        <DonutChart
          data={expenseByCategory.map((c) => ({
            label: c.categoryName,
            value: c.total,
          }))}
          size={180}
        />
      </View>

      {/* Category breakdown list */}
      <View className="mt-4 gap-2">
        {expenseByCategory.map((item) => (
          <View key={item.categoryId} className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-2">
              <Text size="sm" className="font-medium">
                {item.categoryName}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {item.percentage}%
              </Text>
            </View>
            <Text size="sm" className="font-medium">
              {formatCurrencyFn(item.total)}
            </Text>
          </View>
        ))}
      </View>

      {/* Top categories */}
      {expenseByCategory.length > 1 && (
        <View className="mt-3 rounded-xl bg-muted p-3">
          <Text size="xs" className="font-medium text-muted-foreground">
            Top Spending
          </Text>
          <Text size="sm" className="mt-1">
            {expenseByCategory[0].categoryName} — {formatCurrencyFn(expenseByCategory[0].total)}
          </Text>
        </View>
      )}

      {/* Highest expense */}
      {highestExpense && (
        <View className="mt-3 rounded-xl bg-muted p-3">
          <Text size="xs" className="font-medium text-muted-foreground">
            Highest Expense
          </Text>
          <View className="mt-1 flex-row items-center justify-between">
            <Text size="sm">{highestExpense.title}</Text>
            <Text size="sm" className="font-semibold text-red-600 dark:text-red-400">
              {formatCurrencyFn(highestExpense.amount)}
            </Text>
          </View>
          <Text size="xs" className="text-muted-foreground">
            {new Date(highestExpense.date).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      )}
    </Card>
  );
}

// ─── Income Analysis ──────────────────────────────────────────────────────────

function IncomeAnalysisCard({
  incomeByCategory,
  highestIncome,
  formatCurrencyFn,
}: {
  incomeByCategory: ReturnType<typeof useAnalytics>['incomeByCategory'];
  highestIncome: ReturnType<typeof useAnalytics>['highestIncome'];
  formatCurrencyFn: typeof formatCurrency;
}) {
  if (incomeByCategory.length === 0) {
    return (
      <Card className="w-full items-center p-6">
        <TrendingUp size={28} className="text-muted-foreground" />
        <Heading size="sm" className="mt-3">
          No Income
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          No income recorded for this period.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
        <Heading size="md">Income Analysis</Heading>
      </View>

      {/* Category chart */}
      <View className="mt-4">
        <DonutChart
          data={incomeByCategory.map((c) => ({
            label: c.categoryName,
            value: c.total,
          }))}
          size={160}
        />
      </View>

      {/* Category breakdown */}
      <View className="mt-4 gap-2">
        {incomeByCategory.map((item) => (
          <View key={item.categoryId} className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-2">
              <Text size="sm" className="font-medium">
                {item.categoryName}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {item.percentage}%
              </Text>
            </View>
            <Text size="sm" className="font-medium">
              {formatCurrencyFn(item.total)}
            </Text>
          </View>
        ))}
      </View>

      {/* Highest income */}
      {highestIncome && (
        <View className="mt-3 rounded-xl bg-muted p-3">
          <Text size="xs" className="font-medium text-muted-foreground">
            Highest Income
          </Text>
          <View className="mt-1 flex-row items-center justify-between">
            <Text size="sm">{highestIncome.title}</Text>
            <Text size="sm" className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrencyFn(highestIncome.amount)}
            </Text>
          </View>
          <Text size="xs" className="text-muted-foreground">
            {new Date(highestIncome.date).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      )}
    </Card>
  );
}

// ─── Monthly Trend ────────────────────────────────────────────────────────────

function MonthlyTrendCard({
  monthlyTrends,
}: {
  monthlyTrends: ReturnType<typeof useAnalytics>['monthlyTrends'];
}) {
  if (monthlyTrends.length === 0) {
    return (
      <Card className="w-full items-center p-6">
        <Calendar size={28} className="text-muted-foreground" />
        <Heading size="sm" className="mt-3">
          No Trends
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          Add transactions across multiple months to see trends.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <BarChart3 size={18} />
        <Heading size="md">Monthly Trend</Heading>
      </View>

      <View className="mt-4">
        <LineChart
          labels={monthlyTrends.map((t) => t.label)}
          series={[
            {
              label: 'Income',
              color: 'rgb(34,197,94)',
              data: monthlyTrends.map((t) => t.income),
            },
            {
              label: 'Expenses',
              color: 'rgb(239,68,68)',
              data: monthlyTrends.map((t) => t.expenses),
            },
            {
              label: 'Net',
              color: 'rgb(59,130,246)',
              data: monthlyTrends.map((t) => t.net),
            },
          ]}
          height={200}
        />
      </View>

      {/* Monthly breakdown table */}
      <View className="mt-4 gap-2">
        {monthlyTrends.slice(-6).reverse().map((trend) => (
          <View key={trend.monthKey} className="flex-row items-center justify-between rounded-xl bg-muted px-3 py-2">
            <Text size="sm" className="w-12 font-medium">
              {trend.label}
            </Text>
            <View className="flex-row gap-4">
              <Text size="xs" className="text-green-600 dark:text-green-400">
                +{formatCurrency(trend.income)}
              </Text>
              <Text size="xs" className="text-red-600 dark:text-red-400">
                -{formatCurrency(trend.expenses)}
              </Text>
              <Text
                size="xs"
                className={`font-medium ${
                  trend.net >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                {formatCurrencySigned(trend.net)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ─── Budget vs Actual ─────────────────────────────────────────────────────────

function BudgetVsActualCard({
  budgetVsActual,
  formatCurrencyFn,
}: {
  budgetVsActual: ReturnType<typeof useAnalytics>['budgetVsActual'];
  formatCurrencyFn: typeof formatCurrency;
}) {
  if (!budgetVsActual || budgetVsActual.items.length === 0) {
    return (
      <Card className="w-full items-center p-6">
        <Target size={28} className="text-muted-foreground" />
        <Heading size="sm" className="mt-3">
          No Budgets
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          No budgets set for this period.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <Target size={18} className="text-primary" />
        <Heading size="md">Budget vs Actual</Heading>
      </View>

      {/* Overall */}
      <View className="mt-3">
        <View className="flex-row items-center justify-between">
          <Text size="sm" className="font-medium">Overall</Text>
          <Text size="sm" className="text-muted-foreground">
            {budgetVsActual.totalUtilization}%
          </Text>
        </View>
        <Progress value={Math.min(100, budgetVsActual.totalUtilization)} className="mt-2">
          <ProgressFilledTrack />
        </Progress>
        <View className="mt-1 flex-row justify-between">
          <Text size="xs" className="text-muted-foreground">
            Spent: {formatCurrencyFn(budgetVsActual.totalSpent)}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            Remaining: {formatCurrencyFn(budgetVsActual.totalRemaining)}
          </Text>
        </View>
        <Text size="xs" className="text-muted-foreground">
          of {formatCurrencyFn(budgetVsActual.totalBudget)} budget
        </Text>
      </View>

      {/* Per-category breakdown */}
      <View className="mt-4 gap-2">
        {budgetVsActual.items.map((item) => (
          <View key={item.budgetId} className="rounded-xl bg-muted p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text size="sm" className="font-medium">
                  {item.categoryName}
                </Text>
                {item.isOverBudget && (
                  <AlertTriangle size={12} className="text-orange-500" />
                )}
              </View>
              <Text size="sm" className="text-muted-foreground">
                {item.utilization}%
              </Text>
            </View>
            <Progress value={Math.min(100, item.utilization)} className="mt-2">
              <ProgressFilledTrack />
            </Progress>
            <View className="mt-1 flex-row justify-between">
              <Text size="xs" className="text-muted-foreground">
                {formatCurrencyFn(item.spent)} / {formatCurrencyFn(item.budgetAmount)}
              </Text>
              {item.isOverBudget ? (
                <Text size="xs" className="text-orange-500">
                  Over by {formatCurrencyFn(item.overBudgetAmount)}
                </Text>
              ) : (
                <Text size="xs" className="text-muted-foreground">
                  {formatCurrencyFn(item.remaining)} left
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ─── Account Analysis ─────────────────────────────────────────────────────────

function AccountAnalysisCard({
  accountAnalysis,
  formatCurrencyFn,
}: {
  accountAnalysis: ReturnType<typeof useAnalytics>['accountAnalysis'];
  formatCurrencyFn: typeof formatCurrency;
}) {
  if (accountAnalysis.accounts.length === 0) {
    return (
      <Card className="w-full items-center p-6">
        <Wallet size={28} className="text-muted-foreground" />
        <Heading size="sm" className="mt-3">
          No Accounts
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          Add accounts to track your balances.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <Wallet size={18} />
        <Heading size="md">Account Analysis</Heading>
      </View>

      {/* Total balance */}
      <View className="mt-3 rounded-xl bg-muted p-3">
        <Text size="xs" className="text-muted-foreground">
          Total Balance
        </Text>
        <Heading size="lg" className="mt-1">
          {formatCurrencyFn(accountAnalysis.totalBalance)}
        </Heading>
      </View>

      {/* Balance distribution chart */}
      {accountAnalysis.accounts.length > 1 && (
        <View className="mt-4">
          <HorizontalBarChart
            data={accountAnalysis.accounts
              .filter((a) => a.balance > 0)
              .map((a) => ({
                label: a.account.name,
                value: a.balance,
              }))}
          />
        </View>
      )}

      {/* Account details */}
      <View className="mt-4 gap-2">
        {accountAnalysis.accounts.map((item) => (
          <View key={item.account.id} className="flex-row items-center justify-between rounded-xl bg-muted p-3">
            <View className="flex-1">
              <Text size="sm" className="font-medium">
                {item.account.name}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {item.account.type.charAt(0).toUpperCase() + item.account.type.slice(1)} · {item.transactionCount} transactions
              </Text>
            </View>
            <Text
              size="sm"
              className={`font-semibold ${
                item.balance >= 0
                  ? 'text-foreground'
                  : 'text-red-600 dark:text-red-400'
              }`}>
              {formatCurrencyFn(item.balance)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ─── Savings Analysis ─────────────────────────────────────────────────────────

function SavingsAnalysisCard({
  savingsAnalysis,
  formatCurrencyFn,
}: {
  savingsAnalysis: ReturnType<typeof useAnalytics>['savingsAnalysis'];
  formatCurrencyFn: typeof formatCurrency;
}) {
  if (savingsAnalysis.goals.length === 0) {
    return (
      <Card className="w-full items-center p-6">
        <PiggyBank size={28} className="text-muted-foreground" />
        <Heading size="sm" className="mt-3">
          No Savings Goals
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          Create savings goals to track your progress.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <PiggyBank size={18} className="text-primary" />
        <Heading size="md">Savings Analysis</Heading>
      </View>

      {/* Overall summary */}
      <View className="mt-3 rounded-xl bg-muted p-3">
        <View className="flex-row items-center justify-between">
          <Text size="xs" className="text-muted-foreground">
            Overall Progress
          </Text>
          <Text size="xs" className="font-medium">
            {savingsAnalysis.overallProgress}%
          </Text>
        </View>
        <Progress value={Math.min(100, savingsAnalysis.overallProgress)} className="mt-2">
          <ProgressFilledTrack />
        </Progress>
        <View className="mt-1 flex-row justify-between">
          <Text size="xs" className="text-muted-foreground">
            Saved: {formatCurrencyFn(savingsAnalysis.totalSaved)}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            Target: {formatCurrencyFn(savingsAnalysis.totalTarget)}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View className="mt-3 flex-row gap-3">
        <View className="flex-1 items-center rounded-xl bg-muted p-3">
          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
          <Text size="xs" className="mt-1 font-medium">
            {savingsAnalysis.completedCount}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            Completed
          </Text>
        </View>
        <View className="flex-1 items-center rounded-xl bg-muted p-3">
          <Clock size={16} className="text-blue-600 dark:text-blue-400" />
          <Text size="xs" className="mt-1 font-medium">
            {savingsAnalysis.activeCount}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            Active
          </Text>
        </View>
      </View>

      {/* Individual goals */}
      <View className="mt-4 gap-2">
        {savingsAnalysis.goals.map((goal) => (
          <View key={goal.id} className="rounded-xl bg-muted p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                {goal.isCompleted ? (
                  <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                ) : (
                  <Target size={14} className="text-primary" />
                )}
                <Text size="sm" className="font-medium">
                  {goal.name}
                </Text>
              </View>
              <Text size="sm" className="text-muted-foreground">
                {goal.progress}%
              </Text>
            </View>
            <Progress value={Math.min(100, goal.progress)} className="mt-2">
              <ProgressFilledTrack />
            </Progress>
            <View className="mt-1 flex-row justify-between">
              <Text size="xs" className="text-muted-foreground">
                {formatCurrencyFn(goal.currentAmount)} / {formatCurrencyFn(goal.targetAmount)}
              </Text>
              {goal.isCompleted ? (
                <Text size="xs" className="font-medium text-green-600 dark:text-green-400">
                  Done!
                </Text>
              ) : (
                <Text size="xs" className="text-muted-foreground">
                  {formatCurrencyFn(goal.targetAmount - goal.currentAmount)} to go
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────

function InsightsCard({
  insights,
}: {
  insights: ReturnType<typeof useAnalytics>['insights'];
}) {
  if (insights.length === 0) {
    return (
      <Card className="w-full items-center p-6">
        <Lightbulb size={28} className="text-muted-foreground" />
        <Heading size="sm" className="mt-3">
          No Insights
        </Heading>
        <Text size="sm" className="mt-1 text-center text-muted-foreground">
          Add more data to see insights.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <Lightbulb size={18} className="text-yellow-500" />
        <Heading size="md">Insights</Heading>
      </View>

      <View className="mt-3 gap-3">
        {insights.map((insight, index) => {
          const iconColor =
            insight.type === 'positive'
              ? 'text-green-600 dark:text-green-400'
              : insight.type === 'negative'
                ? 'text-red-600 dark:text-red-400'
                : insight.type === 'warning'
                  ? 'text-orange-500'
                  : 'text-muted-foreground';

          const Icon =
            insight.type === 'positive'
              ? TrendingUp
              : insight.type === 'negative'
                ? TrendingDown
                : insight.type === 'warning'
                  ? AlertTriangle
                  : Lightbulb;

          return (
            <View key={index} className="flex-row gap-3 rounded-xl bg-muted p-3">
              <Icon size={16} className={iconColor} style={{ marginTop: 2 }} />
              <Text size="sm" className="flex-1">
                {insight.message}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="w-full items-center p-8">
      <BarChart3 size={40} className="text-muted-foreground" />
      <Heading size="md" className="mt-4">
        No Data Yet
      </Heading>
      <Text size="sm" className="mt-2 text-center text-muted-foreground">
        Start tracking your income and expenses to see detailed analytics
        and reports.
      </Text>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);
  const { loading: financeLoading, error: financeError, refresh } = useFinance();
  const analytics = useAnalytics();


  const {
    periodType,
    periodDate,
    periodRange,
    setPeriodType,
    goToPreviousPeriod,
    goToNextPeriod,
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
  } = analytics;

  // Check if we have any data at all
  const hasAnyData = useMemo(() => {
    return (
      summary.transactionCount > 0 ||
      accountAnalysis.accounts.length > 0 ||
      savingsAnalysis.goals.length > 0 ||
      monthlyTrends.length > 0
    );
  }, [
    summary.transactionCount,
    accountAnalysis.accounts.length,
    savingsAnalysis.goals.length,
    monthlyTrends.length,
  ]);

  // Loading state
  if (financeLoading) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text size="sm" className="mt-3 text-muted-foreground">
            Loading analytics...
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Error state
  if (financeError || error) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-6">
          <AlertTriangle size={32} className="text-destructive" />
          <Text size="md" className="mt-3 text-center font-medium">
            Something went wrong
          </Text>
          <Text size="sm" className="mt-2 text-center text-muted-foreground">
            {financeError || error}
          </Text>
          <Button variant="outline" className="mt-4" onPress={refresh}>
            <ButtonText>Try again</ButtonText>
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-emerald-50/40 dark:bg-slate-950 relative">
      {/* Ambient background SVG orbs */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#10B981" color2="#059669" width={450} height={350} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={financeLoading} onRefresh={refresh} tintColor="#10B981" />
        }>
        <View className="gap-4 px-5" style={{ zIndex: 1, paddingTop: topPadding }}>
          {/* Header */}
          <FadeInView delay={0}>
            <View className="flex-row items-center gap-3">
              <Button variant="ghost" size="icon" onPress={() => router.back()} className="rounded-2xl bg-emerald-500/10">
                <ArrowLeft size={20} className="text-emerald-600 dark:text-emerald-400" />
              </Button>
              <View className="flex-1">
                <Text size="xs" className="font-semibold text-emerald-500 uppercase tracking-wider">
                  Finance · Intelligence
                </Text>
                <Heading size="xl" className="mt-0.5 font-bold tracking-tight text-foreground">
                  Analytics & Reports
                </Heading>
              </View>
            </View>
          </FadeInView>


        {/* Period controls */}
        <PeriodSelector
          periodType={periodType}
          periodLabel={periodRange.label}
          onPrevious={goToPreviousPeriod}
          onNext={goToNextPeriod}
          onSetPeriodType={setPeriodType}
          onGoToCurrent={() => setPeriodType('month')}
        />

        {/* Empty state */}
        {!hasAnyData && <EmptyState />}

        {/* Summary */}
        {hasAnyData && <SummaryCard summary={summary} />}

        {/* Expense Analysis */}
        {hasAnyData && (
          <ExpenseAnalysisCard
            expenseByCategory={expenseByCategory}
            highestExpense={highestExpense}
            formatCurrencyFn={formatCurrency}
          />
        )}

        {/* Income Analysis */}
        {hasAnyData && (
          <IncomeAnalysisCard
            incomeByCategory={incomeByCategory}
            highestIncome={highestIncome}
            formatCurrencyFn={formatCurrency}
          />
        )}

        {/* Monthly Trend */}
        {hasAnyData && <MonthlyTrendCard monthlyTrends={monthlyTrends} />}

        {/* Budget vs Actual */}
        {hasAnyData && (
          <BudgetVsActualCard
            budgetVsActual={budgetVsActual}
            formatCurrencyFn={formatCurrency}
          />
        )}

        {/* Account Analysis */}
        <AccountAnalysisCard
          accountAnalysis={accountAnalysis}
          formatCurrencyFn={formatCurrency}
        />

        {/* Savings Analysis */}
        <SavingsAnalysisCard
          savingsAnalysis={savingsAnalysis}
          formatCurrencyFn={formatCurrency}
        />

        {/* Insights */}
        {hasAnyData && <InsightsCard insights={insights} />}
      </View>
    </ScrollView>
  </View>
  );
}
