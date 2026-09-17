// ─── Phase 1K Runtime Tests ───────────────────────────────────────────────────
// Run: npx tsx --import ./src/__tests__/mock-setup.ts src/__tests__/nutrition-1k.test.ts
import {
  analyticsDateRange,
  calculateBMR,
  calculateDailyEnergy,
  calculateDailyNutrition,
  calculateNutrition,
  calculateNutritionAnalytics,
  earliestAnalyticsDate,
  emptyNutritionAnalyticsSummary,
  isValidAnalyticsDay,
  resolveNutritionAnalyticsRange,
  searchFoods,
  shiftAnalyticsDay,
  summarizeNutritionAnalytics,
} from '@/services/nutrition';
import type { BodyProfile, EnergyActivity, FoodItem, FoodLogEntry, Recipe } from '@/types/nutrition';
import { getTodayDate } from '@/types/nutrition';
let passed = 0; let failed = 0; let total = 0;
function assert(c: boolean, msg: string) {
  total++; if (c) { passed++; console.log(`  ok ${msg}`); }
  else { failed++; console.log(`  FAIL ${msg}`); }
}
function eq(a: unknown, b: unknown, msg: string) {
  total++; if (a === b) { passed++; console.log(`  ok ${msg}`); }
  else { failed++; console.log(`  FAIL ${msg} (got ${String(a)} expected ${String(b)})`); }
}
function approx(a: number, b: number, msg: string, eps = 1e-6) {
  total++; if (Math.abs(a - b) <= eps) { passed++; console.log(`  ok ${msg}`); }
  else { failed++; console.log(`  FAIL ${msg} (got ${a} expected ${b})`); }
}
const NOW = '2026-09-13T00:00:00.000Z';
function mkFood(id: string, cal = 100, p = 10, c = 20, f = 5, fib = 2): FoodItem {
  return {
    id, name: `Food ${id}`, brand: null, category: 'Test', description: null,
    source: 'custom', sourceDetail: null, preparation: 'raw',
    serving: { amount: 100, unit: 'g' },
    nutrition: { basis: 'per_100g', servingAmount: null, servingUnit: null, calories: cal, protein: p, carbohydrates: c, fat: f, fiber: fib, sugar: 0, saturatedFat: 0, sodium: 0, micronutrients: {} },
    createdAt: NOW, updatedAt: NOW,
  };
}
function mkLog(id: string, foodId: string, date: string, qty = 100, meal: FoodLogEntry['mealType'] = 'lunch', itemType: FoodLogEntry['itemType'] = 'food'): FoodLogEntry {
  return { id, foodId, quantity: qty, unit: 'g', mealType: meal, date, itemType, createdAt: NOW, updatedAt: NOW };
}
function mkAct(id: string, date: string, cal = 200, source: EnergyActivity['source'] = 'manual'): EnergyActivity {
  return { id, name: `Act ${id}`, activityType: 'running', intensity: 'moderate', durationMinutes: 30, calories: cal, caloriesSource: 'manual', distanceKm: null, date, createdAt: NOW, updatedAt: NOW, source } as EnergyActivity;
}
function mkProfile(): BodyProfile {
  return { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activityLevel: 'moderate', goal: 'maintain', createdAt: NOW, updatedAt: NOW };
}
function mkRecipe(id: string, food: FoodItem): Recipe {
  return { id, name: `Recipe ${id}`, description: null, category: null, servings: 2, ingredients: [{ id: 'ing1', foodId: food.id, quantity: 200, unit: 'g' }], createdAt: NOW, updatedAt: NOW };
}
void (async () => {
console.log('1K: date range generation');
assert(isValidAnalyticsDay('2026-02-29') === false, '2026 not leap');
assert(isValidAnalyticsDay('2024-02-29') === true, '2024 leap valid');
assert(isValidAnalyticsDay('2026-13-01') === false, 'bad month');
assert(isValidAnalyticsDay('2026-00-10') === false, 'zero month');
assert(isValidAnalyticsDay('bad') === false, 'non date invalid');
eq(shiftAnalyticsDay('2026-01-31', 1), '2026-02-01', 'month boundary shift');
eq(shiftAnalyticsDay('2024-02-28', 1), '2024-02-29', 'leap shift');
eq(shiftAnalyticsDay('2023-02-28', 1), '2023-03-01', 'non-leap feb end');
eq(shiftAnalyticsDay('2026-01-01', -1), '2025-12-31', 'year boundary back');
eq(shiftAnalyticsDay('bad', 1), '', 'invalid shift empty');
const r3 = analyticsDateRange('2026-09-11', '2026-09-13');
eq(r3.length, 3, '3-day range length');
eq(r3[0], '2026-09-11', 'range start');
eq(r3[2], '2026-09-13', 'range end');
eq(analyticsDateRange('2026-09-13', '2026-09-11').length, 0, 'inverted empty');
eq(analyticsDateRange('bad', '2026-09-13').length, 0, 'invalid start empty');
eq(analyticsDateRange('2026-09-13', '2026-09-13').length, 1, 'single day range');
console.log('1K: periods');
const f = mkFood('f1'); const logs: FoodLogEntry[] = [mkLog('l1', 'f1', '2026-09-01')];
const acts: EnergyActivity[] = [mkAct('a1', '2026-08-01')];
const today = '2026-09-13';
let rr = resolveNutritionAnalyticsRange(7, logs, acts, today);
eq(rr.endDate, today, '7d ends today');
eq(analyticsDateRange(rr.startDate, rr.endDate).length, 7, '7d length 7');
rr = resolveNutritionAnalyticsRange(30, logs, acts, today);
eq(analyticsDateRange(rr.startDate, rr.endDate).length, 30, '30d length 30');
rr = resolveNutritionAnalyticsRange(90, logs, acts, today);
eq(analyticsDateRange(rr.startDate, rr.endDate).length, 90, '90d length 90');
rr = resolveNutritionAnalyticsRange(365, logs, acts, today);
eq(analyticsDateRange(rr.startDate, rr.endDate).length, 365, '365d length 365');
rr = resolveNutritionAnalyticsRange('all', logs, acts, today);
eq(rr.startDate, '2026-08-01', 'all starts earliest');
eq(rr.endDate, today, 'all ends today');
const rrEmpty = resolveNutritionAnalyticsRange('all', [], [], today);
console.log('1K: single and multi-day data');
{
  const food = mkFood('sf1', 200, 20, 10, 5, 3);
  const res = calculateNutritionAnalytics('2026-09-13', '2026-09-13', [mkLog('sl1', 'sf1', '2026-09-13')], [food], [], null, []);
  eq(res.points.length, 1, 'single day one point');
  approx(res.points[0].caloriesIn, 200, 'single day calories in');
  approx(res.points[0].proteinG, 20, 'single day protein');
  approx(res.points[0].carbsG, 10, 'single day carbs');
  approx(res.points[0].fatG, 5, 'single day fat');
  approx(res.points[0].fiberG, 3, 'single day fiber');
  eq(res.summary.nutritionDays, 1, 'single nutrition day');
  eq(res.summary.daysWithData, 1, 'single day with data');
}
{
  const food = mkFood('mf1', 100, 10, 10, 10, 1);
  const multi = calculateNutritionAnalytics('2026-09-11', '2026-09-13',
    [mkLog('m1', 'mf1', '2026-09-11'), mkLog('m2', 'mf1', '2026-09-12', 200)], [food], [], null, []);
  eq(multi.points.length, 3, 'multi 3 points');
  approx(multi.points[0].caloriesIn, 100, 'day1 cal');
  approx(multi.points[1].caloriesIn, 200, 'day2 cal scaled');
  approx(multi.points[2].caloriesIn, 0, 'missing day zero point');
  eq(multi.summary.nutritionDays, 2, 'missing day excluded from nutrition days');
  approx(multi.summary.averageCaloriesIn ?? -1, 150, 'average over nutrition days only');
  approx(multi.summary.totalCaloriesIn, 300, 'total in');
}
console.log('1K: food and recipe aggregation');
{
  const food = mkFood('rf1', 100, 10, 20, 5, 2);
  const recipe = mkRecipe('r1', food);
  const res = calculateNutritionAnalytics('2026-09-13', '2026-09-13',
    [mkLog('rl1', 'r1', '2026-09-13', 1, 'dinner', 'recipe')], [food], [recipe], null, []);
  approx(res.points[0].caloriesIn, 100, 'recipe per-serving calories (200/2)');
  approx(res.points[0].proteinG, 10, 'recipe protein per serving');
}
{
  const res = calculateNutritionAnalytics('2026-09-13', '2026-09-13',
    [mkLog('bad1', 'missing-food', '2026-09-13')], [], [], null, []);
  approx(res.points[0].caloriesIn, 0, 'missing food ref zero');
  eq(res.summary.nutritionDays, 0, 'missing food no nutrition day');
  eq(res.summary.daysWithData, 0, 'missing food no data day');
}
{
  const food = mkFood('rf2', 100, 10, 20, 5, 2);
  const res = calculateNutritionAnalytics('2026-09-13', '2026-09-13',
    [mkLog('bad2', 'missing-recipe', '2026-09-13', 1, 'dinner', 'recipe')], [food], [], null, []);
  approx(res.points[0].caloriesIn, 0, 'missing recipe ref zero');
  eq(res.summary.nutritionDays, 0, 'missing recipe no nutrition day');
}
console.log('1K: calories out, bmr, activity, net');
{
  const food = mkFood('ef1', 2500, 10, 10, 10, 1);
  const profile = mkProfile();
  const bmr = calculateBMR(profile);
  const res = calculateNutritionAnalytics('2026-09-13', '2026-09-13',
    [mkLog('e1', 'ef1', '2026-09-13')], [food], [], profile, [mkAct('ea1', '2026-09-13', 300)]);
  approx(res.points[0].activityCalories, 300, 'activity calories');
  approx(res.points[0].caloriesOut, bmr + 300, 'calories out = bmr + activity');
  approx(res.points[0].netCalories, 2500 - (bmr + 300), 'net energy');
  const direct = calculateDailyEnergy('2026-09-13', [mkLog('e1', 'ef1', '2026-09-13')], [food], [], profile, [mkAct('ea1', '2026-09-13', 300)]);
  approx(res.points[0].caloriesOut, direct.caloriesOut, 'reuse daily energy');
  const dn = calculateDailyNutrition('2026-09-13', [mkLog('e1', 'ef1', '2026-09-13')], [food], []);
  approx(res.points[0].caloriesIn, dn.totals.calories, 'reuse daily nutrition');
}
{
  const food = mkFood('nf1', 500, 5, 5, 5, 1);
  const res = calculateNutritionAnalytics('2026-09-13', '2026-09-13',
    [mkLog('n1', 'nf1', '2026-09-13')], [food], [], null, [mkAct('na1', '2026-09-13', 100)]);
  approx(res.points[0].caloriesOut, 100, 'no profile out = activity only');
  approx(res.points[0].netCalories, 400, 'no profile net');
}
console.log('1K: averages and totals');
{
  const food = mkFood('af1', 100, 10, 20, 5, 4);
  const res = calculateNutritionAnalytics('2026-09-11', '2026-09-13',
    [mkLog('a1', 'af1', '2026-09-11'), mkLog('a2', 'af1', '2026-09-13', 300)],
    [food], [], null, [mkAct('aa1', '2026-09-11', 100), mkAct('aa2', '2026-09-12', 300)]);
  approx(res.summary.averageProteinG ?? -1, 20, 'avg protein over 2 nutrition days');
  approx(res.summary.averageCarbsG ?? -1, 40, 'avg carbs');
  approx(res.summary.averageFatG ?? -1, 10, 'avg fat');
  approx(res.summary.averageFiberG ?? -1, 8, 'avg fiber');
  approx(res.summary.averageActivityCalories ?? -1, 200, 'avg activity over 2 active days');
  approx(res.summary.totalActivityCalories, 400, 'total activity all points');
  approx(res.summary.averageCaloriesOut ?? -1, 400 / 3, 'avg out over 3 data days');
  approx(res.summary.totalCaloriesOut, 400, 'total out');
}
console.log('1K: deficit maintenance surplus');
{
  const s = summarizeNutritionAnalytics([
    { date: '2026-09-11', caloriesIn: 100, caloriesOut: 200, netCalories: -100, proteinG: 1, carbsG: 1, fatG: 1, fiberG: 1, activityCalories: 0 },
    { date: '2026-09-12', caloriesIn: 200, caloriesOut: 200, netCalories: 0, proteinG: 1, carbsG: 1, fatG: 1, fiberG: 1, activityCalories: 0 },
    { date: '2026-09-13', caloriesIn: 300, caloriesOut: 200, netCalories: 100, proteinG: 1, carbsG: 1, fatG: 1, fiberG: 1, activityCalories: 0 },
  ], null);
  eq(s.deficitDays, 1, 'one deficit');
  eq(s.maintenanceDays, 1, 'one maintenance');
  eq(s.surplusDays, 1, 'one surplus');
}
console.log('1K: target adherence');
{
  const pts = [
    { date: '2026-09-11', caloriesIn: 2000, caloriesOut: 2000, netCalories: 0, proteinG: 1, carbsG: 1, fatG: 1, fiberG: 1, activityCalories: 0 },
    { date: '2026-09-12', caloriesIn: 2500, caloriesOut: 2000, netCalories: 500, proteinG: 1, carbsG: 1, fatG: 1, fiberG: 1, activityCalories: 0 },
  ];
  eq(summarizeNutritionAnalytics(pts, 2000).targetAdherencePercent, 50, '50% adherence (1800-2200 band)');
  eq(summarizeNutritionAnalytics(pts, 2000 - 0).targetAdherencePercent, 50, 'deterministic band');
  eq(summarizeNutritionAnalytics(pts, null).targetAdherencePercent, null, 'null without profile');
  eq(summarizeNutritionAnalytics([], 2000).targetAdherencePercent, null, 'null without days');
  eq(summarizeNutritionAnalytics(pts, 0).targetAdherencePercent, null, 'null on zero target');
  eq(summarizeNutritionAnalytics(pts, NaN).targetAdherencePercent, null, 'null on NaN target');
}
{
  const profile = mkProfile();
  const food = mkFood('tf1', 100, 1, 1, 1, 1);
  const noProf = calculateNutritionAnalytics('2026-09-13', '2026-09-13', [mkLog('t1', 'tf1', '2026-09-13')], [food], [], null, []);
  eq(noProf.summary.targetAdherencePercent, null, 'no profile null adherence');
  const withProf = calculateNutritionAnalytics('2026-09-13', '2026-09-13', [mkLog('t1', 'tf1', '2026-09-13')], [food], [], profile, []);
  eq(typeof withProf.summary.targetAdherencePercent, 'number', 'profile gives adherence number');
}
console.log('1K: only food, only activity, mixed');

eq(rrEmpty.startDate, today, 'all empty starts today');
eq(earliestAnalyticsDate([], []), null, 'earliest null when empty');
console.log('1K: tail block');
{
  const food = mkFood('of1', 400, 4, 4, 4, 1);
  const onlyFood = calculateNutritionAnalytics('2026-09-13', '2026-09-13', [mkLog('of1', 'of1', '2026-09-13')], [food], [], null, []);
  eq(onlyFood.summary.nutritionDays, 1, 'only food nutrition day');
  eq(onlyFood.summary.activeDays, 0, 'only food no active days');
  eq(onlyFood.summary.averageActivityCalories, null, 'only food null avg activity');
}
{
  const onlyAct = calculateNutritionAnalytics('2026-09-13', '2026-09-13', [], [], [], null, [mkAct('oa1', '2026-09-13', 250)]);
  eq(onlyAct.summary.nutritionDays, 0, 'only activity no nutrition days');
  eq(onlyAct.summary.activeDays, 1, 'only activity one active day');
  eq(onlyAct.summary.averageCaloriesIn, null, 'only activity null avg in');
  approx(onlyAct.summary.averageActivityCalories ?? -1, 250, 'only activity avg');
  approx(onlyAct.points[0].netCalories, -250, 'only activity negative net');
}
{
  const food = mkFood('mx1', 600, 6, 6, 6, 1);
  const mixed = calculateNutritionAnalytics('2026-09-12', '2026-09-13', [mkLog('mx1', 'mx1', '2026-09-12')], [food], [], null, [mkAct('mxa', '2026-09-13', 150)]);
  eq(mixed.summary.nutritionDays, 1, 'mixed nutrition days');
  eq(mixed.summary.activeDays, 1, 'mixed active days');
  eq(mixed.summary.daysWithData, 2, 'mixed two data days');
}
{
  const food = mkFood('hc1', 100, 1, 1, 1, 1);
  const hc = mkAct('hc-import', '2026-09-13', 180, 'health_connect');
  const man = mkAct('man1', '2026-09-13', 120, 'manual');
  const res = calculateNutritionAnalytics('2026-09-13', '2026-09-13', [mkLog('hcl', 'hc1', '2026-09-13')], [food], [], null, [hc, man]);
  approx(res.points[0].activityCalories, 300, 'imported plus manual sum');
  const iso = calculateNutritionAnalytics('2026-09-12', '2026-09-13', [mkLog('isol', 'hc1', '2026-09-13')], [food], [], null, [mkAct('isoa', '2026-09-12', 50)]);
  approx(iso.points[0].caloriesIn, 0, 'other day not polluted by food');
  approx(iso.points[1].activityCalories, 0, 'other day not polluted by activity');
}
{
  const days = analyticsDateRange('2024-02-28', '2024-03-01');
  eq(days.length, 3, 'leap boundary 3 days');
  eq(days[1], '2024-02-29', 'leap day included');
  const food = mkFood('bf1', 100, 1, 1, 1, 1);
  const badLogs = [{ id: 'x', foodId: 'bf1', quantity: 100, unit: 'g', mealType: 'lunch', date: 'not-a-date', createdAt: NOW, updatedAt: NOW }] as unknown as FoodLogEntry[];
  const badActs = [{ id: 'y', name: 'y', activityType: 'running', intensity: 'moderate', durationMinutes: 10, calories: 50, caloriesSource: 'manual', distanceKm: null, date: 'bad-date', createdAt: NOW, updatedAt: NOW }] as unknown as EnergyActivity[];
  const r = calculateNutritionAnalytics('2026-09-13', '2026-09-13', badLogs, [food], [], null, badActs);
  approx(r.points[0].caloriesIn, 0, 'malformed date logs ignored');
  approx(r.points[0].activityCalories, 0, 'malformed date acts ignored');
  eq(earliestAnalyticsDate(badLogs, badActs), null, 'malformed earliest null');
  const e = emptyNutritionAnalyticsSummary();
  eq(e.daysWithData, 0, 'empty summary zero days');
  eq(e.targetAdherencePercent, null, 'empty adherence null');
  const inv = calculateNutritionAnalytics('bad', 'also-bad', [], [], [], null, []);
  eq(inv.points.length, 0, 'invalid range empty points');
  const detFood = mkFood('det1', 123, 4, 5, 6, 1);
  const detLogs = [mkLog('detl', 'det1', '2026-09-13')];
  const detActs = [mkAct('deta', '2026-09-13', 77)];
  const prof = mkProfile();
  const a1 = calculateNutritionAnalytics('2026-09-10', '2026-09-13', detLogs, [detFood], [], prof, detActs);
  const a2 = calculateNutritionAnalytics('2026-09-10', '2026-09-13', detLogs, [detFood], [], prof, detActs);
  eq(JSON.stringify(a1), JSON.stringify(a2), 'deterministic repeated calc');
  const sc = calculateNutrition(detFood, { amount: 100, unit: 'g' });
  approx(sc.calories, 123, 'compat calculateNutrition unchanged');
  const sr = searchFoods([detFood, mkFood('other', 1, 0, 0, 0, 0)], 'det1');
  eq(sr.length >= 1, true, 'compat searchFoods works');
  eq(getTodayDate().length, 10, 'compat getTodayDate shape');
}
console.log(`1K done: ${passed} passed, ${failed} failed, ${total} total`);
if (failed > 0) process.exit(1);
})();
