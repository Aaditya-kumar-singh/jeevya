// JEEVYA 3V.2 focused Android widget integration tests.
import appConfig from '../../app.json';
import { saveData } from '@/lib/storage';
import {
  ANDROID_WIDGET_INSTANCE_STORAGE_KEY,
  getAndroidWidgetConfigurationId,
  getAndroidWidgetInstances,
  removeAndroidWidgetInstance,
  setAndroidWidgetConfiguration,
} from '@/services/androidWidgetInstances';
import { buildWidgetSnapshot } from '@/services/widgets';
import { WIDGET_ACTIONS, type WidgetConfiguration } from '@/types/widgets';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
      clear: () => { storage.clear(); },
      key: (index: number) => [...storage.keys()][index] ?? null,
      get length() { return storage.size; },
    },
  },
});

let total = 0; let passed = 0; let failed = 0;
function assert(ok: boolean, message: string) { total += 1; if (ok) { passed += 1; console.log(`PASS ${message}`); } else { failed += 1; console.log(`FAIL ${message}`); } }
function base(id: string, modules: WidgetConfiguration['modules']): WidgetConfiguration {
  const t = '2026-09-15T00:00:00.000Z';
  return { id, preset: 'custom', density: 'compact', modules, selectedMetrics: [], createdAt: t, updatedAt: t };
}

void (async () => {
  console.log('\n=== JEEVYA 3V.2 Android Widget ===');

  await saveData(ANDROID_WIDGET_INSTANCE_STORAGE_KEY, {});
  await setAndroidWidgetConfiguration(101, 'widget_a');
  await setAndroidWidgetConfiguration(202, 'widget_b');
  assert((await getAndroidWidgetConfigurationId(101)) === 'widget_a', 'widget instance 101 maps to its selected configuration');
  assert((await getAndroidWidgetConfigurationId(202)) === 'widget_b', 'widget instance 202 maps independently');
  const instances = await getAndroidWidgetInstances();
  assert(Object.keys(instances).length === 2, 'multiple widget instances coexist without overwriting each other');

  await removeAndroidWidgetInstance(101);
  assert((await getAndroidWidgetConfigurationId(101)) === null, 'deleting one launcher widget removes only its association');
  assert((await getAndroidWidgetConfigurationId(202)) === 'widget_b', 'deleting one widget preserves other instance associations');

  const plugin = (appConfig.expo.plugins as unknown[]).find((item) => Array.isArray(item) && item[0] === 'react-native-android-widget') as [string, { widgets: Record<string, unknown>[] }] | undefined;
  const widgetConfig = plugin?.[1]?.widgets?.[0];
  assert(!!widgetConfig && widgetConfig.name === 'JeevyaWidget', 'Android Jeevya widget is registered in Expo configuration');
  assert(widgetConfig?.widgetFeatures === 'reconfigurable', 'widget instances can be independently reconfigured');
  assert(widgetConfig?.resizeMode === 'horizontal|vertical', 'widget supports launcher resizing in both directions');
  assert(widgetConfig?.updatePeriodMillis === 1800000, 'system refresh interval is the Android-safe 30 minute minimum');
  assert(widgetConfig?.minWidth === '110dp' && widgetConfig?.minHeight === '70dp', 'small widget minimum size is configured');
  assert(widgetConfig?.maxResizeWidth === '330dp' && widgetConfig?.maxResizeHeight === '330dp', 'larger resizable widget bounds are configured');

  assert(WIDGET_ACTIONS.tasks.navigationTarget === '/tasks', 'Tasks deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.habits.navigationTarget === '/habits', 'Habits deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.workout.navigationTarget === '/health/workout', 'Workout deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.sleep.navigationTarget === '/health/sleep', 'Sleep deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.calories.navigationTarget === '/nutrition', 'Nutrition deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.finance_spending.navigationTarget === '/finance', 'Finance deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.finance_budget.navigationTarget === '/finance/budget', 'Budget deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.savings.navigationTarget === '/finance/savings-goals', 'Savings deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.books.navigationTarget === '/books', 'Books deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.goals.navigationTarget === '/goals', 'Goals deep-link metadata uses the existing route');
  assert(WIDGET_ACTIONS.life_intelligence.navigationTarget === '/insights', 'Life Intelligence deep-link metadata uses the existing route');

  const custom = base('widget_custom', ['protein', 'calories', 'fat']);
  custom.density = 'detailed';
  custom.selectedMetrics = ['protein'];
  await saveData('jeevya:widgets:configurations', [custom]);
  const snapshot = await buildWidgetSnapshot(custom, '2026-09-15', { authState: 'guest' });
  assert(snapshot.configurationId === 'widget_custom', 'Android widget consumes the shared 3V.1 snapshot identity');
  assert(snapshot.density === 'detailed', 'Android widget snapshot preserves configured density');
  assert(snapshot.modules.every((module) => module.module === 'protein'), 'selected metrics constrain the shared snapshot without recalculation');
  assert(snapshot.modules.every((module) => Object.values(module.values).every((value) => value !== null && value !== undefined)), 'missing values are never fabricated as null or undefined');

  const empty = base('widget_empty', ['tasks', 'habits', 'calories', 'protein', 'finance_spending', 'books', 'goals']);
  await saveData('jeevya:tasks', []);
  await saveData('jeevya:habits', []);
  await saveData('jeevya:habit-logs', []);
  await saveData('jeevya:nutrition:food-logs', []);
  await saveData('jeevya:finance:transactions', []);
  await saveData('jeevya:books', []);
  await saveData('jeevya:goals', []);
  const emptySnapshot = await buildWidgetSnapshot(empty, '2026-09-15', { authState: 'guest' });
  assert(emptySnapshot.modules.length === 0, 'missing domain data produces a safe empty widget state');
  assert(!JSON.stringify(emptySnapshot).includes('sync') && !JSON.stringify(emptySnapshot).includes('conflict'), 'widget snapshot contains no sync or conflict metadata');
  assert(!JSON.stringify(emptySnapshot).includes('token') && !JSON.stringify(emptySnapshot).includes('password'), 'widget snapshot contains no credential fields');

  const guest = await buildWidgetSnapshot(empty, '2026-09-15', { authState: 'guest' });
  const authenticated = await buildWidgetSnapshot(empty, '2026-09-15', { authState: 'authenticated' });
  assert(JSON.stringify(guest.modules) === JSON.stringify(authenticated.modules), 'guest/local projection remains capability-safe without auth-token exposure');

  console.log(`\n3V.2 Android widget tests: ${passed}/${total} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
})();
