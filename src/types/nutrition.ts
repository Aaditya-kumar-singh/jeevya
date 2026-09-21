// ─── Nutrition Types (Phase 1A) ───────────────────────────────────────────────
// Local-first model. Records are plain JSON objects (no class instances) so the
// shape stays compatible with a future Supabase table row.
//
// RAW VS COOKED: preparation state is a first-class field. A raw food and its
// cooked counterpart are DISTINCT records with their own nutrition values —
// never assume 200 g raw equals 200 g cooked.

import { nowISO, todayCivilDate } from '@/lib/date';

/** Nutrient reference basis for a profile. */
export type NutritionBasis = 'per_100g' | 'per_100ml' | 'per_serving';

export const NUTRITION_BASES: NutritionBasis[] = ['per_100g', 'per_100ml', 'per_serving'];

/**
 * Typed serving units. Mass and volume families convert exactly (standard
 * nutrition-label equivalents: 1 cup = 240 ml, 1 tbsp = 15 ml, 1 tsp = 5 ml).
 * `piece` / `serving` are discrete and only combine with an identical unit.
 * Extend by adding members — stored records keep plain strings.
 */
export type ServingUnit =
  | 'g'
  | 'kg'
  | 'mg'
  | 'ml'
  | 'l'
  | 'piece'
  | 'serving'
  | 'cup'
  | 'bowl'
  | 'tbsp'
  | 'tsp';

export const SERVING_UNITS: ServingUnit[] = [
  'g', 'kg', 'mg', 'ml', 'l', 'piece', 'serving', 'cup', 'bowl', 'tbsp', 'tsp',
];

/** Where a food record comes from. */
export type FoodSource = 'system' | 'imported' | 'custom' | 'recipe';

export const FOOD_SOURCES: FoodSource[] = ['system', 'imported', 'custom', 'recipe'];

/**
 * Preparation/state of the food AS WEIGHED. Raw and cooked variants of the
 * same food must be stored as separate records.
 */
export type PreparationState =
  | 'raw'
  | 'cooked'
  | 'boiled'
  | 'fried'
  | 'baked'
  | 'grilled'
  | 'steamed'
  | 'other';

export const PREPARATION_STATES: PreparationState[] = [
  'raw', 'cooked', 'boiled', 'fried', 'baked', 'grilled', 'steamed', 'other',
];

/**
 * Micronutrient keys. Adding a key here extends the model with no schema
 * rewrite — values travel as a plain JSON map. Units are per-nutrient
 * conventions (mg/µg/IU) and deliberately not encoded in 1A.
 */
export type MicronutrientKey =
  | 'cholesterol'
  | 'potassium'
  | 'calcium'
  | 'iron'
  | 'magnesium'
  | 'phosphorus'
  | 'zinc'
  | 'copper'
  | 'manganese'
  | 'selenium'
  | 'vitaminA'
  | 'vitaminC'
  | 'vitaminD'
  | 'vitaminE'
  | 'vitaminK'
  | 'vitaminB1'
  | 'vitaminB2'
  | 'vitaminB3'
  | 'vitaminB5'
  | 'vitaminB6'
  | 'vitaminB7'
  | 'vitaminB12'
  | 'folate';

export const MICRONUTRIENT_KEYS: MicronutrientKey[] = [
  'cholesterol', 'potassium', 'calcium', 'iron', 'magnesium',
  'phosphorus', 'zinc', 'copper', 'manganese', 'selenium', 'vitaminA', 'vitaminC', 'vitaminD',
  'vitaminE', 'vitaminK', 'vitaminB1', 'vitaminB2', 'vitaminB3', 'vitaminB5',
  'vitaminB6', 'vitaminB7', 'vitaminB12', 'folate',
];

/** Sparse micronutrient map — absent keys mean "unknown", never zero. */
export type Micronutrients = Partial<Record<MicronutrientKey, number>>;

/** A weighed serving reference (e.g. one package, one piece). */
export interface ServingInfo {
  amount: number; // > 0
  unit: ServingUnit;
}

/**
 * Nutrient values for one reference quantity defined by `basis`:
 * per 100 g, per 100 ml, or per `servingAmount` × `servingUnit`.
 * All values finite and >= 0.
 */
export interface NutritionProfile {
  basis: NutritionBasis;
  /** Required when basis is per_serving; otherwise informational/null. */
  servingAmount: number | null;
  servingUnit: ServingUnit | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
  /** Advanced fatty-acid fields are sparse: absent means unknown, not zero. */
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;
  transFat?: number;
  micronutrients: Micronutrients;
}

