// LIFEOS 3T.8: Supabase security + production authentication audit.
// Static and implementation-backed checks only. No credentials are printed.
// @ts-nocheck
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const read = (path) => fs.readFileSync(path, 'utf8');
const src = (path) => read(`src/${path}`);
const assertNoSensitiveLiteral = (text, label) => {
  assert(!/SUPABASE_SERVICE_ROLE_KEY|sb_secret/i.test(text), `${label} references a privileged Supabase credential`);
  assert(!/console\.(log|debug|info|warn|error)\s*\([^\n]*(password|access.?token|refresh.?token|service.?role|secret)/i.test(text), `${label} contains sensitive logging`);
};

let passed = 0;
const check = (name, fn) => { try { fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; } };

const supabaseSource = src('lib/supabase.ts');
const authSource = src('services/auth.ts');
const authHook = src('hooks/useAuth.ts');
const syncSource = src('services/sync.ts');
const backupSource = src('services/backup.ts');
const capabilitySource = src('types/capabilities.ts');
const accountGateSource = src('services/accountGate.ts');
const settingsSource = src('app/settings/index.tsx');
const conflictTypeSource = src('types/sync.ts');

check('no service-role credential in client code', () => {
  const clientFiles = ['lib/supabase.ts','services/auth.ts','hooks/useAuth.ts','services/sync.ts','services/backup.ts','types/capabilities.ts','hooks/useCapabilities.ts','services/capabilities.ts'];
  for (const file of clientFiles) assertNoSensitiveLiteral(src(file), `src/${file}`);
});

check('no secret Supabase key is embedded in client code', () => {
  assert(!/['"](?:sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})['"]/i.test(supabaseSource), 'supabase client contains a secret-like key literal');
  assert(supabaseSource.includes('process.env.EXPO_PUBLIC_SUPABASE_KEY'), 'public client key is not environment-configured');
});

check('public/publishable key configuration only', () => {
  assert(supabaseSource.includes('EXPO_PUBLIC_SUPABASE_URL') && supabaseSource.includes('EXPO_PUBLIC_SUPABASE_KEY'), 'public Supabase configuration missing');
  assert(!supabaseSource.includes('SUPABASE_URL') || !supabaseSource.includes('SUPABASE_SERVICE_ROLE_KEY'), 'privileged env configuration referenced by client');
});

check('Supabase client uses safe native session settings', () => {
  assert(supabaseSource.includes('storage: AsyncStorage'), 'existing session storage mechanism changed');
  assert(supabaseSource.includes('autoRefreshToken: true'), 'auto refresh disabled');
  assert(supabaseSource.includes('persistSession: true'), 'session persistence disabled');
  assert(supabaseSource.includes('detectSessionInUrl: false'), 'URL session detection enabled');
  assert(supabaseSource.includes('offline-placeholder-anon-key'), 'missing configuration does not have an explicit safe placeholder');
});

check('authenticated identity comes from session.user.id', () => {
  assert(syncSource.includes('data.session?.user?.id'), 'sync identity is not derived from session.user.id');
  assert(authSource.includes('session?.user ?? null'), 'auth state is not derived from session user');
  assert(!syncSource.includes('metadata.userId') && !syncSource.includes('metadata?.userId'), 'sync metadata can authorize identity');
});

check('auth uses one listener foundation and cleans it up', () => {
  assert(authSource.includes('supabase.auth.onAuthStateChange'), 'Supabase auth listener missing');
  assert(authSource.includes('subscription.data.subscription.unsubscribe()'), 'auth listener cleanup missing');
  assert(!authHook.includes('onAuthStateChange'), 'useAuth duplicates the Supabase auth listener');
});

check('passwords and tokens are not logged or persisted by auth', () => {
  assertNoSensitiveLiteral(authSource, 'auth service');
  assert(!authSource.includes('AsyncStorage'), 'auth service directly persists credentials');
  assert(!authHook.includes('console.'), 'auth hook logs credentials');
  assert(!settingsSource.match(/console\.(log|debug|info|warn|error)/i), 'settings logs auth data');
});

check('password reset remains account-neutral', () => {
  assert(authSource.includes('resetPasswordForEmail'), 'password reset flow missing');
  assert(authSource.includes('If an account uses this email'), 'password reset is not account-neutral');
});

check('guest cannot sync and sync is current-session scoped', () => {
  assert(syncSource.includes('if (!sessionUserId)'), 'guest sync guard missing');
  assert(syncSource.includes(".eq('user_id', sessionUserId)"), 'remote query is not session scoped');
  assert(syncSource.includes('row.user_id !== sessionUserId'), 'upload identity guard missing');
  assert(syncSource.includes('assertSessionIdentity(sessionUserId)'), 'stale session checks missing');
});

check('account switching cannot reuse prior sync identity', () => {
  assert(syncSource.includes('syncPromise.userId === currentUserId'), 'concurrent identity mismatch guard missing');
  assert(syncSource.includes('active for a different authenticated account'), 'cross-account active sync is not rejected safely');
});

check('RLS ownership policy exists for lifeos_sync_records', () => {
  const sql = read('sql/lifeos-sync.sql');
  assert(sql.includes('alter table public.lifeos_sync_records enable row level security'), 'sync RLS is not enabled');
  assert(sql.includes('using (auth.uid() = user_id)'), 'sync SELECT/UPDATE ownership policy missing');
  assert(sql.includes('with check (auth.uid() = user_id)'), 'sync INSERT/UPDATE ownership check missing');
  assert(!sql.match(/for\s+(select|insert|update|delete)[^\n]*\n?\s*(using|with check)\s*\([^)]*true/i), 'unrestricted sync policy detected');
  assert(!/for\s+(select|insert|update|delete)[^\n]*to\s+anon/i.test(sql), 'anonymous sync policy detected');
});

check('all user-owned workout tables have owner-scoped RLS', () => {
  const sql = read('sql/workout-tables.sql');
  for (const table of ['workouts','workout_exercises','workout_sets','personal_records']) assert(sql.includes(`alter table public.${table} enable row level security`), `RLS missing for ${table}`);
  assert(sql.includes('auth.uid() = user_id'), 'direct user ownership checks missing');
  assert(sql.includes('where w.id = workout_id and w.user_id = auth.uid()'), 'child workout ownership checks missing');
  assert(sql.includes('where we.id = workout_exercise_id and w.user_id = auth.uid()'), 'workout set ownership checks missing');
  assert(sql.includes('public.exercises'), 'exercises is intentionally referenced as an existing public library table, not invented here');
});

check('backup excludes sync and conflict metadata and contains no auth primitives', () => {
  assert(backupSource.includes('BACKUP_STORAGE_KEYS'), 'backup key allowlist missing');
  assert(!backupSource.includes('lifeos:sync:metadata') && !backupSource.includes('lifeos:sync:conflicts'), 'sync/conflict metadata entered backup allowlist');
  assert(!backupSource.includes('access_token') && !backupSource.includes('refresh_token'), 'auth token fields entered backup service');
  assert(!backupSource.includes('password'), 'password entered backup service');
});

check('restoring backup cannot fabricate authentication', () => {
  assert(!backupSource.includes('supabase.auth'), 'backup restore can mutate authentication');
  assert(!backupSource.includes('setSession') && !backupSource.includes('signIn'), 'backup restore can fabricate a session');
});

check('location remains outside authentication and capability boundaries', () => {
  assert(capabilitySource.includes("localLocation: { feature: 'localLocation', accessLevel: 'local' }"), 'localLocation is not LOCAL');
  assert(capabilitySource.includes("locationComparison: { feature: 'locationComparison', accessLevel: 'global' }"), 'locationComparison is not GLOBAL');
  assert(!authSource.match(/Location|request.*permission|expo-location/i), 'authentication requests location');
  assert(!authHook.match(/Location|request.*permission|expo-location/i), 'useAuth requests location');
});

check('conflict metadata cannot authorize authentication identity', () => {
  assert(!conflictTypeSource.includes('userId'), 'conflict type introduces an identity field');
  assert(!syncSource.match(/conflict\.(userId|authUserId)/), 'conflict metadata used as authentication identity');
  assert(syncSource.includes('const session = await supabase.auth.getSession()'), 'conflict resolution uses current session');
});

check('account and global boundaries use the existing capability registry', () => {
  assert(capabilitySource.includes("accountSettings: { feature: 'accountSettings', accessLevel: 'account' }"), 'accountSettings level incorrect');
  assert(capabilitySource.includes("cloudSync: { feature: 'cloudSync', accessLevel: 'account' }"), 'cloudSync level incorrect');
  for (const feature of ['globalStats','leaderboard','community','globalChallenges','locationComparison']) assert(capabilitySource.includes(`${feature}: { feature: '${feature}', accessLevel: 'global' }`), `${feature} is not GLOBAL`);
  assert(accountGateSource.includes('checkAccess'), 'account gate bypasses capability system');
});

check('account UI uses current auth state and does not introduce profile persistence', () => {
  assert(settingsSource.includes('useAuth()'), 'settings does not use authoritative auth foundation');
  assert(settingsSource.includes('user?.email'), 'settings email is not sourced from current auth user');
  assert(settingsSource.includes('signOut()'), 'settings does not use authoritative signOut action');
  assert(!settingsSource.match(/AsyncStorage|profile.*storage|saveProfile|profileId/i), 'account UI introduced profile persistence');
});

check('production environment keeps privileged secret out of tracked repository', () => {
  const tracked = execFileSync('git', ['ls-files', '.env', '.env.local', '.env.production', '.env.development'], { encoding: 'utf8' });
  assert(tracked.trim() === '', 'an environment file containing credentials is tracked');
  const ignore = read('.gitignore');
  assert(ignore.includes('.env') && ignore.includes('.env.local'), 'environment files are not ignored');
});

console.log(`LIFEOS 3T.8 SUPABASE SECURITY + PRODUCTION AUTH AUDIT: ${passed} passed, 0 failed`);

