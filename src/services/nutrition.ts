// ─── Nutrition Service (Phase 1A) ─────────────────────────────────────────────
// Local-first AsyncStorage CRUD for custom/system foods, mirroring the
// Journal/Books service architecture: same storage.ts helpers, same uid()
// IDs, same normalize-on-load pattern, same write-serialization reliability,
// plain JSON records (Supabase-row compatible). No network, no AI.
//
// Also home to the pure quantity calculation engine (no storage, no JSX):
// scale any food's profile to an arbitrary valid quantity. Internal math stays
// precise — rounding is a presentation concern for later phases.

import { saveData, loadData } from '@/lib/storage';
import { uid } from '@/lib/uid';
import { SYSTEM_FOODS } from '@/lib/system-foods';
import {
  ACTIVITY_INTENSITIES,
  ACTIVITY_LEVELS,
  ACTIVITY_TYPES,
  FOOD_SOURCES,
  MEAL_TYPES,
  MET_TABLE,
  MICRONUTRIENT_KEYS,
  NUTRITION_BASES,
  NUTRITION_GOALS,
  PREPARATION_STATES,
  SERVING_UNITS,
  getNowISO,
  getTodayDate,
  type ActivityEstimateInput,
  type ActivityIntensity,
  type ActivityLevel,
  type ActivityType,
  type BodyProfile,
  type BodyProfileInput,
  type CaloriesSource,
  type CreateEnergyActivityInput,
  type CreateFoodInput,
  type CreateFoodLogInput,
  type CreateRecipeInput,
  type DailyEnergySummary,
  type DailyNutritionSummary,
  type EnergyActivity,
  type FoodItem,
  type FoodLogEntry,
  type FoodQuantity,
  type FoodSource,
  type MealNutritionSummary,
  type MealType,
  type MicronutrientKey,
  type Micronutrients,
  type NutritionAnalyticsPeriod,
  type NutritionAnalyticsPoint,
  type NutritionAnalyticsResult,
  type NutritionAnalyticsSummary,
  type NutritionBasis,
  type NutritionGoal,
  type NutritionInsight,
  type NutritionInsightSeverity,
  type NutritionInsightType,
  type NutritionProfile,
  type NutritionProfileInput,
  type NutritionTargets,
  type NutrientTotals,
  type NutritionSourceMetadata,
  type PreparationState,
  type Recipe,
  type RecipeIngredient,
  type ServingInfo,
  type ServingUnit,
  type Sex,
  type UpdateEnergyActivityInput,
  type UpdateFoodInput,
  type UpdateFoodLogInput,
  type UpdateRecipeInput,
} from '@/types/nutrition';

// ─── Storage Key ──────────────────────────────────────────────────────────────

const FOODS_KEY = 'jeevya:nutrition:foods';

// ─── Validation Limits ────────────────────────────────────────────────────────

export const FOOD_NAME_MAX = 200;
export const FOOD_BRAND_MAX = 200;
export const FOOD_CATEGORY_MAX = 100;
export const FOOD_DESCRIPTION_MAX = 2000;
export const FOOD_SOURCE_DETAIL_MAX = 500;

// ─── Unit System ──────────────────────────────────────────────────────────────

type UnitFamily = 'mass' | 'volume' | 'count';

const UNIT_FAMILY: Record<ServingUnit, UnitFamily> = {
  g: 'mass', kg: 'mass', mg: 'mass',
  ml: 'volume', l: 'volume', cup: 'volume', bowl: 'volume', tbsp: 'volume', tsp: 'volume',
  piece: 'count', serving: 'count',
};

/** Exact factors to base units (grams / milliliters). Household volumes use
 *  standard nutrition-label equivalents: cup 240 ml, tbsp 15 ml, tsp 5 ml. */
const UNIT_TO_BASE: Record<ServingUnit, number> = {
  g: 1, kg: 1000, mg: 0.001,
  ml: 1, l: 1000, cup: 240, bowl: 400, tbsp: 15, tsp: 5,
  piece: 1, serving: 1,
};

function isValidUnit(value: unknown): value is ServingUnit {
  return typeof value === 'string' && (SERVING_UNITS as string[]).includes(value);
}

/**
 * Return the unit vocabulary compatible with a food's nutrition basis.
 * - per_100g  → mass units
 * - per_100ml → volume units
 * - per_serving → depends on the serving unit's family
 *
 * Count families (piece/serving) only allow their exact matching unit.
 */
export function compatibleUnits(food: Pick<FoodItem, 'nutrition'>): ServingUnit[] {
  const n = food.nutrition;
  switch (n.basis) {
    case 'per_100g':
      return ['g', 'kg', 'mg'];
    case 'per_100ml':
      return ['ml', 'l', 'cup', 'tbsp', 'tsp'];
    case 'per_serving': {
      const servingUnit = n.servingUnit as ServingUnit;
      const family = UNIT_FAMILY[servingUnit];
      if (family === 'count') return [servingUnit];
      if (family === 'mass') return ['g', 'kg', 'mg'];
      if (family === 'volume') return ['ml', 'l', 'cup', 'tbsp', 'tsp'];
      return [servingUnit];
    }
    default:
      return [...SERVING_UNITS];
  }
}

function isValidBasis(value: unknown): value is NutritionBasis {
  return typeof value === 'string' && (NUTRITION_BASES as string[]).includes(value);
}

function isValidSource(value: unknown): value is FoodSource {
  return typeof value === 'string' && (FOOD_SOURCES as string[]).includes(value);
}

function isValidPreparation(value: unknown): value is PreparationState {
  return (
    typeof value === 'string' &&
    (PREPARATION_STATES as string[]).includes(value)
  );
}

/** Finite and >= 0. Rejects NaN, Infinity, negatives, non-numbers. */
function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

// ─── Normalization (malformed/legacy records degrade, never crash) ────────────

function toAmount(value: unknown, fallback: number): number {
  return isValidAmount(value) ? value : fallback;
}

function toUnit(value: unknown): ServingUnit {
  return isValidUnit(value) ? value : 'serving';
}

function normalizeMicros(raw: unknown): Micronutrients {
  const out: Micronutrients = {};
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const record = raw as Record<string, unknown>;
  for (const key of MICRONUTRIENT_KEYS) {
    const v = record[key];
    // Invalid micro values are dropped (unknown), never zero-filled — a
    // missing key means "unknown", which downstream math must respect.
    if (isValidAmount(v)) out[key] = v;
  }
  return out;
}

function normalizeProfile(raw: unknown): NutritionProfile {
  const r = (raw != null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw
    : {}) as Record<string, unknown>;
  const basis = isValidBasis(r.basis) ? r.basis : 'per_100g';
  const optionalFat = (key: string): number | undefined =>
    isValidAmount(r[key]) ? r[key] : undefined;
  const servingAmount =
    r.servingAmount == null || r.servingAmount === ''
      ? null
      : toAmount(r.servingAmount, 0) || null;
  return {
    basis,
    servingAmount,
    servingUnit: r.servingUnit == null || r.servingUnit === '' ? null : toUnit(r.servingUnit),
    calories: toAmount(r.calories, 0),
    protein: toAmount(r.protein, 0),
    carbohydrates: toAmount(r.carbohydrates, 0),
    fat: toAmount(r.fat, 0),
    fiber: toAmount(r.fiber, 0),
    sugar: toAmount(r.sugar, 0),
    saturatedFat: toAmount(r.saturatedFat, 0),
    sodium: toAmount(r.sodium, 0),
    ...(optionalFat('monounsaturatedFat') !== undefined ? { monounsaturatedFat: optionalFat('monounsaturatedFat') } : {}),
    ...(optionalFat('polyunsaturatedFat') !== undefined ? { polyunsaturatedFat: optionalFat('polyunsaturatedFat') } : {}),
    ...(optionalFat('transFat') !== undefined ? { transFat: optionalFat('transFat') } : {}),
    micronutrients: normalizeMicros(r.micronutrients),
  };
}

function normalizeServing(raw: unknown): ServingInfo {
  const r = (raw != null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw
    : {}) as Record<string, unknown>;
  const amount = toAmount(r.amount, 0);
  return {
    amount: amount > 0 ? amount : 1,
    unit: toUnit(r.unit),
  };
}

function normalizeQuantityConversions(raw: unknown): Partial<Record<ServingUnit, number>> | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Partial<Record<ServingUnit, number>> = {};
  for (const unit of SERVING_UNITS) {
    const value = (raw as Record<string, unknown>)[unit];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) out[unit] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeAliases(raw: unknown, canonicalName?: string): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const canonical = normalizeQuery(String(canonicalName ?? ''));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const alias = value.trim().replace(/\s+/g, ' ');
    const normalized = normalizeQuery(alias);
    if (!normalized || normalized === canonical || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(alias);
  }
  return out.length > 0 ? out : undefined;
}

function toOptionalText(value: unknown, max: number): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeFood(raw: Record<string, unknown>): FoodItem {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    ...(normalizeAliases(raw.aliases, typeof raw.name === 'string' ? raw.name : undefined)
      ? { aliases: normalizeAliases(raw.aliases, typeof raw.name === 'string' ? raw.name : undefined) }
      : {}),
    brand: toOptionalText(raw.brand, FOOD_BRAND_MAX),
    category: String(raw.category ?? '').trim().slice(0, FOOD_CATEGORY_MAX),
    description: toOptionalText(raw.description, FOOD_DESCRIPTION_MAX),
    source: isValidSource(raw.source) ? raw.source : 'custom',
    sourceDetail: toOptionalText(raw.sourceDetail, FOOD_SOURCE_DETAIL_MAX),
    preparation: isValidPreparation(raw.preparation) ? raw.preparation : 'other',
    serving: normalizeServing(raw.serving),
    quantityConversions: normalizeQuantityConversions(raw.quantityConversions),
    nutrition: normalizeProfile(raw.nutrition),
    createdAt: toISOWithFallback(raw.createdAt),
    updatedAt: toISOWithFallback(raw.updatedAt),
  };
}

