// ─── JEEVYA A2: Health/Nutrition Boundary Regression Tests ───────────────────
// Run: npx tsx --import ./src/__tests__/mock-setup.ts src/__tests__/health-nutrition-a2.test.ts

import {
  importHealthActivities,
  normalizeHealthActivity,
} from '@/services/health';
import {
  calculateDailyEnergy,
  getEnergyActivities,
} from '@/services/nutrition';
import type { ActivityIntensity, ActivityType, BodyProfile, EnergyActivity, FoodItem, FoodLogEntry } from '@/types/nutrition';
import type { HealthActivity, HealthProvider, HealthProviderAdapter, HealthSyncStatus } from '@/types/health';
import { loadData, saveData } from '@/lib/storage';

const ENERGY_KEY = 'jeevya:nutrition:energy-activities';

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, message: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${message}`);
  }
}

function eq(actual: unknown, expected: unknown, message: string) {
  assert(actual === expected, `${message} (got ${String(actual)}, expected ${String(expected)})`);
}

function approx(actual: number, expected: number, message: string, epsilon = 1e-6) {
  assert(Math.abs(actual - expected) <= epsilon, `${message} (got ${actual}, expected ${expected})`);
}

const NOW = '2026-09-14T00:00:00.000Z';

function healthActivity(externalId: string, calories = 300): HealthActivity {
  return {
    externalId,
    provider: 'health_connect',
    name: 'Health Connect Run',
    activityType: 'running',
    intensity: 'moderate',
    startAt: '2026-09-14T07:00:00Z',
    endAt: '2026-09-14T07:30:00Z',
    durationMinutes: 30,
    calories,
    distanceKm: 5,
    source: 'health_connect',
  };
}

function food(): FoodItem {
  return {
    id: 'a2-food', name: 'A2 Food', brand: null, category: 'Test', description: null,
    source: 'custom', sourceDetail: null, preparation: 'raw',
    serving: { amount: 100, unit: 'g' },
    nutrition: {
      basis: 'per_100g', servingAmount: null, servingUnit: null,
      calories: 100, protein: 10, carbohydrates: 20, fat: 5, fiber: 2,
      sugar: 0, saturatedFat: 0, sodium: 0, micronutrients: {},
    },
    createdAt: NOW, updatedAt: NOW,
  };
}

function log(): FoodLogEntry {
  return {
    id: 'a2-log', foodId: 'a2-food', quantity: 100, unit: 'g', mealType: 'lunch',
    itemType: 'food', date: '2026-09-14', createdAt: NOW, updatedAt: NOW,
  };
}

function profile(): BodyProfile {
  return {
    sex: 'male', age: 30, heightCm: 180, weightKg: 80,
    activityLevel: 'moderate', goal: 'maintain', createdAt: NOW, updatedAt: NOW,
  };
}

void (async () => {
  console.log('\n=== A2.1 Health type separation ===');
  const provider: HealthProvider = 'health_connect';
  const status: HealthSyncStatus = 'ready';
  const adapter: HealthProviderAdapter = {
    provider,
    isAvailable: async () => true,
    getPermissionStatus: async () => 'granted',
    requestPermissions: async () => true,
    readActivities: async () => [healthActivity('type-check')],
  };
  const activity: HealthActivity = healthActivity('type-check');
  assert(provider === 'health_connect' && status === 'ready', 'provider and sync types are owned by types/health');
  assert(typeof adapter.readActivities === 'function' && activity.provider === provider, 'HealthProviderAdapter and HealthActivity resolve from Health types');

  console.log('\n=== A2.2 Import and normalization ===');
  await saveData(ENERGY_KEY, []);
  const normalized = normalizeHealthActivity(healthActivity('a2-normalize', 350));
  eq(normalized.externalId, 'a2-normalize', 'normalization preserves externalId');
  eq(normalized.provider, 'health_connect', 'normalization preserves provider');
  eq(normalized.calories, 350, 'normalization preserves provider calories');

  const first = await importHealthActivities([healthActivity('a2-import', 300)]);
  eq(first.imported, 1, 'Health import delegates one new activity to Nutrition owner');
  const persisted = await loadData<Record<string, unknown>[]>(ENERGY_KEY, []);
  eq(persisted.length, 1, 'imported activity is persisted in canonical EnergyActivity store');

  console.log('\n=== A2.3 Persistence ownership and deduplication ===');
  const duplicate = await importHealthActivities([healthActivity('a2-import', 325), healthActivity('a2-import', 325)]);
  eq(duplicate.imported, 0, 'duplicate provider record is not imported twice');
  eq(duplicate.updated, 2, 'duplicate provider records follow existing update behavior');
  const afterDuplicate = await loadData<Record<string, unknown>[]>(ENERGY_KEY, []);
  eq(afterDuplicate.filter((r) => r.externalId === 'a2-import').length, 1, 'canonical store contains one record for the provider ID');

  const reloaded = await getEnergyActivities();
  const reloadedImported = reloaded.find((a) => a.externalId === 'a2-import');
  assert(!!reloadedImported, 'provider identity survives Nutrition normalization/reload');
  eq(reloadedImported?.calories, 325, 'updated provider calories survive reload');

  console.log('\n=== A2.4 Existing Nutrition energy calculations ===');
  const importedForMath: EnergyActivity = {
    ...normalizeHealthActivity(healthActivity('a2-math', 300)),
    createdAt: NOW,
    updatedAt: NOW,
  };
  const result = calculateDailyEnergy('2026-09-14', [log()], [food()], [], profile(), [importedForMath]);
  approx(result.caloriesIn, 100, 'existing Nutrition calories-in calculation unchanged');
  approx(result.activityCalories, 300, 'imported activity contributes its calories to Nutrition energy');
  approx(result.caloriesOut, result.bmr! + 300, 'existing calories-out calculation includes activity');
  approx(result.netCalories, 100 - (result.bmr! + 300), 'existing net-energy calculation remains unchanged');

  console.log('\n=== A2.5 Backward compatibility ===');
  const legacyRecord = {
    id: 'legacy-a2', name: 'Legacy activity', activityType: 'walking' as ActivityType,
    intensity: 'light' as ActivityIntensity, durationMinutes: 20, calories: 120,
    caloriesSource: 'manual', distanceKm: null, date: '2026-09-13',
    createdAt: NOW, updatedAt: NOW, source: 'manual',
  } as EnergyActivity;
  await saveData(ENERGY_KEY, [legacyRecord]);
  const legacyLoaded = await getEnergyActivities();
  eq(legacyLoaded.length, 1, 'existing Nutrition activity records remain readable');
  eq(legacyLoaded[0].id, 'legacy-a2', 'legacy activity ID is preserved');
  eq(legacyLoaded[0].calories, 120, 'legacy activity calories are preserved');

  console.log(`\n========================================`);
  console.log(`  A2 Tests: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
})();
