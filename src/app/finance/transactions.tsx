import { useState, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Search, X } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';
import type { FinanceTransaction } from '@/types/finance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'income' | 'expense';

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center py-12">
      <Text size="sm" className="text-muted-foreground">
        {message}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { transactions, categories, accounts, loading, refreshing, refresh } = useFinance();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Build category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Get available months from transactions
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const tx of transactions) {
      const monthKey = tx.date.slice(0, 7); // "YYYY-MM"
      monthSet.add(monthKey);
    }
    return Array.from(monthSet).sort().reverse();
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((tx) => tx.type === filterType);
    }

    // Filter by month
    if (selectedMonth) {
      result = result.filter((tx) => tx.date.startsWith(selectedMonth));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (tx) =>
          tx.title.toLowerCase().includes(query) ||
          tx.note.toLowerCase().includes(query) ||
          (categoryMap.get(tx.categoryId) || '').toLowerCase().includes(query),
      );
    }

    // Sort by date descending
    result.sort((a, b) => b.date.localeCompare(a.date));

    return result;
  }, [transactions, filterType, selectedMonth, searchQuery, categoryMap]);

  // Calculate totals for filtered results
  const filteredTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expenses += tx.amount;
      }
    }
    return { income, expenses, net: income - expenses };
  }, [filteredTransactions]);

  // Format month label
  function formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  // Loading state
  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text size="sm" className="mt-3 text-muted-foreground">
            Loading transactions...
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View>
          <Text size="sm" className="text-muted-foreground">
            Finance · Transactions
          </Text>
          <Heading size="xl" className="mt-1">
            Transactions
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {filteredTransactions.length} transactions
          </Text>
        </View>

        {/* Summary */}
        <Card className="w-full p-4">
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl bg-muted p-3">
              <Text size="xs" className="text-muted-foreground">
                Income
              </Text>
              <Text size="md" className="mt-1 font-semibold text-green-600 dark:text-green-400">
                +{formatCurrency(filteredTotals.income)}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-muted p-3">
              <Text size="xs" className="text-muted-foreground">
                Expenses
              </Text>
              <Text size="md" className="mt-1 font-semibold text-red-600 dark:text-red-400">
                -{formatCurrency(filteredTotals.expenses)}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-muted p-3">
              <Text size="xs" className="text-muted-foreground">
                Net
              </Text>
              <Text
                size="md"
                className={`mt-1 font-semibold ${filteredTotals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {filteredTotals.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(filteredTotals.net))}
              </Text>
            </View>
          </View>
        </Card>

        {/* Search */}
        <View>
          <Input>
            <InputField
              placeholder="Search transactions..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </Input>
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              className="absolute right-3 top-2.5">
              <X size={16} className="text-muted-foreground" />
            </Pressable>
          )}
        </View>

        {/* Filter Tabs */}
        <View className="flex-row gap-2">
          {(['all', 'income', 'expense'] as FilterType[]).map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              size="sm"
              onPress={() => setFilterType(type)}>
              <ButtonText>
                {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expense'}
              </ButtonText>
            </Button>
          ))}
        </View>

        {/* Month Filter */}
        {availableMonths.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
            <Button
              variant={selectedMonth === null ? 'secondary' : 'ghost'}
              size="sm"
              onPress={() => setSelectedMonth(null)}>
              <ButtonText>All months</ButtonText>
            </Button>
            {availableMonths.map((month) => (
              <Button
                key={month}
                variant={selectedMonth === month ? 'secondary' : 'ghost'}
                size="sm"
                onPress={() => setSelectedMonth(month)}>
                <ButtonText>{formatMonth(month)}</ButtonText>
              </Button>
            ))}
          </ScrollView>
        )}

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <EmptyState
            message={
              searchQuery || filterType !== 'all' || selectedMonth
                ? 'No transactions match your filters'
                : 'No transactions yet. Start tracking your spending.'
            }
          />
        ) : (
          <View className="gap-2">
            {filteredTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                categoryName={categoryMap.get(tx.categoryId) || 'Uncategorized'}
                accounts={accounts}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Transaction Item ─────────────────────────────────────────────────────────

function TransactionItem({
  transaction,
  categoryName,
  accounts,
}: {
  transaction: FinanceTransaction;
  categoryName: string;
  accounts: { id: string; name: string }[];
}) {
  const isTransfer = transaction.type === 'transfer';
  const isIncome = transaction.type === 'income';

  let label: string;
  let amountPrefix: string;
  let amountColor: string;
  let bgColor: string;
  let IconComponent: typeof ArrowDownLeft;

  if (isTransfer) {
    const fromAccount = accounts.find((a) => a.id === transaction.fromAccountId);
    const toAccount = accounts.find((a) => a.id === transaction.toAccountId);
    label = `${fromAccount?.name || 'Source'} → ${toAccount?.name || 'Destination'}`;
    amountPrefix = '';
    amountColor = 'text-blue-600 dark:text-blue-400';
    bgColor = 'bg-blue-100 dark:bg-blue-900/30';
    IconComponent = ArrowRightLeft;
  } else if (isIncome) {
    label = categoryName;
    amountPrefix = '+';
    amountColor = 'text-green-600 dark:text-green-400';
    bgColor = 'bg-green-100 dark:bg-green-900/30';
    IconComponent = ArrowDownLeft;
  } else {
    label = categoryName;
    amountPrefix = '-';
    amountColor = 'text-red-600 dark:text-red-400';
    bgColor = 'bg-red-100 dark:bg-red-900/30';
    IconComponent = ArrowUpRight;
  }

  return (
    <Link href={{ pathname: '/finance/[id]', params: { id: transaction.id } }} asChild>
      <Pressable>
        <Card className="w-full p-4">
          <View className="flex-row items-center gap-3">
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${bgColor}`}>
              <IconComponent size={18} className={amountColor} />
            </View>
            <View className="flex-1">
              <Text size="sm" className="font-medium text-foreground">
                {transaction.title}
              </Text>
              <Text size="xs" className="text-muted-foreground">
                {label} · {formatDate(transaction.date)}
              </Text>
            </View>
            <Text
              size="md"
              className={`font-semibold ${amountColor}`}>
              {amountPrefix}{formatCurrency(transaction.amount)}
            </Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