export interface FoodItem {
  id: string;
  name: string;
  /** Search aliases for common names and regional terminology; aliases never create separate food records. */
  aliases?: string[];
  brand: string | null;
  category: string;
  description: string | null;
  source: FoodSource;
  /**
   * Phase 1B: provenance note (e.g. dataset authority). Optional and
   * display-only — never affects validation or calculations.
   */
  sourceDetail: string | null;
  /** Preparation state AS WEIGHED — raw vs cooked are separate records. */
  preparation: PreparationState;
  serving: ServingInfo;
  /** Optional food-specific canonical conversions. Values are grams for mass-based foods and ml for volume-based foods. */
  quantityConversions?: Partial<Record<ServingUnit, number>>;
  nutrition: NutritionProfile;
  createdAt: string; // full ISO datetime
  updatedAt: string; // full ISO datetime
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface NutritionProfileInput {
  basis: NutritionBasis;
  servingAmount?: number | null;
  servingUnit?: ServingUnit | null;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
  sodium?: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;
  transFat?: number;
  micronutrients?: Micronutrients;
}

export interface CreateFoodInput {
  name: string;
  aliases?: string[];
  brand?: string | null;
  category?: string;
  description?: string | null;
  source?: FoodSource;
  sourceDetail?: string | null;
  preparation?: PreparationState;
  serving: ServingInfo;
  quantityConversions?: Partial<Record<ServingUnit, number>>;
  nutrition: NutritionProfileInput;
}

export interface UpdateFoodInput {
  name?: string;
  aliases?: string[];
  brand?: string | null;
  category?: string;
  description?: string | null;
  source?: FoodSource;
  sourceDetail?: string | null;
  preparation?: PreparationState;
  serving?: ServingInfo;
  quantityConversions?: Partial<Record<ServingUnit, number>>;
  nutrition?: NutritionProfileInput;
}

/** A quantity requested by a future consumer (meal logging, calculator UI). */
export interface FoodQuantity {
  amount: number;
  unit: ServingUnit;
}

export type NutritionDataQuality = 'verified' | 'estimated' | 'user_entered' | 'recipe_calculated';

export interface NutritionSourceMetadata {
  quality: NutritionDataQuality;
  source: FoodSource;
  sourceDetail: string | null;
}

// ─── Meal Logging (Phase 1D) ─────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'other';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'other'];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
  other: 'Other',
};

/**
 * A single food log entry — references a FoodItem by ID and stores the
 * quantity/unit used. Nutrition is always calculated from the referenced
 * FoodItem + stored quantity, never copied into the log.
 *
 * Phase 1F: `itemType` distinguishes food vs recipe references.
 * Existing logs without this field default to 'food'.
 */
export interface FoodLogEntry {
  id: string;
  foodId: string;
  quantity: number;
  unit: ServingUnit;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  /** Phase 1F: 'food' (default) or 'recipe'. Absent on legacy records = 'food'. */
  itemType?: 'food' | 'recipe';
  createdAt: string; // full ISO datetime
  updatedAt: string; // full ISO datetime
}

export interface CreateFoodLogInput {
  foodId: string;
  quantity: number;
  unit: ServingUnit;
  mealType: MealType;
  date?: string; // defaults to today when omitted
  /** Phase 1F: 'food' (default) or 'recipe'. */
  itemType?: 'food' | 'recipe';
}

export interface UpdateFoodLogInput {
  foodId?: string;
  quantity?: number;
  unit?: ServingUnit;
  mealType?: MealType;
  date?: string;
  itemType?: 'food' | 'recipe';
}

// ─── Daily Nutrition Totals (Phase 1E) ───────────────────────────────────────

/**
 * Aggregated nutrient values. All macros are summed linearly.
 * Micronutrients use "present or absent" semantics: if a food has a value,
 * it contributes to the sum; absent micronutrients stay absent (unknown).
 */
export interface NutrientTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;
  transFat?: number;
  micronutrients: Micronutrients;
}

/** Totals for a single meal type on a given day. */
export interface MealNutritionSummary {
  mealType: MealType;
  totals: NutrientTotals;
  loggedCount: number;
  calculatedCount: number;
  unavailableCount: number;
  errorCount: number;
}

/** Full daily nutrition summary. */
export interface DailyNutritionSummary {
  date: string; // YYYY-MM-DD
  totals: NutrientTotals;
  byMeal: MealNutritionSummary[];
  loggedCount: number;
  calculatedCount: number;
  unavailableCount: number;
  errorCount: number;
}

// ─── Recipes (Phase 1F) ──────────────────────────────────────────────────────

