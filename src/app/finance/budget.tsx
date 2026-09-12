import { useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';
import type { BudgetSpending } from '@/services/finance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function getPreviousMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 2);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BudgetScreen() {
  const router = useRouter();
  const {
    categories,
    loading,
    refreshing,
    refresh,
    removeBudget,
    getBudgetSpendingForMonth,
    getTotalBudgetSpendingForMonth,
  } = useFinance();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [budgetSpending, setBudgetSpending] = useState<BudgetSpending[]>([]);
  const [totals, setTotals] = useState<{
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    totalPercentage: number;
  } | null>(null);
  const [loadingBudgets, setLoadingBudgets] = useState(true);

  // Build category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Load budget spending for selected month
  const loadBudgetData = useCallback(async () => {
    setLoadingBudgets(true);
    try {
      const [spending, totalSpending] = await Promise.all([
        getBudgetSpendingForMonth(selectedMonth),
        getTotalBudgetSpendingForMonth(selectedMonth),
      ]);
      setBudgetSpending(spending);
      setTotals(totalSpending);
    } catch (e) {
      console.error('Failed to load budget data:', e);
    } finally {
      setLoadingBudgets(false);
    }
  }, [selectedMonth, getBudgetSpendingForMonth, getTotalBudgetSpendingForMonth]);

  // Load on mount and when month changes
  useState(() => {
    loadBudgetData();
  });

  // Reload when refreshing
  const handleRefresh = useCallback(async () => {
    await refresh();
    await loadBudgetData();
  }, [refresh, loadBudgetData]);

  // Month navigation
  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth((prev) => getPreviousMonth(prev));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth((prev) => getNextMonth(prev));
  }, []);

  // Delete budget
  const handleDeleteBudget = useCallback(
    (budgetId: string, categoryName: string) => {
      Alert.alert(
        'Delete Budget',
        `Are you sure you want to delete the budget for "${categoryName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeBudget(budgetId);
                await loadBudgetData();
                Alert.alert('Success', 'Budget deleted successfully');
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete budget');
              }
            },
          },
        ],
      );
    },
    [removeBudget, loadBudgetData],
  );

  // Loading state
  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text size="sm" className="mt-3 text-muted-foreground">
            Loading budgets...
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Finance · Budgets
            </Text>
            <Heading size="xl" className="mt-1">
              Monthly Budgets
            </Heading>
          </View>
          <Link href="/finance/add-budget" asChild>
            <Pressable>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Plus size={20} className="text-primary-foreground" />
              </View>
            </Pressable>
          </Link>
        </View>

        {/* Month Navigation */}
        <Card className="w-full p-4">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={goToPreviousMonth} className="p-2">
              <ChevronLeft size={20} className="text-muted-foreground" />
            </Pressable>
            <View className="flex-1 items-center">
              <Text size="md" className="font-medium">
                {formatMonthLabel(selectedMonth)}
              </Text>
            </View>
            <Pressable onPress={goToNextMonth} className="p-2">
              <ChevronRight size={20} className="text-muted-foreground" />
            </Pressable>
          </View>
        </Card>

        {/* Overall Summary */}
        {totals && totals.totalBudget > 0 && (
          <Card className="w-full p-4">
            <View className="flex-row items-center justify-between">
              <Heading size="md">Overall</Heading>
              <Text size="sm" className="text-muted-foreground">
                {totals.totalPercentage}% used
              </Text>
            </View>
            <Progress value={Math.min(100, totals.totalPercentage)} className="mt-3">
              <ProgressFilledTrack />
            </Progress>
            <View className="mt-3 flex-row justify-between">
              <Text size="sm" className="text-muted-foreground">
                {formatCurrency(totals.totalSpent)} spent
              </Text>
              <Text size="sm" className="text-muted-foreground">
                {formatCurrency(totals.totalRemaining)} remaining
              </Text>
            </View>
            <Text size="xs" className="mt-1 text-muted-foreground">
              of {formatCurrency(totals.totalBudget)} budget
            </Text>
          </Card>
        )}

        {/* Budget List */}
        {loadingBudgets ? (
          <Card className="w-full p-4">
            <View className="items-center py-6">
              <ActivityIndicator size="small" />
              <Text size="sm" className="mt-2 text-muted-foreground">
                Loading budget data...
              </Text>
            </View>
          </Card>
        ) : budgetSpending.length === 0 ? (
          <Card className="w-full items-center p-6">
            <TrendingUp size={32} className="text-muted-foreground" />
            <Heading size="md" className="mt-4">
              No budgets for this month
            </Heading>
            <Text size="sm" className="mt-2 text-center text-muted-foreground">
              Create a budget to track your spending by category.
            </Text>
            <Link href="/finance/add-budget" asChild>
              <Pressable>
                <Button variant="default" className="mt-4">
                  <ButtonText>Add Budget</ButtonText>
                </Button>
              </Pressable>
            </Link>
          </Card>
        ) : (
          <View className="gap-3">
            {budgetSpending.map((item) => {
              const categoryName = categoryMap.get(item.categoryId) || 'Unknown Category';
              const displayPercentage = Math.min(100, item.percentage);

              return (
                <Pressable
                  key={item.budgetId}
                  onLongPress={() => handleDeleteBudget(item.budgetId, categoryName)}>
                  <Card className="w-full p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text size="md" className="font-medium">
                            {categoryName}
                          </Text>
                          {item.isOverBudget && (
                            <AlertTriangle size={14} className="text-orange-500" />
                          )}
                        </View>
                        {item.isOverBudget && (
                          <Text size="xs" className="text-orange-500">
                            Over budget by {formatCurrency(item.overBudgetAmount)}
                          </Text>
                        )}
                      </View>
                      <Text size="sm" className="text-muted-foreground">
                        {item.percentage}%
                      </Text>
                    </View>
                    <Progress value={displayPercentage} className="mt-3">
                      <ProgressFilledTrack />
                    </Progress>
                    <View className="mt-2 flex-row justify-between">
                      <Text size="sm" className="text-muted-foreground">
                        {formatCurrency(item.spent)} spent
                      </Text>
                      <Text size="sm" className="text-muted-foreground">
                        {formatCurrency(item.remaining)} left
                      </Text>
                    </View>
                    <Text size="xs" className="mt-1 text-muted-foreground">
                      of {formatCurrency(item.budgetAmount)} budget
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Help Text */}
        {budgetSpending.length > 0 && (
          <Text size="xs" className="text-center text-muted-foreground">
            Long press on a budget to delete it
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
