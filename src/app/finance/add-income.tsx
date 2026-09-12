import { useState, useMemo } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationErrors {
  title?: string;
  amount?: string;
  accountId?: string;
  categoryId?: string;
  date?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddIncomeScreen() {
  const router = useRouter();
  const { accounts, categories, addTransaction } = useFinance();

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Filter income categories
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );

  // Selected labels
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId],
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
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
    if (!validate()) return;

    try {
      setSaving(true);
      await addTransaction({
        title: title.trim(),
        amount: parseFloat(amount),
        accountId,
        categoryId,
        type: 'income',
        date,
        note: note.trim(),
      });

      Alert.alert('Success', 'Income added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save income');
    } finally {
      setSaving(false);
    }
  }

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
            <Button variant="ghost" size="icon" onPress={() => router.back()}>
              <ArrowLeft size={20} />
            </Button>
            <View>
              <Text size="sm" className="text-muted-foreground">
                Finance · Add Income
              </Text>
              <Heading size="xl" className="mt-1">
                Add Income
              </Heading>
            </View>
          </View>

          {/* Title */}
          <Card className="w-full gap-3 p-4">
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Title
              </Text>
              <Input>
                <InputField
                  placeholder="e.g. Monthly salary"
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

            {/* Amount */}
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
                  {accounts.length === 0 && (
                    <View className="px-3 py-4">
                      <Text size="sm" className="text-center text-muted-foreground">
                        No accounts available
                      </Text>
                    </View>
                  )}
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
                  {incomeCategories.map((cat) => (
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
                  {incomeCategories.length === 0 && (
                    <View className="px-3 py-4">
                      <Text size="sm" className="text-center text-muted-foreground">
                        No categories available
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {errors.categoryId && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.categoryId}
                </Text>
              )}
            </View>

            {/* Date */}
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

            {/* Note */}
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
              <ButtonText>{saving ? 'Saving...' : 'Save Income'}</ButtonText>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onPress={() => router.back()}
              disabled={saving}>
              <ButtonText>Cancel</ButtonText>
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
