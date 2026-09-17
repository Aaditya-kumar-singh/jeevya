// @ts-nocheck
import fs from 'node:fs';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(`${root}/${p}`, 'utf8');
const assert = (v: unknown, m: string) => { if (!v) throw new Error(m); };

let passed = 0;
const check = async (name: string, fn: () => void | Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`); };

async function main() {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } } });
  const globalData = await import('@/services/globalData');
  const { compareGlobalPeriods, compareGlobalAggregates, calculateGlobalRankingBand } = globalData;

  const base = {
    metricName: 'x', metricType: 'count', period: 'week',
    periodStart: '2026-09-14', periodEnd: '2026-09-20',
    geographicLevel: 'country', geographicCode: 'IN',
    aggregateCount: 10, createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z',
    dataVersion: 1, schemaVersion: 1,
  } as const;

  await check('compatible current-vs-previous comparison is deterministic', async () => {
    const current = { ...base, aggregateValue: 20 };
    const previous = { ...base, periodStart: '2026-09-07', periodEnd: '2026-09-13', aggregateValue: 10 };
    const a = compareGlobalPeriods(current, previous);
    const b = compareGlobalPeriods(current, previous);
    assert(JSON.stringify(a) === JSON.stringify(b), 'comparison is not deterministic');
    assert(a.status === 'available' && a.comparison?.absoluteChange === 10 && a.trend === 'up', 'compatible comparison failed');
  });

  await check('incompatible metric names are rejected', async () => {
    const result = compareGlobalPeriods({ ...base, aggregateValue: 2 }, { ...base, periodStart: '2026-09-07', periodEnd: '2026-09-13', metricName: 'other', aggregateValue: 1 });
    assert(result.status === 'incompatible', 'metric mismatch was not rejected as incompatible');
  });

  await check('period mismatch is rejected', async () => {
    const result = compareGlobalPeriods({ ...base, aggregateValue: 2 }, { ...base, period: 'month', periodStart: '2026-08-14', periodEnd: '2026-09-13', aggregateValue: 1 });
    assert(result.status === 'incompatible', 'period mismatch was not rejected');
  });

  await check('geographic aggregate can be compared with the global aggregate', () => {
    const local = { ...base, aggregateValue: 20 };
    const global = { ...base, geographicLevel: 'global', geographicCode: undefined, aggregateValue: 10 };
    const result = compareGlobalAggregates(local, global);
    assert(result.status === 'available' && result.comparison?.kind === 'geographic' && result.comparison.absoluteChange === 10, 'geographic comparison failed');
  });

  await check('incompatible non-global geographic levels are rejected', () => {
    const country = { ...base, aggregateValue: 20 };
    const region = { ...base, geographicLevel: 'region', geographicCode: 'NCR', aggregateValue: 10 };
    const result = compareGlobalAggregates(country, region);
    assert(result.status === 'incompatible', 'incompatible geography was accepted');
  });

  await check('missing comparison data returns insufficient_data', () => {
    const result = compareGlobalAggregates({ ...base, aggregateValue: 20 }, null);
    assert(result.status === 'insufficient_data' && result.comparison === null, 'missing comparison data was fabricated');
  });

  await check('zero remains a real value and unavailable is distinct', async () => {
    const current = { ...base, aggregateValue: 5 };
    const previous = { ...base, periodStart: '2026-09-07', periodEnd: '2026-09-13', aggregateValue: 0 };
    const result = compareGlobalPeriods(current, previous);
    assert(result.status === 'available' && result.comparison?.percentageChange === null, 'zero was converted or divided');
    const source = read('src/services/globalData.ts');
    assert(source.includes("status: 'unavailable'"), 'unavailable state missing');
  });

  await check('ranking-band calculation uses a population distribution only', () => {
    const value = { ...base, aggregateValue: 75 };
    const distribution = {
      ...base,
      totalPopulation: 50,
      bands: [
        { band: 'bottom', minimumValue: 0, maximumValue: 19, populationCount: 10 },
        { band: 'lower', minimumValue: 20, maximumValue: 39, populationCount: 10 },
        { band: 'middle', minimumValue: 40, maximumValue: 59, populationCount: 10 },
        { band: 'upper', minimumValue: 60, maximumValue: 79, populationCount: 10 },
        { band: 'top', minimumValue: 80, maximumValue: 100, populationCount: 10 },
      ],
      dataVersion: 1,
      schemaVersion: 1,
    };
    const result = calculateGlobalRankingBand(value, distribution);
    assert(result.status === 'available' && result.band === 'upper', 'ranking band calculation failed');
  });

  await check('missing or insufficient population distribution returns insufficient_data', () => {
    const value = { ...base, aggregateValue: 75 };
    assert(calculateGlobalRankingBand(value, null).status === 'insufficient_data', 'missing distribution not handled');
    const incomplete = { ...base, totalPopulation: 5, bands: [], dataVersion: 1, schemaVersion: 1 };
    assert(calculateGlobalRankingBand(value, incomplete).status === 'invalid', 'malformed distribution not rejected');
  });

  await check('ranking never exposes an individual rank, percentile, or leaderboard position', () => {
    const source = `${read('src/types/global.ts')}\n${read('src/services/globalData.ts')}`;
    assert(!/userRank|userPercentile|leaderboardPosition|individualRank|percentile/i.test(source), 'individual ranking primitive found');
    assert(!/userId|email/i.test(read('src/types/global.ts')), 'identity field found in global types');
  });

  await check('global layer never reads private domain storage', () => {
    const source = read('src/services/globalData.ts');
    for (const table of ['lifeos_sync_records', 'tasks', 'habits', 'books', 'journal', 'finance', 'nutrition', 'workout', 'sleep']) {
      assert(!source.includes(`from('${table}')`), `private table ${table} accessed`);
    }
  });

  await check('global layer has no service-role usage or client write API', () => {
    const source = read('src/services/globalData.ts');
    assert(!/SUPABASE_SERVICE_ROLE_KEY|service_role|sb_secret/i.test(source), 'service role referenced');
    assert(!/\.insert\(|\.update\(|\.delete\(/.test(source), 'global write API found');
  });

  await check('geography is coarse approved levels only', () => {
    const types = read('src/types/global.ts');
    const service = read('src/services/globalData.ts');
    assert(types.includes("'global' | 'country' | 'region' | 'city'"), 'approved geography contract missing');
    assert(!/latitude|longitude|coordinates|preciseLocation/i.test(types), 'precise geography leaked into types');
    assert(service.includes('GEOGRAPHIES'), 'geography validation missing');
  });

  await check('deterministic ordering remains explicit in global reads', () => {
    const source = read('src/services/globalData.ts');
    assert(source.includes(".order('period_start', { ascending: true })") && source.includes(".order('metric_name', { ascending: true })"), 'deterministic ordering missing');
  });

  await check('capability boundary remains unchanged and no global UI exists', () => {
    const capabilities = read('src/types/capabilities.ts');
    assert(capabilities.includes('globalStats') && capabilities.includes('leaderboard') && capabilities.includes('community') && capabilities.includes('globalChallenges'), 'capability boundary changed');
    assert(!fs.existsSync(`${root}/src/app/global-statistics.tsx`), 'global UI exposed');
    assert(!fs.existsSync(`${root}/src/app/leaderboard.tsx`), 'leaderboard UI exposed');
  });

  await check('3T.9 and 3T.10 foundations remain authoritative', () => {
    const sql = read('sql/lifeos-global-metrics.sql');
    const service = read('src/services/globalData.ts');
    assert(sql.includes('enable row level security') && sql.includes('for select') && sql.includes('to authenticated'), '3T.9 RLS changed');
    assert(!sql.includes('for insert') && !sql.includes('for update') && !sql.includes('for delete'), 'client write policy added');
    assert(service.includes('LIFEOS_GLOBAL_METRIC_DEFINITIONS') && service.includes('readGlobalMetrics'), '3T.10 layer missing');
  });

  console.log(`LIFEOS 3T.11 GLOBAL COMPARISON + RANKING FOUNDATION: ${passed} passed, 0 failed`);
}

main().catch((error) => { console.error(error); process.exit(1); });
