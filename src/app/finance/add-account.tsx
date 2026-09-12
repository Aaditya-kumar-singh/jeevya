import { useState } from 'react';
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
import type { AccountType } from '@/types/finance';

// ─── Constants ────────────────────────────────────────────────────────────────

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
  type?: string;
  balance?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddAccountScreen() {
  const router = useRouter();
  const { addAccount } = useFinance();

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Selected type label
  const selectedType = ACCOUNT_TYPES.find((t) => t.value === type);

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: ValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Account name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return;

    try {
      setSaving(true);
      const parsedBalance = parseFloat(balance) || 0;
      await addAccount({
        name: name.trim(),
        type,
        balance: parsedBalance,
        currency: currency.trim() || 'INR',
      });

      Alert.alert('Success', 'Account created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create account');
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
                Finance · Add Account
              </Text>
              <Heading size="xl" className="mt-1">
                Add Account
              </Heading>
            </View>
          </View>

          {/* Form */}
          <Card className="w-full gap-3 p-4">
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Account Name
              </Text>
              <Input>
                <InputField
                  placeholder="e.g. Main Bank Account"
                  value={name}
                  onChangeText={setName}
                />
              </Input>
              {errors.name && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.name}
                </Text>
              )}
            </View>

            {/* Account Type */}
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
                        setType(t.value);
                        setShowTypePicker(false);
                      }}
                      className="flex-row items-center justify-between border-b border-border px-3 py-2.5 last:border-b-0">
                      <Text size="sm" className="text-foreground">
                        {t.label}
                      </Text>
                      {type === t.value && (
                        <Check size={16} className="text-primary" />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
              {errors.type && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.type}
                </Text>
              )}
            </View>

            {/* Initial Balance */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Initial Balance (₹)
              </Text>
              <Input>
                <InputField
                  placeholder="0.00"
                  value={balance}
                  onChangeText={setBalance}
                  keyboardType="decimal-pad"
                />
              </Input>
              {errors.balance && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.balance}
                </Text>
              )}
            </View>

            {/* Currency */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Currency
              </Text>
              <Input>
                <InputField
                  placeholder="INR"
                  value={currency}
                  onChangeText={setCurrency}
                />
              </Input>
            </View>
          </Card>

          {/* Actions */}
          <View className="gap-3">
            <Button variant="default" size="lg" onPress={handleSave} disabled={saving}>
              <ButtonText>{saving ? 'Creating...' : 'Create Account'}</ButtonText>
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
