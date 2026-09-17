// LIFEOS 3T.7: account profile + account lifecycle UX.
// @ts-nocheck
import fs from 'node:fs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const memory = new Map();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); }, removeItem: (key) => { memory.delete(key); }, clear: () => { memory.clear(); }, get length() { return memory.size; }, key: (index) => Array.from(memory.keys())[index] ?? null } } });

  const { supabase } = await import('@/lib/supabase');
  const { getAuthStatus, signOut } = await import('@/services/auth');
  const { getFeatureAccess, canAccess } = await import('@/services/capabilities');

  const settingsSource = fs.readFileSync('src/app/settings/index.tsx', 'utf8');
  const authSource = fs.readFileSync('src/services/auth.ts', 'utf8');
  const syncSource = fs.readFileSync('src/services/sync.ts', 'utf8');
  const supabaseSource = fs.readFileSync('src/lib/supabase.ts', 'utf8');

  const originalGetSession = supabase.auth.getSession;
  const originalSignOut = supabase.auth.signOut;
  let sessionUserId = null;
  let signOutError = null;
  Object.defineProperty(supabase.auth, 'getSession', {
    configurable: true,
    writable: true,
    value: async () => ({ data: { session: sessionUserId ? { user: { id: sessionUserId, email: `${sessionUserId}@example.com` } } : null }, error: null }),
  });
  Object.defineProperty(supabase.auth, 'signOut', {
    configurable: true,
    writable: true,
    value: async () => {
      if (signOutError) return { error: signOutError };
      sessionUserId = null;
      return { error: null };
    },
  });

  let passed = 0;
  const check = async (name, fn) => {
    try { await fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; }
  };

  await check('guest account surface stays an authentication entry', async () => {
    sessionUserId = null;
    const status = await getAuthStatus();
    assert(status.authState === 'guest' && !status.isAuthenticated && status.user === null, 'guest state is not empty');
    assert(settingsSource.includes("'Sign in or create an account'"), 'guest account entry missing');
    assert(settingsSource.includes("onSignIn={() => signIn('/settings')}"), 'guest sign-in route missing');
    assert(settingsSource.includes("onCreateAccount={() => createAccount('/settings')}"), 'guest create-account route missing');
  });

  await check('authenticated account surface shows authenticated status', async () => {
    sessionUserId = 'account-a';
    const status = await getAuthStatus();
    assert(status.authState === 'authenticated' && status.isAuthenticated, 'authenticated state missing');
    assert(settingsSource.includes('Account status'), 'account status surface missing');
    assert(settingsSource.includes('Authenticated'), 'authenticated status label missing');
    assert(settingsSource.includes('Sign out'), 'sign-out action missing');
  });

  await check('authenticated email comes from the Supabase user', async () => {
    sessionUserId = 'account-a';
    const status = await getAuthStatus();
    assert(status.user?.email === 'account-a@example.com', 'email did not come from session user');
    assert(settingsSource.includes('user?.email'), 'settings does not render current session user email');
    assert(!settingsSource.includes('AsyncStorage') && !settingsSource.includes('accountEmail'), 'email is persisted as a second identity');
  });

  await check('accountSettings is capability-gated', async () => {
    assert(getFeatureAccess('accountSettings')?.accessLevel === 'account', 'accountSettings is not ACCOUNT-level');
    assert(canAccess('accountSettings', 'guest') === false, 'guest can access accountSettings');
    assert(canAccess('accountSettings', 'authenticated') === true, 'authenticated accountSettings is blocked');
    assert(settingsSource.includes("checkAccess('accountSettings')"), 'settings does not use capability system');
  });

  await check('guest cannot access authenticated account state', async () => {
    sessionUserId = null;
    const status = await getAuthStatus();
    assert(status.user === null && status.isAuthenticated === false, 'guest retained authenticated user');
    assert(settingsSource.includes("authState === 'authenticated'"), 'authenticated surface is not session-state conditional');
  });

  await check('successful signout returns to guest', async () => {
    sessionUserId = 'account-a';
    signOutError = null;
    const result = await signOut();
    assert(result.authState === 'guest' && result.user === null && result.authError === null, 'successful signout did not return guest');
    assert(sessionUserId === null, 'session remained after successful signout');
  });

  await check('failed signout preserves actual authentication state', async () => {
    sessionUserId = 'account-a';
    signOutError = new Error('Unable to sign out right now.');
    const result = await signOut();
    assert(result.isAuthenticated === true && result.user?.id === 'account-a', 'failed signout falsely changed auth state');
    assert(result.authError === 'Unable to sign out right now.', 'safe signout error was not preserved');
    signOutError = null;
  });

  await check('Account A to B shows B', async () => {
    sessionUserId = 'account-a';
    const a = await getAuthStatus();
    assert(a.user?.id === 'account-a', 'A was not authenticated');
    sessionUserId = null;
    const guest = await getAuthStatus();
    assert(guest.user === null, 'guest state was not observed');
    sessionUserId = 'account-b';
    const b = await getAuthStatus();
    assert(b.user?.id === 'account-b' && b.user?.email === 'account-b@example.com', 'B did not replace A');
  });

  await check('no cached identity is used', async () => {
    assert(settingsSource.includes('user?.email'), 'UI does not read current auth user');
    assert(authSource.includes('supabase.auth.getSession()'), 'auth status does not use Supabase session');
    assert(!settingsSource.includes('userId') || !settingsSource.includes('AsyncStorage'), 'settings contains a cached user identity path');
    assert(!settingsSource.includes('useState<') || !settingsSource.includes('userId'), 'settings stores a cached user ID');
  });

  await check('account UI does not modify local data', async () => {
    assert(!settingsSource.includes('saveData('), 'account UI writes domain data');
    assert(!settingsSource.includes('removeData('), 'account UI deletes domain data');
    assert(!settingsSource.includes('clearStorage'), 'account UI clears local storage');
  });

  await check('local data and backup are not deleted by signout', async () => {
    assert(!authSource.includes('AsyncStorage.clear'), 'auth signout clears local storage');
    assert(!authSource.includes('removeItem('), 'auth signout removes local data');
    assert(settingsSource.includes('signOut()'), 'settings uses authoritative signOut action');
  });

  await check('no service-role credential is introduced', async () => {
    assert(!settingsSource.includes('SERVICE_ROLE'), 'settings references service role');
    assert(!authSource.includes('SERVICE_ROLE'), 'auth service references service role');
    assert(!supabaseSource.includes('SUPABASE_SERVICE_ROLE_KEY'), 'client Supabase module references service role');
  });

  await check('no profile persistence or profile table is introduced', async () => {
    assert(!settingsSource.includes('profileData') && !settingsSource.includes('profileData'), 'profile persistence state introduced');
    assert(!settingsSource.includes('insert(') && !settingsSource.includes('upsert('), 'account UI writes a profile record');
    assert(!authSource.includes('profiles'), 'auth service introduces a profile table');
  });

  await check('no duplicate auth state system is introduced', async () => {
    assert(settingsSource.includes('useAuth()'), 'settings does not reuse useAuth');
    assert(!settingsSource.includes('onAuthStateChange'), 'settings creates a duplicate auth listener');
    assert(!settingsSource.includes('getSession()'), 'settings reads session directly instead of useAuth');
  });

  await check('3R and 3S remain untouched by account UI', async () => {
    assert(syncSource.includes('synchronizeLifeOS'), '3R sync entry point missing');
    assert(syncSource.includes('getCurrentSessionUserId'), '3R session identity bridge missing');
    assert(syncSource.includes('getConflicts'), '3S conflict handling missing');
    assert(!settingsSource.includes('resolveConflict') && !settingsSource.includes('setConflict'), 'account UI modifies 3S conflict behavior');
  });

  await check('existing authentication routes remain valid', async () => {
    assert(settingsSource.includes("'/auth/sign-in'"), 'sign-in route missing');
    assert(settingsSource.includes("createAccount('/settings')"), 'sign-up route action missing');
    assert(fs.existsSync('src/app/auth/sign-in.tsx'), 'sign-in route file missing');
    assert(fs.existsSync('src/app/auth/sign-up.tsx'), 'sign-up route file missing');
    assert(fs.existsSync('src/app/auth/forgot-password.tsx'), 'forgot-password route file missing');
    assert(syncSource.includes('supabase.auth.getSession()'), '3R sync no longer reads current session');
  });

  Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: originalGetSession });
  Object.defineProperty(supabase.auth, 'signOut', { configurable: true, writable: true, value: originalSignOut });
  console.log(`LIFEOS 3T.7 ACCOUNT PROFILE + ACCOUNT LIFECYCLE UX: ${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
