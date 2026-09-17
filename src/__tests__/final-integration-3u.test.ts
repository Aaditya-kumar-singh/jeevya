declare const require: (id: string) => any;
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const assert: (value: unknown, message: string) => asserts value = (value, message) => { if (!value) throw new Error(message); };

let passed = 0;
const check = (name: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${name}`); };

const appFiles = (() => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx|ts)$/.test(entry.name)) out.push(path.relative(root, full));
    }
  };
  walk(path.join(root, 'src/app'));
  return out;
})();

check('all major route files exist', () => {
  const required = [
    'src/app/(tabs)/index.tsx','src/app/(tabs)/more.tsx','src/app/goals.tsx','src/app/search.tsx',
    'src/app/life-timeline.tsx','src/app/data-quality.tsx','src/app/weekly-review.tsx','src/app/health/nutrition.tsx',
    'src/app/nutrition/index.tsx','src/app/nutrition/log.tsx','src/app/nutrition/meals.tsx','src/app/nutrition/recipes.tsx',
    'src/app/nutrition/targets.tsx','src/app/nutrition/energy.tsx','src/app/finance/analytics.tsx','src/app/books/index.tsx',
    'src/app/journal/index.tsx','src/app/tasks/index.tsx','src/app/habits/index.tsx'
  ];
  assert(required.every((p) => fs.existsSync(path.join(root, p))), 'required route missing');
});

check('root stack registers nutrition and core detail routes', () => {
  const layout = read('src/app/_layout.tsx');
  for (const route of ['nutrition/index','nutrition/log','nutrition/recipes','nutrition/recipe-edit','goals','settings/index']) {
    assert(layout.includes(`name="${route}"`), `route not registered: ${route}`);
  }
});

check('global service remains read-only', () => {
  const source = read('src/services/globalData.ts');
  assert(!/\.insert\(|\.update\(|\.delete\(/.test(source), 'global service exposes client writes');
  assert(!source.includes('lifeos:nutrition'), 'global service references nutrition storage');
});

check('global metrics schema has authenticated reads and no client writes', () => {
  const sql = read('sql/lifeos-global-metrics.sql');
  assert(sql.includes('enable row level security'), 'global metrics RLS missing');
  assert(sql.includes('to authenticated'), 'global metrics authenticated read boundary missing');
  assert(sql.includes('There is deliberately no INSERT, UPDATE, or DELETE policy'), 'global metrics write boundary missing');
});

check('sync/conflict metadata is excluded from backup surface', () => {
  const backup = read('src/services/backup.ts');
  assert(!backup.includes('lifeos:sync:metadata'), 'sync metadata enters backup');
  assert(!backup.includes('lifeos:sync:conflicts'), 'conflict metadata enters backup');
});

check('client source contains no service-role credential reference', () => {
  for (const file of appFiles.concat([
    'src/services/globalData.ts','src/services/nutrition.ts','src/hooks/useAuth.ts','src/services/auth.ts','src/services/sync.ts'
  ])) {
    const source = read(file);
    assert(!source.includes('SUPABASE_SERVICE_ROLE_KEY'), `service-role reference in ${file}`);
  }
});

check('nutrition does not use global data layer', () => {
  const nutrition = read('src/services/nutrition.ts');
  assert(!nutrition.includes('@/services/globalData'), 'nutrition imports global service');
  assert(nutrition.includes('calculateNutrition'), 'nutrition calculator missing');
  assert(nutrition.includes('calculateDailyNutrition'), 'daily nutrition aggregation missing');
  assert(nutrition.includes('calculateDailyEnergy'), 'energy integration missing');
});

check('canonical date utility is used by integration boundary', () => {
  const integration = read('src/services/lifeosIntegration.ts');
  assert(integration.includes("from '@/lib/date'"), 'integration bypasses canonical date utilities');
  assert(integration.includes('isValidCivilDate'), 'integration does not validate civil dates');
});

check('navigation projections preserve record IDs in their destinations', () => {
  const search = read('src/services/unifiedSearch.ts');
  const timeline = read('src/services/lifeTimeline.ts');
  assert(search.includes('route: `/tasks/${task.id}`'), 'task search route loses record ID');
  assert(search.includes('route: `/books/${book.id}`'), 'book search route loses record ID');
  assert(search.includes('route: `/journal/${entry.id}`'), 'journal search route loses record ID');
  assert(search.includes('route: `/finance/${transaction.id}`'), 'finance search route loses record ID');
  assert(timeline.includes('route: `/tasks/${task.id}`'), 'timeline task route loses record ID');
  assert(timeline.includes('route: `/books/${book.id}`'), 'timeline book route loses record ID');
});

check('3T.13 regression suite is present', () => {
  assert(fs.existsSync(path.join(root, 'src/__tests__/nutrition-3t13.test.ts')), '3T.13 suite missing');
});

console.log(`LIFEOS 3U FINAL INTEGRATION QA: ${passed} passed, 0 failed`);
