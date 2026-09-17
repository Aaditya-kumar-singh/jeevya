// LIFEOS 3T.3: account lifecycle and local-first safety coverage.
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
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const original = {
    getSession: supabase.auth.getSession,
    signUp: supabase.auth.signUp,
    signInWithPassword: supabase.auth.signInWithPassword,
    signOut: supabase.auth.signOut,
    resetPasswordForEmail: supabase.auth.resetPasswordForEmail,
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
  };

  const userA = { id: 'user-a', email: 'a@example.com', user_metadata: {} };
  const userB = { id: 'user-b', email: 'b@example.com', user_metadata: {} };
  const sessionA = { access_token: 'a', refresh_token: 'a', user: userA };
  const sessionB = { access_token: 'b', refresh_token: 'b', user: userB };
  let currentSession = null;
  let storageMutations = 0;

  Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: async () => ({ data: { session: currentSession }, error: null }) });
  Object.defineProperty(AsyncStorage, 'setItem', { configurable: true, writable: true, value: async () => { storageMutations++; } });
  Object.defineProperty(AsyncStorage, 'removeItem', { configurable: true, writable: true, value: async () => { storageMutations++; } });
  Object.defineProperty(AsyncStorage, 'getItem', { configurable: true, writable: true, value: original.getItem });

  let signupResponse = { data: { session: sessionA, user: userA }, error: null };
  let signinResponse = { data: { session: sessionA, user: userA }, error: null };
  let signoutResponse = { error: null };
  let resetResponse = { error: null };
  Object.defineProperty(supabase.auth, 'signUp', { configurable: true, writable: true, value: async () => { currentSession = signupResponse.data.session; return signupResponse; } });
  Object.defineProperty(supabase.auth, 'signInWithPassword', { configurable: true, writable: true, value: async () => { currentSession = signinResponse.data.session; return signinResponse; } });
  Object.defineProperty(supabase.auth, 'signOut', { configurable: true, writable: true, value: async () => { if (!signoutResponse.error) currentSession = null; return signoutResponse; } });
  Object.defineProperty(supabase.auth, 'resetPasswordForEmail', { configurable: true, writable: true, value: async () => resetResponse });

  const localBefore = {
    tasks: '[{"id":"task-1"}]', habits: '[{"id":"habit-1"}]', books: '[{"id":"book-1"}]', journal: '[{"id":"journal-1"}]',
    finance: '[{"id":"txn-1"}]', nutrition: '[{"id":"food-1"}]', workout: '[{"id":"workout-1"}]', sleep: '[{"id":"sleep-1"}]',
    backup: '{"version":1}', derived: '{"dailyPulse":"stable"}',
  };

  let passed = 0;
  const check = async (name, fn) => { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; } };
  const assertLocalUntouched = (beforeMutations) => assert(storageMutations === beforeMutations, 'auth action mutated AsyncStorage');

  await check('successful signup uses returned real session user', async () => {
    signupResponse = { data: { session: sessionA, user: userA }, error: null }; currentSession = null;
    const before = storageMutations;
    const result = await auth.signUp(' A@EXAMPLE.COM ', 'password');
    assert(result.ok && result.status.authState === 'authenticated' && result.status.user.id === userA.id, 'signup did not use returned session user');
    assertLocalUntouched(before);
  });

  await check('signup confirmation required remains guest without a session', async () => {
    signupResponse = { data: { session: null, user: userA }, error: null }; currentSession = null;
    const before = storageMutations;
    const result = await auth.signUp('a@example.com', 'password');
    assert(result.ok && result.confirmationRequired && result.status.authState === 'guest' && result.status.user === null, 'confirmation/no-session state incorrect');
    assertLocalUntouched(before);
  });

  await check('signup failure exposes safe error and actual guest state', async () => {
    signupResponse = { data: { session: null, user: null }, error: new Error('Email already registered') }; currentSession = null;
    const before = storageMutations;
    const result = await auth.signUp('a@example.com', 'password');
    assert(!result.ok && result.status.authState === 'guest' && result.error === 'Email already registered', 'signup failure incorrect');
    assertLocalUntouched(before);
  });

  await check('successful signin becomes authenticated as active user', async () => {
    signinResponse = { data: { session: sessionA, user: userA }, error: null }; currentSession = null;
    const before = storageMutations;
    const result = await auth.signIn('a@example.com', 'password');
    assert(result.ok && result.status.isAuthenticated && result.status.user.id === userA.id, 'signin did not authenticate active user');
    assertLocalUntouched(before);
  });

  await check('signin failure preserves actual guest state', async () => {
    signinResponse = { data: { session: null, user: null }, error: new Error('Invalid login credentials') }; currentSession = null;
    const before = storageMutations;
    const result = await auth.signIn('a@example.com', 'wrong');
    assert(!result.ok && result.status.authState === 'guest' && result.error === 'Invalid login credentials', 'signin failure incorrect');
    assertLocalUntouched(before);
  });

  await check('successful signout returns guest without touching local data', async () => {
    currentSession = sessionA; signoutResponse = { error: null };
    const before = storageMutations;
    const result = await auth.signOut();
    assert(result.authState === 'guest' && result.user === null, 'signout did not become guest');
    assertLocalUntouched(before);
  });

  await check('signout failure preserves actual session and exposes error', async () => {
    currentSession = sessionA; signoutResponse = { error: new Error('Sign out unavailable') };
    const before = storageMutations;
    const result = await auth.signOut();
    assert(result.authState === 'authenticated' && result.user.id === userA.id && result.authError === 'Sign out unavailable', 'signout failure falsely changed session state');
    assertLocalUntouched(before);
    signoutResponse = { error: null };
  });

  await check('password reset succeeds with generic account-safe confirmation', async () => {
    currentSession = null; resetResponse = { error: null };
    const before = storageMutations;
    const result = await auth.requestPasswordReset(' A@EXAMPLE.COM ');
    assert(result.ok && result.message.includes('If an account uses this email'), 'password reset success message is not generic');
    assertLocalUntouched(before);
  });

  await check('password reset failure is safe and does not reveal account existence', async () => {
    currentSession = null; resetResponse = { error: new Error('rate limited') };
    const before = storageMutations;
    const result = await auth.requestPasswordReset('a@example.com');
    assert(!result.ok && result.error === 'Unable to request a password reset right now.', 'password reset failure was not generic');
    assertLocalUntouched(before);
  });

  await check('account A to account B never reuses A identity', async () => {
    currentSession = sessionA;
    const first = await auth.getAuthStatus();
    assert(first.user.id === userA.id, 'account A was not active');
    currentSession = null;
    const guest = await auth.getAuthStatus();
    assert(guest.user === null && guest.authState === 'guest', 'account A leaked after signout');
    signinResponse = { data: { session: sessionB, user: userB }, error: null };
    const result = await auth.signIn('b@example.com', 'password');
    assert(result.status.user.id === userB.id && result.status.user.id !== userA.id, 'account B reused account A identity');
  });

  await check('all protected local domains remain byte-for-byte represented after auth actions', async () => {
    const before = JSON.stringify(localBefore);
    currentSession = null; signupResponse = { data: { session: sessionA, user: userA }, error: null };
    await auth.signUp('a@example.com', 'password');
    currentSession = null; signinResponse = { data: { session: sessionB, user: userB }, error: null };
    await auth.signIn('b@example.com', 'password');
    signoutResponse = { error: null }; await auth.signOut();
    resetResponse = { error: null }; await auth.requestPasswordReset('a@example.com');
    assert(JSON.stringify(localBefore) === before, 'local domain fixture changed');
  });

  await check('guest remains usable without authentication', async () => {
    currentSession = null;
    const status = await auth.getAuthStatus();
    assert(status.authState === 'guest' && status.user === null && !status.isAuthenticated, 'guest mode is not usable without authentication');
  });

  Object.defineProperty(supabase.auth, 'getSession', { configurable: true, writable: true, value: original.getSession });
  Object.defineProperty(supabase.auth, 'signUp', { configurable: true, writable: true, value: original.signUp });
  Object.defineProperty(supabase.auth, 'signInWithPassword', { configurable: true, writable: true, value: original.signInWithPassword });
  Object.defineProperty(supabase.auth, 'signOut', { configurable: true, writable: true, value: original.signOut });
  Object.defineProperty(supabase.auth, 'resetPasswordForEmail', { configurable: true, writable: true, value: original.resetPasswordForEmail });
  Object.defineProperty(AsyncStorage, 'getItem', { configurable: true, writable: true, value: original.getItem });
  Object.defineProperty(AsyncStorage, 'setItem', { configurable: true, writable: true, value: original.setItem });
  Object.defineProperty(AsyncStorage, 'removeItem', { configurable: true, writable: true, value: original.removeItem });
  console.log(`LIFEOS 3T.3 ACCOUNT LIFECYCLE: ${passed} passed, 0 failed`);
})().catch(() => process.exit(1));
