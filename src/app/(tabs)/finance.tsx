import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, type Href } from 'expo-router';

// Extended route type for new finance routes
const ACCOUNTS_HREF = '/finance/accounts' as Href;
const TRANSFER_HREF = '/finance/transfer' as Href;
const SAVINGS_GOALS_HREF = '/finance/savings-goals' as Href;
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Download,
  Landmark,
  Plus,
  Target,
  Wallet,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';
import { FadeInView } from '@/components/motion/FadeInView';
import { ScalePressable } from '@/components/motion/ScalePressable';
import { CategoryWave } from '@/components/visuals/CategoryWave';
import { FinanceVaultGraphic } from '@/components/visuals/FinanceVaultGraphic';
import { FloatingBlobsSVG } from '@/components/visuals/FloatingBlobsSVG';
import { VirtualAccountCard } from '@/components/finance/VirtualAccountCard';
import type { FinanceTransaction } from '@/types/finance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit: 'Credit',
    cash: 'Cash',
    investment: 'Investment',
  };
  return labels[type] || type;
}

// ─── Empty State Component ────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center py-6">
      <Text size="sm" className="text-muted-foreground">
        {message}
      </Text>
    </View>
  );
}

// ─── Dashboard Sections ───────────────────────────────────────────────────────

function BalanceSummary({
  totalBalance,
  monthlyIncome,
  monthlyExpenses,
  net,
}: {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  net: number;
}) {
  return (
    <Card className="w-full p-4">
      <Heading size="md">Balance</Heading>
      <Text size="sm" className="text-muted-foreground">
        {getCurrentMonth()}
      </Text>

      <View className="mt-3">
        <Text size="sm" className="text-muted-foreground">
          Total balance
        </Text>
        <Heading size="xl" className="mt-1">
          {formatCurrency(totalBalance)}
        </Heading>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-muted/60 p-3">
          <View className="flex-row items-center gap-1">
            <ArrowDownLeft size={14} className="text-success" />
            <Text size="xs" className="text-muted-foreground font-medium">
              Income
            </Text>
          </View>
          <Text size="md" className="mt-1 font-semibold text-success">
            +{formatCurrency(monthlyIncome)}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl bg-muted/60 p-3">
          <View className="flex-row items-center gap-1">
            <ArrowUpRight size={14} className="text-destructive" />
            <Text size="xs" className="text-muted-foreground font-medium">
              Expenses
            </Text>
          </View>
          <Text size="md" className="mt-1 font-semibold text-destructive">
            -{formatCurrency(monthlyExpenses)}
          </Text>
        </View>

        <View className="flex-1 rounded-2xl bg-muted/60 p-3">
          <View className="flex-row items-center gap-1">
            <CircleDollarSign size={14} className="text-muted-foreground" />
            <Text size="xs" className="text-muted-foreground font-medium">
              Net
            </Text>
          </View>
          <Text
            size="md"
            className={`mt-1 font-semibold ${net >= 0 ? 'text-success' : 'text-destructive'}`}>
            {net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(net))}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function AccountsPreview({ accounts }: { accounts: { id: string; name: string; type: string; balance: number }[] }) {
  if (accounts.length === 0) {
    return (
      <Card className="w-full p-4">
        <Heading size="md">Accounts</Heading>
        <EmptyState message="No accounts yet. Add one to get started." />
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between">
        <Heading size="md">Accounts</Heading>
        <Link href={ACCOUNTS_HREF} asChild>
          <Pressable>
            <Text size="sm" className="text-primary">
              See all
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="mt-3 gap-2">
        {accounts.map((account) => (
          <View key={account.id} className="flex-row items-center justify-between rounded-xl bg-muted p-3">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary">
                <Landmark size={16} />
              </View>
              <View>
                <Text size="sm" className="font-medium">
                  {account.name}
                </Text>
                <Text size="xs" className="text-muted-foreground">
                  {getAccountTypeLabel(account.type)}
                </Text>
              </View>
            </View>
            <Text size="sm" className="font-semibold">
              {formatCurrency(account.balance)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function SpendingByCategory({
  spending,
}: {
  spending: { categoryId: string; categoryName: string; total: number }[];
}) {
  if (spending.length === 0) {
    return (
      <Card className="w-full p-4">
        <Heading size="md">Spending</Heading>
        <EmptyState message="No expenses this month." />
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <Heading size="md">Spending</Heading>
      <Text size="sm" className="text-muted-foreground">
        This month by category
      </Text>

      <View className="mt-3 gap-2">
        {spending.map((item) => (
          <View key={item.categoryId} className="flex-row items-center justify-between">
            <Text size="sm">{item.categoryName}</Text>
            <Text size="sm" className="font-medium">
              {formatCurrency(item.total)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function BudgetPreview({
  budgets,
  spending,
  categoryMap,
}: {
  budgets: { id: string; categoryId: string; amount: number; month: string }[];
  spending: Map<string, number>;
  categoryMap: Map<string, string>;
}) {
  if (budgets.length === 0) {
    return (
      <Card className="w-full p-4">
        <Heading size="md">Budgets</Heading>
        <EmptyState message="No budgets set for this month." />
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between">
        <Heading size="md">Budgets</Heading>
        <Link href="/finance/budget" asChild>
          <Pressable>
            <Text size="sm" className="text-primary">
              See all
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="mt-3 gap-3">
        {budgets.slice(0, 3).map((budget) => {
          const spent = spending.get(budget.categoryId) || 0;
          const pct = budget.amount > 0 ? Math.min(100, Math.round((spent / budget.amount) * 100)) : 0;
          const remaining = Math.max(0, budget.amount - spent);
          const isOverBudget = spent > budget.amount;
          const categoryName = categoryMap.get(budget.categoryId) || 'Unknown Category';

          return (
            <View key={budget.id}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-2">
                  <Text size="sm" className="font-medium">
                    {categoryName}
                  </Text>
                  {isOverBudget && (
                    <Text size="xs" className="text-orange-500">
                      Over
                    </Text>
                  )}
                </View>
                <Text size="sm" className="text-muted-foreground">
                  {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                </Text>
              </View>
              <Progress value={pct} className="mt-2">
                <ProgressFilledTrack />
              </Progress>
              <Text size="xs" className="mt-1 text-muted-foreground">
                {isOverBudget ? `Over by ${formatCurrency(spent - budget.amount)}` : `${formatCurrency(remaining)} remaining`}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function SavingsGoalsPreview({ goals }: { goals: { id: string; name: string; currentAmount: number; targetAmount: number; deadline: string }[] }) {
  if (goals.length === 0) {
    return (
      <Card className="w-full p-4">
        <Heading size="md">Savings Goals</Heading>
        <EmptyState message="No savings goals yet. Create one to start saving." />
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between">
        <Heading size="md">Savings Goals</Heading>
        <Link href={SAVINGS_GOALS_HREF} asChild>
          <Pressable>
            <Text size="sm" className="text-primary">
              See all
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="mt-3 gap-3">
        {goals.slice(0, 3).map((goal) => {
          const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
          const isCompleted = goal.currentAmount >= goal.targetAmount;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

          return (
            <Link
              key={goal.id}
              href={{ pathname: '/finance/savings-goals/[id]', params: { id: goal.id } }}
              asChild>
              <Pressable>
                <View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <Target size={14} className="text-primary" />
                      )}
                      <Text size="sm" className="font-medium">
                        {goal.name}
                      </Text>
                    </View>
                    <Text size="sm" className="text-muted-foreground">
                      {pct}%
                    </Text>
                  </View>
                  <Progress value={pct} className="mt-2">
                    <ProgressFilledTrack />
                  </Progress>
                  <View className="mt-1 flex-row items-center justify-between">
                    <Text size="xs" className="text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                    </Text>
                    {isCompleted ? (
                      <Text size="xs" className="font-medium text-green-600 dark:text-green-400">
                        Completed!
                      </Text>
                    ) : (
                      <Text size="xs" className="text-muted-foreground">
                        {formatCurrency(remaining)} remaining
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Card>
  );
}

function RecentTransactions({
  transactions,
  categories,
}: {
  transactions: FinanceTransaction[];
  categories: Map<string, string>;
}) {
  if (transactions.length === 0) {
    return (
      <Card className="w-full p-4">
        <Heading size="md">Recent Transactions</Heading>
        <EmptyState message="No transactions yet. Start tracking your spending." />
      </Card>
    );
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center justify-between">
        <Heading size="md">Recent Transactions</Heading>
        <Link href="/finance/transactions" asChild>
          <Pressable>
            <Text size="sm" className="text-primary">
              See all
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="mt-3 gap-2">
        {transactions.slice(0, 5).map((tx) => {
          const categoryName = categories.get(tx.categoryId) || 'Uncategorized';
          const isIncome = tx.type === 'income';

          return (
            <View key={tx.id} className="flex-row items-center gap-3 rounded-xl bg-muted p-3">
              <View
                className={`h-9 w-9 items-center justify-center rounded-full ${isIncome ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {isIncome ? (
                  <ArrowDownLeft size={16} className="text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowUpRight size={16} className="text-red-600 dark:text-red-400" />
                )}
              </View>
              <View className="flex-1">
                <Text size="sm" className="font-medium">
                  {tx.title}
                </Text>
                <Text size="xs" className="text-muted-foreground">
                  {categoryName} · {formatDate(tx.date)}
                </Text>
              </View>
              <Text
                size="sm"
                className={`font-semibold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function QuickActions() {
  const actions: { label: string; href: Href; icon: typeof Wallet; variant: 'default' | 'secondary' | 'outline' }[] = [
    { label: 'Add Expense', href: '/finance/add-expense', icon: ArrowUpRight, variant: 'default' },
    { label: 'Add Income', href: '/finance/add-income', icon: ArrowDownLeft, variant: 'secondary' },
    { label: 'Transfer', href: TRANSFER_HREF, icon: ArrowRightLeft, variant: 'outline' },
    { label: 'Accounts', href: ACCOUNTS_HREF, icon: Landmark, variant: 'outline' },
    { label: 'Analytics', href: '/finance/analytics', icon: BarChart3, variant: 'outline' },
    { label: 'Export', href: '/finance/export', icon: Download, variant: 'outline' },
  ];

  return (
    <Card className="w-full p-4">
      <Heading size="md">Quick Actions</Heading>
      <View className="mt-3 flex-row gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} asChild>
              <Pressable className="flex-1 items-center gap-2 rounded-2xl bg-muted py-4">
                <Icon size={20} />
                <Text size="xs" className="text-center font-medium">
                  {action.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FinanceScreen() {
  const {
    accounts,
    transactions,
    categories,
    budgets,
    savingsGoals,
    loading,
    refreshing,
    error,
    refresh,
  } = useFinance();

  const monthKey = getMonthKey();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 48);

  // Build category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Calculate monthly totals
  const { monthlyIncome, monthlyExpenses, spendingByCategory, spendingMap } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const categoryTotals = new Map<string, number>();

    for (const tx of transactions) {
      const txMonth = tx.date.slice(0, 7); // "YYYY-MM"
      if (txMonth !== monthKey) continue;

      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expenses += tx.amount;
        const prev = categoryTotals.get(tx.categoryId) || 0;
        categoryTotals.set(tx.categoryId, prev + tx.amount);
      }
    }

    // Sort spending by total descending
    const sorted = Array.from(categoryTotals.entries())
      .map(([categoryId, total]) => ({
        categoryId,
        categoryName: categoryMap.get(categoryId) || 'Uncategorized',
        total,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      monthlyIncome: income,
      monthlyExpenses: expenses,
      spendingByCategory: sorted,
      spendingMap: categoryTotals,
    };
  }, [transactions, monthKey, categoryMap]);

  // Current month budgets
  const monthBudgets = useMemo(() => {
    return budgets.filter((b) => b.month === monthKey);
  }, [budgets, monthKey]);

  // Total balance
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  // Net this month
  const net = monthlyIncome - monthlyExpenses;

  // Recent transactions (sorted by date descending)
  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [transactions]);

  // Loading state
  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text size="sm" className="mt-3 text-muted-foreground">
            Loading finance data...
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Error state
  if (error) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text size="md" className="text-center font-medium">
            Something went wrong
          </Text>
          <Text size="sm" className="mt-2 text-center text-muted-foreground">
            {error}
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
      {/* Ambient background orbs */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}>
        <FloatingBlobsSVG color1="#10B981" color2="#F59E0B" width={450} height={350} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>

        <View className="gap-4 px-5 pb-12" style={{ zIndex: 1, paddingTop: topPadding }}>
          {/* Header */}
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text size="xs" className="font-semibold text-emerald-500 uppercase tracking-wider">
                  Wealth & Budget Hub
                </Text>
                <Heading size="xl" className="mt-1 font-bold tracking-tight text-foreground">
                  Financial Control
                </Heading>
                <Text size="sm" className="mt-1 text-muted-foreground font-medium">
                  {getCurrentMonth()} Overview
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20 shadow-xs">
                <Landmark size={24} className="text-emerald-500" />
              </View>
            </View>
          </FadeInView>

          {/* Intricate Vault Shield SVG Graphic */}
          <FadeInView delay={40}>
            <View className="items-center my-1">
              <FinanceVaultGraphic width={350} height={130} />
            </View>
          </FadeInView>

          {/* Platinum Virtual Account Card */}
          <FadeInView delay={80}>
            <VirtualAccountCard
              totalBalance={totalBalance}
              monthlyIncome={monthlyIncome}
              monthlyExpenses={monthlyExpenses}
            />
          </FadeInView>

          {/* Balance Summary */}
          <FadeInView delay={120}>
            <BalanceSummary
              totalBalance={totalBalance}
              monthlyIncome={monthlyIncome}
              monthlyExpenses={monthlyExpenses}
              net={net}
            />
          </FadeInView>

          {/* Accounts Preview */}
          <FadeInView delay={180}>
            <AccountsPreview accounts={accounts} />
          </FadeInView>

          {/* Spending by Category */}
          <FadeInView delay={240}>
            <SpendingByCategory spending={spendingByCategory} />
          </FadeInView>

          {/* Budget Preview */}
          <FadeInView delay={300}>
            <BudgetPreview budgets={monthBudgets} spending={spendingMap} categoryMap={categoryMap} />
          </FadeInView>

          {/* Savings Goals Preview */}
          <FadeInView delay={360}>
            <SavingsGoalsPreview goals={savingsGoals} />
          </FadeInView>

          {/* Recent Transactions */}
          <FadeInView delay={420}>
            <RecentTransactions transactions={recentTransactions} categories={categoryMap} />
          </FadeInView>

          {/* Quick Actions */}
          <FadeInView delay={480}>
            <QuickActions />
          </FadeInView>
        </View>
      </ScrollView>
    </View>
  );
}
