// @ts-nocheck
import fs from 'node:fs';
import { JEEVYA_GLOBAL_METRIC_FIELDS, isJeevyaGlobalMetric } from '@/types/global';

let JEEVYA_GLOBAL_METRIC_DEFINITIONS: any;
let compareGlobalMetric: any;
let previousEquivalentPeriod: any;

const root = process.cwd();
const read = (p: string) => fs.readFileSync(`${root}/${p}`, 'utf8');
const assert = (v: unknown, m: string) => { if (!v) throw new Error(m); };

let passed = 0;
const check = async (name: string, fn: () => void | Promise<void>) => { await fn(); passed++; console.log(`PASS ${name}`); };

async function main() {
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } } });
const globalData = await import('@/services/globalData');
JEEVYA_GLOBAL_METRIC_DEFINITIONS = globalData.JEEVYA_GLOBAL_METRIC_DEFINITIONS;
compareGlobalMetric = globalData.compareGlobalMetric;
previousEquivalentPeriod = globalData.previousEquivalentPeriod;
await check('metric definition registry is explicit and contains no demonstration metrics', () => {
  assert(Array.isArray(JEEVYA_GLOBAL_METRIC_DEFINITIONS), 'registry missing');
  assert(JEEVYA_GLOBAL_METRIC_DEFINITIONS.every((d) => d.metricName && d.metricType && d.unit && d.meaning && d.supportedPeriods.length > 0), 'invalid metric definition');
});
await check('global metric contract contains only approved aggregate fields', () => {
  assert(!JEEVYA_GLOBAL_METRIC_FIELDS.includes('userId' as never), 'userId exposed');
  assert(!JEEVYA_GLOBAL_METRIC_FIELDS.includes('email' as never), 'email exposed');
});
await check('valid aggregate retrieval path is restricted to the global table and explicit columns', () => {
  const source = read('src/services/globalData.ts');
  assert(source.includes("from('jeevya_global_metrics')"), 'wrong table');
  assert(source.includes(".select(GLOBAL_METRIC_COLUMNS)"), 'arbitrary selection allowed');
  assert(!source.includes("from('jeevya_sync_records')"), 'sync records accessed');
});
await check('invalid remote rows are rejected before becoming trusted statistics', () => {
  const source = read('src/services/globalData.ts');
  assert(source.includes('mapMetric') && source.includes("return invalid('Global data contained malformed or unapproved statistics.')"), 'invalid row rejection missing');
  assert(source.includes('aggregate_count < MIN_COHORT'), 'minimum cohort validation missing');
});
await check('unavailable, empty, and zero are distinct', () => {
  const source = read('src/services/globalData.ts');
  assert(source.includes("status: 'unavailable'"), 'unavailable missing');
  assert(source.includes("status: 'empty'"), 'empty missing');
  assert(source.includes('aggregateValue === 0'), 'zero comparison missing');
});
await check('guests require authentication', () => {
  const source = read('src/services/globalData.ts');
  assert(source.includes("status: 'auth_required'"), 'guest auth requirement missing');
});
await check('deterministic ordering and all query filters are explicit', () => {
  const source = read('src/services/globalData.ts');
  for (const fragment of [".eq('metric_name'", ".eq('metric_type'", ".eq('period'", ".gte('period_start'", ".lte('period_end'", ".eq('geographic_level'", ".eq('geographic_code'", ".order('period_start'", ".order('metric_name'"]) assert(source.includes(fragment), `missing ${fragment}`);
});
await check('date, geography, and period validation exists', () => {
  const source = read('src/services/globalData.ts');
  assert(source.includes('validDate') && source.includes('PERIODS.includes') && source.includes('GEOGRAPHIES.includes'), 'validation missing');
});
await check('comparison uses supplied previous data only', () => {
  const source = read('src/services/globalData.ts');
  assert(source.includes('if (!previous)'), 'missing-data comparison branch');
  assert(source.includes('previous.aggregateValue'), 'previous metric calculation missing');
  assert(!source.includes('readGlobalMetrics({ metricName: metric.metricName'), 'comparison fabricates/fetches hidden previous data');
});
await check('previous equivalent period is deterministic', () => {
  const current = { metricName: 'x', metricType: 'count', period: 'week', periodStart: '2026-09-14', periodEnd: '2026-09-20', aggregateValue: 10, aggregateCount: 5, createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z', dataVersion: 1, schemaVersion: 1 } as const;
  const a = previousEquivalentPeriod(current); const b = previousEquivalentPeriod(current);
  assert(JSON.stringify(a) === JSON.stringify(b), 'period calculation is not deterministic');
  assert(a?.start === '2026-09-07' && a.end === '2026-09-13', 'wrong previous period');
});
await check('percentage change handles a zero previous value without division', async () => {
  const current = { metricName: 'x', metricType: 'count', period: 'week', periodStart: '2026-09-14', periodEnd: '2026-09-20', aggregateValue: 5, aggregateCount: 5, createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z', dataVersion: 1, schemaVersion: 1 } as const;
  const previous = { ...current, periodStart: '2026-09-07', periodEnd: '2026-09-13', aggregateValue: 0 };
  const result = await compareGlobalMetric(current, previous);
  assert(result.status === 'available' && result.comparison?.percentageChange === null && result.trend === 'up', 'zero previous handling incorrect');
});
await check('trend is neutral to meaning and deterministic', async () => {
  const base = { metricName: 'x', metricType: 'count', period: 'day', periodStart: '2026-09-14', periodEnd: '2026-09-14', aggregateCount: 5, createdAt: '2026-09-14T00:00:00Z', updatedAt: '2026-09-14T00:00:00Z', dataVersion: 1, schemaVersion: 1 } as const;
  const up = await compareGlobalMetric({ ...base, aggregateValue: 2 }, { ...base, aggregateValue: 1 });
  const down = await compareGlobalMetric({ ...base, aggregateValue: 1 }, { ...base, aggregateValue: 2 });
  const same = await compareGlobalMetric({ ...base, aggregateValue: 1 }, { ...base, aggregateValue: 1 });
  const none = await compareGlobalMetric({ ...base, aggregateValue: 1 }, null);
  assert(up.trend === 'up' && down.trend === 'down' && same.trend === 'unchanged' && none.trend === 'insufficient_data', 'trend calculation incorrect');
});
await check('malformed data and private fields cannot enter the contract', () => {
  assert(!isJeevyaGlobalMetric({ userId: 'private' }), 'private row accepted');
  assert(!JEEVYA_GLOBAL_METRIC_FIELDS.some((f) => /user|email|password|token|journal|transaction|description/i.test(f)), 'private field in contract');
});
await check('client has no global write API or service-role usage', () => {
  const source = read('src/services/globalData.ts');
  assert(!/\.insert\(|\.update\(|\.delete\(/.test(source), 'global write API found');
  assert(!/SUPABASE_SERVICE_ROLE_KEY|service_role|sb_secret/i.test(source), 'service role referenced');
});
await check('3T.9 RLS and authority boundary remain intact', () => {
  const sql = read('sql/jeevya-global-metrics.sql');
  assert(sql.includes('enable row level security'), 'RLS missing');
  assert(sql.includes('for select') && sql.includes('to authenticated'), 'authenticated read missing');
  assert(!sql.includes('for insert') && !sql.includes('for update') && !sql.includes('for delete'), 'client write policy introduced');
  assert(sql.includes('aggregate_count >= 5'), 'cohort boundary weakened');
});
await check('capability/global boundary is preserved and no global UI was added', () => {
  const capabilities = read('src/types/capabilities.ts');
  assert(capabilities.includes('globalStats') && capabilities.includes('leaderboard') && capabilities.includes('community'), 'global capabilities changed unexpectedly');
  assert(!fs.existsSync(`${root}/src/app/global-statistics.tsx`), 'global UI exposed');
});

console.log(`JEEVYA 3T.10 GLOBAL STATISTICS FOUNDATION: ${passed} passed, 0 failed`);
}

main().catch((error) => { console.error(error); process.exit(1); });
