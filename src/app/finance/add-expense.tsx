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
import { ArrowLeft, Check, ChevronDown, ImagePlus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

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

export default function AddExpenseScreen() {
  const router = useRouter();
  const { accounts, categories, addTransaction } = useFinance();

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [note, setNote] = useState('');
  const [purpose, setPurpose] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Filter expense categories
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
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

  async function pickReceipt() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a receipt.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setReceipt(result.assets[0]);
    }
  }

  async function handleSave() {
    if (!validate()) return;

    try {
      setSaving(true);
      await addTransaction({
        title: title.trim(),
        amount: parseFloat(amount),
        accountId,
        categoryId,
        type: 'expense',
        date,
        note: note.trim(),
        purpose: purpose.trim() || undefined,
        tags: Array.from(new Set(tagsText.split(',').map((tag) => tag.trim()).filter(Boolean))),
        receiptAttachment: receipt
          ? {
              uri: receipt.uri,
              name: receipt.fileName || 'receipt.jpg',
              mimeType: receipt.mimeType,
              size: receipt.fileSize,
            }
          : undefined,
      });

      Alert.alert('Success', 'Expense added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save expense');
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
                Finance · Add Expense
              </Text>
              <Heading size="xl" className="mt-1">
                Add Expense
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
                  placeholder="e.g. Grocery shopping"
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

            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">Purpose (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                {['Food', 'Travel', 'College', 'Shopping', 'Bills', 'Family', 'Friend', 'Health', 'Work', 'Subscription', 'Personal', 'Other'].map((item) => (
                  <Pressable key={item} onPress={() => setPurpose(purpose === item ? '' : item)} className={`mr-2 rounded-full px-3 py-2 ${purpose === item ? 'bg-primary' : 'bg-muted'}`}>
                    <Text size="xs" className={purpose === item ? 'text-primary-foreground' : 'text-foreground'}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Input><InputField placeholder="Or enter a custom purpose..." value={purpose} onChangeText={setPurpose} /></Input>
            </View>

            {/* Tags */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Tags (optional)
              </Text>
              <Input>
                <InputField
                  placeholder="e.g. essential, monthly, college"
                  value={tagsText}
                  onChangeText={setTagsText}
                  autoCapitalize="none"
                />
              </Input>
              <Text size="xs" className="mt-1 text-muted-foreground">
                Separate multiple tags with commas.
              </Text>
            </View>

            {/* Receipt */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Receipt (optional)
              </Text>
              {receipt ? (
                <View className="flex-row items-center justify-between rounded-md border border-border bg-muted px-3 py-2.5">
                  <View className="flex-1">
                    <Text size="sm" className="text-foreground" numberOfLines={1}>
                      {receipt.fileName || 'Receipt image'}
                    </Text>
                    <Text size="xs" className="text-muted-foreground">
                      Attached to this expense
                    </Text>
                  </View>
                  <Pressable onPress={() => setReceipt(null)} accessibilityLabel="Remove receipt">
                    <X size={18} className="text-muted-foreground" />
                  </Pressable>
                </View>
              ) : (
                <Button variant="outline" onPress={pickReceipt}>
                  <ImagePlus size={17} />
                  <ButtonText>Attach receipt photo</ButtonText>
                </Button>
              )}
              <Text size="xs" className="mt-1 text-muted-foreground">
                The photo stays as a local attachment and is not uploaded by this flow.
              </Text>
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
              <ButtonText>{saving ? 'Saving...' : 'Save Expense'}</ButtonText>
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
