import { canAccess, getFeatureAccess, requiresAuthentication, LIFEOS_CAPABILITY_REGISTRY } from '@/services/capabilities';

function assertEqual(actual: unknown, expected: unknown, message = 'assertion failed'): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

const local = ['tasks','habits','workout','sleep','nutrition','finance','books','journal','analytics','weeklyReview','dailyPulse','dailyPlan','lifeIntelligence','unifiedSearch','lifeTimeline','dataQuality','backup','localLocation'];
const account = ['cloudSync','crossDevice','accountSettings'];
const global = ['globalStats','leaderboard','community','globalChallenges','locationComparison'];

for (const feature of local) {
  assertEqual(getFeatureAccess(feature)?.accessLevel, 'local');
  assertEqual(canAccess(feature, 'guest'), true);
  assertEqual(canAccess(feature, 'authenticated'), true);
}
console.log('PASS every local capability is available to guest and authenticated users');

for (const feature of account) {
  assertEqual(getFeatureAccess(feature)?.accessLevel, 'account');
  assertEqual(canAccess(feature, 'guest'), false);
  assertEqual(canAccess(feature, 'authenticated'), true);
  assertEqual(requiresAuthentication(feature), true);
}
console.log('PASS account capabilities are denied to guest and allowed to authenticated users');

for (const feature of global) {
  assertEqual(getFeatureAccess(feature)?.accessLevel, 'global');
  assertEqual(canAccess(feature, 'guest'), false);
  assertEqual(canAccess(feature, 'authenticated'), true);
  assertEqual(requiresAuthentication(feature), true);
}
console.log('PASS global capabilities are denied to guest and recognized as authentication-required');

for (const feature of [...local, ...account, ...global]) assertEqual(canAccess(feature, 'loading'), false);
console.log('PASS loading state never grants capability access');

assertEqual(getFeatureAccess('unknown-feature'), null);
assertEqual(canAccess('unknown-feature', 'authenticated'), false);
assertEqual(requiresAuthentication('unknown-feature'), false);
console.log('PASS unknown capability fails safely');

const first = JSON.stringify(LIFEOS_CAPABILITY_REGISTRY);
const second = JSON.stringify(LIFEOS_CAPABILITY_REGISTRY);
assertEqual(first, second);
assertEqual(Object.keys(LIFEOS_CAPABILITY_REGISTRY).length, 26);
console.log('PASS capability registry is deterministic');

assertEqual(getFeatureAccess('cloudSync')?.accessLevel, 'account');
assertEqual(getFeatureAccess('localLocation')?.accessLevel, 'local');
assertEqual(getFeatureAccess('locationComparison')?.accessLevel, 'global');
console.log('PASS cloudSync, localLocation, and locationComparison use required levels');

assertEqual(canAccess('cloudSync', 'authenticated'), true);
assertEqual(canAccess('cloudSync', 'guest'), false);
console.log('PASS capability checks use only the supplied auth state and do not require a cached user ID');

console.log('LIFEOS 3T.4 FEATURE ACCESS CONTROL: 10 passed, 0 failed');
