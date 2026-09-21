// JEEVYA 3T.13 focused tests: advanced nutrition + nutrient calculator.
// Run: npx tsx --import ./src/__tests__/mock-setup.ts src/__tests__/nutrition-3t13.test.ts

import { saveData } from '@/lib/storage';
import {
  calculateDailyEnergy,
  calculateDailyNutrition,
  calculateFoodQuantity,
  calculateMealNutritionDetailed,
  calculateNutrition,
  calculateRecipeForQuantity,
  calculateRecipeNutrition,
  calculateRecipePerServing,
  createFood,
  createFoodLog,
  deleteFood,
  deleteFoodLog,
  deleteRecipe,
  getFoods,
  roundNutritionForDisplay,
} from '@/services/nutrition';
import type { FoodItem, Recipe } from '@/types/nutrition';

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, message: string) {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.log(`  ✗ FAIL: ${message}`);
  }
}

function eq(actual: unknown, expected: unknown, message: string) {
  assert(actual === expected, `${message} (got ${String(actual)}, expected ${String(expected)})`);
}

function close(actual: number, expected: number, message: string, epsilon = 1e-9) {
  assert(Math.abs(actual - expected) <= epsilon, `${message} (got ${actual}, expected ${expected})`);
}

const food = (overrides: Partial<FoodItem> = {}): FoodItem => ({
  id: 'food-test',
  name: 'Test Food',
  brand: null,
  category: 'Test',
  description: null,
  source: 'system',
  sourceDetail: 'USDA test fixture',
  preparation: 'cooked',
  serving: { amount: 100, unit: 'g' },
  nutrition: {
    basis: 'per_100g',
    servingAmount: null,
    servingUnit: null,
    calories: 200,
    protein: 10,
    carbohydrates: 30,
    fat: 5,
    fiber: 4,
    sugar: 2,
    saturatedFat: 1,
    sodium: 20,
    monounsaturatedFat: 2,
    polyunsaturatedFat: 1,
    transFat: 0,
    micronutrients: {
      calcium: 50,
      iron: 2,
      magnesium: 20,
      phosphorus: 80,
      potassium: 150,
      zinc: 1,
      copper: 0.1,
      manganese: 0.2,
      selenium: 3,
      vitaminA: 10,
      vitaminC: 5,
      vitaminD: 1,
      vitaminE: 0.5,
      vitaminK: 2,
      vitaminB1: 0.1,
      vitaminB2: 0.2,
      vitaminB3: 1,
      vitaminB5: 0.3,
      vitaminB6: 0.1,
      vitaminB7: 0.01,
      vitaminB12: 0.2,
      folate: 10,
    },
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

void (async () => {
  console.log('\n=== 3T.13 Advanced Nutrition + Nutrient Calculator ===');

  console.log('\n=== 1. Per-100 g calculation and quantity scaling ===');
  const base = food();
  const result100g = calculateNutrition(base, { amount: 100, unit: 'g' });
  const result250g = calculateNutrition(base, { amount: 250, unit: 'g' });
  close(result100g.calories, 200, '100 g keeps per-100 g calories');
  close(result250g.calories, 500, '250 g scales calories linearly');
  close(result250g.protein, 25, '250 g scales protein');
  close(result250g.fat, 12.5, '250 g scales fat');
  close(result250g.fiber, 10, '250 g scales fiber');
  close(result250g.micronutrients.calcium ?? -1, 125, 'micronutrients scale with quantity');
  close(result250g.monounsaturatedFat ?? -1, 5, 'advanced fat fields scale');

  console.log('\n=== 2. Gram, milliliter, piece and serving conversions ===');
  close(calculateNutrition(base, { amount: 1, unit: 'kg' }).calories, 2000, 'kg converts to grams');
  close(calculateNutrition(base, { amount: 500, unit: 'mg' }).calories, 1, 'mg converts to grams');
  const milk = food({
    id: 'milk-test',
    nutrition: { ...base.nutrition, basis: 'per_100ml' },
    quantityConversions: { bowl: 250 },
  });
  close(calculateNutrition(milk, { amount: 250, unit: 'ml' }).calories, 500, 'ml uses per-100 ml basis');
  close(calculateNutrition(milk, { amount: 1, unit: 'bowl' }).calories, 500, 'bowl uses food-specific volume conversion');
  const roti = food({ id: 'roti-test', quantityConversions: { piece: 40 } });
  close(calculateNutrition(roti, { amount: 2, unit: 'piece' }).calories, 160, 'piece converts through canonical food conversion');
  const egg = food({
    id: 'egg-test',
    nutrition: { ...base.nutrition, basis: 'per_serving', servingAmount: 1, servingUnit: 'piece' },
  });
  close(calculateNutrition(egg, { amount: 2, unit: 'piece' }).calories, 400, 'serving-based piece quantity scales');

  console.log('\n=== 3. Missing vs zero nutrient handling ===');
  const sparse = food({
    id: 'sparse-test',
    nutrition: { ...base.nutrition, transFat: undefined, micronutrients: { calcium: 0, iron: 2 } },
  });
  const sparseResult = calculateNutrition(sparse, { amount: 100, unit: 'g' });
  eq(sparseResult.transFat, undefined, 'missing trans fat stays missing');
  eq(sparseResult.micronutrients.calcium, 0, 'explicit zero remains zero');
  eq(sparseResult.micronutrients.vitaminC, undefined, 'missing vitamin stays missing');
  assert(!('vitaminC' in sparseResult.micronutrients), 'missing nutrient is not zero-filled');

  console.log('\n=== 4. Meal and per-food contribution ===');
  const rice = food({ id: 'rice', name: 'Boiled Rice', nutrition: { ...base.nutrition, calories: 130, protein: 2.7, carbohydrates: 28, fat: 0.3, fiber: 0.4 } });
  const dal = food({ id: 'dal', name: 'Dal', nutrition: { ...base.nutrition, calories: 115, protein: 6, carbohydrates: 17, fat: 3, fiber: 4 } });
  const rotiMeal = food({ id: 'roti', name: 'Roti', quantityConversions: { piece: 40 } });
  const logs = [
    { id: 'l1', foodId: 'rice', quantity: 200, unit: 'g' as const, mealType: 'lunch' as const, date: '2026-09-14', createdAt: '2026-09-14T12:00:00Z', updatedAt: '2026-09-14T12:00:00Z' },
    { id: 'l2', foodId: 'dal', quantity: 150, unit: 'g' as const, mealType: 'lunch' as const, date: '2026-09-14', createdAt: '2026-09-14T12:01:00Z', updatedAt: '2026-09-14T12:01:00Z' },
    { id: 'l3', foodId: 'roti', quantity: 2, unit: 'piece' as const, mealType: 'lunch' as const, date: '2026-09-14', createdAt: '2026-09-14T12:02:00Z', updatedAt: '2026-09-14T12:02:00Z' },
  ];
  const detailed = calculateMealNutritionDetailed(logs, [rice, dal, rotiMeal]);
  close(detailed.totals.calories, 592.5, 'meal calories sum all food contributions');
  close(detailed.totals.protein, 22.4, 'meal protein totals correctly');
  close(detailed.totals.carbohydrates, 105.5, 'meal carbs total correctly');
  close(detailed.totals.fat, 9.1, 'meal fats total correctly');
  close(detailed.totals.fiber, 10, 'meal fiber total correctly');
  eq(detailed.contributions.length, 3, 'meal exposes one contribution per food');
  eq(detailed.contributions[0]?.foodId, 'rice', 'per-food contribution preserves food identity');

  console.log('\n=== 5. Recipe calculation and arbitrary quantity ===');
  const recipe: Recipe = {
    id: 'recipe-dal',
    name: 'Dal Recipe',
    description: null,
    category: 'Recipe',
    servings: 4,
    totalQuantity: { amount: 800, unit: 'g' },
    ingredients: [
      { id: 'ri1', foodId: 'dal', quantity: 400, unit: 'g' },
      { id: 'ri2', foodId: 'rice', quantity: 100, unit: 'g' },
    ],
    createdAt: '2026-09-14T00:00:00Z',
    updatedAt: '2026-09-14T00:00:00Z',
  };
  const recipeTotal = calculateRecipeNutrition(recipe, [dal, rice]);
  close(recipeTotal.totals.calories, 590, 'recipe totals sum ingredient nutrition');
  close(calculateRecipePerServing(recipe, [dal, rice]).totals.calories, 147.5, 'recipe per-serving calculation divides total');
  close(calculateRecipeForQuantity(recipe, [dal, rice], { amount: 200, unit: 'g' }).totals.calories, 147.5, 'arbitrary recipe quantity uses declared total quantity');

  console.log('\n=== 6. Daily aggregation and no double counting ===');
  const daily = calculateDailyNutrition('2026-09-14', logs, [rice, dal, rotiMeal]);
  close(daily.totals.calories, 592.5, 'daily total equals logged meal once');
  eq(daily.loggedCount, 3, 'daily aggregation counts each log once');
  eq(daily.calculatedCount, 3, 'daily aggregation calculates each log once');
  close(daily.byMeal.find((m) => m.mealType === 'lunch')?.totals.calories ?? -1, 592.5, 'daily meal bucket matches total');

  console.log('\n=== 7. BMR/TDEE and authoritative activity integration ===');
  const profile = { sex: 'male' as const, age: 30, heightCm: 180, weightKg: 80, activityLevel: 'moderate' as const, goal: 'maintain' as const, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
  const energy = calculateDailyEnergy('2026-09-14', logs, [rice, dal, rotiMeal], [], profile, [
    { id: 'a1', name: 'Walking', activityType: 'walking', intensity: 'moderate', durationMinutes: 60, calories: 250, caloriesSource: 'manual', distanceKm: 5, date: '2026-09-14', createdAt: '2026-09-14T08:00:00Z', updatedAt: '2026-09-14T08:00:00Z' },
  ]);
  assert(energy.bmr != null && energy.bmr > 0, 'BMR is integrated from existing body profile');
  eq(energy.activityCalories, 250, 'activity calories come from existing activity records');
  close(energy.caloriesIn, 592.5, 'energy intake reuses daily nutrition without duplication');
  close(energy.netCalories, energy.caloriesIn - energy.caloriesOut, 'net energy is IN minus OUT');

  console.log('\n=== 8. Source metadata, validation and deterministic rounding ===');
  const custom = await createFood({ name: 'Custom Test', serving: { amount: 100, unit: 'g' }, nutrition: { basis: 'per_100g', calories: 100, protein: 5, carbohydrates: 10, fat: 2, fiber: 1, sugar: 1, saturatedFat: 0.5, sodium: 10 } });
  const customCalc = calculateFoodQuantity(custom, { amount: 50, unit: 'g' });
  eq(customCalc.source.quality, 'user_entered', 'custom food is labeled user-entered');
  eq(customCalc.source.source, 'custom', 'source metadata preserves food source');
  close(roundNutritionForDisplay(1.005, 2), 1.01, 'rounding is deterministic');
  assert(Number.isFinite(roundNutritionForDisplay(123.456789, 3)), 'rounding preserves finite values');
  try { calculateNutrition(base, { amount: 0, unit: 'g' }); assert(false, 'zero quantity must be rejected'); } catch { assert(true, 'zero quantity is rejected'); }
  try { calculateNutrition(base, { amount: -1, unit: 'g' }); assert(false, 'negative quantity must be rejected'); } catch { assert(true, 'negative quantity is rejected'); }
  try { calculateNutrition(base, { amount: 1, unit: 'piece' }); assert(false, 'incompatible piece quantity must be rejected'); } catch { assert(true, 'incompatible piece quantity is rejected'); }

  console.log('\n=== 9. Backward compatibility and persistence ===');
  await saveData('jeevya:nutrition:foods', [{
    id: 'legacy-food', name: 'Legacy Food', category: 'Legacy', source: 'custom', serving: { amount: 100, unit: 'g' },
    nutrition: { basis: 'per_100g', calories: 100, protein: 5, carbohydrates: 10, fat: 2, fiber: 1, sugar: 1, saturatedFat: 0.5, sodium: 10, micronutrients: { calcium: 0 } },
  }]);
  const legacyFoods = await getFoods();
  eq(legacyFoods.length, 1, 'legacy stored food remains readable');
  eq(legacyFoods[0]?.id, 'legacy-food', 'legacy food identity remains intact');
  eq(legacyFoods[0]?.nutrition.micronutrients.calcium, 0, 'legacy explicit zero survives normalization');
  const persistedLog = await createFoodLog({ foodId: custom.id, quantity: 1, unit: 'serving', mealType: 'breakfast', date: '2026-09-14' });
  assert(persistedLog.id.length > 0, 'existing food-log storage remains compatible');

  await deleteFood(custom.id);
  await deleteFoodLog(persistedLog.id);
  await deleteRecipe(recipe.id).catch(() => false);

  console.log(`\n=== RESULT: ${passed}/${total} passed, ${failed} failed ===`);
  if (failed > 0) process.exitCode = 1;
})();
