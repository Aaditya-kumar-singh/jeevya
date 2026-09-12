import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  FileText,
  Landmark,
  PiggyBank,
  Receipt,
  Wallet,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';
import {
  generateTransactionsCsv,
  generateAccountsCsv,
  generateBudgetsCsv,
  generateSavingsGoalsCsv,
  generateJsonBackup,
  writeFileAndShare,
  type TransactionFilter,
} from '@/services/financeExport';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function getPreviousMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 2);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getNextMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── Export Card Component ────────────────────────────────────────────────────

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: typeof Wallet;
  count: number;
  disabled?: boolean;
}

function ExportOptionCard({
  option,
  exporting,
  onExport,
}: {
  option: ExportOption;
  exporting: string | null;
  onExport: (id: string) => void;
}) {
  const Icon = option.icon;
  const isExporting = exporting === option.id;

  return (
    <Pressable
      onPress={() => onExport(option.id)}
      disabled={isExporting || option.disabled}
      hitSlop={8}>
      <Card className="w-full p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
            <Icon size={20} />
          </View>
          <View className="flex-1">
            <Text size="md" className="font-medium">
              {option.label}
            </Text>
            <Text size="xs" className="text-muted-foreground">
              {option.description}
            </Text>
          </View>
          <View className="items-center">
            {isExporting ? (
              <ActivityIndicator size="small" />
            ) : option.disabled ? (
              <Text size="xs" className="text-muted-foreground">
                Empty
              </Text>
            ) : (
              <View className="flex-row items-center gap-1">
                <Text size="xs" className="text-muted-foreground">
                  {option.count} {option.count === 1 ? 'item' : 'items'}
                </Text>
                <ChevronRight size={14} className="text-muted-foreground" />
              </View>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

// ─── Month Picker ─────────────────────────────────────────────────────────────

function MonthPicker({
  selectedMonth,
  onMonthChange,
}: {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}) {
  const goToPrevious = useCallback(() => {
    onMonthChange(getPreviousMonth(selectedMonth));
  }, [selectedMonth, onMonthChange]);

  const goToNext = useCallback(() => {
    onMonthChange(getNextMonth(selectedMonth));
  }, [selectedMonth, onMonthChange]);

  return (
    <Card className="w-full p-4">
      <Text size="xs" className="mb-2 text-muted-foreground">
        Filter transactions by month
      </Text>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={goToPrevious} className="p-2" hitSlop={12}>
          <ArrowLeft size={18} className="text-muted-foreground" />
        </Pressable>
        <Pressable onPress={goToNext} className="p-2" hitSlop={12}>
          <ArrowLeft
            size={18}
            className="text-muted-foreground"
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Success Toast ────────────────────────────────────────────────────────────

function SuccessToast({ message }: { message: string }) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl bg-green-100 p-3 dark:bg-green-900/30">
      <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
      <Text size="sm" className="flex-1 font-medium text-green-700 dark:text-green-300">
        {message}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExportScreen() {
  const router = useRouter();
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

  const [exporting, setExporting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Transaction filter
  const [txFilter, setTxFilter] = useState<TransactionFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState(formatMonthKey(new Date()));

  // Available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const tx of transactions) {
      months.add(tx.date.slice(0, 7));
    }
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Count transactions for selected filter
  const filteredTxCount = useMemo(() => {
    if (txFilter === 'all') return transactions.length;
    if (txFilter === 'current-month') {
      const monthKey = formatMonthKey(new Date());
      return transactions.filter((tx) => tx.date.slice(0, 7) === monthKey).length;
    }
    return transactions.filter((tx) => tx.date.slice(0, 7) === selectedMonth).length;
  }, [transactions, txFilter, selectedMonth]);

  // Export options
  const exportOptions: ExportOption[] = useMemo(
    () => [
      {
        id: 'transactions',
        label: 'Transactions CSV',
        description: 'Export all transactions with account/category names',
        icon: Receipt,
        count: filteredTxCount,
        disabled: filteredTxCount === 0,
      },
      {
        id: 'accounts',
        label: 'Accounts CSV',
        description: 'Export account details and balances',
        icon: Landmark,
        count: accounts.length,
        disabled: accounts.length === 0,
      },
      {
        id: 'budgets',
        label: 'Budgets CSV',
        description: 'Export budget allocations by category',
        icon: Wallet,
        count: budgets.length,
        disabled: budgets.length === 0,
      },
      {
        id: 'savings-goals',
        label: 'Savings Goals CSV',
        description: 'Export savings goals with progress',
        icon: PiggyBank,
        count: savingsGoals.length,
        disabled: savingsGoals.length === 0,
      },
      {
        id: 'json-backup',
        label: 'Full Finance JSON Backup',
        description: 'Complete backup of all finance data',
        icon: Database,
        count:
          accounts.length +
          transactions.length +
          categories.length +
          budgets.length +
          savingsGoals.length,
        disabled:
          accounts.length === 0 &&
          transactions.length === 0 &&
          budgets.length === 0 &&
          savingsGoals.length === 0,
      },
    ],
    [accounts, transactions, categories, budgets, savingsGoals, filteredTxCount],
  );

  // Handle export
  const handleExport = useCallback(
    async (exportId: string) => {
      setExporting(exportId);
      setSuccessMessage(null);

      try {
        let result: { csv?: string; json?: string; filename: string };

        switch (exportId) {
          case 'transactions':
            result = generateTransactionsCsv(
              transactions,
              accounts,
              categories,
              txFilter,
              txFilter === 'selected-month' ? selectedMonth : undefined,
            );
            await writeFileAndShare(result.csv!, result.filename);
            setSuccessMessage(`Transactions exported as ${result.filename}`);
            break;

          case 'accounts':
            result = generateAccountsCsv(accounts);
            await writeFileAndShare(result.csv!, result.filename);
            setSuccessMessage(`Accounts exported as ${result.filename}`);
            break;

          case 'budgets':
            result = generateBudgetsCsv(budgets, categories);
            await writeFileAndShare(result.csv!, result.filename);
            setSuccessMessage(`Budgets exported as ${result.filename}`);
            break;

          case 'savings-goals':
            result = generateSavingsGoalsCsv(savingsGoals);
            await writeFileAndShare(result.csv!, result.filename);
            setSuccessMessage(`Savings goals exported as ${result.filename}`);
            break;

          case 'json-backup':
            result = generateJsonBackup(
              accounts,
              transactions,
              categories,
              budgets,
              savingsGoals,
            );
            await writeFileAndShare(result.json!, result.filename);
            setSuccessMessage(`Full backup created as ${result.filename}`);
            break;

          default:
            Alert.alert('Error', 'Unknown export type');
        }

        // Clear success message after 4 seconds
        setTimeout(() => setSuccessMessage(null), 4000);
      } catch (e) {
        Alert.alert(
          'Export Failed',
          e instanceof Error ? e.message : 'Failed to export data. Please try again.',
        );
      } finally {
        setExporting(null);
      }
    },
    [
      transactions,
      accounts,
      categories,
      budgets,
      savingsGoals,
      txFilter,
      selectedMonth,
    ],
  );

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
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View className="gap-4 px-5 pt-14">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Finance · Export
            </Text>
            <Heading size="xl" className="mt-1">
              Export & Backup
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              Download your finance data
            </Text>
          </View>
        </View>

        {/* Success toast */}
        {successMessage && <SuccessToast message={successMessage} />}

        {/* Transaction filter */}
        <Card className="w-full p-4">
          <Text size="sm" className="font-medium">
            Transaction Export Filter
          </Text>

          <View className="mt-3 flex-row gap-2">
            {([
              { value: 'all', label: 'All' },
              { value: 'current-month', label: 'This Month' },
              { value: 'selected-month', label: 'Select Month' },
            ] as { value: TransactionFilter; label: string }[]).map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setTxFilter(opt.value)}
                className={`flex-1 items-center rounded-xl py-2.5 ${
                  txFilter === opt.value ? 'bg-primary' : 'bg-muted'
                }`}
                hitSlop={8}>
                <Text
                  size="xs"
                  className={`font-medium ${
                    txFilter === opt.value
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Month selector when "Select Month" is chosen */}
          {txFilter === 'selected-month' && (
            <View className="mt-3">
              <View className="flex-row items-center justify-between rounded-xl bg-muted px-4 py-3">
                <Pressable
                  onPress={() => {
                    const prev = getPreviousMonth(selectedMonth);
                    setSelectedMonth(prev);
                  }}
                  hitSlop={12}>
                  <ArrowLeft size={18} className="text-muted-foreground" />
                </Pressable>
                <Text size="sm" className="font-medium">
                  {formatMonthLabel(selectedMonth)}
                </Text>
                <Pressable
                  onPress={() => {
                    const next = getNextMonth(selectedMonth);
                    setSelectedMonth(next);
                  }}
                  hitSlop={12}>
                  <ArrowLeft
                    size={18}
                    className="text-muted-foreground"
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                </Pressable>
              </View>

              {availableMonths.length > 0 && (
                <View className="mt-2 flex-row flex-wrap gap-1">
                  {availableMonths.slice(0, 6).map((month) => (
                    <Pressable
                      key={month}
                      onPress={() => setSelectedMonth(month)}
                      className={`rounded-lg px-2.5 py-1 ${
                        selectedMonth === month ? 'bg-primary' : 'bg-muted'
                      }`}
                      hitSlop={6}>
                      <Text
                        size="xs"
                        className={
                          selectedMonth === month
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground'
                        }>
                        {formatMonthLabel(month)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Export options */}
        <View className="gap-2">
          <Text size="sm" className="font-medium text-muted-foreground">
            Choose what to export
          </Text>

          {exportOptions.map((option) => (
            <ExportOptionCard
              key={option.id}
              option={option}
              exporting={exporting}
              onExport={handleExport}
            />
          ))}
        </View>

        {/* Data summary */}
        <Card className="w-full p-4">
          <Text size="sm" className="font-medium">
            Data Summary
          </Text>
          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text size="xs" className="text-muted-foreground">
                Accounts
              </Text>
              <Text size="xs" className="font-medium">
                {accounts.length}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text size="xs" className="text-muted-foreground">
                Transactions
              </Text>
              <Text size="xs" className="font-medium">
                {transactions.length}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text size="xs" className="text-muted-foreground">
                Categories
              </Text>
              <Text size="xs" className="font-medium">
                {categories.length}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text size="xs" className="text-muted-foreground">
                Budgets
              </Text>
              <Text size="xs" className="font-medium">
                {budgets.length}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text size="xs" className="text-muted-foreground">
                Savings Goals
              </Text>
              <Text size="xs" className="font-medium">
                {savingsGoals.length}
              </Text>
            </View>
          </View>
        </Card>

        {/* Help text */}
        <Text size="xs" className="text-center text-muted-foreground">
          Exported files are saved to your device. CSV files include a BOM for
          Excel compatibility. JSON backups include all finance data with version
          metadata.
        </Text>
      </View>
    </ScrollView>
  );
}
