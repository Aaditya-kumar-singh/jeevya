import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ArrowLeft, Plus, Minus, Edit3, Trash2, CheckCircle, Target, Clock, AlertCircle } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useFinance } from '@/hooks/useFinance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getDeadlineStatus(deadline: string): { label: string; color: string; icon: typeof Clock } {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Overdue', color: 'text-red-600 dark:text-red-400', icon: AlertCircle };
  } else if (diffDays <= 7) {
    return { label: 'Due soon', color: 'text-orange-600 dark:text-orange-400', icon: Clock };
  } else if (diffDays <= 30) {
    return { label: 'Upcoming', color: 'text-yellow-600 dark:text-yellow-400', icon: Clock };
  } else {
    return { label: 'On track', color: 'text-green-600 dark:text-green-400', icon: Clock };
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SavingsGoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { savingsGoals, loading, editSavingsGoal, removeSavingsGoal } = useFinance();

  // Find the goal
  const goal = useMemo(() => savingsGoals.find((g) => g.id === id), [savingsGoals, id]);

  // Form state for add/reduce money
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'add' | 'reduce' | null>(null);
  const [saving, setSaving] = useState(false);

  // Calculations
  const pct = useMemo(() => {
    if (!goal) return 0;
    return goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  }, [goal]);

  const remaining = useMemo(() => {
    if (!goal) return 0;
    return Math.max(0, goal.targetAmount - goal.currentAmount);
  }, [goal]);

  const isCompleted = goal ? goal.currentAmount >= goal.targetAmount : false;

  const deadlineStatus = useMemo(() => {
    if (!goal?.deadline) return null;
    return getDeadlineStatus(goal.deadline);
  }, [goal]);

  // ─── Add/Reduce Money ─────────────────────────────────────────────────────

  async function handleAmountAction() {
    if (!goal || !mode) return;

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0');
      return;
    }

    let newCurrentAmount: number;
    if (mode === 'add') {
      newCurrentAmount = goal.currentAmount + parsedAmount;
    } else {
      newCurrentAmount = Math.max(0, goal.currentAmount - parsedAmount);
    }

    // Don't allow current amount above target
    if (newCurrentAmount > goal.targetAmount) {
      Alert.alert('Error', 'Cannot add more than the target amount');
      return;
    }

    try {
      setSaving(true);
      await editSavingsGoal(goal.id, { currentAmount: newCurrentAmount });
      setAmount('');
      setMode(null);
      Alert.alert('Success', mode === 'add' ? 'Money added successfully' : 'Money reduced successfully');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update goal');
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete Goal ──────────────────────────────────────────────────────────

  function handleDelete() {
    if (!goal) return;

    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSavingsGoal(goal.id);
              Alert.alert('Deleted', 'Savings goal deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete goal');
            }
          },
        },
      ],
    );
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
            <View className="flex-1">
              <Text size="sm" className="text-muted-foreground">
                Finance · Savings Goal
              </Text>
              <Heading size="xl" className="mt-1">
                {goal.name}
              </Heading>
            </View>
            <Button variant="ghost" size="icon" onPress={() => router.push(`/finance/edit-savings-goal/${goal.id}` as Href)}>
              <Edit3 size={20} />
            </Button>
          </View>

          {/* Progress Card */}
          <Card className="w-full p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                {isCompleted ? (
                  <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                ) : (
                  <Target size={20} className="text-primary" />
                )}
                <Text size="lg" className="font-medium">
                  {isCompleted ? 'Goal Completed!' : 'Progress'}
                </Text>
              </View>
              <Text size="lg" className="font-bold">
                {pct}%
              </Text>
            </View>

            <Progress value={pct} className="mt-3">
              <ProgressFilledTrack />
            </Progress>

            <View className="mt-3 flex-row justify-between">
              <Text size="sm" className="text-muted-foreground">
                Saved: {formatCurrency(goal.currentAmount)}
              </Text>
              <Text size="sm" className="text-muted-foreground">
                Target: {formatCurrency(goal.targetAmount)}
              </Text>
            </View>

            {!isCompleted && (
              <Text size="xs" className="mt-2 text-muted-foreground">
                {formatCurrency(remaining)} remaining to reach your goal
              </Text>
            )}
          </Card>

          {/* Deadline */}
          {goal.deadline && (
            <Card className="w-full p-4">
              <View className="flex-row items-center gap-2">
                {deadlineStatus && <deadlineStatus.icon size={16} className={deadlineStatus.color} />}
                <View className="flex-1">
                  <Text size="sm" className="font-medium">
                    Deadline
                  </Text>
                  <Text size="xs" className="text-muted-foreground">
                    {formatDate(goal.deadline)}
                  </Text>
                </View>
                {deadlineStatus && (
                  <Text size="xs" className={deadlineStatus.color}>
                    {deadlineStatus.label}
                  </Text>
                )}
              </View>
            </Card>
          )}

          {/* Add/Reduce Money */}
          {!isCompleted && (
            <Card className="w-full p-4">
              <Text size="md" className="font-medium">
                Update Saved Amount
              </Text>

              <View className="mt-3 flex-row gap-3">
                <Button
                  variant={mode === 'add' ? 'default' : 'outline'}
                  className="flex-1"
                  onPress={() => setMode(mode === 'add' ? null : 'add')}>
                  <Plus size={16} />
                  <ButtonText>Add Money</ButtonText>
                </Button>
                <Button
                  variant={mode === 'reduce' ? 'destructive' : 'outline'}
                  className="flex-1"
                  onPress={() => setMode(mode === 'reduce' ? null : 'reduce')}>
                  <Minus size={16} />
                  <ButtonText>Reduce</ButtonText>
                </Button>
              </View>

              {mode && (
                <View className="mt-3 gap-3">
                  <Input>
                    <InputField
                      placeholder="Enter amount"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                    />
                  </Input>
                  <Button
                    variant={mode === 'add' ? 'default' : 'destructive'}
                    onPress={handleAmountAction}
                    disabled={saving || !amount}>
                    <ButtonText>
                      {saving ? 'Processing...' : mode === 'add' ? 'Add Money' : 'Reduce Amount'}
                    </ButtonText>
                  </Button>
                </View>
              )}
            </Card>
          )}

          {/* Actions */}
          <Card className="w-full p-4">
            <View className="gap-3">
              <Button
                variant="outline"
                onPress={() => router.push(`/finance/edit-savings-goal/${goal.id}` as Href)}>
                <Edit3 size={16} />
                <ButtonText>Edit Goal</ButtonText>
              </Button>
              <Button variant="destructive" onPress={handleDelete}>
                <Trash2 size={16} />
                <ButtonText>Delete Goal</ButtonText>
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