function toISOWithFallback(value: unknown): string {
  if (typeof value === 'string' && value !== '' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return getNowISO();
}

async function loadNormalized(): Promise<FoodItem[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(FOODS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeFood).filter((f) => f.id !== '' && f.name !== '');
  } catch {
    return [];
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function assertValidServing(serving: ServingInfo): void {
  if (!isValidUnit(serving.unit)) throw new Error('Invalid serving unit');
  if (!Number.isFinite(serving.amount) || serving.amount <= 0) {
    throw new Error('Serving amount must be greater than 0');
  }
}

function assertValidQuantityConversions(conversions: Partial<Record<ServingUnit, number>> | undefined): void {
  if (conversions == null) return;
  for (const [unit, value] of Object.entries(conversions)) {
    if (!isValidUnit(unit)) throw new Error(`Invalid quantity conversion unit: ${unit}`);
    if (!Number.isFinite(value) || (value as number) <= 0) {
      throw new Error(`Quantity conversion for ${unit} must be greater than 0`);
    }
  }
}

function assertValidProfile(profile: NutritionProfileInput): void {
  if (!isValidBasis(profile.basis)) throw new Error('Invalid nutrition basis');
  if (profile.basis === 'per_serving') {
    if (
      profile.servingAmount == null ||
      !Number.isFinite(profile.servingAmount) ||
      profile.servingAmount <= 0
    ) {
      throw new Error('Serving amount is required for per-serving nutrition');
    }
    if (!isValidUnit(profile.servingUnit)) {
      throw new Error('Serving unit is required for per-serving nutrition');
    }
  } else {
    if (
      profile.servingAmount !== undefined &&
      profile.servingAmount !== null &&
      (!Number.isFinite(profile.servingAmount) || profile.servingAmount < 0)
    ) {
      throw new Error('Invalid serving amount');
    }
    if (
      profile.servingUnit !== undefined &&
      profile.servingUnit !== null &&
      !isValidUnit(profile.servingUnit)
    ) {
      throw new Error('Invalid serving unit');
    }
  }
  const macros: [string, number | undefined][] = [
    ['Calories', profile.calories],
    ['Protein', profile.protein],
    ['Carbohydrates', profile.carbohydrates],
    ['Fat', profile.fat],
    ['Fiber', profile.fiber],
    ['Sugar', profile.sugar],
    ['Saturated fat', profile.saturatedFat],
    ['Sodium', profile.sodium],
    ['Monounsaturated fat', profile.monounsaturatedFat],
    ['Polyunsaturated fat', profile.polyunsaturatedFat],
    ['Trans fat', profile.transFat],
  ];
  for (const [label, value] of macros) {
    if (value !== undefined && !isValidAmount(value)) {
      throw new Error(`${label} must be a finite number (0 or more)`);
    }
  }
  if (profile.micronutrients !== undefined) {
    if (profile.micronutrients == null || typeof profile.micronutrients !== 'object') {
      throw new Error('Invalid micronutrients');
    }
    for (const [key, value] of Object.entries(profile.micronutrients)) {
      if (!(MICRONUTRIENT_KEYS as string[]).includes(key)) {
        throw new Error(`Unknown micronutrient: ${key}`);
      }
      if (!isValidAmount(value)) {
        throw new Error(`Micronutrient ${key} must be a finite number (0 or more)`);
      }
    }
  }
}

function buildProfile(input: NutritionProfileInput): NutritionProfile {
  assertValidProfile(input);
  const micros: Micronutrients = {};
  if (input.micronutrients) {
    for (const key of MICRONUTRIENT_KEYS) {
      const v = input.micronutrients[key];
      if (v !== undefined) micros[key] = v;
    }
  }
  return {
    basis: input.basis,
    servingAmount: input.servingAmount ?? null,
    servingUnit: input.servingUnit ?? null,
    calories: input.calories ?? 0,
    protein: input.protein ?? 0,
    carbohydrates: input.carbohydrates ?? 0,
    fat: input.fat ?? 0,
    fiber: input.fiber ?? 0,
    sugar: input.sugar ?? 0,
    saturatedFat: input.saturatedFat ?? 0,
    sodium: input.sodium ?? 0,
    ...(input.monounsaturatedFat !== undefined ? { monounsaturatedFat: input.monounsaturatedFat } : {}),
    ...(input.polyunsaturatedFat !== undefined ? { polyunsaturatedFat: input.polyunsaturatedFat } : {}),
    ...(input.transFat !== undefined ? { transFat: input.transFat } : {}),
    micronutrients: micros,
  };
}

// ─── Write Serialization (Journal reliability standard) ───────────────────────

let writeQueue: Promise<void> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Get all foods, alphabetical by name (stable for future search UI).
 */
export async function getFoods(): Promise<FoodItem[]> {
  const foods = await loadNormalized();
  return foods.sort(
    (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getFoodById(id: string): Promise<FoodItem | null> {
  const foods = await loadNormalized();
  return foods.find((f) => f.id === id) ?? null;
}

export async function createFood(input: CreateFoodInput): Promise<FoodItem> {
  return serialize(async () => {
    const name = input.name.trim();
    if (!name) throw new Error('Food name is required');
    if (name.length > FOOD_NAME_MAX) {
      throw new Error(`Food name must be ${FOOD_NAME_MAX} characters or fewer`);
    }
    if (input.source !== undefined && !isValidSource(input.source)) {
      throw new Error('Invalid food source');
    }
    if (input.preparation !== undefined && !isValidPreparation(input.preparation)) {
      throw new Error('Invalid preparation state');
    }
    assertValidServing(input.serving);
    assertValidQuantityConversions(input.quantityConversions);
    const aliases = normalizeAliases(input.aliases, name);
    const nutrition = buildProfile(input.nutrition);

    const foods = await loadNormalized();

    // IDs must be unique — regenerate on the (near-impossible) collision.
    let id = uid('food_');
    let guard = 0;
    while (foods.some((f) => f.id === id) && guard++ < 5) {
      id = uid('food_');
    }
    if (foods.some((f) => f.id === id)) {
      throw new Error('Could not generate a unique food ID');
    }

    const now = getNowISO();
    const food: FoodItem = {
      id,
      name,
      ...(aliases ? { aliases } : {}),
      brand: toOptionalText(input.brand, FOOD_BRAND_MAX),
      category: (input.category ?? '').trim().slice(0, FOOD_CATEGORY_MAX),
      description: toOptionalText(input.description, FOOD_DESCRIPTION_MAX),
      source: input.source ?? 'custom',
      sourceDetail:
        input.sourceDetail !== undefined
          ? toOptionalText(input.sourceDetail, FOOD_SOURCE_DETAIL_MAX)
          : null,
      preparation: input.preparation ?? 'other',
      serving: { amount: input.serving.amount, unit: input.serving.unit },
      ...(input.quantityConversions ? { quantityConversions: { ...input.quantityConversions } } : {}),
      nutrition,
      createdAt: now,
      updatedAt: now,
    };

    await saveData(FOODS_KEY, [food, ...foods]);
    return food;
  });
}

export async function updateFood(
  id: string,
  input: UpdateFoodInput,
): Promise<FoodItem | null> {
  return serialize(async () => {
    const foods = await loadNormalized();
    const index = foods.findIndex((f) => f.id === id);
    if (index === -1) return null;

    const food = foods[index];

    let name = food.name;
    if (input.name !== undefined) {
      name = input.name.trim();
      if (!name) throw new Error('Food name is required');
      if (name.length > FOOD_NAME_MAX) {
        throw new Error(`Food name must be ${FOOD_NAME_MAX} characters or fewer`);
      }
    }
    const aliases = input.aliases !== undefined ? normalizeAliases(input.aliases, name) : food.aliases;
    if (input.source !== undefined && !isValidSource(input.source)) {
      throw new Error('Invalid food source');
    }
    if (input.preparation !== undefined && !isValidPreparation(input.preparation)) {
      throw new Error('Invalid preparation state');
    }
    if (input.serving !== undefined) assertValidServing(input.serving);
    if (input.quantityConversions !== undefined) assertValidQuantityConversions(input.quantityConversions);

    // Full-profile replacement keeps validation total (partial patching of
    // nested nutrition would silently mix bases and units).
    let nutrition = food.nutrition;
    if (input.nutrition !== undefined) nutrition = buildProfile(input.nutrition);

    const updated: FoodItem = {
      ...food,
      name,
      ...(aliases ? { aliases } : {}),
      brand: input.brand !== undefined ? toOptionalText(input.brand, FOOD_BRAND_MAX) : food.brand,
      category:
        input.category !== undefined
          ? input.category.trim().slice(0, FOOD_CATEGORY_MAX)
          : food.category,
      description:
        input.description !== undefined
          ? toOptionalText(input.description, FOOD_DESCRIPTION_MAX)
          : food.description,
      source: input.source ?? food.source,
      sourceDetail:
        input.sourceDetail !== undefined
          ? toOptionalText(input.sourceDetail, FOOD_SOURCE_DETAIL_MAX)
          : food.sourceDetail,
      preparation: input.preparation ?? food.preparation,
      serving: input.serving ? { ...input.serving } : food.serving,
      quantityConversions:
        input.quantityConversions !== undefined
          ? { ...input.quantityConversions }
          : food.quantityConversions,
      nutrition,
      updatedAt: getNowISO(),
    };

    foods[index] = updated;
    await saveData(FOODS_KEY, foods);
    return updated;
  });
}

export async function deleteFood(id: string): Promise<boolean> {
  return serialize(async () => {
    const foods = await loadNormalized();
    const filtered = foods.filter((f) => f.id !== id);
    if (filtered.length === foods.length) return false;
    await saveData(FOODS_KEY, filtered);
    return true;
  });
}

// ─── Food Logs (Phase 1D) ────────────────────────────────────────────────────

const FOOD_LOGS_KEY = 'jeevya:nutrition:food-logs';

function isValidMealType(value: unknown): value is MealType {
  return typeof value === 'string' && (MEAL_TYPES as string[]).includes(value);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidPositiveAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function normalizeFoodLog(raw: Record<string, unknown>): FoodLogEntry {
  const itemType =
    raw.itemType === 'recipe' || raw.itemType === 'food' ? raw.itemType : undefined;
  return {
    id: String(raw.id ?? ''),
    foodId: String(raw.foodId ?? ''),
    quantity: isValidPositiveAmount(raw.quantity) ? raw.quantity : 0,
    unit: isValidUnit(raw.unit) ? raw.unit : 'serving',
    mealType: isValidMealType(raw.mealType) ? raw.mealType : 'other',
    date: isValidDate(raw.date) ? raw.date : getTodayDate(),
    ...(itemType ? { itemType } : {}),
    createdAt: toISOWithFallback(raw.createdAt),
    updatedAt: toISOWithFallback(raw.updatedAt),
  };
}

async function loadFoodLogsNormalized(): Promise<FoodLogEntry[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(FOOD_LOGS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map(normalizeFoodLog)
      .filter((l) => l.id !== '' && l.foodId !== '' && l.quantity > 0);
  } catch {
    return [];
  }
}

let foodLogWriteQueue: Promise<void> = Promise.resolve();

function serializeFoodLog<T>(fn: () => Promise<T>): Promise<T> {
  const run = foodLogWriteQueue.then(fn, fn);
  foodLogWriteQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getFoodLogs(): Promise<FoodLogEntry[]> {
  const logs = await loadFoodLogsNormalized();
  return logs.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getFoodLogById(id: string): Promise<FoodLogEntry | null> {
  const logs = await loadFoodLogsNormalized();
  return logs.find((l) => l.id === id) ?? null;
}

export async function getFoodLogsForDate(date: string): Promise<FoodLogEntry[]> {
  const logs = await loadFoodLogsNormalized();
  return logs
    .filter((l) => l.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getFoodLogsForMeal(
  date: string,
  mealType: MealType,
): Promise<FoodLogEntry[]> {
  const logs = await loadFoodLogsNormalized();
  return logs
    .filter((l) => l.date === date && l.mealType === mealType)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createFoodLog(input: CreateFoodLogInput): Promise<FoodLogEntry> {
  return serializeFoodLog(async () => {
    if (!input.foodId || typeof input.foodId !== 'string') {
      throw new Error('Valid food ID is required');
    }
    if (!isValidPositiveAmount(input.quantity)) {
      throw new Error('Quantity must be a positive number');
    }
    if (!isValidUnit(input.unit)) {
      throw new Error('Invalid serving unit');
    }
    if (!isValidMealType(input.mealType)) {
      throw new Error('Invalid meal type');
    }
    const date = input.date ?? getTodayDate();
    if (!isValidDate(date)) {
      throw new Error('Invalid date format (use YYYY-MM-DD)');
    }

    const logs = await loadFoodLogsNormalized();

    let id = uid('flog_');
    let guard = 0;
    while (logs.some((l) => l.id === id) && guard++ < 5) {
      id = uid('flog_');
    }
    if (logs.some((l) => l.id === id)) {
      throw new Error('Could not generate a unique food log ID');
    }

    const now = getNowISO();
    const entry: FoodLogEntry = {
      id,
      foodId: input.foodId,
      quantity: input.quantity,
      unit: input.unit,
      mealType: input.mealType,
      date,
      ...(input.itemType ? { itemType: input.itemType } : {}),
      createdAt: now,
      updatedAt: now,
    };

    await saveData(FOOD_LOGS_KEY, [entry, ...logs]);
    return entry;
  });
}

export async function updateFoodLog(
  id: string,
  input: UpdateFoodLogInput,
): Promise<FoodLogEntry | null> {
  return serializeFoodLog(async () => {
    const logs = await loadFoodLogsNormalized();
    const index = logs.findIndex((l) => l.id === id);
    if (index === -1) return null;

    const log = logs[index];

    if (input.foodId !== undefined) {
      if (!input.foodId || typeof input.foodId !== 'string') {
        throw new Error('Valid food ID is required');
      }
    }
    if (input.quantity !== undefined && !isValidPositiveAmount(input.quantity)) {
      throw new Error('Quantity must be a positive number');
    }
    if (input.unit !== undefined && !isValidUnit(input.unit)) {
      throw new Error('Invalid serving unit');
    }
    if (input.mealType !== undefined && !isValidMealType(input.mealType)) {
      throw new Error('Invalid meal type');
    }
    if (input.date !== undefined && !isValidDate(input.date)) {
      throw new Error('Invalid date format (use YYYY-MM-DD)');
    }

    const updated: FoodLogEntry = {
      ...log,
      foodId: input.foodId ?? log.foodId,
      quantity: input.quantity ?? log.quantity,
      unit: input.unit ?? log.unit,
      mealType: input.mealType ?? log.mealType,
      date: input.date ?? log.date,
      ...(input.itemType !== undefined ? { itemType: input.itemType } : {}),
      updatedAt: getNowISO(),
    };

    logs[index] = updated;
    await saveData(FOOD_LOGS_KEY, logs);
    return updated;
  });
}

export async function deleteFoodLog(id: string): Promise<boolean> {
  return serializeFoodLog(async () => {
    const logs = await loadFoodLogsNormalized();
    const filtered = logs.filter((l) => l.id !== id);
    if (filtered.length === logs.length) return false;
    await saveData(FOOD_LOGS_KEY, filtered);
    return true;
  });
}

// ─── Recipes (Phase 1F) ──────────────────────────────────────────────────────

const RECIPES_KEY = 'jeevya:nutrition:recipes';
const RECIPE_NAME_MAX = 200;
const RECIPE_DESCRIPTION_MAX = 2000;
const RECIPE_CATEGORY_MAX = 100;

// ─── Recipe Normalization ─────────────────────────────────────────────────────

function normalizeRecipeIngredient(raw: Record<string, unknown>): RecipeIngredient {
  return {
    id: String(raw.id ?? ''),
    foodId: String(raw.foodId ?? ''),
    quantity: isValidPositiveAmount(raw.quantity) ? raw.quantity : 0,
    unit: isValidUnit(raw.unit) ? raw.unit : 'serving',
  };
}

function normalizeRecipe(raw: Record<string, unknown>): Recipe {
  const rawIngredients = Array.isArray(raw.ingredients) ? raw.ingredients : [];
  const ingredients: RecipeIngredient[] = [];
  for (const ri of rawIngredients) {
    if (ri != null && typeof ri === 'object' && !Array.isArray(ri)) {
      const ing = normalizeRecipeIngredient(ri as Record<string, unknown>);
      if (ing.id && ing.foodId && ing.quantity > 0) ingredients.push(ing);
    }
  }
  const servings = typeof raw.servings === 'number' && raw.servings > 0 ? raw.servings : 1;
  const rawTotal = raw.totalQuantity;
  const totalQuantity =
    rawTotal != null && typeof rawTotal === 'object' && !Array.isArray(rawTotal)
      ? (() => {
          const r = rawTotal as Record<string, unknown>;
          const amount = isValidPositiveAmount(r.amount) ? r.amount : null;
          const unit = isValidUnit(r.unit) ? r.unit : null;
          return amount != null && unit != null ? { amount, unit } : undefined;
        })()
      : undefined;
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    description: toOptionalText(raw.description, RECIPE_DESCRIPTION_MAX),
    category: toOptionalText(raw.category, RECIPE_CATEGORY_MAX),
    servings,
    ...(totalQuantity ? { totalQuantity } : {}),
    ingredients,
    createdAt: toISOWithFallback(raw.createdAt),
    updatedAt: toISOWithFallback(raw.updatedAt),
  };
}

async function loadRecipesNormalized(): Promise<Recipe[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(RECIPES_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map(normalizeRecipe)
      .filter((r) => r.id !== '' && r.name !== '');
  } catch {
    return [];
  }
}

let recipeWriteQueue: Promise<void> = Promise.resolve();

function serializeRecipe<T>(fn: () => Promise<T>): Promise<T> {
  const run = recipeWriteQueue.then(fn, fn);
  recipeWriteQueue = run.then(() => undefined, () => undefined);
  return run;
}

// ─── Recipe Validation ────────────────────────────────────────────────────────

function assertValidRecipeInput(input: CreateRecipeInput | UpdateRecipeInput): void {
  if ('name' in input && input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) throw new Error('Recipe name is required');
    if (name.length > RECIPE_NAME_MAX) {
      throw new Error(`Recipe name must be ${RECIPE_NAME_MAX} characters or fewer`);
    }
  }
  if ('servings' in input && input.servings !== undefined) {
    if (!Number.isFinite(input.servings) || input.servings <= 0) {
      throw new Error('Servings must be greater than 0');
    }
  }
  if ('totalQuantity' in input && input.totalQuantity !== undefined) {
    assertValidServing(input.totalQuantity);
  }
  if ('ingredients' in input && input.ingredients !== undefined) {
    if (!Array.isArray(input.ingredients)) {
      throw new Error('Ingredients must be an array');
    }
    for (const ing of input.ingredients) {
      if (!ing.foodId || typeof ing.foodId !== 'string') {
        throw new Error('Each ingredient must have a valid food ID');
      }
      if (!isValidPositiveAmount(ing.quantity)) {
        throw new Error(`Ingredient "${ing.foodId}" has invalid quantity`);
      }
      if (!isValidUnit(ing.unit)) {
        throw new Error(`Ingredient "${ing.foodId}" has invalid unit`);
      }
    }
  }
}

// ─── Recipe CRUD ──────────────────────────────────────────────────────────────

export async function getRecipes(): Promise<Recipe[]> {
  const recipes = await loadRecipesNormalized();
  return recipes.sort(
    (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const recipes = await loadRecipesNormalized();
  return recipes.find((r) => r.id === id) ?? null;
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  return serializeRecipe(async () => {
    assertValidRecipeInput(input);
    const name = String(input.name).trim();
    const recipes = await loadRecipesNormalized();

    let id = uid('rcp_');
    let guard = 0;
    while (recipes.some((r) => r.id === id) && guard++ < 5) {
      id = uid('rcp_');
    }
    if (recipes.some((r) => r.id === id)) {
      throw new Error('Could not generate a unique recipe ID');
    }

    const now = getNowISO();
    const ingredients: RecipeIngredient[] = (input.ingredients ?? []).map((ing) => ({
      id: uid('ring_'),
      foodId: ing.foodId,
      quantity: ing.quantity,
      unit: ing.unit,
    }));

    const recipe: Recipe = {
      id,
      name,
      description: toOptionalText(input.description, RECIPE_DESCRIPTION_MAX),
      category: toOptionalText(input.category, RECIPE_CATEGORY_MAX),
      servings: input.servings ?? 1,
      ...(input.totalQuantity ? { totalQuantity: { ...input.totalQuantity } } : {}),
      ingredients,
      createdAt: now,
      updatedAt: now,
    };

    await saveData(RECIPES_KEY, [recipe, ...recipes]);
    return recipe;
  });
}

export async function updateRecipe(
  id: string,
  input: UpdateRecipeInput,
): Promise<Recipe | null> {
  return serializeRecipe(async () => {
    assertValidRecipeInput(input);
    const recipes = await loadRecipesNormalized();
    const index = recipes.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const recipe = recipes[index];
    let name = recipe.name;
    if (input.name !== undefined) {
      name = String(input.name).trim();
      if (!name) throw new Error('Recipe name is required');
      if (name.length > RECIPE_NAME_MAX) {
        throw new Error(`Recipe name must be ${RECIPE_NAME_MAX} characters or fewer`);
      }
    }

    const updated: Recipe = {
      ...recipe,
      name,
      description:
        input.description !== undefined
          ? toOptionalText(input.description, RECIPE_DESCRIPTION_MAX)
          : recipe.description,
      category:
        input.category !== undefined
          ? toOptionalText(input.category, RECIPE_CATEGORY_MAX)
          : recipe.category,
      servings: input.servings ?? recipe.servings,
      ...(input.totalQuantity !== undefined
        ? { totalQuantity: input.totalQuantity ? { ...input.totalQuantity } : undefined }
        : recipe.totalQuantity
          ? { totalQuantity: { ...recipe.totalQuantity } }
          : {}),
      ingredients: input.ingredients ?? recipe.ingredients,
      updatedAt: getNowISO(),
    };

    recipes[index] = updated;
    await saveData(RECIPES_KEY, recipes);
    return updated;
  });
}

export async function deleteRecipe(id: string): Promise<boolean> {
  return serializeRecipe(async () => {
    const recipes = await loadRecipesNormalized();
    const filtered = recipes.filter((r) => r.id !== id);
    if (filtered.length === recipes.length) return false;
    await saveData(RECIPES_KEY, filtered);
    return true;
  });
}

// ─── Recipe Search ────────────────────────────────────────────────────────────

export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const q = normalizeQuery(query);
  if (!q) {
    return [...recipes].sort((a, b) => a.name.localeCompare(b.name));
  }
  const tokens = q.split(' ').filter(Boolean);

  const scored: { recipe: Recipe; tier: number; pos: number }[] = [];
  for (const recipe of recipes) {
    const name = normalizeQuery(recipe.name);
    const hay = normalizeQuery([recipe.name, recipe.category ?? ''].join(' '));
    let tier = -1;
    if (name === q) {
      tier = 0;
    } else if (name.startsWith(q)) {
      tier = 1;
    } else if (tokens.every((t) => hay.includes(t))) {
      tier = 2;
    } else if (tokens.some((t) => hay.includes(t))) {
      tier = 3;
    } else {
      continue;
    }
    const positions = tokens.map((t) => name.indexOf(t)).filter((i) => i >= 0);
    scored.push({
      recipe,
      tier,
      pos: positions.length > 0 ? Math.min(...positions) : Number.MAX_SAFE_INTEGER,
    });
  }

  return scored
    .sort(
      (a, b) =>
        a.tier - b.tier || a.pos - b.pos || a.recipe.name.localeCompare(b.recipe.name),
    )
    .map((s) => s.recipe);
}

// ─── Recipe Nutrition Calculation (pure) ──────────────────────────────────────

export interface RecipeNutritionResult {
  totals: NutrientTotals;
  calculatedCount: number;
  unavailableCount: number;
  errorCount: number;
  unavailableFoodIds: string[];
}

/**
 * Calculate total recipe nutrition by summing all ingredient nutrition.
 * Pure — no storage access. Operates on provided recipe, foods, and the
 * calculateNutrition engine. Missing foods increment unavailableCount.
 */
export function calculateRecipeNutrition(
  recipe: Recipe,
  foods: FoodItem[],
): RecipeNutritionResult {
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  let totals = emptyTotals();
  let calculatedCount = 0;
  let unavailableCount = 0;
  let errorCount = 0;
  const unavailableFoodIds: string[] = [];

  for (const ing of recipe.ingredients) {
    const food = foodMap.get(ing.foodId) ?? null;
    if (!food) {
      unavailableCount++;
      unavailableFoodIds.push(ing.foodId);
      continue;
    }
    try {
      const scaled = calculateNutrition(food, { amount: ing.quantity, unit: ing.unit });
      totals = addTotals(totals, scaledToTotals(scaled));
      calculatedCount++;
    } catch {
      errorCount++;
      unavailableFoodIds.push(ing.foodId);
    }
  }

  return { totals, calculatedCount, unavailableCount, errorCount, unavailableFoodIds };
}

/**
 * Per-serving recipe nutrition = total / servings.
 * If servings <= 0, returns the total unchanged.
 */
export function calculateRecipePerServing(
  recipe: Recipe,
  foods: FoodItem[],
): RecipeNutritionResult {
  const result = calculateRecipeNutrition(recipe, foods);
  if (recipe.servings > 0 && result.calculatedCount > 0) {
    result.totals = divideTotals(result.totals, recipe.servings);
  }
  return result;
}

export interface RecipeQuantityCalculation extends RecipeNutritionResult {
  quantity: FoodQuantity;
  source: NutritionSourceMetadata;
}

/** Calculate a recipe for an arbitrary finished-recipe quantity when totalQuantity is declared. */
export function calculateRecipeForQuantity(
  recipe: Recipe,
  foods: FoodItem[],
  quantity: FoodQuantity,
): RecipeQuantityCalculation {
  const total = calculateRecipeNutrition(recipe, foods);
  if (!recipe.totalQuantity) throw new Error('Recipe has no declared total quantity');
  if (!Number.isFinite(quantity.amount) || quantity.amount <= 0) throw new Error('Quantity must be a finite positive amount');
  const totalUnit = recipe.totalQuantity.unit;
  const requestedUnit = quantity.unit;
  const totalFamily = UNIT_FAMILY[totalUnit];
  const requestedFamily = UNIT_FAMILY[requestedUnit];
  if (totalFamily !== requestedFamily || (totalFamily === 'count' && totalUnit !== requestedUnit)) {
    throw new Error('Recipe quantity units are incompatible');
  }
  const totalBase = recipe.totalQuantity.amount * UNIT_TO_BASE[totalUnit];
  const requestedBase = quantity.amount * UNIT_TO_BASE[requestedUnit];
  if (totalBase <= 0) throw new Error('Recipe total quantity must be greater than 0');
  const scaled = divideTotals(total.totals, totalBase / requestedBase);
  return {
    ...total,
    totals: scaled,
    quantity: { ...quantity },
    source: { quality: 'recipe_calculated', source: 'recipe', sourceDetail: `Recipe: ${recipe.name}` },
  };
}

function divideTotals(totals: NutrientTotals, divisor: number): NutrientTotals {
  const micros: Micronutrients = {};
  for (const [key, value] of Object.entries(totals.micronutrients)) {
    micros[key as MicronutrientKey] = (value as number) / divisor;
  }
  return {
    calories: totals.calories / divisor,
    protein: totals.protein / divisor,
    carbohydrates: totals.carbohydrates / divisor,
    fat: totals.fat / divisor,
    fiber: totals.fiber / divisor,
    sugar: totals.sugar / divisor,
    saturatedFat: totals.saturatedFat / divisor,
    sodium: totals.sodium / divisor,
    ...(totals.monounsaturatedFat !== undefined ? { monounsaturatedFat: totals.monounsaturatedFat / divisor } : {}),
    ...(totals.polyunsaturatedFat !== undefined ? { polyunsaturatedFat: totals.polyunsaturatedFat / divisor } : {}),
    ...(totals.transFat !== undefined ? { transFat: totals.transFat / divisor } : {}),
    micronutrients: micros,
  };
}

// ─── System Foods: Seed / Query / Search (Phase 1B) ───────────────────────────

export interface SeedResult {
  added: number;
  skipped: number;
}

/**
 * Seed the curated system database. Deterministic and idempotent:
 * - records carry stable `food_sys_<slug>` IDs,
 * - existing IDs are skipped untouched (system records are never rewritten,
 *   user custom/imported/recipe records are never touched),
 * - raw store rows are preserved byte-for-byte except appended defs.
 * Returns counts for observability. Never throws on corrupt payloads —
 * a non-array store is treated as empty.
 */
export async function seedSystemFoods(): Promise<SeedResult> {
  return serialize(async () => {
    const stored = await loadData<Record<string, unknown>[]>(FOODS_KEY, []);
    const list = Array.isArray(stored) ? stored : [];
    const ids = new Set(
      list.map((r) =>
        r != null && typeof r === 'object' && !Array.isArray(r)
          ? String((r as Record<string, unknown>).id ?? '')
          : '',
      ),
    );

    const now = getNowISO();
    let added = 0;
    for (const def of SYSTEM_FOODS) {
      if (ids.has(def.id)) continue;
      // Same validators as createFood — a bad dataset row fails loudly here
      // (programmer error) instead of persisting silently.
      const name = def.name.trim();
      if (!name) throw new Error(`System food ${def.id} has no name`);
      if (name.length > FOOD_NAME_MAX) throw new Error(`System food ${def.id} name too long`);
      if (!isValidSource(def.source)) throw new Error(`System food ${def.id} has invalid source`);
      if (!isValidPreparation(def.preparation)) {
        throw new Error(`System food ${def.id} has invalid preparation`);
      }
      assertValidServing(def.serving);
      const nutrition = buildProfile(def.nutrition);
      list.push({
        id: def.id,
        name,
        ...(normalizeAliases(def.aliases, name) ? { aliases: normalizeAliases(def.aliases, name) } : {}),
        brand: toOptionalText(def.brand, FOOD_BRAND_MAX),
        category: (def.category ?? '').trim().slice(0, FOOD_CATEGORY_MAX),
        description: toOptionalText(def.description, FOOD_DESCRIPTION_MAX),
        source: def.source,
        sourceDetail: toOptionalText(def.sourceDetail, FOOD_SOURCE_DETAIL_MAX),
        preparation: def.preparation,
        serving: { amount: def.serving.amount, unit: def.serving.unit },
        ...(def.quantityConversions ? { quantityConversions: { ...def.quantityConversions } } : {}),
        nutrition,
        createdAt: now,
        updatedAt: now,
      });
      ids.add(def.id);
      added += 1;
    }

    if (added > 0) await saveData(FOODS_KEY, list);
    return { added, skipped: SYSTEM_FOODS.length - added };
  });
}

/** All system (built-in) foods, alphabetical. */
export async function getSystemFoods(): Promise<FoodItem[]> {
  const foods = await loadNormalized();
  return foods
    .filter((f) => f.source === 'system')
    .sort(
      (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
    );
}

/** All foods regardless of source (same as getFoods). */
export async function getAllFoods(): Promise<FoodItem[]> {
  return getFoods();
}

/** Foods in a category (case-insensitive exact match), alphabetical. */
export async function getFoodByCategory(category: string): Promise<FoodItem[]> {
  const needle = category.trim().toLowerCase();
  const foods = await loadNormalized();
  return foods
    .filter((f) => f.category.trim().toLowerCase() === needle)
    .sort(
      (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
    );
}

/** Foods from one source, alphabetical. Unknown sources yield []. */
export async function getFoodsBySource(source: FoodSource): Promise<FoodItem[]> {
  if (!isValidSource(source)) return [];
  const foods = await loadNormalized();
  return foods
    .filter((f) => f.source === source)
    .sort(
      (a, b) => a.name.localeCompare(b.name) || b.createdAt.localeCompare(a.createdAt),
    );
}

// ─── Pure Search (no storage — works on any food list) ────────────────────────

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function foodHaystack(food: FoodItem): string {
  return normalizeQuery(
    [food.name, ...(food.aliases ?? []), food.brand ?? '', food.category, food.preparation].join(' '),
  );
}

function foodName(food: FoodItem): string {
  return normalizeQuery(food.name);
}

/**
 * Ranked food search over an in-memory list (no external API):
 * 1. exact name match
 * 2. name prefix match (whole query)
 * 3. every query token present (name/brand/category/preparation) —
 *    so "chicken cooked" prefers cooked-chicken records over raw ones
 * 4. any single token present
 * Ties break by earliest match position, then name. Empty query returns the
 * whole list alphabetical.
 */
export function searchFoods(foods: FoodItem[], query: string): FoodItem[] {
  const q = normalizeQuery(query);
  if (!q) {
    return [...foods].sort((a, b) => a.name.localeCompare(b.name));
  }
  const tokens = q.split(' ').filter(Boolean);

  const scored: { food: FoodItem; tier: number; pos: number }[] = [];
  for (const food of foods) {
    const name = foodName(food);
    const aliases = (food.aliases ?? []).map(normalizeQuery);
    const hay = foodHaystack(food);
    let tier = -1;
    if (name === q || aliases.includes(q)) {
      tier = 0;
    } else if (name.startsWith(q) || aliases.some((alias) => alias.startsWith(q))) {
      tier = 1;
    } else if (tokens.every((t) => hay.includes(t))) {
      tier = 2;
    } else if (tokens.some((t) => hay.includes(t))) {
      tier = 3;
    } else {
      continue;
    }
    const positions = tokens
      .map((t) => name.indexOf(t))
      .filter((i) => i >= 0);
    scored.push({
      food,
      tier,
      pos: positions.length > 0 ? Math.min(...positions) : Number.MAX_SAFE_INTEGER,
    });
  }

  return scored
    .sort(
      (a, b) =>
        a.tier - b.tier || a.pos - b.pos || a.food.name.localeCompare(b.food.name),
    )
    .map((s) => s.food);
}

// ─── Quantity Calculation Engine (pure — no storage) ──────────────────────────

export interface ScaledNutrients {
  /** Exact scale factor applied (requested ÷ reference). Unrounded. */
  factor: number;
  source?: NutritionSourceMetadata;
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

function scaleMicros(micros: Micronutrients, factor: number): Micronutrients {
  const out: Micronutrients = {};
  for (const key of MICRONUTRIENT_KEYS) {
    const v = micros[key];
    if (v !== undefined) out[key] = v * factor;
  }
  return out;
}

function scaleProfile(profile: NutritionProfile, factor: number): ScaledNutrients {
  return {
    factor,
    calories: profile.calories * factor,
    protein: profile.protein * factor,
    carbohydrates: profile.carbohydrates * factor,
    fat: profile.fat * factor,
    fiber: profile.fiber * factor,
    sugar: profile.sugar * factor,
    saturatedFat: profile.saturatedFat * factor,
    sodium: profile.sodium * factor,
    ...(profile.monounsaturatedFat !== undefined ? { monounsaturatedFat: profile.monounsaturatedFat * factor } : {}),
    ...(profile.polyunsaturatedFat !== undefined ? { polyunsaturatedFat: profile.polyunsaturatedFat * factor } : {}),
    ...(profile.transFat !== undefined ? { transFat: profile.transFat * factor } : {}),
    micronutrients: scaleMicros(profile.micronutrients, factor),
  };
}

/**
 * Scale a food's nutrition to an arbitrary valid quantity.
 *
 * Compatibility rules (no density assumptions — mass and volume never mix):
 * - per_100g basis: quantity must be a mass unit (g/kg/mg).
 * - per_100ml basis: quantity must be a volume unit (ml/l/cup/tbsp/tsp).
 * - per_serving basis: quantity must share the serving unit's family; discrete
 *   `piece`/`serving` units must match exactly.
 *
 * Throws on invalid quantities, unknown units, or incompatible unit/basis
 * pairs. Values stay precise — callers round for presentation.
 */
export function calculateNutrition(
  food: Pick<FoodItem, 'nutrition' | 'quantityConversions'>,
  quantity: FoodQuantity,
): ScaledNutrients {
  const { nutrition } = food;

  if (
    !Number.isFinite(quantity.amount) ||
    quantity.amount <= 0 ||
    !isValidUnit(quantity.unit)
  ) {
    throw new Error('Quantity must be a finite positive amount with a valid unit');
  }

  const qtyFamily = UNIT_FAMILY[quantity.unit];
  const declaredConversion = food.quantityConversions?.[quantity.unit];
  const qtyBase =
    declaredConversion !== undefined
      ? quantity.amount * declaredConversion
      : quantity.amount * UNIT_TO_BASE[quantity.unit];

  switch (nutrition.basis) {
    case 'per_100g': {
      if (qtyFamily !== 'mass' && declaredConversion === undefined) {
        throw new Error('Gram-based foods require a mass quantity or a food-specific conversion');
      }
      return scaleProfile(nutrition, qtyBase / 100);
    }
    case 'per_100ml': {
      if (qtyFamily !== 'volume' && declaredConversion === undefined) {
        throw new Error('Milliliter-based foods require a volume quantity or a food-specific conversion');
      }
      return scaleProfile(nutrition, qtyBase / 100);
    }
    case 'per_serving': {
      if (
        nutrition.servingAmount == null ||
        !Number.isFinite(nutrition.servingAmount) ||
        nutrition.servingAmount <= 0 ||
        !isValidUnit(nutrition.servingUnit)
      ) {
        throw new Error('Food is missing a valid serving reference');
      }
      const servingUnit = nutrition.servingUnit as ServingUnit;
      if (UNIT_FAMILY[servingUnit] === 'count' || qtyFamily === 'count') {
        // Discrete units combine only with their exact match.
        if (quantity.unit !== servingUnit) {
          throw new Error(`This food is portioned in ${servingUnit} — quantity must match`);
        }
        return scaleProfile(nutrition, quantity.amount / (nutrition.servingAmount as number));
      }
      if (UNIT_FAMILY[servingUnit] !== qtyFamily) {
        throw new Error('Serving and quantity units are incompatible (mass vs volume)');
      }
      const servingBase = (nutrition.servingAmount as number) * UNIT_TO_BASE[servingUnit];
      return scaleProfile(nutrition, qtyBase / servingBase);
    }
    default:
      throw new Error('Food has an invalid nutrition basis');
  }
}

export function roundNutritionForDisplay(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return value;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) throw new Error('Decimals must be an integer from 0 to 6');
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export interface FoodQuantityCalculation {
  foodId: string;
  foodName: string;
  quantity: FoodQuantity;
  nutrients: ScaledNutrients;
  source: NutritionSourceMetadata;
}

/** Calculate a concrete food quantity while carrying its provenance metadata. */
export function calculateFoodQuantity(food: FoodItem, quantity: FoodQuantity): FoodQuantityCalculation {
  const nutrients = calculateNutrition(food, quantity);
  return {
    foodId: food.id,
    foodName: food.name,
    quantity: { ...quantity },
    nutrients,
    source: {
      quality:
        food.source === 'custom'
          ? 'user_entered'
          : food.source === 'recipe'
            ? 'recipe_calculated'
            : food.sourceDetail?.toLowerCase().startsWith('estimated')
              ? 'estimated'
              : 'verified',
      source: food.source,
      sourceDetail: food.sourceDetail,
    },
  };
}

// ─── Daily Nutrition Aggregation (Phase 1E) ─────────────────────────────────

/** Zero-valued nutrient totals. */
function emptyTotals(): NutrientTotals {
  return {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    saturatedFat: 0,
    sodium: 0,
    micronutrients: {},
  };
}

/** Sum two nutrient totals. Micronutrients only combine when both have a value. */
function addTotals(a: NutrientTotals, b: NutrientTotals): NutrientTotals {
  const micros: Micronutrients = {};
  const allKeys = new Set([
    ...Object.keys(a.micronutrients),
    ...Object.keys(b.micronutrients),
  ]) as Set<MicronutrientKey>;
  for (const key of allKeys) {
    const va = a.micronutrients[key];
    const vb = b.micronutrients[key];
    if (va !== undefined && vb !== undefined) {
      micros[key] = va + vb;
    } else if (va !== undefined) {
      micros[key] = va;
    } else if (vb !== undefined) {
      micros[key] = vb;
    }
  }
  const addOptional = (key: 'monounsaturatedFat' | 'polyunsaturatedFat' | 'transFat') => {
    const av = a[key];
    const bv = b[key];
    if (av === undefined && bv === undefined) return undefined;
    return (av ?? 0) + (bv ?? 0);
  };
  const monounsaturatedFat = addOptional('monounsaturatedFat');
  const polyunsaturatedFat = addOptional('polyunsaturatedFat');
  const transFat = addOptional('transFat');
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbohydrates: a.carbohydrates + b.carbohydrates,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
    sugar: a.sugar + b.sugar,
    saturatedFat: a.saturatedFat + b.saturatedFat,
    sodium: a.sodium + b.sodium,
    ...(monounsaturatedFat !== undefined ? { monounsaturatedFat } : {}),
    ...(polyunsaturatedFat !== undefined ? { polyunsaturatedFat } : {}),
    ...(transFat !== undefined ? { transFat } : {}),
    micronutrients: micros,
  };
}

/** Convert a ScaledNutrients result into NutrientTotals for aggregation. */
function scaledToTotals(scaled: ScaledNutrients): NutrientTotals {
  return {
    calories: scaled.calories,
    protein: scaled.protein,
    carbohydrates: scaled.carbohydrates,
    fat: scaled.fat,
    fiber: scaled.fiber,
    sugar: scaled.sugar,
    saturatedFat: scaled.saturatedFat,
    sodium: scaled.sodium,
    ...(scaled.monounsaturatedFat !== undefined ? { monounsaturatedFat: scaled.monounsaturatedFat } : {}),
    ...(scaled.polyunsaturatedFat !== undefined ? { polyunsaturatedFat: scaled.polyunsaturatedFat } : {}),
    ...(scaled.transFat !== undefined ? { transFat: scaled.transFat } : {}),
    micronutrients: scaled.micronutrients,
  };
}

/**
 * Calculate nutrition totals for one meal type on a given day.
 * Pure — no storage access. Operates on the provided logs, foods, and recipes.
 * Handles both food and recipe log entries.
 */
export function calculateMealNutrition(
  logs: FoodLogEntry[],
  foods: FoodItem[],
  recipes: Recipe[] = [],
): MealNutritionSummary {
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  let totals = emptyTotals();
  let calculatedCount = 0;
  let unavailableCount = 0;
  let errorCount = 0;

  for (const log of logs) {
    const itemType = log.itemType ?? 'food';

    if (itemType === 'recipe') {
      const recipe = recipeMap.get(log.foodId) ?? null;
      if (!recipe) {
        unavailableCount++;
        continue;
      }
      try {
        const recipeResult = calculateRecipeNutrition(recipe, foods);
        // Scale recipe nutrition by the requested quantity/servings
        // log.quantity = number of servings requested
        const servingsFactor = log.quantity;
        const scaled = divideTotals(recipeResult.totals, recipe.servings / servingsFactor);
        totals = addTotals(totals, scaled);
        calculatedCount++;
      } catch {
        errorCount++;
      }
    } else {
      const food = foodMap.get(log.foodId) ?? null;
      if (!food) {
        unavailableCount++;
        continue;
      }
      try {
        const scaled = calculateNutrition(food, {
          amount: log.quantity,
          unit: log.unit,
        });
        totals = addTotals(totals, scaledToTotals(scaled));
        calculatedCount++;
      } catch {
        errorCount++;
      }
    }
  }

  return {
    mealType: logs[0]?.mealType ?? 'other',
    totals,
    loggedCount: logs.length,
    calculatedCount,
    unavailableCount,
    errorCount,
  };
}

export interface MealFoodContribution {
  logId: string;
  foodId: string;
  itemType: 'food' | 'recipe';
  quantity: FoodQuantity;
  nutrients: NutrientTotals;
  source: NutritionSourceMetadata;
}

export interface DetailedMealNutrition extends MealNutritionSummary {
  contributions: MealFoodContribution[];
}

/** Detailed meal calculation retaining each logged food/recipe contribution. */
export function calculateMealNutritionDetailed(
  logs: FoodLogEntry[],
  foods: FoodItem[],
  recipes: Recipe[] = [],
): DetailedMealNutrition {
  const summary = calculateMealNutrition(logs, foods, recipes);
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const contributions: MealFoodContribution[] = [];
  for (const log of logs) {
    const itemType = log.itemType ?? 'food';
    try {
      if (itemType === 'recipe') {
        const recipe = recipeMap.get(log.foodId);
        if (!recipe) continue;
        const recipeResult = calculateRecipeNutrition(recipe, foods);
        const totals = divideTotals(recipeResult.totals, recipe.servings / log.quantity);
        contributions.push({
          logId: log.id,
          foodId: recipe.id,
          itemType,
          quantity: { amount: log.quantity, unit: log.unit },
          nutrients: totals,
          source: { quality: 'recipe_calculated', source: 'recipe', sourceDetail: `Recipe: ${recipe.name}` },
        });
      } else {
        const food = foodMap.get(log.foodId);
        if (!food) continue;
        const calculated = calculateFoodQuantity(food, { amount: log.quantity, unit: log.unit });
        contributions.push({
          logId: log.id,
          foodId: food.id,
          itemType,
          quantity: calculated.quantity,
          nutrients: scaledToTotals(calculated.nutrients),
          source: calculated.source,
        });
      }
    } catch {
      // Summary already reports unavailable/error counts; omit failed contribution.
    }
  }
  return { ...summary, contributions };
}

/**
 * Calculate full daily nutrition summary for a YYYY-MM-DD date.
 * Pure — no storage access. Operates on the provided logs, foods, and recipes.
 */
export function calculateDailyNutrition(
  date: string,
  foodLogs: FoodLogEntry[],
  foods: FoodItem[],
  recipes: Recipe[] = [],
): DailyNutritionSummary {
  const dayLogs = foodLogs.filter((l) => l.date === date);

  // Group by meal type
  const logsByMeal = new Map<MealType, FoodLogEntry[]>();
  for (const m of MEAL_TYPES) logsByMeal.set(m, []);
  for (const log of dayLogs) {
    const arr = logsByMeal.get(log.mealType);
    if (arr) arr.push(log);
  }

  // Calculate per-meal summaries
  const byMeal: MealNutritionSummary[] = [];
  let totals = emptyTotals();
  let loggedCount = 0;
  let calculatedCount = 0;
  let unavailableCount = 0;
  let errorCount = 0;

  for (const mealType of MEAL_TYPES) {
    const mealLogs = logsByMeal.get(mealType) ?? [];
    if (mealLogs.length === 0) {
      byMeal.push({
        mealType,
        totals: emptyTotals(),
        loggedCount: 0,
        calculatedCount: 0,
        unavailableCount: 0,
        errorCount: 0,
      });
      continue;
    }

    const summary = calculateMealNutrition(mealLogs, foods, recipes);
    byMeal.push(summary);
    totals = addTotals(totals, summary.totals);
    loggedCount += summary.loggedCount;
    calculatedCount += summary.calculatedCount;
    unavailableCount += summary.unavailableCount;
    errorCount += summary.errorCount;
  }

  return {
    date,
    totals,
    byMeal,
    loggedCount,
    calculatedCount,
    unavailableCount,
    errorCount,
  };
}

/** Re-exported so future consumers discover the supported unit vocabulary. */
export type { MicronutrientKey };

// ─── Body Profile & BMR/TDEE (Phase 1G) ──────────────────────────────────────

const BODY_PROFILE_KEY = 'jeevya:nutrition:body-profile';

function isValidSex(value: unknown): value is Sex {
  return typeof value === 'string' && (value === 'male' || value === 'female');
}

function isValidActivityLevel(value: unknown): value is ActivityLevel {
  return typeof value === 'string' && ACTIVITY_LEVELS.some((l) => l.value === value);
}

function isValidNutritionGoal(value: unknown): value is NutritionGoal {
  return typeof value === 'string' && NUTRITION_GOALS.some((g) => g.value === value);
}

function isValidAge(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 150;
}

function isValidWeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 500;
}

function isValidHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 300;
}

function normalizeBodyProfile(raw: Record<string, unknown>): BodyProfile {
  return {
    sex: isValidSex(raw.sex) ? raw.sex : 'male',
    age: isValidAge(raw.age) ? raw.age : 25,
    heightCm: isValidHeight(raw.heightCm) ? raw.heightCm : 170,
    weightKg: isValidWeight(raw.weightKg) ? raw.weightKg : 70,
    activityLevel: isValidActivityLevel(raw.activityLevel) ? raw.activityLevel : 'sedentary',
    goal: isValidNutritionGoal(raw.goal) ? raw.goal : 'maintain',
    calorieAdjustment: typeof raw.calorieAdjustment === 'number' ? raw.calorieAdjustment : undefined,
    createdAt: toISOWithFallback(raw.createdAt),
    updatedAt: toISOWithFallback(raw.updatedAt),
  };
}

// ─── Body Profile CRUD ────────────────────────────────────────────────────────

export async function getBodyProfile(): Promise<BodyProfile | null> {
  try {
    const raw = await loadData<Record<string, unknown> | null>(BODY_PROFILE_KEY, null);
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return normalizeBodyProfile(raw);
  } catch {
    return null;
  }
}

export async function saveBodyProfile(input: BodyProfileInput): Promise<BodyProfile> {
  if (!isValidSex(input.sex)) throw new Error('Invalid sex');
  if (!isValidAge(input.age)) throw new Error('Age must be between 0 and 150');
  if (!isValidHeight(input.heightCm)) throw new Error('Height must be between 0 and 300 cm');
  if (!isValidWeight(input.weightKg)) throw new Error('Weight must be between 0 and 500 kg');
  if (!isValidActivityLevel(input.activityLevel)) throw new Error('Invalid activity level');
  if (!isValidNutritionGoal(input.goal)) throw new Error('Invalid nutrition goal');

  const now = getNowISO();
  const profile: BodyProfile = {
    sex: input.sex,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    activityLevel: input.activityLevel,
    goal: input.goal,
    calorieAdjustment: input.calorieAdjustment,
    createdAt: now,
    updatedAt: now,
  };
  await saveData(BODY_PROFILE_KEY, profile);
  return profile;
}

export async function updateBodyProfile(input: Partial<BodyProfileInput>): Promise<BodyProfile | null> {
  const existing = await getBodyProfile();
  if (!existing) return null;

  const updated: BodyProfile = {
    ...existing,
    sex: input.sex ?? existing.sex,
    age: input.age ?? existing.age,
    heightCm: input.heightCm ?? existing.heightCm,
    weightKg: input.weightKg ?? existing.weightKg,
    activityLevel: input.activityLevel ?? existing.activityLevel,
    goal: input.goal ?? existing.goal,
    calorieAdjustment: input.calorieAdjustment ?? existing.calorieAdjustment,
    updatedAt: getNowISO(),
  };

  // Validate after merge
  if (!isValidSex(updated.sex)) throw new Error('Invalid sex');
  if (!isValidAge(updated.age)) throw new Error('Age must be between 0 and 150');
  if (!isValidHeight(updated.heightCm)) throw new Error('Height must be between 0 and 300 cm');
  if (!isValidWeight(updated.weightKg)) throw new Error('Weight must be between 0 and 500 kg');
  if (!isValidActivityLevel(updated.activityLevel)) throw new Error('Invalid activity level');
  if (!isValidNutritionGoal(updated.goal)) throw new Error('Invalid nutrition goal');

  await saveData(BODY_PROFILE_KEY, updated);
  return updated;
}

export async function clearBodyProfile(): Promise<boolean> {
  try {
    await loadData(BODY_PROFILE_KEY, null); // ensure key exists
    const { removeData } = await import('@/lib/storage');
    await removeData(BODY_PROFILE_KEY);
    return true;
  } catch {
    return false;
  }
}

// ─── Pure BMR/TDEE Calculations ──────────────────────────────────────────────

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.
 * - Male:   10 × weight(kg) + 6.25 × height(cm) − 5 × age(y) + 5
 * - Female: 10 × weight(kg) + 6.25 × height(cm) − 5 × age(y) − 161
 *
 * Pure — no storage access.
 */
export function calculateBMR(params: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const { sex, weightKg, heightCm, age } = params;
  if (!isValidWeight(weightKg) || !isValidHeight(heightCm) || !isValidAge(age)) {
    throw new Error('Invalid body parameters for BMR calculation');
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Calculate Total Daily Energy Expenditure.
 * TDEE = BMR × activity multiplier.
 *
 * Pure — no storage access.
 */
export function calculateTDEE(params: { sex: Sex; weightKg: number; heightCm: number; age: number; activityLevel: ActivityLevel }): number {
  const bmr = calculateBMR(params);
  const level = ACTIVITY_LEVELS.find((l) => l.value === params.activityLevel);
  const multiplier = level?.multiplier ?? 1.2;
  return bmr * multiplier;
}

/**
 * Calculate target calories based on goal.
 * - lose:  TDEE − 500
 * - maintain: TDEE
 * - gain:  TDEE + 300
 * - custom: TDEE + calorieAdjustment
 *
 * Pure — no storage access.
 */
export function calculateTargetCalories(params: { tdee: number; goal: NutritionGoal; calorieAdjustment?: number }): number {
  const goalDef = NUTRITION_GOALS.find((g) => g.value === params.goal);
  const adjustment = params.goal === 'custom'
    ? (params.calorieAdjustment ?? 0)
    : (goalDef?.defaultAdjustment ?? 0);
  return Math.max(0, params.tdee + adjustment);
}

/**
 * Calculate macro targets (g) from target calories.
 * Defaults: protein 1.6 g/kg, fat 0.8 g/kg, carbs fill remaining.
 * Fiber: 14 g per 1000 kcal.
 *
 * Pure — no storage access.
 */
export function calculateNutritionTargets(profile: BodyProfile): NutritionTargets {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(profile);
  const targetCalories = calculateTargetCalories({
    tdee,
    goal: profile.goal,
    calorieAdjustment: profile.calorieAdjustment,
  });

  const protein = profile.weightKg * 1.6;
  const fat = profile.weightKg * 0.8;
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const remainingCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const carbohydrates = remainingCalories / 4;
  const fiber = (targetCalories / 1000) * 14;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbohydrates: Math.round(carbohydrates),
    fiber: Math.round(fiber),
  };
}

// ─── Energy Activities (Phase 1H + 1I) ───────────────────────────────────────

const ENERGY_ACTIVITIES_KEY = 'jeevya:nutrition:energy-activities';

function isValidActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && (ACTIVITY_TYPES as { value: string }[]).some((t) => t.value === value);
}

function isValidActivityIntensity(value: unknown): value is ActivityIntensity {
  return typeof value === 'string' && (ACTIVITY_INTENSITIES as { value: string }[]).some((i) => i.value === value);
}

function isValidCaloriesSource(value: unknown): value is CaloriesSource {
  return value === 'manual' || value === 'estimated';
}

function normalizeEnergyActivity(raw: Record<string, unknown>): EnergyActivity {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    activityType: isValidActivityType(raw.activityType) ? raw.activityType : 'other',
    intensity: isValidActivityIntensity(raw.intensity) ? raw.intensity : 'moderate',
    durationMinutes:
      raw.durationMinutes != null &&
      typeof raw.durationMinutes === 'number' &&
      Number.isFinite(raw.durationMinutes) &&
      raw.durationMinutes > 0
        ? raw.durationMinutes
        : null,
    calories: isValidAmount(raw.calories) ? raw.calories : 0,
    caloriesSource: isValidCaloriesSource(raw.caloriesSource) ? raw.caloriesSource : 'manual',
    distanceKm:
      raw.distanceKm != null &&
      typeof raw.distanceKm === 'number' &&
      Number.isFinite(raw.distanceKm) &&
      raw.distanceKm >= 0
        ? raw.distanceKm
        : null,
    date: isValidDate(raw.date) ? raw.date : getTodayDate(),
    createdAt: toISOWithFallback(raw.createdAt),
    updatedAt: toISOWithFallback(raw.updatedAt),
    source: raw.source === 'health_connect' ? 'health_connect' : 'manual',
    externalId: typeof raw.externalId === 'string' ? raw.externalId : undefined,
    provider: raw.provider === 'health_connect' ? 'health_connect' : undefined,
  };
}

async function loadEnergyActivitiesNormalized(): Promise<EnergyActivity[]> {
  try {
    const raw = await loadData<Record<string, unknown>[]>(ENERGY_ACTIVITIES_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map(normalizeEnergyActivity)
      .filter((a) => a.id !== '' && a.name !== '' && a.calories > 0);
  } catch {
    return [];
  }
}

let energyActivityWriteQueue: Promise<void> = Promise.resolve();

function serializeEnergyActivity<T>(fn: () => Promise<T>): Promise<T> {
  const run = energyActivityWriteQueue.then(fn, fn);
  energyActivityWriteQueue = run.then(() => undefined, () => undefined);
  return run;
}

/**
 * Import externally normalized activities into the canonical EnergyActivity store.
 * Nutrition owns this persistence boundary and keeps manual activity metadata intact.
 * Imported records are deduplicated by provider + externalId.
 */
export async function importEnergyActivities(
  activitiesToImport: EnergyActivity[],
): Promise<{ imported: number; updated: number }> {
  return serializeEnergyActivity(async () => {
    let imported = 0;
    let updated = 0;
    const existing = await loadEnergyActivitiesNormalized();
    const existingMap = new Map<string, EnergyActivity>();

    for (const activity of existing) {
      if (activity.provider && activity.externalId) {
        existingMap.set(`${activity.provider}:${activity.externalId}`, activity);
      }
    }

    const merged = [...existing];

    for (const activity of activitiesToImport) {
      if (!activity.externalId || !activity.provider) continue;

      const key = `${activity.provider}:${activity.externalId}`;
      const existingRecord = existingMap.get(key);

      if (existingRecord) {
        const index = merged.findIndex((item) => item.id === existingRecord.id);
        if (index !== -1) {
          merged[index] = {
            ...existingRecord,
            name: activity.name,
            activityType: activity.activityType,
            intensity: activity.intensity,
            durationMinutes: activity.durationMinutes,
            calories: activity.calories,
            caloriesSource: activity.caloriesSource,
            distanceKm: activity.distanceKm,
            updatedAt: getNowISO(),
          };
          existingMap.set(key, merged[index]);
          updated++;
        }
      } else {
        merged.unshift(activity);
        existingMap.set(key, activity);
        imported++;
      }
    }

    if (imported > 0 || updated > 0) {
      await saveData(ENERGY_ACTIVITIES_KEY, merged);
    }

    return { imported, updated };
  });
}

// ─── Activity Calorie Estimation (Phase 1I) ──────────────────────────────────

/**
 * Estimate calories burned using MET formula.
 * calories = MET × weightKg × durationHours
 * Pure — no storage access.
 */
export function estimateActivityCalories(input: ActivityEstimateInput): number {
  const metRow = MET_TABLE[input.activityType];
  if (!metRow) throw new Error(`Unknown activity type: ${input.activityType}`);
  const met = metRow[input.intensity];
  if (met == null) throw new Error(`Unknown intensity: ${input.intensity}`);
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new Error('Duration must be a positive number');
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
    throw new Error('Weight must be a positive number');
  }
  const durationHours = input.durationMinutes / 60;
  return met * input.weightKg * durationHours;
}

// ─── Activity CRUD ────────────────────────────────────────────────────────────

export async function getEnergyActivities(): Promise<EnergyActivity[]> {
  const activities = await loadEnergyActivitiesNormalized();
  return activities.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getEnergyActivitiesByDate(date: string): Promise<EnergyActivity[]> {
  const activities = await loadEnergyActivitiesNormalized();
  return activities
    .filter((a) => a.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getEnergyActivityById(id: string): Promise<EnergyActivity | null> {
  const activities = await loadEnergyActivitiesNormalized();
  return activities.find((a) => a.id === id) ?? null;
}

export async function createEnergyActivity(
  input: CreateEnergyActivityInput,
): Promise<EnergyActivity> {
  return serializeEnergyActivity(async () => {
    const name = input.name.trim();
    if (!name) throw new Error('Activity name is required');

    const activityType: ActivityType = input.activityType ?? 'other';
    if (!isValidActivityType(activityType)) throw new Error('Invalid activity type');

    const intensity: ActivityIntensity = input.intensity ?? 'moderate';
    if (!isValidActivityIntensity(intensity)) throw new Error('Invalid intensity');

    const caloriesSource: CaloriesSource = input.caloriesSource ?? 'manual';
    if (!isValidCaloriesSource(caloriesSource)) throw new Error('Invalid calories source');

    if (!isValidAmount(input.calories) || input.calories <= 0) {
      throw new Error('Calories must be a positive number');
    }
    if (
      input.durationMinutes != null &&
      (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0)
    ) {
      throw new Error('Duration must be a positive number');
    }
    if (
      input.distanceKm != null &&
      input.distanceKm !== undefined &&
      (!Number.isFinite(input.distanceKm) || input.distanceKm < 0)
    ) {
      throw new Error('Distance must be a non-negative number');
    }
    const date = input.date ?? getTodayDate();
    if (!isValidDate(date)) {
      throw new Error('Invalid date format (use YYYY-MM-DD)');
    }

    const activities = await loadEnergyActivitiesNormalized();

    let id = uid('eact_');
    let guard = 0;
    while (activities.some((a) => a.id === id) && guard++ < 5) {
      id = uid('eact_');
    }
    if (activities.some((a) => a.id === id)) {
      throw new Error('Could not generate a unique activity ID');
    }

    const now = getNowISO();
    const activity: EnergyActivity = {
      id,
      name,
      activityType,
      intensity,
      durationMinutes:
        input.durationMinutes != null && input.durationMinutes > 0
          ? input.durationMinutes
          : null,
      calories: input.calories,
      caloriesSource,
      distanceKm:
        input.distanceKm != null && input.distanceKm >= 0 ? input.distanceKm : null,
      date,
      createdAt: now,
      updatedAt: now,
    };

    await saveData(ENERGY_ACTIVITIES_KEY, [activity, ...activities]);
    return activity;
  });
}

export async function updateEnergyActivity(
  id: string,
  input: UpdateEnergyActivityInput,
): Promise<EnergyActivity | null> {
  return serializeEnergyActivity(async () => {
    const activities = await loadEnergyActivitiesNormalized();
    const index = activities.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const activity = activities[index];

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error('Activity name is required');
    }
    if (input.activityType !== undefined && !isValidActivityType(input.activityType)) {
      throw new Error('Invalid activity type');
    }
    if (input.intensity !== undefined && !isValidActivityIntensity(input.intensity)) {
      throw new Error('Invalid intensity');
    }
    if (input.caloriesSource !== undefined && !isValidCaloriesSource(input.caloriesSource)) {
      throw new Error('Invalid calories source');
    }
    if (input.calories !== undefined && (!isValidAmount(input.calories) || input.calories <= 0)) {
      throw new Error('Calories must be a positive number');
    }
    if (
      input.durationMinutes !== undefined &&
      input.durationMinutes !== null &&
      (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0)
    ) {
      throw new Error('Duration must be a positive number');
    }
    if (
      input.distanceKm !== undefined &&
      input.distanceKm !== null &&
      (!Number.isFinite(input.distanceKm) || input.distanceKm < 0)
    ) {
      throw new Error('Distance must be a non-negative number');
    }
    if (input.date !== undefined && !isValidDate(input.date)) {
      throw new Error('Invalid date format (use YYYY-MM-DD)');
    }

    const updated: EnergyActivity = {
      ...activity,
      name: input.name !== undefined ? input.name.trim() : activity.name,
      activityType: input.activityType ?? activity.activityType,
      intensity: input.intensity ?? activity.intensity,
      durationMinutes:
        input.durationMinutes !== undefined
          ? input.durationMinutes != null && input.durationMinutes > 0
            ? input.durationMinutes
            : null
          : activity.durationMinutes,
      calories: input.calories ?? activity.calories,
      caloriesSource: input.caloriesSource ?? activity.caloriesSource,
      distanceKm:
        input.distanceKm !== undefined
          ? input.distanceKm != null && input.distanceKm >= 0
            ? input.distanceKm
            : null
          : activity.distanceKm,
      date: input.date ?? activity.date,
      updatedAt: getNowISO(),
    };

    activities[index] = updated;
    await saveData(ENERGY_ACTIVITIES_KEY, activities);
    return updated;
  });
}

export async function deleteEnergyActivity(id: string): Promise<boolean> {
  return serializeEnergyActivity(async () => {
    const activities = await loadEnergyActivitiesNormalized();
    const filtered = activities.filter((a) => a.id !== id);
    if (filtered.length === activities.length) return false;
    await saveData(ENERGY_ACTIVITIES_KEY, filtered);
    return true;
  });
}

// ─── Energy Balance Calculation (Phase 1H + 1I) ──────────────────────────────

/**
 * Calculate daily energy balance summary.
 * Pure — no storage access. Reuses existing calculateDailyNutrition and calculateBMR.
 * Activity calories: manual uses stored value; estimated calculated from profile + MET.
 */
export function calculateDailyEnergy(
  date: string,
  foodLogs: FoodLogEntry[],
  foods: FoodItem[],
  recipes: Recipe[],
  bodyProfile: BodyProfile | null,
  activities: EnergyActivity[],
): DailyEnergySummary {
  // Calories IN: reuse existing daily nutrition
  const dailyNutrition = calculateDailyNutrition(date, foodLogs, foods, recipes);
  const caloriesIn = dailyNutrition.totals.calories;

  // BMR from body profile
  let bmr: number | null = null;
  if (bodyProfile) {
    try {
      bmr = calculateBMR(bodyProfile);
    } catch {
      bmr = null;
    }
  }

  // Activity calories: sum valid calories from manual + estimated
  const dayActivities = activities.filter((a) => a.date === date);
  let activityCalories = 0;
  for (const a of dayActivities) {
    if (a.caloriesSource === 'estimated' && bodyProfile && a.durationMinutes != null) {
      try {
        activityCalories += estimateActivityCalories({
          activityType: a.activityType,
          intensity: a.intensity,
          durationMinutes: a.durationMinutes,
          weightKg: bodyProfile.weightKg,
        });
      } catch {
        // estimation failed — skip this activity's calories
      }
    } else {
      // manual or estimated without profile — use stored calories
      activityCalories += a.calories;
    }
  }

  // Calories OUT: BMR + activity
  const caloriesOut = (bmr ?? 0) + activityCalories;

  // Net calories
  const netCalories = caloriesIn - caloriesOut;

  // Targets
  let calorieTarget: number | null = null;
  let remainingCalories: number | null = null;
  if (bodyProfile) {
    try {
      const targets = calculateNutritionTargets(bodyProfile);
      calorieTarget = targets.targetCalories;
      remainingCalories = targets.targetCalories - caloriesIn;
    } catch {
      // no target
    }
  }

  // Status
  let status: DailyEnergySummary['status'] = 'maintenance';
  if (netCalories < 0) status = 'deficit';
  else if (netCalories > 0) status = 'surplus';

  return {
    date,
    caloriesIn,
    bmr,
    activityCalories,
    caloriesOut,
    netCalories,
    calorieTarget,
    remainingCalories,
    status,
  };
}

// ─── Nutrition & Energy Analytics (Phase 1K) ─────────────────────────────────
// Historical analytics from persisted records. One date-loop reuses
// calculateDailyNutrition(), calculateDailyEnergy() and calculateBMR().
// Civil-date math is UTC-noon based (timezone-safe); never uses
// new Date("YYYY-MM-DD") for local-day arithmetic.

const ANALYTICS_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isLeapYearCivil(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonthCivil(year: number, month: number): number {
  return (
    [31, isLeapYearCivil(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      month - 1
    ] ?? 0
  );
}

/** True for well-formed, real calendar YYYY-MM-DD strings. */
export function isValidAnalyticsDay(value: unknown): value is string {
  if (typeof value !== 'string' || !ANALYTICS_DAY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonthCivil(y, m);
}

/** Shift a YYYY-MM-DD by delta days using UTC-noon civil math. '' on invalid. */
export function shiftAnalyticsDay(iso: string, delta: number): string {
  if (!isValidAnalyticsDay(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/** Every civil date from start to end inclusive. Empty on invalid/inverted input. */
export function analyticsDateRange(startDate: string, endDate: string): string[] {
  if (!isValidAnalyticsDay(startDate) || !isValidAnalyticsDay(endDate)) return [];
  if (startDate > endDate) return [];
  const out: string[] = [];
  for (let c = startDate; c <= endDate; c = shiftAnalyticsDay(c, 1)) {
    out.push(c);
    if (out.length > 4000) break;
  }
  return out;
}

/** Smallest valid data date across logs/activities, or null when none exist. */
export function earliestAnalyticsDate(
  foodLogs: FoodLogEntry[],
  energyActivities: EnergyActivity[],
): string | null {
  let earliest: string | null = null;
  const consider = (value: unknown) => {
    if (typeof value !== 'string') return;
    const day = value.length >= 10 ? value.slice(0, 10) : '';
    if (!isValidAnalyticsDay(day)) return;
    if (earliest == null || day < earliest) earliest = day;
  };
  for (const log of foodLogs ?? []) consider((log as FoodLogEntry | null)?.date);
  for (const a of energyActivities ?? []) consider((a as EnergyActivity | null)?.date);
  return earliest;
}
/** Resolve a period to an inclusive window. Numeric ends today; all spans data. */
export function resolveNutritionAnalyticsRange(
  period: NutritionAnalyticsPeriod,
  foodLogs: FoodLogEntry[],
  energyActivities: EnergyActivity[],
  today: string = getTodayDate(),
): { startDate: string; endDate: string } {
  const endDate = isValidAnalyticsDay(today) ? today : getTodayDate();
  if (period === 'all') {
    const earliest = earliestAnalyticsDate(foodLogs, energyActivities);
    return { startDate: earliest ?? endDate, endDate };
  }
  return { startDate: shiftAnalyticsDay(endDate, -(period - 1)), endDate };
}

/** Nutrition day only when aggregated food energy is meaningful. */
function hasMeaningfulNutrition(point: {
  caloriesIn: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}): boolean {
  return (
    point.caloriesIn > 0 ||
    point.proteinG > 0 ||
    point.carbsG > 0 ||
    point.fatG > 0 ||
    point.fiberG > 0
  );
}

/** Zeroed summary used for empty/invalid ranges. */
export function emptyNutritionAnalyticsSummary(): NutritionAnalyticsSummary {
  return {
    averageCaloriesIn: null,
    averageCaloriesOut: null,
    averageNetCalories: null,
    averageProteinG: null,
    averageCarbsG: null,
    averageFatG: null,
    averageFiberG: null,
    averageActivityCalories: null,
    totalCaloriesIn: 0,
    totalCaloriesOut: 0,
    totalActivityCalories: 0,
    deficitDays: 0,
    maintenanceDays: 0,
    surplusDays: 0,
    targetAdherencePercent: null,
    daysWithData: 0,
    nutritionDays: 0,
    activeDays: 0,
  };
}
/** Aggregate daily points. Missing days are never treated as zero days. */
export function summarizeNutritionAnalytics(
  points: NutritionAnalyticsPoint[],
  calorieTarget: number | null,
): NutritionAnalyticsSummary {
  const safePoints = Array.isArray(points) ? points : [];
  const nutritionDays = safePoints.filter(hasMeaningfulNutrition);
  const activeDays = safePoints.filter((p) => p.activityCalories > 0);
  const energyDays = safePoints.filter(
    (p) => hasMeaningfulNutrition(p) || p.activityCalories > 0 || p.caloriesOut > 0,
  );
  const avg = (values: number[]): number | null =>
    values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
  let deficitDays = 0;
  let maintenanceDays = 0;
  let surplusDays = 0;
  for (const p of energyDays) {
    if (p.netCalories < 0) deficitDays += 1;
    else if (p.netCalories > 0) surplusDays += 1;
    else maintenanceDays += 1;
  }
  let targetAdherencePercent: number | null = null;
  if (
    typeof calorieTarget === 'number' &&
    Number.isFinite(calorieTarget) &&
    calorieTarget > 0 &&
    nutritionDays.length > 0
  ) {
    const low = calorieTarget * 0.9;
    const high = calorieTarget * 1.1;
    const hits = nutritionDays.filter(
      (p) => p.caloriesIn >= low && p.caloriesIn <= high,
    ).length;
    targetAdherencePercent = Math.round((hits / nutritionDays.length) * 100);
  }
  return {
    averageCaloriesIn: avg(nutritionDays.map((p) => p.caloriesIn)),
    averageCaloriesOut: avg(energyDays.map((p) => p.caloriesOut)),
    averageNetCalories: avg(energyDays.map((p) => p.netCalories)),
    averageProteinG: avg(nutritionDays.map((p) => p.proteinG)),
    averageCarbsG: avg(nutritionDays.map((p) => p.carbsG)),
    averageFatG: avg(nutritionDays.map((p) => p.fatG)),
    averageFiberG: avg(nutritionDays.map((p) => p.fiberG)),
    averageActivityCalories: avg(activeDays.map((p) => p.activityCalories)),
    totalCaloriesIn: nutritionDays.reduce((a, p) => a + p.caloriesIn, 0),
    totalCaloriesOut: energyDays.reduce((a, p) => a + p.caloriesOut, 0),
    totalActivityCalories: safePoints.reduce((a, p) => a + p.activityCalories, 0),
    deficitDays,
    maintenanceDays,
    surplusDays,
    targetAdherencePercent,
    daysWithData: energyDays.length,
    nutritionDays: nutritionDays.length,
    activeDays: activeDays.length,
  };
}

/** One date-loop reusing daily nutrition + energy calculators. */
export function calculateNutritionAnalytics(
  startDate: string,
  endDate: string,
  foodLogs: FoodLogEntry[],
  foods: FoodItem[],
  recipes: Recipe[],
  bodyProfile: BodyProfile | null,
  energyActivities: EnergyActivity[],
): NutritionAnalyticsResult {
  const days = analyticsDateRange(startDate, endDate);
  if (days.length === 0) {
    const emptyStart = isValidAnalyticsDay(startDate) ? startDate : getTodayDate();
    const emptyEnd = isValidAnalyticsDay(endDate) ? endDate : emptyStart;
    return {
      startDate: emptyStart,
      endDate: emptyEnd,
      points: [],
      summary: emptyNutritionAnalyticsSummary(),
    };
  }
  const safeLogs = Array.isArray(foodLogs) ? foodLogs : [];
  const safeFoods = Array.isArray(foods) ? foods : [];
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeActivities = Array.isArray(energyActivities) ? energyActivities : [];
  let calorieTarget: number | null = null;
  if (bodyProfile) {
    try {
      calorieTarget = calculateNutritionTargets(bodyProfile).targetCalories;
    } catch {
      calorieTarget = null;
    }
  }
  const points: NutritionAnalyticsPoint[] = days.map((date) => {
    const nutrition = calculateDailyNutrition(date, safeLogs, safeFoods, safeRecipes);
    const energy = calculateDailyEnergy(
      date, safeLogs, safeFoods, safeRecipes, bodyProfile, safeActivities,
    );
    return {
      date,
      caloriesIn: nutrition.totals.calories,
      caloriesOut: energy.caloriesOut,
      netCalories: energy.netCalories,
      proteinG: nutrition.totals.protein,
      carbsG: nutrition.totals.carbohydrates,
      fatG: nutrition.totals.fat,
      fiberG: nutrition.totals.fiber,
      activityCalories: energy.activityCalories,
    };
  });
  return {
    startDate: days[0],
    endDate: days[days.length - 1],
    points,
    summary: summarizeNutritionAnalytics(points, calorieTarget),
  };
}
/** Max consecutive streak within sorted YYYY-MM-DD day list. */
export function longestConsecutiveStreak(days: string[]): number {
  if (days.length === 0) return 0;
  const set = new Set(days);
  let best = 0;
  for (const d of set) {
    if (set.has(shiftAnalyticsDay(d, -1))) continue;
    let len = 1;
    let c = shiftAnalyticsDay(d, 1);
    while (set.has(c)) { len += 1; c = shiftAnalyticsDay(c, 1); }
    if (len > best) best = len;
  }
  return best;
}

/** Deterministic insight id from type+title+range. */
export function nutritionInsightId(type: string, title: string, start: string, end: string): string {
  const raw = `${type}|${title}|${start}|${end}`;
  let h = 5381;
  for (let i = 0; i < raw.length; i += 1) h = ((h * 33) ^ raw.charCodeAt(i)) >>> 0;
  return `nins_${type}_${h.toString(36)}`;
}

const INSIGHT_TYPE_PRIORITY: Record<NutritionInsightType, number> = {
  calorie_target: 0, protein_target: 1, energy_balance: 2, macro_balance: 3,
  activity: 4, consistency: 5, meal_pattern: 6, missing_data: 7,
};
const SEVERITY_PRIORITY: Record<NutritionInsightSeverity, number> = {
  warning: 0, positive: 1, info: 2,
};

/** Sort warnings, then positives, then infos; type order breaks ties. Max 8. */
export function sortNutritionInsights(insights: NutritionInsight[]): NutritionInsight[] {
  return [...insights].sort((a, b) =>
    SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity] ||
    INSIGHT_TYPE_PRIORITY[a.type] - INSIGHT_TYPE_PRIORITY[b.type] ||
    a.title.localeCompare(b.title),
  ).slice(0, 8);
}

/** Remove dupes with identical type+title+range (keep first). */
export function dedupeNutritionInsights(insights: NutritionInsight[]): NutritionInsight[] {
  const seen = new Set<string>();
  const out: NutritionInsight[] = [];
  for (const i of insights) {
    const k = `${i.type}|${i.title}|${i.dateRangeStart}|${i.dateRangeEnd}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}

function mkInsight(
  type: NutritionInsightType, severity: NutritionInsightSeverity,
  title: string, message: string, recommendation: string,
  start: string, end: string, extra?: { metric?: string; value?: number; target?: number },
): NutritionInsight {
  return {
    id: nutritionInsightId(type, title, start, end),
    type, severity, title, message, recommendation,
    ...(extra?.metric !== undefined ? { metric: extra.metric } : {}),
    ...(extra?.value !== undefined ? { value: extra.value } : {}),
    ...(extra?.target !== undefined ? { target: extra.target } : {}),
    dateRangeStart: start, dateRangeEnd: end,
  };
}
function round1(v: number): number { return Math.round(v * 10) / 10; }


/** Calorie + protein + energy-balance insights. Pure. */
function calorieProteinEnergyInsights(
  analytics: NutritionAnalyticsResult,
  bodyProfile: BodyProfile | null,
  targets: NutritionTargets | null,
): NutritionInsight[] {
  const start = analytics.startDate;
  const end = analytics.endDate;
  const s = analytics.summary;
  const out: NutritionInsight[] = [];
  const avgIn = s.averageCaloriesIn;
  const calTarget = targets?.targetCalories ?? null;
  const hasCal = typeof calTarget === 'number' && Number.isFinite(calTarget) && calTarget > 0;
  if (hasCal && avgIn != null && s.nutritionDays > 0) {
    const ratio = avgIn / (calTarget as number);
    if (ratio < 0.9) {
      out.push(mkInsight('calorie_target', 'warning', 'Calories below target',
        `Average intake ${round1(avgIn)} kcal is ${round1((1 - ratio) * 100)}% below the ${calTarget} kcal target over ${s.nutritionDays} logged days.`,
        'Consider logging consistently and reviewing portion sizes against your target.',
        start, end, { metric: 'avgCaloriesIn', value: round1(avgIn), target: calTarget }));
    } else if (ratio > 1.1) {
      out.push(mkInsight('calorie_target', 'warning', 'Calories above target',
        `Average intake ${round1(avgIn)} kcal is ${round1((ratio - 1) * 100)}% above the ${calTarget} kcal target over ${s.nutritionDays} logged days.`,
        'Consider reviewing portion sizes and logging consistently to stay near target.',
        start, end, { metric: 'avgCaloriesIn', value: round1(avgIn), target: calTarget }));
    } else {
      out.push(mkInsight('calorie_target', 'positive', 'Calories on target',
        `Average intake ${round1(avgIn)} kcal is within 10% of the ${calTarget} kcal target. Adherence ${s.targetAdherencePercent ?? 0}% of logged days.`,
        'Keep logging consistently to maintain this pattern.',
        start, end, { metric: 'avgCaloriesIn', value: round1(avgIn), target: calTarget }));
    }
  }
  const protTarget = targets?.protein ?? null;
  const avgProt = s.averageProteinG;
  if (typeof protTarget === 'number' && Number.isFinite(protTarget) && protTarget > 0 && avgProt != null && s.nutritionDays > 0) {
    const pr = avgProt / protTarget;
    if (pr < 0.8) {
      out.push(mkInsight('protein_target', 'warning', 'Protein below target',
        `Average protein ${round1(avgProt)} g is below 80% of the ${protTarget} g target.`,
        'Consider adding a protein source to logged meals.',
        start, end, { metric: 'avgProteinG', value: round1(avgProt), target: protTarget }));
    } else if (pr < 1) {
      out.push(mkInsight('protein_target', 'info', 'Protein near target',
        `Average protein ${round1(avgProt)} g is between 80-99% of the ${protTarget} g target.`,
        'Small additions to logged meals can close the gap.',
        start, end, { metric: 'avgProteinG', value: round1(avgProt), target: protTarget }));
    } else {
      out.push(mkInsight('protein_target', 'positive', 'Protein on target',
        `Average protein ${round1(avgProt)} g meets the ${protTarget} g target.`,
        'Keep logging protein sources consistently.',
        start, end, { metric: 'avgProteinG', value: round1(avgProt), target: protTarget }));
    }
  }
  const avgNet = s.averageNetCalories;
  if (avgNet != null && s.daysWithData > 0) {
    const goal = bodyProfile?.goal ?? null;
    const BAL = 150;
    if (avgNet < -BAL) {
      const sev: NutritionInsightSeverity = goal === 'lose' ? 'positive' : 'warning';
      out.push(mkInsight('energy_balance', sev,
        goal === 'lose' ? 'Deficit aligns with goal' : 'Sustained calorie deficit',
        `Average net ${round1(avgNet)} kcal across ${s.daysWithData} days with data (deficit ${s.deficitDays}, surplus ${s.surplusDays}).`,
        goal === 'lose' ? 'Keep logging to track this trend.' : 'Consider reviewing intake and activity logs for consistency.',
        start, end, { metric: 'avgNetCalories', value: round1(avgNet) }));
    } else if (avgNet > BAL) {
      const sev: NutritionInsightSeverity = goal === 'gain' ? 'positive' : 'warning';
      out.push(mkInsight('energy_balance', sev,
        goal === 'gain' ? 'Surplus aligns with goal' : 'Sustained calorie surplus',
        `Average net +${round1(avgNet)} kcal across ${s.daysWithData} days with data (surplus ${s.surplusDays}, deficit ${s.deficitDays}).`,
        goal === 'gain' ? 'Keep logging to track this trend.' : 'Consider reviewing intake and activity logs for consistency.',
        start, end, { metric: 'avgNetCalories', value: round1(avgNet) }));
    } else {
      out.push(mkInsight('energy_balance', goal === 'maintain' ? 'positive' : 'info', 'Energy roughly balanced',
        `Average net ${round1(avgNet)} kcal is within ±${BAL} kcal across ${s.daysWithData} days with data.`,
        'Keep logging intake and activity consistently.',
        start, end, { metric: 'avgNetCalories', value: round1(avgNet) }));
    }
  }
  return out;
}


/** Macro + activity + consistency insights. Pure. */
function habitInsights(
  analytics: NutritionAnalyticsResult,
  targets: NutritionTargets | null,
): NutritionInsight[] {
  const start = analytics.startDate;
  const end = analytics.endDate;
  const s = analytics.summary;
  const out: NutritionInsight[] = [];
  const carbT = targets?.carbohydrates ?? null;
  const fatT = targets?.fat ?? null;
  if (s.nutritionDays > 0 && s.averageCarbsG != null && typeof carbT === 'number' && carbT > 0) {
    const r = s.averageCarbsG / carbT;
    if (r < 0.7 || r > 1.3) {
      out.push(mkInsight('macro_balance', 'info', 'Carbs differ from target',
        `Average carbs ${round1(s.averageCarbsG)} g vs target ${carbT} g.`,
        'Review logged carb portions if this pattern persists.',
        start, end, { metric: 'avgCarbsG', value: round1(s.averageCarbsG), target: carbT }));
    }
  }
  if (s.nutritionDays > 0 && s.averageFatG != null && typeof fatT === 'number' && fatT > 0) {
    const r = s.averageFatG / fatT;
    if (r < 0.7 || r > 1.3) {
      out.push(mkInsight('macro_balance', 'info', 'Fat differs from target',
        `Average fat ${round1(s.averageFatG)} g vs target ${fatT} g.`,
        'Review logged fat portions if this pattern persists.',
        start, end, { metric: 'avgFatG', value: round1(s.averageFatG), target: fatT }));
    }
  }
  const totalDays = analytics.points.length;
  if (totalDays > 0) {
    const cov = s.activeDays / totalDays;
    if (s.activeDays >= 4 && cov >= 0.5) {
      out.push(mkInsight('activity', 'positive', 'Activity logged consistently',
        `${s.activeDays} active days, ${round1(s.totalActivityCalories)} kcal total.`,
        'Keep logging activities to preserve this record.',
        start, end, { metric: 'activeDays', value: s.activeDays }));
    } else if (s.activeDays === 0) {
      out.push(mkInsight('activity', 'info', 'No activity logged',
        'No activity calories were recorded in this range.',
        'Log activities to build an activity record.',
        start, end, { metric: 'activeDays', value: 0 }));
    } else {
      out.push(mkInsight('activity', 'info', 'Activity logging is sparse',
        `${s.activeDays} active days out of ${totalDays} days in range.`,
        'Log activities more regularly for clearer trends.',
        start, end, { metric: 'activeDays', value: s.activeDays }));
    }
  }
  const nutDays = analytics.points.filter((p) => p.caloriesIn > 0 || p.proteinG > 0).map((p) => p.date);
  const actDays = analytics.points.filter((p) => p.activityCalories > 0).map((p) => p.date);
  const nutStreak = longestConsecutiveStreak(nutDays);
  const actStreak = longestConsecutiveStreak(actDays);
  if (totalDays > 0 && s.nutritionDays >= 4 && nutStreak >= 3) {
    out.push(mkInsight('consistency', 'positive', 'Consistent nutrition logging',
      `${s.nutritionDays} nutrition days with a ${nutStreak}-day streak.`,
      'Keep logging to preserve this record.',
      start, end, { metric: 'nutritionDays', value: s.nutritionDays }));
  } else if (totalDays >= 7 && s.nutritionDays <= Math.max(1, Math.floor(totalDays * 0.3))) {
    out.push(mkInsight('consistency', 'info', 'Nutrition logging is sparse',
      `${s.nutritionDays} nutrition days out of ${totalDays} days.`,
      'Log meals more regularly for clearer trends.',
      start, end, { metric: 'nutritionDays', value: s.nutritionDays }));
  }
  if (actStreak >= 3 && s.activeDays >= 3) {
    out.push(mkInsight('consistency', 'positive', 'Consistent activity logging',
      `${s.activeDays} active days with a ${actStreak}-day streak.`,
      'Keep logging activities regularly.',
      start, end, { metric: 'activeDays', value: s.activeDays }));
  }
  return out;
}
/** Meal-pattern + missing-data insights. Pure, neutral phrasing. */
function patternMissingInsights(
  analytics: NutritionAnalyticsResult,
  bodyProfile: BodyProfile | null,
  foodLogs: FoodLogEntry[],
): NutritionInsight[] {
  const start = analytics.startDate;
  const end = analytics.endDate;
  const s = analytics.summary;
  const out: NutritionInsight[] = [];
  const safeLogs = Array.isArray(foodLogs) ? foodLogs : [];
  const inRange = safeLogs.filter((l) => typeof l?.date === 'string' && l.date >= start && l.date <= end);
  if (inRange.length >= 5 && s.nutritionDays >= 3) {
    const counts: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, other: 0 };
    for (const l of inRange) {
      const m = (l as FoodLogEntry).mealType;
      if (counts[m] !== undefined) counts[m] += 1;
    }
    const total = Math.max(1, inRange.length);
    const share = (k: string) => counts[k] / total;
    if (share('breakfast') < 0.1 && counts.dinner + counts.lunch > 0) {
      out.push(mkInsight('meal_pattern', 'info', 'Breakfast rarely logged',
        `Breakfast is ${Math.round(share('breakfast') * 100)}% of ${inRange.length} logged meals.`,
        'Log breakfast when eaten for a fuller record.',
        start, end, { metric: 'breakfastShare', value: round1(share('breakfast') * 100) }));
    }
    if (share('lunch') < 0.1 && counts.dinner + counts.breakfast > 0) {
      out.push(mkInsight('meal_pattern', 'info', 'Lunch rarely logged',
        `Lunch is ${Math.round(share('lunch') * 100)}% of ${inRange.length} logged meals.`,
        'Log lunch when eaten for a fuller record.',
        start, end, { metric: 'lunchShare', value: round1(share('lunch') * 100) }));
    }
    if (share('dinner') >= 0.5) {
      out.push(mkInsight('meal_pattern', 'info', 'Dinner heavily represented',
        `Dinner is ${Math.round(share('dinner') * 100)}% of ${inRange.length} logged meals.`,
        'Log other meals when eaten for a balanced record.',
        start, end, { metric: 'dinnerShare', value: round1(share('dinner') * 100) }));
    }
    if (share('snack') >= 0.4 && inRange.length >= 6) {
      out.push(mkInsight('meal_pattern', 'info', 'Snack-heavy logging',
        `Snacks are ${Math.round(share('snack') * 100)}% of ${inRange.length} logged meals.`,
        'Log main meals when eaten for a fuller record.',
        start, end, { metric: 'snackShare', value: round1(share('snack') * 100) }));
    }
  }
  if (bodyProfile == null) {
    out.push(mkInsight('missing_data', 'warning', 'No body profile',
      'Calorie and BMR-based insights are unavailable without a body profile.',
      'Add a body profile in Nutrition Targets to enable target insights.',
      start, end));
  }
  if (s.nutritionDays === 0) {
    out.push(mkInsight('missing_data', 'warning', 'No nutrition logs',
      'No nutrition logs were found in this range.',
      'Log meals to enable nutrition insights.',
      start, end));
  }
  if (s.activeDays === 0 && s.nutritionDays > 0) {
    out.push(mkInsight('missing_data', 'info', 'No activity data',
      'No activity calories were recorded in this range.',
      'Log activities to enable activity insights.',
      start, end));
  }
  if (analytics.points.length >= 7 && s.daysWithData > 0 && s.daysWithData <= Math.floor(analytics.points.length * 0.3)) {
    out.push(mkInsight('missing_data', 'info', 'Sparse tracking data',
      `Only ${s.daysWithData} of ${analytics.points.length} days have data.`,
      'Log more regularly for clearer insights.',
      start, end, { metric: 'daysWithData', value: s.daysWithData }));
  }
  return out;
}

/** Deterministic insights: no storage, neutral, max 8, warnings first. */
export function generateNutritionInsights(
  analytics: NutritionAnalyticsResult,
  bodyProfile: BodyProfile | null,
  targets: NutritionTargets | null,
  foodLogs: FoodLogEntry[],
  foods: FoodItem[],
  recipes: Recipe[],
): NutritionInsight[] {
  void foods;
  void recipes;
  const all = [
    ...calorieProteinEnergyInsights(analytics, bodyProfile, targets),
    ...habitInsights(analytics, targets),
    ...patternMissingInsights(analytics, bodyProfile, foodLogs),
  ];
  return sortNutritionInsights(dedupeNutritionInsights(all));
}


