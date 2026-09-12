import { useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Trash2,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';
import type { AccountType, FinanceTransaction } from '@/types/finance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit: 'Credit Card',
    cash: 'Cash',
    investment: 'Investment',
  };
  return labels[type] || type;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationErrors {
  name?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AccountDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    accounts,
    transactions,
    categories,
    loading,
    refreshing,
    refresh,
    editAccount,
    removeAccount,
  } = useFinance();

  // Find account
  const account = useMemo(() => accounts.find((a) => a.id === id), [accounts, id]);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AccountType>('checking');
  const [editCurrency, setEditCurrency] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Account-specific transactions
  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return transactions
      .filter(
        (tx) =>
          tx.accountId === account.id ||
          tx.fromAccountId === account.id ||
          tx.toAccountId === account.id,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, account]);

  // Category lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Account totals
  const accountTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let transfersIn = 0;
    let transfersOut = 0;

    for (const tx of accountTransactions) {
      if (tx.type === 'income' && tx.accountId === account?.id) {
        income += tx.amount;
      } else if (tx.type === 'expense' && tx.accountId === account?.id) {
        expenses += tx.amount;
      } else if (tx.type === 'transfer') {
        if (tx.toAccountId === account?.id) {
          transfersIn += tx.amount;
        }
        if (tx.fromAccountId === account?.id) {
          transfersOut += tx.amount;
        }
      }
    }

    return { income, expenses, transfersIn, transfersOut };
  }, [accountTransactions, account]);

  // Initialize edit state
  const enterEditMode = useCallback(() => {
    if (!account) return;
    setEditName(account.name);
    setEditType(account.type);
    setEditCurrency(account.currency);
    setErrors({});
    setEditing(true);
  }, [account]);

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: ValidationErrors = {};
    if (!editName.trim()) {
      newErrors.name = 'Account name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate() || !account) return;

    try {
      setSaving(true);
      await editAccount(account.id, {
        name: editName.trim(),
        type: editType,
        currency: editCurrency.trim() || 'INR',
      });

      setEditing(false);
      Alert.alert('Success', 'Account updated successfully');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!account) return;

    // Check if account has transactions
    if (accountTransactions.length > 0) {
      Alert.alert(
        'Cannot Delete',
        `This account has ${accountTransactions.length} transaction(s). Please delete or transfer them first before deleting this account.`,
      );
      return;
    }

    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAccount(account.id);
              Alert.alert('Deleted', 'Account deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete account');
            }
          },
        },
      ],
    );
  }

  // ─── Not Found ────────────────────────────────────────────────────────────

  if (loading && !account) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text size="sm" className="mt-3 text-muted-foreground">
            Loading...
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (!account) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text size="md" className="text-center font-medium">
            Account not found
          </Text>
          <Button variant="outline" className="mt-4" onPress={() => router.back()}>
            <ButtonText>Go back</ButtonText>
          </Button>
        </View>
      </ScrollView>
    );
  }

  // ─── Edit Mode ────────────────────────────────────────────────────────────

  if (editing) {
    const selectedType = ACCOUNT_TYPES.find((t) => t.value === editType);

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled">
          <View className="gap-4 px-5 pt-14">
            <View className="flex-row items-center gap-3">
              <Button variant="ghost" size="icon" onPress={() => setEditing(false)}>
                <ArrowLeft size={20} />
              </Button>
              <View>
                <Text size="sm" className="text-muted-foreground">
                  Finance · Edit Account
                </Text>
                <Heading size="xl" className="mt-1">
                  Edit Account
                </Heading>
              </View>
            </View>

            <Card className="w-full gap-3 p-4">
              <View>
                <Text size="sm" className="mb-1 font-medium text-foreground">
                  Account Name
                </Text>
                <Input>
                  <InputField value={editName} onChangeText={setEditName} />
                </Input>
                {errors.name && (
                  <Text size="xs" className="mt-1 text-destructive">
                    {errors.name}
                  </Text>
                )}
              </View>

              <View>
                <Text size="sm" className="mb-1 font-medium text-foreground">
                  Account Type
                </Text>
                <Pressable
                  onPress={() => setShowTypePicker(!showTypePicker)}
                  className="flex-row items-center justify-between rounded-md border border-border bg-transparent px-3 py-2.5">
                  <Text size="sm" className="text-foreground">
                    {selectedType?.label || 'Select type'}
                  </Text>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </Pressable>
                {showTypePicker && (
                  <View className="mt-1 rounded-md border border-border bg-card">
                    {ACCOUNT_TYPES.map((t) => (
                      <Pressable
                        key={t.value}
                        onPress={() => {
                          setEditType(t.value);
                          setShowTypePicker(false);
                        }}
                        className="flex-row items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0">
                        <Text size="sm" className="text-foreground">
                          {t.label}
                        </Text>
                        {editType === t.value && <Check size={16} className="text-primary" />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View>
                <Text size="sm" className="mb-1 font-medium text-foreground">
                  Currency
                </Text>
                <Input>
                  <InputField value={editCurrency} onChangeText={setEditCurrency} />
                </Input>
              </View>
            </Card>

            <View className="gap-3">
              <Button variant="default" size="lg" onPress={handleSave} disabled={saving}>
                <ButtonText>{saving ? 'Saving...' : 'Save Changes'}</ButtonText>
              </Button>
              <Button variant="outline" size="lg" onPress={() => setEditing(false)} disabled={saving}>
                <ButtonText>Cancel</ButtonText>
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── View Mode ────────────────────────────────────────────────────────────

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
              Finance · Account
            </Text>
            <Heading size="xl" className="mt-1">
              {account.name}
            </Heading>
          </View>
        </View>

        {/* Balance Card */}
        <Card className="w-full items-center p-6">
          <Heading size="2xl" className="text-foreground">
            {formatCurrency(account.balance)}
          </Heading>
          <Text size="sm" className="mt-1 text-muted-foreground">
            {getAccountTypeLabel(account.type)} · {account.currency}
          </Text>
        </Card>

        {/* Summary */}
        <Card className="w-full p-4">
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl bg-muted p-3">
              <Text size="xs" className="text-muted-foreground">
                Income
              </Text>
              <Text size="md" className="mt-1 font-semibold text-green-600 dark:text-green-400">
                +{formatCurrency(accountTotals.income)}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-muted p-3">
              <Text size="xs" className="text-muted-foreground">
                Expenses
              </Text>
              <Text size="md" className="mt-1 font-semibold text-red-600 dark:text-red-400">
                -{formatCurrency(accountTotals.expenses)}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-muted p-3">
              <Text size="xs" className="text-muted-foreground">
                Transfers
              </Text>
              <Text size="md" className="mt-1 font-semibold text-foreground">
                {accountTotals.transfersIn > 0 ? '+' : ''}{formatCurrency(accountTotals.transfersIn)}
                {' / '}
                {accountTotals.transfersOut > 0 ? '-' : ''}{formatCurrency(accountTotals.transfersOut)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <View className="flex-row gap-3">
          <Button variant="default" size="lg" className="flex-1" onPress={enterEditMode}>
            <ButtonText>Edit Account</ButtonText>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onPress={handleDelete}>
            <ButtonText>Delete</ButtonText>
          </Button>
        </View>

        {/* Transactions */}
        <View>
          <Text size="md" className="font-medium text-foreground">
            Transactions ({accountTransactions.length})
          </Text>
        </View>

        {accountTransactions.length === 0 ? (
          <Card className="w-full p-4">
            <Text size="sm" className="text-center text-muted-foreground">
              No transactions for this account yet.
            </Text>
          </Card>
        ) : (
          <View className="gap-2">
            {accountTransactions.slice(0, 20).map((tx) => (
              <AccountTransactionItem
                key={tx.id}
                transaction={tx}
                accountId={account.id}
                categoryMap={categoryMap}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Transaction Item ─────────────────────────────────────────────────────────

function AccountTransactionItem({
  transaction: tx,
  accountId,
  categoryMap,
}: {
  transaction: FinanceTransaction;
  accountId: string;
  categoryMap: Map<string, string>;
}) {
  const isTransfer = tx.type === 'transfer';
  const isIncome = tx.type === 'income';
  const isOutgoing = isTransfer && tx.fromAccountId === accountId;

  let label: string;
  let amountPrefix: string;
  let amountColor: string;

  if (isTransfer) {
    label = isOutgoing ? 'Transfer Out' : 'Transfer In';
    amountPrefix = isOutgoing ? '-' : '+';
    amountColor = 'text-foreground';
  } else if (isIncome) {
    label = categoryMap.get(tx.categoryId) || 'Income';
    amountPrefix = '+';
    amountColor = 'text-green-600 dark:text-green-400';
  } else {
    label = categoryMap.get(tx.categoryId) || 'Expense';
    amountPrefix = '-';
    amountColor = 'text-red-600 dark:text-red-400';
  }

  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            isTransfer
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : isIncome
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
          }`}>
          {isTransfer ? (
            <ArrowRightLeft
              size={18}
              className="text-blue-600 dark:text-blue-400"
            />
          ) : isIncome ? (
            <ArrowDownLeft size={18} className="text-green-600 dark:text-green-400" />
          ) : (
            <ArrowUpRight size={18} className="text-red-600 dark:text-red-400" />
          )}
        </View>
        <View className="flex-1">
          <Text size="sm" className="font-medium text-foreground">
            {tx.title}
          </Text>
          <Text size="xs" className="text-muted-foreground">
            {label} · {formatDate(tx.date)}
          </Text>
        </View>
        <Text size="md" className={`font-semibold ${amountColor}`}>
          {amountPrefix}{formatCurrency(tx.amount)}
        </Text>
      </View>
    </Card>
  );
}
