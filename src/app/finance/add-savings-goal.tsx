import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

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

function getOneYearFromNowISO(): string {
  const now = new Date();
  now.setFullYear(now.getFullYear() + 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationErrors {
  name?: string;
  targetAmount?: string;
  currentAmount?: string;
  deadline?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddSavingsGoalScreen() {
  const router = useRouter();
  const { addSavingsGoal } = useFinance();

  // Form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState(getOneYearFromNowISO());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);

  // ─── Validation ───────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: ValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Goal name is required';
    }

    const parsedTarget = parseFloat(targetAmount);
    if (!targetAmount || isNaN(parsedTarget) || parsedTarget <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }

    const parsedCurrent = parseFloat(currentAmount) || 0;
    if (currentAmount && (isNaN(parsedCurrent) || parsedCurrent < 0)) {
      newErrors.currentAmount = 'Current amount must be 0 or greater';
    }

    if (parsedCurrent > parsedTarget && parsedTarget > 0) {
      newErrors.currentAmount = 'Current amount cannot exceed target';
    }

    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      newErrors.deadline = 'Please enter a valid date (YYYY-MM-DD)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return;

    try {
      setSaving(true);
      await addSavingsGoal({
        name: name.trim(),
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        deadline: deadline || '',
      });

      Alert.alert('Success', 'Savings goal created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create savings goal');
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
                Finance · Add Savings Goal
              </Text>
              <Heading size="xl" className="mt-1">
                Add Savings Goal
              </Heading>
            </View>
          </View>

          {/* Form */}
          <Card className="w-full gap-3 p-4">
            {/* Name */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Goal Name
              </Text>
              <Input>
                <InputField
                  placeholder="e.g. Emergency Fund"
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

            {/* Target Amount */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Target Amount (₹)
              </Text>
              <Input>
                <InputField
                  placeholder="0.00"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="decimal-pad"
                />
              </Input>
              {errors.targetAmount && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.targetAmount}
                </Text>
              )}
            </View>

            {/* Current Amount */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Current Amount (₹)
              </Text>
              <Input>
                <InputField
                  placeholder="0.00"
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  keyboardType="decimal-pad"
                />
              </Input>
              {errors.currentAmount && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.currentAmount}
                </Text>
              )}
              <Text size="xs" className="mt-1 text-muted-foreground">
                How much have you already saved towards this goal?
              </Text>
            </View>

            {/* Deadline */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Deadline
              </Text>
              <Input>
                <InputField
                  placeholder="YYYY-MM-DD"
                  value={deadline}
                  onChangeText={setDeadline}
                />
              </Input>
              {errors.deadline && (
                <Text size="xs" className="mt-1 text-destructive">
                  {errors.deadline}
                </Text>
              )}
              <Text size="xs" className="mt-1 text-muted-foreground">
                Optional. When do you want to reach this goal?
              </Text>
            </View>
          </Card>

          {/* Actions */}
          <View className="gap-3">
            <Button
              variant="default"
              size="lg"
              onPress={handleSave}
              disabled={saving}>
              <ButtonText>{saving ? 'Creating...' : 'Create Goal'}</ButtonText>
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
