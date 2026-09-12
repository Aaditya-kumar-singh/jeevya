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
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationErrors {
  categoryId?: string;
  amount?: string;
  month?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddBudgetScreen() {
  const router = useRouter();
  const { categories, budgets, addBudget } = useFinance();

  // Form state
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(getCurrentMonthKey());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Filter expense categories
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );

  // Selected category
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  // Check for duplicate budget
  const isDuplicate = useMemo(() => {
    return budgets.some((b) => b.categoryId === categoryId && b.month === month);
  }, [budgets, categoryId, month]);

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: ValidationErrors = {};

    if (!categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      newErrors.month = 'Please enter a valid month (YYYY-MM)';
    }

    if (categoryId && month && isDuplicate) {
      newErrors.categoryId = 'A budget already exists for this category and month';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return;

    try {
      setSaving(true);
      await addBudget({
        categoryId,
        amount: parseFloat(amount),
        month,
      });

      Alert.alert('Success', 'Budget created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create budget');
    } finally {
      setSaving(false);
    }
  }

  // Month navigation
  const goToPreviousMonth = () => setMonth((prev) => getPreviousMonth(prev));
  const goToNextMonth = () => setMonth((prev) => getNextMonth(prev));

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
                Finance · Add Budget
              </Text>
              <Heading size="xl" className="mt-1">
                Add Budget
              </Heading>
            </View>
          </View>

          {/* Form */}
          <Card className="w-full gap-3 p-4">
            {/* Category */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Expense Category
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
                  {expenseCategories.map((cat) => (
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
                  {expenseCategories.length === 0 && (
                    <View className="px-3 py-4">
                      <Text size="sm" className="text-center text-muted-foreground">
                        No expense categories available
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

            {/* Amount */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Monthly Budget Amount (₹)
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

            {/* Month */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Month
              </Text>
              <Card className="p-3">
                <View className="flex-row items-center justify-between">
                  <Pressable onPress={goToPreviousMonth} className="p-2">
                    <ChevronLeft size={20} className="text-muted-foreground" />
                  </Pressable>
                  <View className="flex-1 items-center">
                    <Text size="md" className="font-medium">
                      {formatMonthLabel(month)}
                    </Text>
                  </View>
                  <Pressable onPress={goToNextMonth} className="p-2">
                    <ChevronRight size={20} className="text-muted-foreground" />
                  </Pressable>
                </View>
              </Card>
              {errors.month && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.month}
                </Text>
              )}
            </View>

            {/* Duplicate Warning */}
            {isDuplicate && (
              <View className="rounded-md bg-orange-50 p-3 dark:bg-orange-900/20">
                <Text size="sm" className="text-orange-600 dark:text-orange-400">
                  A budget already exists for this category in {formatMonthLabel(month)}.
                </Text>
              </View>
            )}
          </Card>

          {/* Actions */}
          <View className="gap-3">
            <Button
              variant="default"
              size="lg"
              onPress={handleSave}
              disabled={saving || isDuplicate}>
              <ButtonText>{saving ? 'Creating...' : 'Create Budget'}</ButtonText>
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
