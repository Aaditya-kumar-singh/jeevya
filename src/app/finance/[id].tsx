import { useState, useMemo, useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowDownLeft,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationErrors {
  title?: string;
  amount?: string;
  accountId?: string;
  categoryId?: string;
  date?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    transactions,
    accounts,
    categories,
    editTransaction,
    removeTransaction,
  } = useFinance();

  // Find transaction
  const transaction = useMemo(
    () => transactions.find((t) => t.id === id),
    [transactions, id],
  );

  // Transfer-specific names must be declared before any conditional return so hook order is stable.
  const fromAccountName = useMemo(
    () => accounts.find((a) => a.id === transaction?.fromAccountId)?.name || 'Unknown',
    [accounts, transaction],
  );
  const toAccountName = useMemo(
    () => accounts.find((a) => a.id === transaction?.toAccountId)?.name || 'Unknown',
    [accounts, transaction],
  );

  // Edit state
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Initialize edit state when entering edit mode
  const enterEditMode = useCallback(() => {
    if (!transaction) return;
    setTitle(transaction.title);
    setAmount(String(transaction.amount));
    setAccountId(transaction.accountId);
    setCategoryId(transaction.categoryId);
    setDate(transaction.date);
    setNote(transaction.note);
    setErrors({});
    setEditing(true);
  }, [transaction]);

  // Filtered categories based on transaction type
  const filteredCategories = useMemo(() => {
    if (!transaction) return [];
    return categories.filter((c) => c.type === transaction.type);
  }, [categories, transaction]);

  // Selected labels
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const categoryName = useMemo(
    () => categories.find((c) => c.id === transaction?.categoryId)?.name || 'Uncategorized',
    [categories, transaction],
  );

  const accountName = useMemo(
    () => accounts.find((a) => a.id === transaction?.accountId)?.name || 'Unknown',
    [accounts, transaction],
  );

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: ValidationErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!accountId) {
      newErrors.accountId = 'Please select an account';
    }

    if (!categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      newErrors.date = 'Please enter a valid date (YYYY-MM-DD)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate() || !transaction) return;

    try {
      setSaving(true);
      await editTransaction(transaction.id, {
        title: title.trim(),
        amount: parseFloat(amount),
        accountId,
        categoryId,
        date,
        note: note.trim(),
      });

      setEditing(false);
      Alert.alert('Success', 'Transaction updated successfully');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!transaction) return;

    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete "${transaction.title}"? This will reverse the balance effect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await removeTransaction(transaction.id);
              Alert.alert('Deleted', 'Transaction deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete transaction');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  // ─── Not Found ────────────────────────────────────────────────────────────

  if (!transaction) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text size="md" className="text-center font-medium">
            Transaction not found
          </Text>
          <Button variant="outline" className="mt-4" onPress={() => router.back()}>
            <ButtonText>Go back</ButtonText>
          </Button>
        </View>
      </ScrollView>
    );
  }

  const isTransfer = transaction.type === 'transfer';
  const isIncome = transaction.type === 'income';

  // ─── View Mode ────────────────────────────────────────────────────────────

  if (!editing) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="gap-4 px-5 pt-14">
          {/* Header */}
          <View className="flex-row items-center gap-3">
            <Button variant="ghost" size="icon" onPress={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <View className="flex-1">
              <Text size="sm" className="text-muted-foreground">
                Finance · Transaction
              </Text>
              <Heading size="xl" className="mt-1">
                {isTransfer ? 'Transfer Details' : 'Transaction Details'}
              </Heading>
            </View>
          </View>

          {/* Amount & Type */}
          <Card className="w-full items-center p-6">
            <View
              className={`h-16 w-16 items-center justify-center rounded-full ${
                isTransfer
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : isIncome
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
              }`}>
              {isTransfer ? (
                <ArrowRightLeft size={32} className="text-blue-600 dark:text-blue-400" />
              ) : isIncome ? (
                <ArrowDownLeft size={32} className="text-green-600 dark:text-green-400" />
              ) : (
                <ArrowUpRight size={32} className="text-red-600 dark:text-red-400" />
              )}
            </View>
            <Heading
              size="2xl"
              className={`mt-3 ${
                isTransfer
                  ? 'text-blue-600 dark:text-blue-400'
                  : isIncome
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
              }`}>
              ₹{transaction.amount.toLocaleString('en-IN')}
            </Heading>
            <Text size="sm" className="mt-1 text-muted-foreground">
              {isTransfer
                ? `Transfer · ${fromAccountName} → ${toAccountName}`
                : `${isIncome ? 'Income' : 'Expense'} · ${transaction.title}`}
            </Text>
          </Card>

          {/* Details */}
          <Card className="w-full gap-3 p-4">
            <View className="flex-row items-center justify-between">
              <Text size="sm" className="text-muted-foreground">
                Title
              </Text>
              <Text size="sm" className="font-medium text-foreground">
                {transaction.title}
              </Text>
            </View>
            <View className="flex-row items-center justify-between border-t border-border pt-3">
              <Text size="sm" className="text-muted-foreground">
                Amount
              </Text>
              <Text size="sm" className="font-medium text-foreground">
                ₹{transaction.amount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View className="flex-row items-center justify-between border-t border-border pt-3">
              <Text size="sm" className="text-muted-foreground">
                Type
              </Text>
              <Text size="sm" className="font-medium text-foreground">
                {isTransfer ? 'Transfer' : isIncome ? 'Income' : 'Expense'}
              </Text>
            </View>
            {isTransfer ? (
              <>
                <View className="flex-row items-center justify-between border-t border-border pt-3">
                  <Text size="sm" className="text-muted-foreground">
                    From
                  </Text>
                  <Text size="sm" className="font-medium text-foreground">
                    {fromAccountName}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between border-t border-border pt-3">
                  <Text size="sm" className="text-muted-foreground">
                    To
                  </Text>
                  <Text size="sm" className="font-medium text-foreground">
                    {toAccountName}
                  </Text>
                </View>
              </>
            ) : (
              <View className="flex-row items-center justify-between border-t border-border pt-3">
                <Text size="sm" className="text-muted-foreground">
                  Account
                </Text>
                <Text size="sm" className="font-medium text-foreground">
                  {accountName}
                </Text>
              </View>
            )}
            {!isTransfer && (
              <View className="flex-row items-center justify-between border-t border-border pt-3">
                <Text size="sm" className="text-muted-foreground">
                  Category
                </Text>
                <Text size="sm" className="font-medium text-foreground">
                  {categoryName}
                </Text>
              </View>
            )}
            <View className="flex-row items-center justify-between border-t border-border pt-3">
              <Text size="sm" className="text-muted-foreground">
                Date
              </Text>
              <Text size="sm" className="font-medium text-foreground">
                {transaction.date}
              </Text>
            </View>
            {transaction.note ? (
              <View className="border-t border-border pt-3">
                <Text size="sm" className="text-muted-foreground">
                  Note
                </Text>
                <Text size="sm" className="mt-1 text-foreground">
                  {transaction.note}
                </Text>
              </View>
            ) : null}
          </Card>

          {/* Actions */}
          <View className="gap-3">
            {!isTransfer && (
              <Button variant="default" size="lg" onPress={enterEditMode}>
                <ButtonText>Edit Transaction</ButtonText>
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              onPress={handleDelete}
              disabled={deleting}>
              <ButtonText>{deleting ? 'Deleting...' : 'Delete Transaction'}</ButtonText>
            </Button>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ─── Edit Mode ────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled">
        <View className="gap-4 px-5 pt-14">
          {/* Header */}
          <View className="flex-row items-center gap-3">
            <Button variant="ghost" size="icon" onPress={() => setEditing(false)}>
              <ArrowLeft size={20} />
            </Button>
            <View>
              <Text size="sm" className="text-muted-foreground">
                Finance · Edit Transaction
              </Text>
              <Heading size="xl" className="mt-1">
                Edit Transaction
              </Heading>
            </View>
          </View>

          {/* Form */}
          <Card className="w-full gap-3 p-4">
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Title
              </Text>
              <Input>
                <InputField
                  placeholder="Transaction title"
                  value={title}
                  onChangeText={setTitle}
                />
              </Input>
              {errors.title && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.title}
                </Text>
              )}
            </View>

            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Amount (₹)
              </Text>
              <Input>
                <InputField
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </Input>
              {errors.amount && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.amount}
                </Text>
              )}
            </View>

            {/* Account */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Account
              </Text>
              <Pressable
                onPress={() => setShowAccountPicker(!showAccountPicker)}
                className="flex-row items-center justify-between rounded-md border border-border bg-transparent px-3 py-2.5">
                <Text
                  size="sm"
                  className={selectedAccount ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedAccount?.name || 'Select account'}
                </Text>
                <ChevronDown size={16} className="text-muted-foreground" />
              </Pressable>
              {showAccountPicker && (
                <View className="mt-1 rounded-md border border-border bg-card">
                  {accounts.map((account) => (
                    <Pressable
                      key={account.id}
                      onPress={() => {
                        setAccountId(account.id);
                        setShowAccountPicker(false);
                        setErrors((prev) => ({ ...prev, accountId: undefined }));
                      }}
                      className="flex-row items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0">
                      <View>
                        <Text size="sm" className="text-foreground">
                          {account.name}
                        </Text>
                        <Text size="xs" className="text-muted-foreground">
                          ₹{account.balance.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      {accountId === account.id && (
                        <Check size={16} className="text-primary" />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
              {errors.accountId && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.accountId}
                </Text>
              )}
            </View>

            {/* Category */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Category
              </Text>
              <Pressable
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                className="flex-row items-center justify-between rounded-md border border-border bg-transparent px-3 py-2.5">
                <Text
                  size="sm"
                  className={selectedCategory ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedCategory?.name || 'Select category'}
                </Text>
                <ChevronDown size={16} className="text-muted-foreground" />
              </Pressable>
              {showCategoryPicker && (
                <View className="mt-1 rounded-md border border-border bg-card">
                  {filteredCategories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        setCategoryId(cat.id);
                        setShowCategoryPicker(false);
                        setErrors((prev) => ({ ...prev, categoryId: undefined }));
                      }}
                      className="flex-row items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0">
                      <Text size="sm" className="text-foreground">
                        {cat.name}
                      </Text>
                      {categoryId === cat.id && (
                        <Check size={16} className="text-primary" />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
              {errors.categoryId && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.categoryId}
                </Text>
              )}
            </View>

            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Date
              </Text>
              <Input>
                <InputField
                  placeholder="YYYY-MM-DD"
                  value={date}
                  onChangeText={setDate}
                />
              </Input>
              {errors.date && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.date}
                </Text>
              )}
            </View>

            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Note (optional)
              </Text>
              <Input>
                <InputField
                  placeholder="Add a note..."
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 60, textAlignVertical: 'top' }}
                />
              </Input>
            </View>
          </Card>

          {/* Actions */}
          <View className="gap-3">
            <Button
              variant="default"
              size="lg"
              onPress={handleSave}
              disabled={saving}>
              <ButtonText>{saving ? 'Saving...' : 'Save Changes'}</ButtonText>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onPress={() => setEditing(false)}
              disabled={saving}>
              <ButtonText>Cancel</ButtonText>
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