export interface RecipeIngredient {
  id: string;
  foodId: string;
  quantity: number;
  unit: ServingUnit;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  servings: number;
  /** Optional finished-recipe quantity, enabling arbitrary consumed portions without assuming a universal dish weight. */
  totalQuantity?: FoodQuantity;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipeInput {
  name: string;
  description?: string | null;
  category?: string | null;
  servings?: number;
  totalQuantity?: FoodQuantity;
  ingredients?: CreateRecipeIngredientInput[];
}

export interface UpdateRecipeInput {
  name?: string;
  description?: string | null;
  category?: string | null;
  servings?: number;
  totalQuantity?: FoodQuantity;
  ingredients?: RecipeIngredient[];
}

export interface CreateRecipeIngredientInput {
  foodId: string;
  quantity: number;
  unit: ServingUnit;
}

// ─── Body Profile & Nutrition Targets (Phase 1G) ─────────────────────────────

export type Sex = 'male' | 'female';

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; multiplier: number }[] = [
  { value: 'sedentary', label: 'Sedentary (little or no exercise)', multiplier: 1.2 },
  { value: 'light', label: 'Light (1–3 days/week)', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderate (3–5 days/week)', multiplier: 1.55 },
  { value: 'very_active', label: 'Very Active (6–7 days/week)', multiplier: 1.725 },
  { value: 'extra_active', label: 'Extra Active (physical job + exercise)', multiplier: 1.9 },
];

export type NutritionGoal = 'lose' | 'maintain' | 'gain' | 'custom';

export const NUTRITION_GOALS: { value: NutritionGoal; label: string; defaultAdjustment: number }[] = [
  { value: 'lose', label: 'Lose Weight', defaultAdjustment: -500 },
  { value: 'maintain', label: 'Maintain Weight', defaultAdjustment: 0 },
  { value: 'gain', label: 'Gain Weight', defaultAdjustment: 300 },
  { value: 'custom', label: 'Custom', defaultAdjustment: 0 },
];

/** Body measurements and profile for BMR/TDEE calculations. */
export interface BodyProfile {
  sex: Sex;
  age: number; // years
  heightCm: number; // centimeters
  weightKg: number; // kilograms
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  /** Custom daily calorie adjustment (positive = surplus, negative = deficit). Only used when goal = 'custom'. */
  calorieAdjustment?: number;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating or updating a body profile. */
export interface BodyProfileInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  calorieAdjustment?: number;
}

/** Calculated daily nutrition targets based on body profile. */
export interface NutritionTargets {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number; // grams
  fat: number; // grams
  carbohydrates: number; // grams
  fiber: number; // grams
}

// ─── Energy Activities (Phase 1H + 1I) ───────────────────────────────────────

export type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'strength_training'
  | 'sports'
  | 'other';

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'walking', label: 'Walking' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'strength_training', label: 'Strength Training' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

export type ActivityIntensity = 'light' | 'moderate' | 'vigorous';

export const ACTIVITY_INTENSITIES: { value: ActivityIntensity; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'vigorous', label: 'Vigorous' },
];

/** MET values by activity type and intensity. */
export const MET_TABLE: Record<ActivityType, Record<ActivityIntensity, number>> = {
  walking:            { light: 2.8, moderate: 3.5, vigorous: 4.3 },
  running:            { light: 7,   moderate: 9.8, vigorous: 12 },
  cycling:            { light: 4,   moderate: 7.5, vigorous: 10 },
  swimming:           { light: 5,   moderate: 7,   vigorous: 9 },
  strength_training:  { light: 3.5, moderate: 5,   vigorous: 6 },
  sports:             { light: 5,   moderate: 7,   vigorous: 9 },
  other:              { light: 3,   moderate: 5,   vigorous: 7 },
};

export type CaloriesSource = 'manual' | 'estimated';

/**
 * A logged energy-burning activity with type, intensity, and calorie source.
 * Phase 1H records without new fields are normalized on load.
 */
export interface EnergyActivity {
  id: string;
  name: string;
  activityType: ActivityType;
  intensity: ActivityIntensity;
  durationMinutes: number | null;
  calories: number;
  caloriesSource: CaloriesSource;
  distanceKm: number | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  /** Source of this activity: manual or an external health provider. */
  source?: 'manual' | 'health_connect';
  /** External provider ID, used for imported-record deduplication. */
  externalId?: string;
  /** External provider that sourced this activity. */
  provider?: 'health_connect';
}

