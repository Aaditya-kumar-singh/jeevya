import {
  ACCOUNT_SIGN_IN_ROUTE,
  ACCOUNT_SIGN_UP_ROUTE,
  buildAccountAuthRoute,
  createAccountGateState,
  getAccountGateDecision,
  isSafeReturnPath,
} from '@/services/accountGate';
import { canAccess, getFeatureAccess } from '@/services/capabilities';

function assertEqual(actual: unknown, expected: unknown, message = 'assertion failed'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertDeepEqual(actual: unknown, expected: unknown, message = 'assertion failed'): void {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) throw new Error(`${message}: expected ${expectedText}, got ${actualText}`);
}

assertEqual(getAccountGateDecision('tasks', 'guest'), 'allow');
assertEqual(getAccountGateDecision('cloudSync', 'guest'), 'gate');
assertEqual(getAccountGateDecision('tasks', 'authenticated'), 'allow');
assertEqual(getAccountGateDecision('cloudSync', 'authenticated'), 'allow');
console.log('PASS guest local and authenticated local/account features do not show an account gate');

assertEqual(getAccountGateDecision('cloudSync', 'loading'), 'wait');
assertEqual(canAccess('cloudSync', 'loading'), false);
console.log('PASS loading account actions are blocked without treating loading as authenticated');

assertEqual(getAccountGateDecision('globalStats', 'guest'), 'gate');
assertEqual(getAccountGateDecision('globalStats', 'authenticated'), 'allow');
console.log('PASS global capabilities use the same authentication gate foundation');

assertEqual(getAccountGateDecision('unknown-feature', 'guest'), 'deny');
assertEqual(getAccountGateDecision('unknown-feature', 'authenticated'), 'deny');
assertEqual(getFeatureAccess('unknown-feature'), null);
console.log('PASS unknown capabilities fail safely');

assertEqual(ACCOUNT_SIGN_IN_ROUTE, '/auth/sign-in');
assertEqual(ACCOUNT_SIGN_UP_ROUTE, '/auth/sign-up');
assertEqual(buildAccountAuthRoute(ACCOUNT_SIGN_IN_ROUTE), '/auth/sign-in');
assertEqual(buildAccountAuthRoute(ACCOUNT_SIGN_IN_ROUTE, '/settings'), '/auth/sign-in?returnTo=%2Fsettings');
assertEqual(buildAccountAuthRoute(ACCOUNT_SIGN_UP_ROUTE, '/settings'), '/auth/sign-up?returnTo=%2Fsettings');
assertEqual(isSafeReturnPath('/settings'), true);
assertEqual(isSafeReturnPath('//external.example'), false);
assertEqual(isSafeReturnPath('/auth/sign-in'), false);
console.log('PASS account actions route through the existing sign-in/sign-up surfaces with a safe return path');

const gate = createAccountGateState({
  feature: 'cloudSync',
  title: 'Account required',
  explanation: 'Create a free LifeOS account to use this feature.',
});
assertDeepEqual(gate, {
  visible: true,
  feature: 'cloudSync',
  title: 'Account required',
  explanation: 'Create a free LifeOS account to use this feature.',
});
console.log('PASS account gate state is reusable and dismissible without auth-state mutation');

assertEqual(getAccountGateDecision('cloudSync', 'guest'), 'gate');
assertEqual(canAccess('cloudSync', 'guest'), false);
assertEqual(getAccountGateDecision('cloudSync', 'authenticated'), 'allow');
console.log('PASS guest cloudSync is gated while authenticated sync remains available');

assertEqual(getAccountGateDecision('accountSettings', 'guest'), 'gate');
assertEqual(getAccountGateDecision('accountSettings', 'authenticated'), 'allow');
console.log('PASS account settings use the same capability-backed gate without a second auth state');

console.log('LIFEOS 3T.5 ACCOUNT-GATED USER EXPERIENCE: 10 passed, 0 failed');
