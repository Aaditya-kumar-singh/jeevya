// LIFEOS 3T.1 + 3T.2: optional auth foundation and guest/auth state coverage.
// @ts-nocheck
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => { memory.set(key, value); },
    removeItem: (key) => { memory.delete(key); },
    clear: () => memory.clear(),
    get length() { return memory.size; },
    key: (index) => Array.from(memory.keys())[index] ?? null,
  } } });

  const { supabase } = await import('@/lib/supabase');
  const auth = await import('@/services/auth');
  const originalGetSession = supabase.auth.getSession;
  const originalOnAuthStateChange = supabase.auth.onAuthStateChange;
  const originalSignOut = supabase.auth.signOut;

  let currentSession = null;
  let callback = null;
  let unsubscribed = false;

  Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: async () => ({ data: { session: currentSession }, error: null }) });
  Object.defineProperty(supabase.auth, 'onAuthStateChange', { configurable: true, writable: true, value: (listener) => {
    callback = listener;
    unsubscribed = false;
    return { data: { subscription: { unsubscribe: () => { unsubscribed = true; } } } };
  } });
  Object.defineProperty(supabase.auth, 'signOut', { configurable: true, writable: true, value: async () => { currentSession = null; if (callback) callback('SIGNED_OUT', null); return { error: null }; } });

  const userA = { id: 'user-a', email: 'a@example.com', user_metadata: {} };
  const userB = { id: 'user-b', email: 'b@example.com', user_metadata: {} };
  const sessionA = { access_token: 'a', refresh_token: 'a', user: userA };
  const sessionB = { access_token: 'b', refresh_token: 'b', user: userB };

  let passed = 0;
  const check = async (name, fn) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; } };

  await check('initial loading state is explicit', async () => {
    const { LOADING_AUTH_STATUS } = auth;
    assert(LOADING_AUTH_STATUS.authState === 'loading' && LOADING_AUTH_STATUS.isLoading && !LOADING_AUTH_STATUS.isAuthenticated && LOADING_AUTH_STATUS.user === null, 'loading state incorrect');
  });

  await check('no session becomes guest', async () => {
    currentSession = null;
    const status = await auth.getAuthStatus();
    assert(status.authState === 'guest' && status.user === null && !status.isAuthenticated && !status.isLoading, 'guest state incorrect');
  });

  await check('valid session becomes authenticated', async () => {
    currentSession = sessionA;
    const status = await auth.getAuthStatus();
    assert(status.authState === 'authenticated' && status.user?.id === userA.id && status.isAuthenticated, 'authenticated state incorrect');
  });

  await check('session change updates the active user', async () => {
    currentSession = sessionA;
    let latest = null;
    const unsubscribe = auth.subscribeToAuthState((status) => { latest = status; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    currentSession = sessionB;
    callback('SIGNED_IN', sessionB);
    assert(latest?.user?.id === userB.id && latest?.authState === 'authenticated', 'session change did not update user');
    unsubscribe();
  });

  await check('sign-out transitions to guest without local data involvement', async () => {
    currentSession = sessionA;
    let latest = null;
    const unsubscribe = auth.subscribeToAuthState((status) => { latest = status; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await auth.signOut();
    assert(latest?.authState === 'guest' && latest?.user === null && !latest?.isAuthenticated, 'sign-out did not become guest');
    unsubscribe();
  });

  await check('stale previous user identity is never reused', async () => {
    currentSession = sessionA;
    const first = await auth.getAuthStatus();
    currentSession = null;
    const guest = await auth.getAuthStatus();
    assert(first.user.id === userA.id && guest.user === null && !guest.isAuthenticated, 'stale user identity leaked into guest state');
    currentSession = sessionB;
    const second = await auth.refreshAuthSession();
    assert(second.user?.id === userB.id && second.user.id !== userA.id, 'previous account identity reused');
  });

  await check('guest mode does not require cloud access', async () => {
    currentSession = null;
    const status = await auth.getAuthStatus();
    assert(status.authState === 'guest' && status.authError === null, 'guest requires cloud access');
  });

  await check('auth listener cleanup prevents future updates', async () => {
    currentSession = sessionA;
    let calls = 0;
    const unsubscribe = auth.subscribeToAuthState(() => { calls += 1; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    unsubscribe();
    const before = calls;
    callback('SIGNED_OUT', null);
    assert(unsubscribed && calls === before, 'listener remained active after cleanup');
  });

  await check('auth failure is represented safely', async () => {
    Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: async () => ({ data: { session: null }, error: new Error('Auth unavailable') }) });
    const status = await auth.getAuthStatus();
    assert(status.authState === 'guest' && status.user === null && status.authError === 'Auth unavailable', 'auth failure was not represented safely');
  });

  Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: originalGetSession });
  Object.defineProperty(supabase.auth, 'onAuthStateChange', { configurable: true, writable: true, value: originalOnAuthStateChange });
  Object.defineProperty(supabase.auth, 'signOut', { configurable: true, writable: true, value: originalSignOut });
  console.log(`LIFEOS 3T.1 + 3T.2 AUTH: ${passed} passed, 0 failed`);
})().catch(() => process.exit(1));