export interface CreateEnergyActivityInput {
  name: string;
  activityType?: ActivityType;
  intensity?: ActivityIntensity;
  durationMinutes?: number | null;
  calories?: number;
  caloriesSource?: CaloriesSource;
  distanceKm?: number | null;
  date?: string;
}

export interface UpdateEnergyActivityInput {
  name?: string;
  activityType?: ActivityType;
  intensity?: ActivityIntensity;
  durationMinutes?: number | null;
  calories?: number;
  caloriesSource?: CaloriesSource;
  distanceKm?: number | null;
  date?: string;
}

/** Input for MET-based calorie estimation. */
export interface ActivityEstimateInput {
  activityType: ActivityType;
  intensity: ActivityIntensity;
  durationMinutes: number;
  weightKg: number;
}

/** Status of daily net energy balance. */
export type EnergyBalanceStatus = 'deficit' | 'maintenance' | 'surplus';

/** Full daily energy balance summary. */
export interface DailyEnergySummary {
  date: string;
  caloriesIn: number;
  bmr: number | null; // null when no body profile
  activityCalories: number;
  caloriesOut: number;
  netCalories: number;
  calorieTarget: number | null; // null when no body profile
  remainingCalories: number | null; // null when no target
  status: EnergyBalanceStatus;
}

// ─── Nutrition & Energy Analytics (Phase 1K) ──────────────────────────────────

/** Analytics look-back window. Numbers = last N days (inclusive, ending today). */
export type NutritionAnalyticsPeriod = 7 | 30 | 90 | 365 | 'all';

export const NUTRITION_ANALYTICS_PERIODS: NutritionAnalyticsPeriod[] = [
  7, 30, 90, 365, 'all',
];

/** One civil day of combined nutrition + energy history. */
export interface NutritionAnalyticsPoint {
  date: string; // YYYY-MM-DD
  caloriesIn: number;
  caloriesOut: number;
  netCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  activityCalories: number;
}

/** Aggregated analytics over a date range. */
export interface NutritionAnalyticsSummary {
  averageCaloriesIn: number | null;
  averageCaloriesOut: number | null;
  averageNetCalories: number | null;
  averageProteinG: number | null;
  averageCarbsG: number | null;
  averageFatG: number | null;
  averageFiberG: number | null;
  averageActivityCalories: number | null;
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  totalActivityCalories: number;
  deficitDays: number;
  maintenanceDays: number;
  surplusDays: number;
  /** % of nutrition days within target ±10%. Null when no profile/target or no nutrition days. */
  targetAdherencePercent: number | null;
  /** Days with meaningful nutrition or activity data. */
  daysWithData: number;
  /** Days with meaningful nutrition data (subset of daysWithData). */
  nutritionDays: number;
  /** Days with activity calories > 0 (subset of daysWithData). */
  activeDays: number;
}

/** Full analytics result for a resolved date range. */
export interface NutritionAnalyticsResult {
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
  points: NutritionAnalyticsPoint[];
  summary: NutritionAnalyticsSummary;
}

// ─── Deterministic Nutrition Intelligence (Phase 1L) ──────────────────────────
// Neutral, deterministic, no AI / no network / no medical claims.

/** Insight category. */
export type NutritionInsightType =
  | 'calorie_target'
  | 'protein_target'
  | 'macro_balance'
  | 'energy_balance'
  | 'activity'
  | 'consistency'
  | 'meal_pattern'
  | 'missing_data';

export const NUTRITION_INSIGHT_TYPES: NutritionInsightType[] = [
  'calorie_target',
  'protein_target',
  'macro_balance',
  'energy_balance',
  'activity',
  'consistency',
  'meal_pattern',
  'missing_data',
];

/** Insight urgency. */
export type NutritionInsightSeverity = 'info' | 'warning' | 'positive';

export const NUTRITION_INSIGHT_SEVERITIES: NutritionInsightSeverity[] = [
  'info',
  'warning',
  'positive',
];

/** One deterministic actionable insight. */
export interface NutritionInsight {
  id: string;
  type: NutritionInsightType;
  severity: NutritionInsightSeverity;
  title: string;
  message: string;
  recommendation: string;
  metric?: string;
  value?: number;
  target?: number;
  dateRangeStart: string; // YYYY-MM-DD
  dateRangeEnd: string; // YYYY-MM-DD
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the current full ISO datetime string.
 * (Mirrors the sibling helpers so Nutrition stays decoupled from other modules.)
 */
export function getNowISO(): string {
  return nowISO();
}

/**
 * Today's date as YYYY-MM-DD (same UTC date-part convention used across
 * Jeevya — consistent with task due dates and goal windows).
 */
export function getTodayDate(): string {
  return todayCivilDate();
}
