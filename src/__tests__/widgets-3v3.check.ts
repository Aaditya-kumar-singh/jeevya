const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key), clear: () => storage.clear(), key: (index: number) => [...storage.keys()][index] ?? null, get length() { return storage.size; } } } });

import { saveData } from '@/lib/storage';
import { addHydration, getHydrationSummary, setHydrationGoal } from '@/services/hydration';
import { buildWidgetSnapshot } from '@/services/widgets';
import { updatePrivacySettings } from '@/services/privacyData';
import type { WidgetConfiguration } from '@/types/widgets';

function assert(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
  console.log('PASS', message);
}

const t = '2026-09-15T00:00:00.000Z';
const config = (modules: WidgetConfiguration['modules']): WidgetConfiguration => ({
  id: 'widget_3v3', preset: 'custom', density: 'detailed', modules, selectedMetrics: [], createdAt: t, updatedAt: t,
});

void (async () => {
  await saveData('jeevya:tasks', []);
  await saveData('jeevya:habits', []);
  await saveData('jeevya:habit-logs', []);
  await saveData('jeevya:nutrition:food-logs', []);
  await saveData('jeevya:finance:transactions', []);
  await saveData('jeevya:finance:payment-imports', [{ id: 'pending_1', status: 'new' }]);
  await saveData('jeevya:books', []);
  await saveData('jeevya:goals', []);
  await setHydrationGoal(2500);
  await saveData('jeevya:health:hydration-logs', []);

  const emptyWater = await buildWidgetSnapshot(config(['water']), '2026-09-15', { authState: 'guest' });
  assert(emptyWater.modules.length === 0, 'water widget stays empty when no hydration is actually logged');

  await addHydration(500, '2026-09-15');
  const hydration = await getHydrationSummary('2026-09-15');
  assert(hydration.amountMl === 500 && hydration.goalMl === 2500, 'hydration service persists today intake and goal');

  const water = await buildWidgetSnapshot(config(['water']), '2026-09-15', { authState: 'guest' });
  assert(water.modules[0]?.values.amountMl === 500, 'water widget exposes the real logged amount');
  assert(water.modules[0]?.values.percentage === 20, 'water widget calculates progress from persisted goal');

  await updatePrivacySettings({ widgetSensitiveData: false });
  const hiddenReview = await buildWidgetSnapshot(config(['finance_payment_review']), '2026-09-15', { authState: 'guest' });
  assert(hiddenReview.modules.length === 0, 'finance widgets stay hidden when sensitive widget data is disabled');
  await updatePrivacySettings({ widgetSensitiveData: true });
  const review = await buildWidgetSnapshot(config(['finance_payment_review']), '2026-09-15', { authState: 'guest' });
  assert(review.modules[0]?.values.pending === 1, 'payment review widget exposes real pending import count');
  assert(review.modules[0]?.action.navigationTarget === '/finance/import-payments', 'payment review widget deep-links to the review flow');

  console.log('3V.3 Android widget checks: PASS');
})().catch((error) => { console.error(error); process.exitCode = 1; });

