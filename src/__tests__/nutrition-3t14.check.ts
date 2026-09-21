// JEEVYA 3T.14 focused tests: comprehensive food + nutrient database expansion.
// Run: npx tsx --import ./src/__tests__/mock-setup.ts src/__tests__/nutrition-3t14.test.ts

import { saveData } from '@/lib/storage';
import { SYSTEM_FOODS } from '@/lib/system-foods';
import {
  calculateDailyNutrition,
  calculateFoodQuantity,
  calculateMealNutritionDetailed,
  calculateNutrition,
  calculateRecipeForQuantity,
  calculateRecipeNutrition,
  calculateRecipePerServing,
  getFoods,
  getSystemFoods,
  searchFoods,
  seedSystemFoods,
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

const byId = (id: string): FoodItem => {
  const found = SYSTEM_FOODS.find((food) => food.id === id);
  if (!found) throw new Error(`Missing fixture ${id}`);
  return {
    ...found,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
  } as FoodItem;
};

void (async () => {
  console.log('\n=== JEEVYA 3T.14 Comprehensive Food + Nutrient Database ===');

  await saveData('jeevya:nutrition:foods', []);
  const seed = await seedSystemFoods();
  const foods = await getSystemFoods();
  const newFoods = foods.filter((food) => food.id.startsWith('food_sys_3t14_'));

  console.log('\n=== 1. Catalog size, categories and representative foods ===');
  eq(seed.added, 142, 'initial seed adds the complete 142-food system catalog');
  eq(newFoods.length, 97, 'exactly 97 Phase 3T.14 foods are queryable after seeding');
  eq(new Set(newFoods.map((food) => food.category)).size, 13, '13 categories are represented by the expansion');
  for (const id of [
    'food_sys_3t14_brown-rice-raw',
    'food_sys_3t14_chickpeas-cooked',
    'food_sys_3t14_almonds-raw',
    'food_sys_3t14_sesame-seeds',
    'food_sys_3t14_milk-whole',
    'food_sys_3t14_peanut-oil',
    'food_sys_3t14_tuna-yellowfin-raw',
    'food_sys_3t14_tofu-firm',
    'food_sys_3t14_chapati-frozen',
    'food_sys_3t14_naan-plain',
  ]) {
    assert(newFoods.some((food) => food.id === id), `representative food exists: ${id}`);
  }
  assert(newFoods.some((food) => food.id === 'food_sys_3t14_pigeon-peas-cooked') === false, 'source-incomplete toor dal variant is not fabricated');

  console.log('\n=== 2. Nutrient completeness and missing-value preservation ===');
  const represented = new Set<string>();
  for (const food of newFoods) {
    assert(food.nutrition.basis === 'per_100g', `${food.name} uses per-100-g basis`);
    assert(food.sourceDetail?.includes('NDB ') === true, `${food.name} preserves NDB provenance`);
    for (const key of ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sugar', 'saturatedFat', 'sodium']) {
      assert(typeof food.nutrition[key as keyof typeof food.nutrition] === 'number', `${food.name} has required source-backed ${key}`);
      represented.add(key);
    }
    for (const key of Object.keys(food.nutrition.micronutrients)) represented.add(key);
    if (food.nutrition.monounsaturatedFat !== undefined) represented.add('monounsaturatedFat');
    if (food.nutrition.polyunsaturatedFat !== undefined) represented.add('polyunsaturatedFat');
    if (food.nutrition.transFat !== undefined) represented.add('transFat');
  }
  eq(represented.size, 32, '32 nutrient fields are represented across the new catalog');
  const brown = byId('food_sys_3t14_brown-rice-raw');
  const brown100 = calculateNutrition(brown, { amount: 100, unit: 'g' });
  eq(brown100.transFat, undefined, 'source-missing trans fat stays absent');
  eq(brown100.micronutrients.vitaminB7, undefined, 'source-missing biotin stays absent');
  eq(brown100.micronutrients.vitaminC, 0, 'explicit source zero vitamin C remains zero');

  console.log('\n=== 3. Provenance, quality and aliases ===');
  eq(calculateFoodQuantity(brown, { amount: 100, unit: 'g' }).source.quality, 'verified', 'USDA system food is classified as verified');
  eq(calculateFoodQuantity(brown, { amount: 100, unit: 'g' }).source.source, 'system', 'source metadata remains system');
  const toorSearch = searchFoods(foods, 'toor dal');
  assert(toorSearch.some((food) => food.id === 'food_sys_toor-dal-raw'), 'existing toor dal record remains searchable');
  assert(searchFoods(foods, 'groundnut oil').some((food) => food.id === 'food_sys_3t14_peanut-oil'), 'groundnut oil alias finds peanut oil');
  assert(searchFoods(foods, 'anjeer').some((food) => food.id === 'food_sys_3t14_figs-raw'), 'anjeer alias finds figs');
  assert(searchFoods(foods, 'bhindi').some((food) => food.id === 'food_sys_3t14_okra-bhindi-raw'), 'bhindi alias finds okra');
  assert(searchFoods(foods, 'badam').some((food) => food.id === 'food_sys_3t14_almonds-raw'), 'badam alias finds almonds');

  console.log('\n=== 4. Duplicate IDs, duplicate records and raw/cooked variants ===');
  const ids = foods.map((food) => food.id);
  eq(new Set(ids).size, ids.length, 'system catalog contains no duplicate IDs');
  eq(new Set(newFoods.map((food) => food.name.toLowerCase())).size, newFoods.length, 'Phase 3T.14 contains no duplicate canonical names');
  assert(newFoods.some((food) => food.id === 'food_sys_3t14_chickpeas-cooked'), 'cooked chickpeas variant exists');
  assert(newFoods.some((food) => food.id === 'food_sys_3t14_lentils-raw'), 'raw lentils variant exists');
  assert(newFoods.some((food) => food.id === 'food_sys_3t14_lentils-cooked'), 'cooked lentils variant exists');
  assert(newFoods.some((food) => food.id === 'food_sys_3t14_milk-whole'), 'whole milk variant exists');
  assert(newFoods.some((food) => food.id === 'food_sys_3t14_milk-skim'), 'skim milk variant exists');

  console.log('\n=== 5. Quantity conversions and 3T.13 calculator compatibility ===');
  const chapati = byId('food_sys_3t14_chapati-frozen');
  const chapatiPiece = calculateNutrition(chapati, { amount: 1, unit: 'piece' });
  close(chapatiPiece.calories, chapati.nutrition.calories * 0.43, 'explicit chapati piece conversion scales through 3T.13 calculator');
  const flour = byId('food_sys_3t14_whole-wheat-flour');
  const flourCup = calculateNutrition(flour, { amount: 1, unit: 'cup' });
  close(flourCup.calories, flour.nutrition.calories * 1.2, 'explicit flour cup conversion scales correctly');
  const oil = byId('food_sys_3t14_peanut-oil');
  const oilTbsp = calculateNutrition(oil, { amount: 1, unit: 'tbsp' });
  close(oilTbsp.calories, oil.nutrition.calories * 0.135, 'explicit oil tablespoon conversion scales correctly');
  close(calculateNutrition(brown, { amount: 250, unit: 'g' }).calories, brown.nutrition.calories * 2.5, '100 g scaling remains linear');
  try {
    calculateNutrition(brown, { amount: 1, unit: 'piece' });
    assert(false, 'incompatible piece quantity must be rejected');
  } catch {
    assert(true, 'incompatible piece quantity is rejected');
  }
  const milk = byId('food_sys_3t14_milk-whole');
  try {
    calculateNutrition(milk, { amount: 100, unit: 'ml' });
    assert(false, 'per-100-g milk rejects unsupported volume conversion without explicit density');
  } catch {
    assert(true, 'per-100-g milk rejects unsupported volume conversion without explicit density');
  }

  console.log('\n=== 6. 100 ml compatibility with existing 3T.13 model ===');
  const existingMilk = foods.find((food) => food.id === 'food_sys_milk-cow');
  assert(existingMilk !== undefined, 'legacy per-100-ml milk remains available');
  if (existingMilk) {
    const milk100 = calculateNutrition(existingMilk, { amount: 100, unit: 'ml' });
    close(milk100.calories, existingMilk.nutrition.calories, 'existing per-100-ml calculation remains compatible');
  }

  console.log('\n=== 7. Meal, recipe and daily aggregation compatibility ===');
  const rice = foods.find((food) => food.id === 'food_sys_white-rice-cooked');
  const chickpeas = byId('food_sys_3t14_chickpeas-cooked');
  const mealLogs = [
    { id: '3t14-rice', foodId: rice?.id ?? 'missing', quantity: 200, unit: 'g' as const, mealType: 'lunch' as const, date: '2026-09-15', createdAt: '2026-09-15T12:00:00Z', updatedAt: '2026-09-15T12:00:00Z' },
    { id: '3t14-chickpeas', foodId: chickpeas.id, quantity: 150, unit: 'g' as const, mealType: 'lunch' as const, date: '2026-09-15', createdAt: '2026-09-15T12:01:00Z', updatedAt: '2026-09-15T12:01:00Z' },
  ];
  assert(rice !== undefined, 'legacy rice remains available for integration');
  if (rice) {
    const detailed = calculateMealNutritionDetailed(mealLogs, [rice, chickpeas]);
    close(detailed.totals.calories, calculateNutrition(rice, { amount: 200, unit: 'g' }).calories + calculateNutrition(chickpeas, { amount: 150, unit: 'g' }).calories, 'meal totals include new food exactly once');
    eq(detailed.contributions.length, 2, 'meal exposes both legacy and new food contributions');

    const recipe: Recipe = {
      id: 'recipe-3t14', name: 'Chickpea Rice', description: null, category: 'Test', servings: 2,
      totalQuantity: { amount: 350, unit: 'g' },
      ingredients: [
        { id: 'r1', foodId: rice.id, quantity: 200, unit: 'g' },
        { id: 'r2', foodId: chickpeas.id, quantity: 150, unit: 'g' },
      ],
      createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z',
    };
    const totalNutrition = calculateRecipeNutrition(recipe, [rice, chickpeas]);
    close(calculateRecipePerServing(recipe, [rice, chickpeas]).totals.calories, totalNutrition.totals.calories / 2, 'recipe per-serving compatibility remains intact');
    close(calculateRecipeForQuantity(recipe, [rice, chickpeas], { amount: 350, unit: 'g' }).totals.calories, totalNutrition.totals.calories, 'recipe arbitrary quantity remains compatible');

    const daily = calculateDailyNutrition('2026-09-15', mealLogs, [rice, chickpeas]);
    close(daily.totals.calories, detailed.totals.calories, 'daily aggregation matches meal aggregation');
    eq(daily.loggedCount, 2, 'daily aggregation counts both logs');
  }

  console.log('\n=== 8. Legacy compatibility and seed idempotence ===');
  const secondSeed = await seedSystemFoods();
  eq(secondSeed.added, 0, 'system seeding is idempotent on existing IDs');
  eq(secondSeed.skipped, SYSTEM_FOODS.length, 'second seed skips the complete system catalog');
  const allFoods = await getFoods();
  assert(allFoods.some((food) => food.id === 'food_sys_white-rice-cooked'), 'legacy system food ID remains stable');
  assert(allFoods.some((food) => food.id === 'food_sys_3t14_brown-rice-raw'), 'new stable system food ID persists');
  const legacyFixture = allFoods.find((food) => food.id === 'food_sys_white-rice-cooked');
  assert(legacyFixture?.source === 'system', 'existing system food source remains unchanged');

  console.log(`\n=== RESULT: ${passed}/${total} passed, ${failed} failed ===`);
  if (failed > 0) process.exitCode = 1;
})();
