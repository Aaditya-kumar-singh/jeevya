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
import { ArrowLeft, ArrowRightLeft, Check, ChevronDown } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationErrors {
  fromAccountId?: string;
  toAccountId?: string;
  amount?: string;
  date?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TransferScreen() {
  const router = useRouter();
  const { accounts, addTransfer } = useFinance();

  // Form state
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Selected accounts
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId],
  );

  const toAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId),
    [accounts, toAccountId],
  );

  // Available destination accounts (excluding source)
  const availableToAccounts = useMemo(
    () => accounts.filter((a) => a.id !== fromAccountId),
    [accounts, fromAccountId],
  );

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: ValidationErrors = {};

    if (!fromAccountId) {
      newErrors.fromAccountId = 'Please select a source account';
    }

    if (!toAccountId) {
      newErrors.toAccountId = 'Please select a destination account';
    }

    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      newErrors.toAccountId = 'Source and destination must be different';
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (fromAccount && fromAccount.type !== 'credit') {
      const parsedAmt = parseFloat(amount) || 0;
      if (parsedAmt > fromAccount.balance) {
        newErrors.amount = 'Insufficient funds in source account';
      }
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
      await addTransfer({
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        title: title.trim() || `Transfer to ${toAccount?.name}`,
        note: note.trim(),
        date,
      });

      Alert.alert('Success', 'Transfer completed successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to complete transfer');
    } finally {
      setSaving(false);
    }
  }

  // No accounts state
  if (accounts.length < 2) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-6">
          <ArrowRightLeft size={48} className="text-muted-foreground" />
          <Heading size="md" className="mt-4">
            Need at least 2 accounts
          </Heading>
          <Text size="sm" className="mt-2 text-center text-muted-foreground">
            Create at least two accounts to make transfers between them.
          </Text>
          <Button variant="outline" className="mt-4" onPress={() => router.back()}>
            <ButtonText>Go back</ButtonText>
          </Button>
        </View>
      </ScrollView>
    );
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
                Finance · Transfer
              </Text>
              <Heading size="xl" className="mt-1">
                Transfer
              </Heading>
            </View>
          </View>

          {/* Form */}
          <Card className="w-full gap-3 p-4">
            {/* From Account */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                From Account
              </Text>
              <Pressable
                onPress={() => setShowFromPicker(!showFromPicker)}
                className="flex-row items-center justify-between rounded-md border border-border bg-transparent px-3 py-2.5">
                <Text
                  size="sm"
                  className={fromAccount ? 'text-foreground' : 'text-muted-foreground'}>
                  {fromAccount
                    ? `${fromAccount.name} (${formatCurrency(fromAccount.balance)})`
                    : 'Select source account'}
                </Text>
                <ChevronDown size={16} className="text-muted-foreground" />
              </Pressable>
              {showFromPicker && (
                <View className="mt-1 rounded-md border border-border bg-card">
                  {accounts.map((account) => (
                    <Pressable
                      key={account.id}
                      onPress={() => {
                        setFromAccountId(account.id);
                        setShowFromPicker(false);
                        // Reset destination if same as source
                        if (toAccountId === account.id) {
                          setToAccountId('');
                        }
                        setErrors((prev) => ({ ...prev, fromAccountId: undefined }));
                      }}
                      className="flex-row items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0">
                      <View>
                        <Text size="sm" className="text-foreground">
                          {account.name}
                        </Text>
                        <Text size="xs" className="text-muted-foreground">
                          {formatCurrency(account.balance)}
                        </Text>
                      </View>
                      {fromAccountId === account.id && (
                        <Check size={16} className="text-primary" />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
              {errors.fromAccountId && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.fromAccountId}
                </Text>
              )}
            </View>

            {/* Arrow indicator */}
            <View className="items-center py-1">
              <ArrowRightLeft size={20} className="text-muted-foreground" />
            </View>

            {/* To Account */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                To Account
              </Text>
              <Pressable
                onPress={() => setShowToPicker(!showToPicker)}
                className="flex-row items-center justify-between rounded-md border border-border bg-transparent px-3 py-2.5">
                <Text
                  size="sm"
                  className={toAccount ? 'text-foreground' : 'text-muted-foreground'}>
                  {toAccount
                    ? `${toAccount.name} (${formatCurrency(toAccount.balance)})`
                    : 'Select destination account'}
                </Text>
                <ChevronDown size={16} className="text-muted-foreground" />
              </Pressable>
              {showToPicker && (
                <View className="mt-1 rounded-md border border-border bg-card">
                  {availableToAccounts.map((account) => (
                    <Pressable
                      key={account.id}
                      onPress={() => {
                        setToAccountId(account.id);
                        setShowToPicker(false);
                        setErrors((prev) => ({ ...prev, toAccountId: undefined }));
                      }}
                      className="flex-row items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0">
                      <View>
                        <Text size="sm" className="text-foreground">
                          {account.name}
                        </Text>
                        <Text size="xs" className="text-muted-foreground">
                          {formatCurrency(account.balance)}
                        </Text>
                      </View>
                      {toAccountId === account.id && (
                        <Check size={16} className="text-primary" />
                      )}
                    </Pressable>
                  ))}
                  {availableToAccounts.length === 0 && (
                    <View className="px-3 py-4">
                      <Text size="sm" className="text-center text-muted-foreground">
                        No other accounts available
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {errors.toAccountId && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.toAccountId}
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

            {/* Title */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Title (optional)
              </Text>
              <Input>
                <InputField
                  placeholder="e.g. Savings transfer"
                  value={title}
                  onChangeText={setTitle}
                />
              </Input>
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
            <Button variant="default" size="lg" onPress={handleSave} disabled={saving}>
              <ButtonText>{saving ? 'Processing...' : 'Transfer'}</ButtonText>
            </Button>
            <Button variant="outline" size="lg" onPress={() => router.back()} disabled={saving}>
              <ButtonText>Cancel</ButtonText>
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
