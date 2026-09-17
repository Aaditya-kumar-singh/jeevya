// ─── Phase 1L Runtime Tests ───────────────────────────────────────────────────
// Run: npx tsx --import ./src/__tests__/mock-setup.ts src/__tests__/nutrition-1l.test.ts
import {
  analyticsDateRange,
  calculateBMR,
  calculateDailyEnergy,
  calculateDailyNutrition,
  calculateNutrition,
  calculateNutritionAnalytics,
  calculateNutritionTargets,
  dedupeNutritionInsights,
  earliestAnalyticsDate,
  emptyNutritionAnalyticsSummary,
  generateNutritionInsights,
  isValidAnalyticsDay,
  longestConsecutiveStreak,
  nutritionInsightId,
  resolveNutritionAnalyticsRange,
  searchFoods,
  shiftAnalyticsDay,
  sortNutritionInsights,
  summarizeNutritionAnalytics,
} from '@/services/nutrition';
import type { BodyProfile, EnergyActivity, FoodItem, FoodLogEntry, NutritionInsight, NutritionTargets, Recipe } from '@/types/nutrition';
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
function mkProfile(goal: BodyProfile['goal'] = 'maintain'): BodyProfile {
  return { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activityLevel: 'moderate', goal, createdAt: NOW, updatedAt: NOW };
}
function mkRecipe(id: string, food: FoodItem): Recipe {
  return { id, name: `Recipe ${id}`, description: null, category: null, servings: 2, ingredients: [{ id: 'ing1', foodId: food.id, quantity: 200, unit: 'g' }], createdAt: NOW, updatedAt: NOW };
}
function insightsFor(
  start: string, end: string, logs: FoodLogEntry[], foods: FoodItem[], recipes: Recipe[],
  profile: BodyProfile | null, acts: EnergyActivity[], targets: NutritionTargets | null,
): NutritionInsight[] {
  const analytics = calculateNutritionAnalytics(start, end, logs, foods, recipes, profile, acts);
  return generateNutritionInsights(analytics, profile, targets, logs, foods, recipes);
}
void (async () => {
console.log('1L: no data and missing data');
{
  const none = insightsFor('2026-09-13', '2026-09-13', [], [], [], null, [], null);
  assert(none.some((i) => i.type === 'missing_data' && i.title === 'No body profile'), 'no data warns profile');
  assert(none.some((i) => i.type === 'missing_data' && i.title === 'No nutrition logs'), 'no data warns logs');
  assert(!none.some((i) => i.type === 'calorie_target'), 'no calorie insight without target');
  assert(!none.some((i) => i.type === 'protein_target'), 'no protein insight without target');
  eq(none.length <= 8, true, 'no data capped at 8');
}
{
  const food = mkFood('nd1', 500, 10, 10, 10, 1);
  const noProf = insightsFor('2026-09-13', '2026-09-13', [mkLog('ndl', 'nd1', '2026-09-13')], [food], [], null, [], null);
  assert(noProf.some((i) => i.title === 'No body profile'), 'food-only warns profile');
  assert(!noProf.some((i) => i.type === 'calorie_target'), 'food-only no calorie without target');
}
{
  const food = mkFood('nt1', 500, 10, 10, 10, 1);
  const prof = mkProfile();
  const tg = calculateNutritionTargets(prof);
  const noTg = insightsFor('2026-09-13', '2026-09-13', [mkLog('ntl', 'nt1', '2026-09-13')], [food], [], prof, [], null);
  assert(!noTg.some((i) => i.type === 'calorie_target'), 'null targets skips calorie');
  assert(!noTg.some((i) => i.type === 'protein_target'), 'null targets skips protein');
  void tg;
}
{
  const onlyAct = insightsFor('2026-09-13', '2026-09-13', [], [], [], mkProfile(), [mkAct('oda', '2026-09-13', 200)], calculateNutritionTargets(mkProfile()));
  assert(onlyAct.some((i) => i.title === 'No nutrition logs'), 'activity-only warns nutrition logs');
}
console.log('1L: calorie rules');
{
  const prof = mkProfile();
  const tg = calculateNutritionTargets(prof);
  const mkCal = (kcal: number) => insightsFor('2026-09-11', '2026-09-13',
    ['2026-09-11', '2026-09-12', '2026-09-13'].map((d, k) => mkLog(`ck${kcal}-${k}`, 'ckf', d, kcal)),
    [mkFood('ckf', 100, 1, 1, 1, 0)], [], prof, [], tg);
  const low = mkCal(Math.round(tg.targetCalories * 0.7));
  const lc = low.find((i) => i.type === 'calorie_target');
  eq(lc?.severity, 'warning', 'low intake warns');
  eq(lc?.title, 'Calories below target', 'low title');
  const high = mkCal(Math.round(tg.targetCalories * 1.3));
  eq(high.find((i) => i.type === 'calorie_target')?.severity, 'warning', 'high intake warns');
  eq(high.find((i) => i.type === 'calorie_target')?.title, 'Calories above target', 'high title');
  const on = mkCal(Math.round(tg.targetCalories));
  eq(on.find((i) => i.type === 'calorie_target')?.severity, 'positive', 'on target positive');
  const edge = mkCal(Math.round(tg.targetCalories * 0.91));
  eq(edge.find((i) => i.type === 'calorie_target')?.severity, 'positive', 'within band positive');
}
console.log('1L: protein rules');
{
  const prof = mkProfile();
  const tg: NutritionTargets = { ...calculateNutritionTargets(prof), protein: 100, carbohydrates: 250, fat: 70 };
  const mkProt = (g: number, day: string) => mkLog(`p${g}-${day}`, 'pf', day, g * 10);
  const food = mkFood('pf', 10, 10, 0, 0, 0);
  const days = ['2026-09-11', '2026-09-12', '2026-09-13'];
  const lo = insightsFor('2026-09-11', '2026-09-13', days.map((d) => mkProt(50, d)), [food], [], prof, [], tg);
  eq(lo.find((i) => i.type === 'protein_target')?.severity, 'warning', 'protein <80 warns');
  const mid = insightsFor('2026-09-11', '2026-09-13', days.map((d) => mkProt(90, d)), [food], [], prof, [], tg);
  eq(mid.find((i) => i.type === 'protein_target')?.severity, 'info', 'protein 80-99 info');
  const hi = insightsFor('2026-09-11', '2026-09-13', days.map((d) => mkProt(110, d)), [food], [], prof, [], tg);
  eq(hi.find((i) => i.type === 'protein_target')?.severity, 'positive', 'protein >=100 positive');
  const skip = insightsFor('2026-09-11', '2026-09-13', days.map((d) => mkProt(50, d)), [food], [], prof, [], { ...tg, protein: 0 });
  assert(!skip.some((i) => i.type === 'protein_target'), 'zero protein target skips');
}
console.log('1L: macro deviations');
{
  const prof = mkProfile();
  const tg: NutritionTargets = { ...calculateNutritionTargets(prof), protein: 100, carbohydrates: 200, fat: 60 };
  const food = mkFood('mf', 100, 0, 10, 10, 0);
  const days = ['2026-09-11', '2026-09-12', '2026-09-13'];
  const dev = insightsFor('2026-09-11', '2026-09-13', days.map((d, k) => mkLog(`md${k}`, 'mf', d, 500)), [food], [], prof, [], tg);
  assert(dev.filter((i) => i.type === 'macro_balance').length <= 2, 'no macro flood');
  const okFood = mkFood('mg', 100, 0, 100, 30, 0);
  const ok = insightsFor('2026-09-13', '2026-09-13', [mkLog('mg1', 'mg', '2026-09-13', 200)], [okFood], [], prof, [],
    { ...tg, carbohydrates: 200, fat: 60 });
  assert(!ok.some((i) => i.title === 'Carbs differ from target'), 'carbs near target quiet');
  assert(!ok.some((i) => i.title === 'Fat differs from target'), 'fat near target quiet');
}
console.log('1L: goal-aware energy balance');
{
  const mkNet = (goal: BodyProfile['goal'], calIn: number, act: number) => {
    const prof = mkProfile(goal);
    const tg = calculateNutritionTargets(prof);
    const food = mkFood(`eb${goal}${calIn}`, 100, 0, 0, 0, 0);
    const days = ['2026-09-11', '2026-09-12', '2026-09-13'];
    return insightsFor('2026-09-11', '2026-09-13', days.map((d, k) => mkLog(`eb${goal}${k}`, food.id, d, calIn)),
      [food], [], prof, days.map((d, k) => mkAct(`eba${goal}${k}`, d, act)), tg);
  };
  const loseDef = mkNet('lose', 100, 100);
  eq(loseDef.find((i) => i.type === 'energy_balance')?.severity, 'positive', 'lose deficit positive');
  const loseSur = mkNet('lose', 4000, 0);
  eq(loseSur.find((i) => i.type === 'energy_balance')?.severity, 'warning', 'lose surplus warns');
  const gainSur = mkNet('gain', 4000, 0);
  eq(gainSur.find((i) => i.type === 'energy_balance')?.severity, 'positive', 'gain surplus positive');
  const gainDef = mkNet('gain', 100, 100);
  eq(gainDef.find((i) => i.type === 'energy_balance')?.severity, 'warning', 'gain deficit warns');
  const maintBig = mkNet('maintain', 4000, 0);
  eq(maintBig.find((i) => i.type === 'energy_balance')?.severity, 'warning', 'maintain surplus warns');
  for (const set of [loseDef, loseSur, gainSur, gainDef]) {
    for (const i of set) {
      assert(!/disease|cure|treat|diagnos|medical/i.test(`${i.message} ${i.recommendation}`), 'no medical claims');
    }
  }
}
console.log('1L: activity and consistency');
{
  const prof = mkProfile();
  const tg = calculateNutritionTargets(prof);
  const food = mkFood('ac1', 500, 5, 5, 5, 1);
  const days = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
  const steady = insightsFor('2026-09-07', '2026-09-13', days.map((d, k) => mkLog(`s${k}`, 'ac1', d)),
    [food], [], prof, days.map((d, k) => mkAct(`sa${k}`, d, 200)), tg);
  eq(steady.find((i) => i.type === 'activity')?.severity, 'positive', 'steady activity positive');
  assert(steady.some((i) => i.title === 'Consistent nutrition logging'), 'nutrition streak positive');
  assert(steady.some((i) => i.title === 'Consistent activity logging'), 'activity streak positive');
  const sparse = insightsFor('2026-09-07', '2026-09-13', [mkLog('sp1', 'ac1', '2026-09-13')], [food], [], prof,
    [mkAct('spa', '2026-09-07', 50)], tg);
  eq(sparse.find((i) => i.type === 'activity')?.title, 'Activity logging is sparse', 'sparse activity info');
  eq(longestConsecutiveStreak(['2026-09-11', '2026-09-12', '2026-09-13']), 3, 'streak 3');
  eq(longestConsecutiveStreak([]), 0, 'streak empty 0');
  eq(longestConsecutiveStreak(['2026-09-11', '2026-09-13']), 1, 'streak gap 1');
}
console.log('1L: meal patterns neutral');
{
  // No profile/targets keeps the insight set small so meal-pattern infos stay
  // within the 8-insight cap after warning-first ordering.
  const food = mkFood('mp1', 200, 5, 5, 5, 1);
  const dinnerDays = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12'];
  const dinnerLogs = dinnerDays.map((d, k) => mkLog(`dn${k}`, 'mp1', d, 100, 'dinner'));
  const dinner = insightsFor('2026-09-07', '2026-09-13', [...dinnerLogs, mkLog('dnl', 'mp1', '2026-09-13', 100, 'dinner')], [food], [], null, [], null);
  assert(dinner.some((i) => i.title === 'Dinner heavily represented'), 'dinner pattern');
  assert(dinner.some((i) => i.title === 'Breakfast rarely logged'), 'breakfast pattern');
  const lunch = insightsFor('2026-09-07', '2026-09-13',
    dinnerLogs.map((l) => ({ ...l, id: `ln2-${l.id}`, mealType: 'breakfast' as const })),
    [food], [], null, [], null);
  assert(lunch.some((i) => i.title === 'Lunch rarely logged'), 'lunch pattern');
  const snackLogs = ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'].map((d, k) => mkLog(`sk${k}`, 'mp1', d, 100, 'snack'));
  const snack = insightsFor('2026-09-08', '2026-09-13', snackLogs, [food], [], null, [], null);
  assert(snack.some((i) => i.title === 'Snack-heavy logging'), 'snack pattern');
  for (const set of [dinner, lunch, snack]) {
    for (const i of set.filter((x) => x.type === 'meal_pattern')) {
      assert(!/unhealthy|bad|should not|never skip|must/i.test(`${i.message} ${i.recommendation}`), 'meal neutral');
    }
  }
  const thin = insightsFor('2026-09-13', '2026-09-13', [mkLog('thin', 'mp1', '2026-09-13', 100, 'dinner')], [food], [], null, [], null);
  assert(!thin.some((i) => i.type === 'meal_pattern'), 'thin data no meal pattern');
}
console.log('1L: ids dedupe priority cap');
{
  eq(nutritionInsightId('activity', 'T', '2026-09-01', '2026-09-07'), nutritionInsightId('activity', 'T', '2026-09-01', '2026-09-07'), 'deterministic ids');
  assert(nutritionInsightId('a', 'T1', 's', 'e') !== nutritionInsightId('a', 'T2', 's', 'e'), 'ids differ by title');
  const dup: NutritionInsight = { id: 'x', type: 'activity', severity: 'info', title: 'Same', message: 'm', recommendation: 'r', dateRangeStart: 's', dateRangeEnd: 'e' };
  eq(dedupeNutritionInsights([dup, { ...dup, id: 'y' }]).length, 1, 'dedupe identical');
  eq(dedupeNutritionInsights([dup, { ...dup, id: 'y', title: 'Other' }]).length, 2, 'keep distinct titles');
  const mk = (sev: NutritionInsight['severity'], type: NutritionInsight['type'], title: string): NutritionInsight =>
    ({ id: `${sev}-${title}`, type, severity: sev, title, message: 'm', recommendation: 'r', dateRangeStart: 's', dateRangeEnd: 'e' });
  const ordered = sortNutritionInsights([mk('info', 'missing_data', 'z'), mk('positive', 'activity', 'a'), mk('warning', 'missing_data', 'w'), mk('warning', 'calorie_target', 'c')]);
  eq(ordered[0].title, 'c', 'warnings first calorie first');
  eq(ordered[1].title, 'w', 'warnings before positives');
  eq(ordered[2].title, 'a', 'positives before infos');
  const many = (['calorie_target', 'protein_target', 'macro_balance', 'energy_balance', 'activity', 'consistency', 'meal_pattern', 'missing_data'] as const).flatMap((t, k) =>
    [0, 1].map((j) => mk(j === 0 ? 'warning' : 'info', t, `${t}-${k}-${j}`)));
  eq(sortNutritionInsights(many).length, 8, 'max 8 insights');
}
console.log('1L: ranges sources determinism compat');
{
  const prof = mkProfile();
  const tg = calculateNutritionTargets(prof);
  const food = mkFood('rg1', 300, 6, 6, 6, 1);
  for (const p of [7, 30, 90, 365, 'all'] as const) {
    const r = resolveNutritionAnalyticsRange(p, [mkLog('rgl', 'rg1', '2026-09-01')], [mkAct('rga', '2026-08-20', 100)], '2026-09-13');
    const a = calculateNutritionAnalytics(r.startDate, r.endDate, [mkLog('rgl', 'rg1', '2026-09-01')], [food], [], prof, [mkAct('rga', '2026-08-20', 100)]);
    const one = generateNutritionInsights(a, prof, tg, [mkLog('rgl', 'rg1', '2026-09-01')], [food], []);
    const two = generateNutritionInsights(a, prof, tg, [mkLog('rgl', 'rg1', '2026-09-01')], [food], []);
    eq(JSON.stringify(one), JSON.stringify(two), `deterministic ${p}`);
    assert(one.every((i) => i.dateRangeStart === r.startDate && i.dateRangeEnd === r.endDate), `range stamped ${p}`);
  }
  const hc = insightsFor('2026-09-13', '2026-09-13', [mkLog('hcl', 'rg1', '2026-09-13')], [food], [], prof, [mkAct('hc1', '2026-09-13', 150, 'health_connect')], tg);
  assert(hc.some((i) => i.type === 'activity'), 'hc feeds insights');
  const recipe = mkRecipe('rr1', food);
  const rl = insightsFor('2026-09-13', '2026-09-13', [mkLog('rrl', 'rr1', '2026-09-13', 1, 'dinner', 'recipe')], [food], [recipe], prof, [], tg);
  assert(rl.some((i) => i.type === 'calorie_target' || i.type === 'energy_balance'), 'recipe feeds insights');
  const badLogs = [{ id: 'bx', foodId: 'rg1', quantity: 100, unit: 'g', mealType: 'lunch', date: 'not-a-date', createdAt: NOW, updatedAt: NOW }] as unknown as FoodLogEntry[];
  const bad = insightsFor('2026-09-13', '2026-09-13', badLogs, [food], [], prof, [], tg);
  assert(bad.some((i) => i.type === 'missing_data'), 'malformed degrades');
  approx(calculateNutrition(food, { amount: 100, unit: 'g' }).calories, 300, 'compat nutrition');
  eq(searchFoods([food], 'rg1').length >= 1, true, 'compat search');
  eq(getTodayDate().length, 10, 'compat today');
  approx(calculateBMR(prof), calculateBMR(prof), 'compat bmr');
  approx(calculateDailyNutrition('2026-09-13', [mkLog('rgl', 'rg1', '2026-09-13')], [food], []).totals.calories, 300, 'compat daily nutrition');
  approx(calculateDailyEnergy('2026-09-13', [mkLog('rgl', 'rg1', '2026-09-13')], [food], [], prof, []).caloriesIn, 300, 'compat daily energy');
  eq(emptyNutritionAnalyticsSummary().daysWithData, 0, 'compat empty summary');
  eq(earliestAnalyticsDate([], []), null, 'compat earliest null');
}
console.log(`1L done: ${passed} passed, ${failed} failed, ${total} total`);
if (failed > 0) process.exit(1);
})();

