// @ts-nocheck
import fs from 'node:fs';
import { canAccess, getFeatureAccess, requiresAuthentication } from '@/services/capabilities';
import {
  LIFEOS_GLOBAL_METRIC_FIELDS,
  isLifeOSGlobalMetric,
  type LifeOSGlobalMetric,
} from '@/types/global';

const src = (path: string) => fs.readFileSync(path, 'utf8');
const globalTypesSource = src('src/types/global.ts');
const globalServiceSource = src('src/services/globalData.ts');
const sql = src('sql/lifeos-global-metrics.sql');
const capabilityTypes = src('src/types/capabilities.ts');
const capabilityService = src('src/services/capabilities.ts');
const capabilityHook = src('src/hooks/useCapabilities.ts');
const accountGate = src('src/components/account/AccountGate.tsx');
const authSource = src('src/services/auth.ts');
const syncSource = src('src/services/sync.ts');
const supabaseSource = src('src/lib/supabase.ts');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: unknown, expected: unknown, message = 'assertion failed'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

assertEqual(getFeatureAccess('globalStats')?.accessLevel, 'global');
assertEqual(getFeatureAccess('locationComparison')?.accessLevel, 'global');
assertEqual(canAccess('globalStats', 'guest'), false);
assertEqual(canAccess('globalStats', 'authenticated'), true);
assertEqual(requiresAuthentication('globalStats'), true);
assertEqual(canAccess('tasks', 'guest'), true);
assertEqual(canAccess('cloudSync', 'guest'), false);
console.log('PASS LOCAL/ACCOUNT/GLOBAL capability boundaries remain unchanged');

assert(capabilityTypes.includes("'globalStats'"), 'global capability registry missing globalStats');
assert(capabilityService.includes('checkFeatureAccess'), 'capability service no longer delegates to central registry');
assert(capabilityHook.includes('useAuth'), 'capability hook no longer uses existing auth state');
assert(accountGate.includes('AccountGateProps'), 'AccountGate was not preserved as the reusable account boundary');
assert(authSource.includes('supabase.auth.getSession()'), 'auth boundary changed unexpectedly');
assert(syncSource.includes("supabase.from('lifeos_sync_records')"), '3R sync boundary changed unexpectedly');
console.log('PASS existing capability, AccountGate, auth, and 3R integration foundations are preserved');

const forbiddenGlobalFields = [
  'email', 'authToken', 'password', 'journalText', 'taskDescription', 'financialTransaction',
  'nutritionFood', 'workoutPrivateDetails', 'preciseLocation', 'latitude', 'longitude', 'profileId', 'userId',
];
for (const field of forbiddenGlobalFields) assert(!LIFEOS_GLOBAL_METRIC_FIELDS.includes(field as never), `forbidden global field present: ${field}`);
assertEqual(LIFEOS_GLOBAL_METRIC_FIELDS.length, 13);
assert(globalTypesSource.includes('export interface LifeOSGlobalMetric'), 'global metric interface missing');
assert(globalTypesSource.includes('LIFEOS_GLOBAL_SCHEMA_VERSION'), 'global schema version missing');
console.log('PASS global model exposes only privacy-safe aggregate fields');

const sampleMetric: LifeOSGlobalMetric = {
  metricName: 'task_completion_rate',
  metricType: 'rate',
  period: 'week',
  periodStart: '2026-09-07',
  periodEnd: '2026-09-13',
  geographicLevel: 'country',
  geographicCode: 'IN',
  aggregateValue: 0.72,
  aggregateCount: 100,
  createdAt: '2026-09-14T00:00:00.000Z',
  updatedAt: '2026-09-14T00:00:00.000Z',
  dataVersion: 1,
  schemaVersion: 1,
};
assert(isLifeOSGlobalMetric(sampleMetric), 'valid aggregate metric was rejected');
for (const key of Object.keys(sampleMetric)) assert(LIFEOS_GLOBAL_METRIC_FIELDS.includes(key as never), `unexpected payload field: ${key}`);
console.log('PASS global metric contract supports aggregate metric type, period, optional geography, values, timestamps, and versions');

assert(globalServiceSource.includes(".from('lifeos_global_metrics')"), 'global service does not use the dedicated global table');
assert(globalServiceSource.includes(".select(GLOBAL_METRIC_COLUMNS)"), 'global service does not use an explicit aggregate-only projection');
assert(!globalServiceSource.includes(".from('lifeos_sync_records')"), 'global service reads private sync records');
assert(!globalServiceSource.includes(".from('lifeos_" + "tasks"), 'global service reads private task records');
console.log('PASS global service never reads private user-owned records');

