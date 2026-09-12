import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useBooks } from '@/hooks/useBooks';
import { useBookGoals } from '@/hooks/useBookGoals';
import {
  formatGoalPeriod,
  getGoalProgress,
  isGoalActive,
  monthRange,
  yearRange,
} from '@/services/book-goals';
import {
  BOOK_GOAL_PERIOD_LABELS,
  BOOK_GOAL_PERIODS,
  BOOK_GOAL_TYPE_LABELS,
  BOOK_GOAL_TYPES,
  type BookGoal,
  type BookGoalPeriod,
  type BookGoalType,
} from '@/types/book-goals';

// ─── Goal Form (create + edit) ────────────────────────────────────────────────

interface GoalFormValue {
  type: BookGoalType;
  period: BookGoalPeriod;
  target: string;
  year: string;
  month: string;
}

function defaultForm(now: Date): GoalFormValue {
  return {
    type: 'books',
    period: 'monthly',
    target: '',
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
  };
}

function formFromGoal(goal: BookGoal): GoalFormValue {
  const [y, m] = goal.startDate.split('-').map(Number);
  return {
    type: goal.type,
    period: goal.period,
    target: String(goal.target),
    year: Number.isInteger(y) ? String(y) : '',
    month: Number.isInteger(m) ? String(m) : '',
  };
}

function GoalForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: GoalFormValue;
  saving: boolean;
  onSave: (value: GoalFormValue) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<GoalFormValue>(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<GoalFormValue>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    if (error) setError(null);
  };

  // Live range preview — invalid input shows a hint instead of a range.
  let rangePreview: string | null = null;
  const yearNum = parseInt(form.year, 10);
  const monthNum = parseInt(form.month, 10);
  try {
    const range =
      form.period === 'monthly'
        ? monthRange(yearNum, monthNum)
        : yearRange(yearNum);
    rangePreview = `${range.start} → ${range.end}`;
  } catch {
    rangePreview = null;
  }

  const handleSave = () => {
    if (!/^\d+$/.test(form.target.trim()) || parseInt(form.target, 10) < 1) {
      setError('Target must be a positive whole number');
      return;
    }
    if (!rangePreview) {
      setError(
        form.period === 'monthly'
          ? 'Enter a valid year and month (1–12)'
          : 'Enter a valid year',
      );
      return;
    }
    onSave(form);
  };

  return (
    <Card className="w-full p-4">
      <Text size="sm" className="mb-2 font-medium">
        Goal type
      </Text>
      <View className="flex-row gap-2">
        {BOOK_GOAL_TYPES.map((t) => {
          const active = form.type === t;
          return (
            <Pressable
              key={t}
              onPress={() => set({ type: t })}
              disabled={saving}
              className={`min-h-[44px] flex-1 items-center justify-center rounded-xl px-2 py-3 ${
                active
                  ? 'border-2 border-primary bg-accent'
                  : 'border-2 border-border bg-card'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${BOOK_GOAL_TYPE_LABELS[t]} goal`}
            >
              <Text
                size="sm"
                className={`font-medium ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {BOOK_GOAL_TYPE_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text size="sm" className="mb-2 mt-4 font-medium">
        Period
      </Text>
      <View className="flex-row gap-2">
        {BOOK_GOAL_PERIODS.map((p) => {
          const active = form.period === p;
          return (
            <Pressable
              key={p}
              onPress={() => set({ period: p })}
              disabled={saving}
              className={`min-h-[44px] flex-1 items-center justify-center rounded-xl px-2 py-3 ${
                active
                  ? 'border-2 border-primary bg-accent'
                  : 'border-2 border-border bg-card'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${BOOK_GOAL_PERIOD_LABELS[p]} goal`}
            >
              <Text
                size="sm"
                className={`font-medium ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {BOOK_GOAL_PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text size="sm" className="mb-2 mt-4 font-medium">
        Target
      </Text>
      <Input>
        <InputField
          placeholder={form.type === 'books' ? 'e.g. 4 books' : 'e.g. 1000 pages'}
          value={form.target}
          onChangeText={(text: string) => set({ target: text })}
          keyboardType="number-pad"
          editable={!saving}
          accessibilityLabel="Goal target, positive whole number"
        />
      </Input>

      <View className="mt-4 flex-row gap-2">
        <View className="flex-1">
          <Text size="sm" className="mb-2 font-medium">
            Year
          </Text>
          <Input>
            <InputField
              placeholder="2026"
              value={form.year}
              onChangeText={(text: string) => set({ year: text })}
              keyboardType="number-pad"
              maxLength={4}
              editable={!saving}
              accessibilityLabel="Goal year"
            />
          </Input>
        </View>
        {form.period === 'monthly' ? (
          <View className="flex-1">
            <Text size="sm" className="mb-2 font-medium">
              Month
            </Text>
            <Input>
              <InputField
                placeholder="1–12"
                value={form.month}
                onChangeText={(text: string) => set({ month: text })}
                keyboardType="number-pad"
                maxLength={2}
                editable={!saving}
                accessibilityLabel="Goal month, 1 to 12"
              />
            </Input>
          </View>
        ) : null}
      </View>

      <Text size="xs" className="mt-2 text-muted-foreground">
        {rangePreview ?? 'Enter a valid period above'}
      </Text>
      {error ? (
        <Text size="xs" className="mt-1 text-destructive">
          {error}
        </Text>
      ) : null}

      <View className="mt-3 flex-row gap-2">
        <Button
          variant="outline"
          className="min-h-[44px] flex-1"
          onPress={onCancel}
          disabled={saving}
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button
          variant="default"
          className="min-h-[44px] flex-1"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" className="text-primary-foreground" />
          ) : (
            <ButtonText>Save Goal</ButtonText>
          )}
        </Button>
      </View>
    </Card>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  achieved,
  remaining,
  percent,
  completed,
  active,
  onEdit,
  onDelete,
}: {
  goal: BookGoal;
  achieved: number;
  remaining: number;
  percent: number;
  completed: boolean;
  active: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const unit = goal.type === 'books' ? 'books' : 'pages';
  return (
    <Card className="w-full p-4">
      <View className="flex-row items-center gap-2">
        <Badge variant={completed ? 'default' : 'secondary'}>
          <BadgeText>
            {BOOK_GOAL_TYPE_LABELS[goal.type]} · {BOOK_GOAL_PERIOD_LABELS[goal.period]}
          </BadgeText>
        </Badge>
        <View className="flex-1" />
        {completed ? (
          <View
            className="flex-row items-center gap-1"
            accessibilityLabel="Goal completed"
          >
            <CheckCircle size={14} className="text-green-500" />
            <Text size="xs" className="font-medium text-green-500">
              Done
            </Text>
          </View>
        ) : (
          <Text size="xs" className="text-muted-foreground">
            {active ? 'Active' : 'Ended'}
          </Text>
        )}
      </View>

      <View
        className="mt-2 flex-row items-baseline justify-between"
        accessibilityRole="text"
        accessibilityLabel={`${formatGoalPeriod(goal)}: ${achieved} of ${goal.target} ${unit}, ${percent} percent`}
      >
        <Heading size="md">{formatGoalPeriod(goal)}</Heading>
        <Text size="sm" className="text-muted-foreground">
          {achieved}/{goal.target} {unit}
        </Text>
      </View>
      <Progress value={percent} className="mt-2">
        <ProgressFilledTrack />
      </Progress>
      <Text size="xs" className="mt-1 text-muted-foreground">
        {percent}% · {remaining} {unit} remaining
      </Text>

      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={onEdit}
          className="min-h-[44px] flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-muted"
          accessibilityRole="button"
          accessibilityLabel={`Edit goal for ${formatGoalPeriod(goal)}`}
        >
          <Pencil size={14} className="text-muted-foreground" />
          <Text size="sm" className="font-medium text-muted-foreground">
            Edit
          </Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="min-h-[44px] flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-muted"
          accessibilityRole="button"
          accessibilityLabel={`Delete goal for ${formatGoalPeriod(goal)}`}
        >
          <Trash2 size={14} className="text-destructive" />
          <Text size="sm" className="font-medium text-destructive">
            Delete
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BookGoalsScreen() {
  const router = useRouter();
  const { books } = useBooks();
  const {
    goals,
    loading,
    refreshing,
    error,
    refresh,
    addGoal,
    editGoal,
    removeGoal,
  } = useBookGoals();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const progressById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getGoalProgress>>();
    for (const goal of goals) map.set(goal.id, getGoalProgress(goal, books));
    return map;
  }, [goals, books]);

  // Active windows first, then history — everything stays readable.
  const ordered = useMemo(
    () =>
      [...goals].sort((a, b) => {
        const aa = isGoalActive(a, today) ? 0 : 1;
        const bb = isGoalActive(b, today) ? 0 : 1;
        return aa - bb || b.startDate.localeCompare(a.startDate);
      }),
    [goals, today],
  );

  const editingGoal = editingId ? goals.find((g) => g.id === editingId) ?? null : null;

  const resolveRange = (value: GoalFormValue) => {
    const yearNum = parseInt(value.year, 10);
    const monthNum = parseInt(value.month, 10);
    return value.period === 'monthly'
      ? monthRange(yearNum, monthNum)
      : yearRange(yearNum);
  };

  const handleCreate = async (value: GoalFormValue) => {
    setSaving(true);
    setFormError(null);
    try {
      const range = resolveRange(value);
      await addGoal({
        type: value.type,
        period: value.period,
        target: parseInt(value.target, 10),
        startDate: range.start,
        endDate: range.end,
      });
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (value: GoalFormValue) => {
    if (!editingGoal) return;
    setSaving(true);
    setFormError(null);
    try {
      const range = resolveRange(value);
      await editGoal(editingGoal.id, {
        type: value.type,
        period: value.period,
        target: parseInt(value.target, 10),
        startDate: range.start,
        endDate: range.end,
      });
      setEditingId(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (goal: BookGoal) => {
    Alert.alert(
      'Delete Goal',
      `Remove the ${formatGoalPeriod(goal)} ${goal.type} goal? Progress history is derived from books and is unaffected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                await removeGoal(goal.id);
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete goal');
              }
            })(),
        },
      ],
    );
  };

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        <Text size="sm" className="mt-3 text-muted-foreground">
          Loading goals...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
      }
    >
      <View className="gap-4 px-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={20} />
          </Button>
          <View className="flex-1">
            <Text size="sm" className="text-muted-foreground">
              Books
            </Text>
            <Heading size="xl" className="mt-1">
              Reading Goals
            </Heading>
          </View>
          {!showForm && !editingId ? (
            <Pressable
              onPress={() => {
                setFormError(null);
                setShowForm(true);
              }}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-primary px-3"
              accessibilityRole="button"
              accessibilityLabel="New reading goal"
            >
              <Plus size={18} className="text-primary-foreground" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setShowForm(false);
                setEditingId(null);
                setFormError(null);
              }}
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted px-3"
              accessibilityRole="button"
              accessibilityLabel="Close goal form"
            >
              <X size={18} className="text-muted-foreground" />
            </Pressable>
          )}
        </View>

        {error ? (
          <Card className="w-full border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <Text size="xs" className="flex-1 text-red-600 dark:text-red-400">
                {error}
              </Text>
              <Pressable onPress={() => void handleRefresh()}>
                <Text size="xs" className="font-medium text-red-600 dark:text-red-400">
                  Retry
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {showForm ? (
          <>
            <GoalForm
              initial={defaultForm(new Date())}
              saving={saving}
              onSave={(v) => void handleCreate(v)}
              onCancel={() => {
                setShowForm(false);
                setFormError(null);
              }}
            />
            {formError ? (
              <Text size="xs" className="text-destructive">
                {formError}
              </Text>
            ) : null}
          </>
        ) : null}

        {editingGoal ? (
          <>
            <GoalForm
              initial={formFromGoal(editingGoal)}
              saving={saving}
              onSave={(v) => void handleUpdate(v)}
              onCancel={() => {
                setEditingId(null);
                setFormError(null);
              }}
            />
            {formError ? (
              <Text size="xs" className="text-destructive">
                {formError}
              </Text>
            ) : null}
          </>
        ) : null}

        {ordered.length === 0 && !showForm ? (
          <Card className="w-full items-center p-6">
            <Target size={28} className="text-muted-foreground" />
            <Heading size="md" className="mt-3 text-center">
              No reading goals yet
            </Heading>
            <Text size="sm" className="mt-1 text-center text-muted-foreground">
              Set a monthly or yearly books/pages target to track your reading.
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {ordered.map((goal) => {
              const p = progressById.get(goal.id) ?? {
                achieved: 0,
                remaining: goal.target,
                percent: 0,
                completed: false,
              };
              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  achieved={p.achieved}
                  remaining={p.remaining}
                  percent={p.percent}
                  completed={p.completed}
                  active={isGoalActive(goal, today)}
                  onEdit={() => {
                    setShowForm(false);
                    setFormError(null);
                    setEditingId(goal.id);
                  }}
                  onDelete={() => handleDelete(goal)}
                />
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
