// ─── Nutrition Targets Screen (Phase 1G) ─────────────────────────────────────
// Body profile management and daily nutrition target display.
// Uses Mifflin-St Jeor for BMR, activity multipliers for TDEE,
// and goal-based calorie adjustments.

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Save,
  Trash2,
  User,
  Calculator,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { useNutrition } from '@/hooks/useNutrition';
import {
  ACTIVITY_LEVELS,
  NUTRITION_GOALS,
  SEX_OPTIONS,
} from '@/types/nutrition';
import type {
  ActivityLevel,
  BodyProfile,
  BodyProfileInput,
  NutritionGoal,
  NutritionTargets,
  Sex,
} from '@/types/nutrition';

// ─── Display Helpers ──────────────────────────────────────────────────────────

function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dt.toISOString().slice(0, 10);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NutritionTargetsScreen() {
  const router = useRouter();
  const {
    bodyProfile,
    targets,
    loading,
    refreshing,
    addBodyProfile,
    editBodyProfile,
    removeBodyProfile,
    refresh,
  } = useNutrition();

  const [isEditing, setIsEditing] = useState(!bodyProfile);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [sex, setSex] = useState<Sex>(bodyProfile?.sex ?? 'male');
  const [age, setAge] = useState(bodyProfile?.age?.toString() ?? '');
  const [heightCm, setHeightCm] = useState(bodyProfile?.heightCm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(bodyProfile?.weightKg?.toString() ?? '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    bodyProfile?.activityLevel ?? 'sedentary',
  );
  const [goal, setGoal] = useState<NutritionGoal>(bodyProfile?.goal ?? 'maintain');
  const [calorieAdjustment, setCalorieAdjustment] = useState(
    bodyProfile?.calorieAdjustment?.toString() ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form when profile loads
  useEffect(() => {
    if (bodyProfile) {
      setSex(bodyProfile.sex);
      setAge(bodyProfile.age.toString());
      setHeightCm(bodyProfile.heightCm.toString());
      setWeightKg(bodyProfile.weightKg.toString());
      setActivityLevel(bodyProfile.activityLevel);
      setGoal(bodyProfile.goal);
      setCalorieAdjustment(bodyProfile.calorieAdjustment?.toString() ?? '');
    }
  }, [bodyProfile]);

  const handleSave = useCallback(async () => {
    setError(null);
    const ageNum = parseFloat(age);
    const heightNum = parseFloat(heightCm);
    const weightNum = parseFloat(weightKg);
    const adjustmentNum = calorieAdjustment ? parseFloat(calorieAdjustment) : undefined;

    if (!Number.isFinite(ageNum) || ageNum <= 0 || ageNum >= 150) {
      setError('Age must be between 0 and 150');
      return;
    }
    if (!Number.isFinite(heightNum) || heightNum <= 0 || heightNum >= 300) {
      setError('Height must be between 0 and 300 cm');
      return;
    }
    if (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum >= 500) {
      setError('Weight must be between 0 and 500 kg');
      return;
    }
    if (calorieAdjustment !== '' && !Number.isFinite(adjustmentNum!)) {
      setError('Invalid calorie adjustment');
      return;
    }

    const input: BodyProfileInput = {
      sex,
      age: ageNum,
      heightCm: heightNum,
      weightKg: weightNum,
      activityLevel,
      goal,
      calorieAdjustment: adjustmentNum,
    };

    try {
      setSaving(true);
      if (bodyProfile) {
        await editBodyProfile(input);
      } else {
        await addBodyProfile(input);
      }
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [bodyProfile, sex, age, heightCm, weightKg, activityLevel, goal, calorieAdjustment, addBodyProfile, editBodyProfile]);

  const handleDelete = useCallback(async () => {
    try {
      setSaving(true);
      await removeBodyProfile();
      setIsEditing(true);
      setSex('male');
      setAge('');
      setHeightCm('');
      setWeightKg('');
      setActivityLevel('sedentary');
      setGoal('maintain');
      setCalorieAdjustment('');
      setShowDeleteConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete profile');
    } finally {
      setSaving(false);
    }
  }, [removeBodyProfile]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="min-h-[44px] min-w-[44px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} className="text-foreground" />
          </Pressable>
          <Heading size="lg">Nutrition Targets</Heading>
        </View>
        {bodyProfile && !isEditing && (
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setIsEditing(true)}
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <User size={20} className="text-primary" />
            </Pressable>
            <Pressable
              onPress={() => setShowDeleteConfirm(true)}
              className="min-h-[44px] min-w-[44px] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Delete profile"
            >
              <Trash2 size={20} className="text-destructive" />
            </Pressable>
          </View>
        )}
      </View>

      {error && (
        <Card className="p-4 mb-4 bg-destructive/10">
          <Text className="text-destructive">{error}</Text>
        </Card>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Card className="p-4 mb-4 bg-destructive/10">
          <Text className="text-destructive mb-4">
            Delete your body profile? This will remove all nutrition targets.
          </Text>
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowDeleteConfirm(false)}
              className="flex-1"
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={handleDelete}
              disabled={saving}
              className="flex-1"
            >
              <ButtonText>{saving ? 'Deleting...' : 'Delete'}</ButtonText>
            </Button>
          </View>
        </Card>
      )}

      {/* Profile Form */}
      {isEditing ? (
        <Card className="p-4 mb-4">
          <Heading size="sm" className="mb-4">Body Profile</Heading>

          {/* Sex */}
          <Text size="sm" className="mb-2 text-muted-foreground">Sex</Text>
          <View className="flex-row gap-2 mb-4">
            {SEX_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setSex(option.value)}
                className={`flex-1 p-3 rounded-lg border ${
                  sex === option.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border'
                }`}
                accessibilityRole="radio"
                accessibilityState={{ checked: sex === option.value }}
                accessibilityLabel={option.label}
              >
                <Text
                  size="sm"
                  className={`text-center ${
                    sex === option.value ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Age */}
          <Text size="sm" className="mb-2 text-muted-foreground">Age (years)</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="e.g., 25"
            className="p-3 rounded-lg border border-border mb-4 text-foreground"
            accessibilityLabel="Age in years"
          />

          {/* Height */}
          <Text size="sm" className="mb-2 text-muted-foreground">Height (cm)</Text>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
            placeholder="e.g., 170"
            className="p-3 rounded-lg border border-border mb-4 text-foreground"
            accessibilityLabel="Height in centimeters"
          />

          {/* Weight */}
          <Text size="sm" className="mb-2 text-muted-foreground">Weight (kg)</Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="numeric"
            placeholder="e.g., 70"
            className="p-3 rounded-lg border border-border mb-4 text-foreground"
            accessibilityLabel="Weight in kilograms"
          />

          {/* Activity Level */}
          <Text size="sm" className="mb-2 text-muted-foreground">Activity Level</Text>
          <View className="gap-2 mb-4">
            {ACTIVITY_LEVELS.map((level) => (
              <Pressable
                key={level.value}
                onPress={() => setActivityLevel(level.value)}
                className={`p-3 rounded-lg border ${
                  activityLevel === level.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border'
                }`}
                accessibilityRole="radio"
                accessibilityState={{ checked: activityLevel === level.value }}
                accessibilityLabel={level.label}
              >
                <Text
                  size="sm"
                  className={
                    activityLevel === level.value ? 'text-primary font-medium' : 'text-muted-foreground'
                  }
                >
                  {level.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Goal */}
          <Text size="sm" className="mb-2 text-muted-foreground">Goal</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {NUTRITION_GOALS.map((g) => (
              <Pressable
                key={g.value}
                onPress={() => setGoal(g.value)}
                className={`px-4 py-3 rounded-lg border ${
                  goal === g.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border'
                }`}
                accessibilityRole="radio"
                accessibilityState={{ checked: goal === g.value }}
                accessibilityLabel={g.label}
              >
                <Text
                  size="sm"
                  className={
                    goal === g.value ? 'text-primary font-medium' : 'text-muted-foreground'
                  }
                >
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Calorie Adjustment (custom only) */}
          {goal === 'custom' && (
            <>
              <Text size="sm" className="mb-2 text-muted-foreground">
                Daily Calorie Adjustment (kcal)
              </Text>
              <TextInput
                value={calorieAdjustment}
                onChangeText={setCalorieAdjustment}
                keyboardType="numeric"
                placeholder="e.g., -300 or +200"
                className="p-3 rounded-lg border border-border mb-4 text-foreground"
                accessibilityLabel="Daily calorie adjustment"
              />
            </>
          )}

          {/* Save Button */}
          <Button
            onPress={handleSave}
            disabled={saving}
            className="w-full"
          >
            <ButtonText>
              {saving ? 'Saving...' : bodyProfile ? 'Update Profile' : 'Create Profile'}
            </ButtonText>
          </Button>
        </Card>
      ) : bodyProfile && targets ? (
        <>
          {/* Profile Summary */}
          <Card className="p-4 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <Heading size="sm">Your Profile</Heading>
            </View>
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text size="sm" className="text-muted-foreground">Sex</Text>
                <Text size="sm">{bodyProfile.sex === 'male' ? 'Male' : 'Female'}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="sm" className="text-muted-foreground">Age</Text>
                <Text size="sm">{bodyProfile.age} years</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="sm" className="text-muted-foreground">Height</Text>
                <Text size="sm">{bodyProfile.heightCm} cm</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="sm" className="text-muted-foreground">Weight</Text>
                <Text size="sm">{bodyProfile.weightKg} kg</Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="sm" className="text-muted-foreground">Activity</Text>
                <Text size="sm">
                  {ACTIVITY_LEVELS.find((l) => l.value === bodyProfile.activityLevel)?.label ?? bodyProfile.activityLevel}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text size="sm" className="text-muted-foreground">Goal</Text>
                <Text size="sm">
                  {NUTRITION_GOALS.find((g) => g.value === bodyProfile.goal)?.label ?? bodyProfile.goal}
                </Text>
              </View>
            </View>
          </Card>

          {/* Calculated Targets */}
          <Card className="p-4 mb-4">
            <Heading size="sm" className="mb-4">Daily Targets</Heading>
            <View className="gap-3">
              <TargetRow label="BMR" value={`${fmt(targets.bmr)} kcal`} />
              <TargetRow label="TDEE" value={`${fmt(targets.tdee)} kcal`} />
              <View className="h-px bg-border my-2" />
              <TargetRow
                label="Target Calories"
                value={`${fmt(targets.targetCalories)} kcal`}
                primary
              />
              <TargetRow label="Protein" value={`${targets.protein} g`} />
              <TargetRow label="Carbohydrates" value={`${targets.carbohydrates} g`} />
              <TargetRow label="Fat" value={`${targets.fat} g`} />
              <TargetRow label="Fiber" value={`${targets.fiber} g`} />
            </View>
          </Card>
        </>
      ) : (
        /* Empty State */
        <Card className="p-6 items-center">
          <Calculator size={48} className="text-muted-foreground mb-4" />
          <Heading size="sm" className="mb-2 text-center">No Profile Yet</Heading>
          <Text size="sm" className="text-muted-foreground text-center mb-4">
            Create a body profile to calculate your BMR, TDEE, and daily nutrition targets.
          </Text>
          <Button onPress={() => setIsEditing(true)}>
            <ButtonText>Create Profile</ButtonText>
          </Button>
        </Card>
      )}
    </ScrollView>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function TargetRow({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center">
      <Text size="sm" className={primary ? 'font-medium' : 'text-muted-foreground'}>
        {label}
      </Text>
      <Text size="sm" className={primary ? 'font-bold text-primary' : 'font-medium'}>
        {value}
      </Text>
    </View>
  );
}