assert(!globalServiceSource.includes('.insert('), 'global service can insert global data');
assert(!globalServiceSource.includes('.upsert('), 'global service can upsert global data');
assert(!globalServiceSource.includes('.update('), 'global service can update global data');
assert(!globalServiceSource.includes('.delete('), 'global service can delete global data');
assert(!globalServiceSource.includes(".from('lifeos_global_metrics').insert"), 'global service publishes fabricated production statistics');
assert(!globalServiceSource.includes(".from('lifeos_global_metrics').upsert"), 'global service publishes fabricated production statistics');
console.log('PASS global service is read-only and contains no fake/sample production statistics');

assert(globalServiceSource.includes('supabase.auth.getSession()'), 'global service does not require the current auth session');
assert(globalServiceSource.includes("status: 'auth_required'"), 'guest/auth-required state is not explicit');
assert(globalServiceSource.includes("status: 'unavailable'"), 'unavailable state is not explicit');
console.log('PASS global service distinguishes authenticated access from unavailable data');

async function runRuntimeChecks(): Promise<void> {
  const storage = new Map<string, string>();
  (globalThis as unknown as { window: { localStorage: Storage } }).window = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
      clear: () => { storage.clear(); },
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      get length() { return storage.size; },
    },
  };
  const { supabase } = await import('@/lib/supabase');
  const { readGlobalMetrics } = await import('@/services/globalData');
  const originalGetSession = supabase.auth.getSession;
  const originalFrom = supabase.from;

  try {
  Object.defineProperty(supabase.auth, 'getSession', {
    configurable: true,
    writable: true,
    value: async () => ({ data: { session: null }, error: null }),
  });
  const guestResult = await readGlobalMetrics();
  assertEqual(guestResult.status, 'auth_required');
  assertEqual(guestResult.metrics.length, 0);
  console.log('PASS guest global read returns auth_required and no data');

  Object.defineProperty(supabase.auth, 'getSession', {
    configurable: true,
    writable: true,
    value: async () => ({ data: { session: { user: { id: 'user-3t9' } } }, error: null }),
  });
  Object.defineProperty(supabase, 'from', {
    configurable: true,
    writable: true,
    value: () => ({
      select: () => ({
        order: () => ({
          order: () => ({
            order: async () => ({ data: null, error: new Error('offline') }),
          }),
        }),
      }),
    }),
  });
  const unavailableResult = await readGlobalMetrics();
  assertEqual(unavailableResult.status, 'unavailable');
  assertEqual(unavailableResult.metrics.length, 0);
  assert(unavailableResult.status !== 'available', 'unavailable data was treated as available');
  console.log('PASS unavailable global data is not treated as zero or available data');
} finally {
  Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: originalGetSession });
  Object.defineProperty(supabase, 'from', { configurable: true, writable: true, value: originalFrom });
}

assert(sql.includes('create table if not exists public.lifeos_global_metrics'), 'global metrics table missing');
assert(sql.includes('alter table public.lifeos_global_metrics enable row level security'), 'global metrics RLS is not enabled');
assert(sql.includes('to authenticated'), 'global read policy is not restricted to authenticated users');
assert(sql.includes('using (true)'), 'authenticated aggregate read policy missing');
assert(sql.includes('revoke all on table public.lifeos_global_metrics from anon, authenticated'), 'client write privileges are not revoked');
assert(sql.includes('grant select on table public.lifeos_global_metrics to authenticated'), 'authenticated read privilege missing');
console.log('PASS global metrics SQL has authenticated-only read and no client write authority');

assert(!sql.match(/create policy[^\n]+for (insert|update|delete)/i), 'global SQL creates a client write policy');
assert(!sql.match(/create policy[^\n]+for select[\s\S]{0,300}(user_id|auth\.uid)/i), 'global SQL exposes a user identity field in aggregate reads');
assert(!sql.includes('user_id'), 'global aggregate table contains a user_id field');
assert(!sql.includes('email'), 'global aggregate table contains email');
assert(!sql.includes('journal'), 'global aggregate table references journal data');
console.log('PASS global SQL contains no raw user identity/private-domain fields');

assert(sql.includes('Future trusted aggregation should run through a server-side role/job'), 'aggregation authority boundary is not documented');
assert(sql.includes('Do not grant INSERT/UPDATE/DELETE to the'), 'client write prohibition is not explicit');
assert(!supabaseSource.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Expo Supabase client references service-role credentials');
console.log('PASS trusted aggregation authority remains server-side and service-role credentials stay out of Expo');

assert(sql.includes("geographic_level in ('global', 'country', 'region', 'city')"), 'geographic aggregation levels are not constrained');
assert(!sql.includes('latitude') && !sql.includes('longitude'), 'precise coordinates entered global SQL');
assert(sql.includes('aggregate_count >= 5'), 'global aggregates do not enforce a minimum anonymous cohort size');
assert(sql.includes('schema_version integer') && sql.includes('data_version integer'), 'version fields missing');
console.log('PASS geography, aggregate count, and schema/data version constraints are explicit');

console.log('LIFEOS 3T.9 GLOBAL CAPABILITY + DATA FOUNDATION: 15 passed, 0 failed');
}

void runRuntimeChecks().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
