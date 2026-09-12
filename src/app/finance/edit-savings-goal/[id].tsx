import { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationErrors {
  name?: string;
  targetAmount?: string;
  deadline?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EditSavingsGoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { savingsGoals, loading, editSavingsGoal } = useFinance();

  // Find the goal
  const goal = useMemo(() => savingsGoals.find((g) => g.id === id), [savingsGoals, id]);

  // Form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);

  // Initialize form with goal data
  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.targetAmount));
      setDeadline(goal.deadline || '');
    }
  }, [goal]);

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

    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      newErrors.deadline = 'Please enter a valid date (YYYY-MM-DD)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate() || !goal) return;

    try {
      setSaving(true);
      await editSavingsGoal(goal.id, {
        name: name.trim(),
        targetAmount: parseFloat(targetAmount),
        deadline: deadline || '',
      });

      Alert.alert('Success', 'Savings goal updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update savings goal');
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text size="sm" className="mt-3 text-muted-foreground">
            Loading goal...
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Not found
  if (!goal) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text size="md" className="text-center font-medium">
            Goal not found
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
                Finance · Edit Savings Goal
              </Text>
              <Heading size="xl" className="mt-1">
                Edit Goal
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

            {/* Current Amount (read-only) */}
            <View>
              <Text size="sm" className="mb-1 font-medium text-foreground">
                Current Amount
              </Text>
              <Card className="p-3">
                <Text size="md" className="font-medium">
                  ₹{goal.currentAmount.toLocaleString('en-IN')}
                </Text>
              </Card>
              <Text size="xs" className="mt-1 text-muted-foreground">
                Use the goal detail screen to add or reduce money
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
              <ButtonText>{saving ? 'Saving...' : 'Save Changes'}</ButtonText>
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
