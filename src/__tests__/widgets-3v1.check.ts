// JEEVYA 3V.1 focused tests.
import { saveData } from '@/lib/storage';
import { DEFAULT_WIDGET_CONFIGURATION, WIDGET_CONFIG_STORAGE_KEY, type WidgetConfiguration } from '@/types/widgets';
import { buildWidgetSnapshot, deleteWidgetConfiguration, getWidgetConfigurations, saveWidgetConfigurations, upsertWidgetConfiguration } from '@/services/widgets';

let total = 0; let passed = 0; let failed = 0;
function assert(ok: boolean, message: string) { total += 1; if (ok) { passed += 1; console.log(`PASS ${message}`); } else { failed += 1; console.log(`FAIL ${message}`); } }
function base(id: string, modules: WidgetConfiguration['modules']): WidgetConfiguration { const t = '2026-09-15T00:00:00.000Z'; return { id, preset: 'custom', density: 'compact', modules, selectedMetrics: [], createdAt: t, updatedAt: t }; }

void (async () => {
  console.log('\n=== JEEVYA 3V.1 Widget Foundation ===');
  await saveData(WIDGET_CONFIG_STORAGE_KEY, []);
  const defaults = await getWidgetConfigurations();
  assert(defaults.length === 1 && defaults[0].id === DEFAULT_WIDGET_CONFIGURATION.id, 'default widget configuration is available locally');
  assert(defaults[0].modules.join(',') === 'tasks,habits,daily_plan', 'default selects Tasks + Habits + Daily Plan');

  const custom = base('widget_a', ['protein', 'calories', 'fat']);
  const second = base('widget_b', ['goals', 'books', 'habits']);
  second.density = 'detailed'; second.title = 'Progress';
  await saveWidgetConfigurations([custom, second]);
  const stored = await getWidgetConfigurations();
  assert(stored.length === 2, 'multiple widget configurations persist independently');
  assert(stored[1].modules.join(',') === 'goals,books,habits', 'custom module ordering is preserved');
  assert(stored[1].density === 'detailed' && stored[1].title === 'Progress', 'density and optional title persist');

  const duplicate = { ...custom, modules: ['protein', 'protein', 'calories'] as WidgetConfiguration['modules'] };
  await upsertWidgetConfiguration(duplicate);
  const deduped = (await getWidgetConfigurations()).find((item) => item.id === 'widget_a');
  assert(deduped?.modules.length === 2, 'invalid duplicate modules are normalized without duplicate records');

  await saveData(WIDGET_CONFIG_STORAGE_KEY, [{ id: 'broken', modules: ['unknown'], preset: 'custom', density: 'compact' }]);
  const repaired = await getWidgetConfigurations();
  assert(repaired.length === 1 && repaired[0].id === DEFAULT_WIDGET_CONFIGURATION.id, 'malformed configuration falls back safely to default');

  await saveData(WIDGET_CONFIG_STORAGE_KEY, [base('widget_empty', ['calories', 'water'])]);
  const snapshot = await buildWidgetSnapshot(base('widget_empty', ['calories', 'water']), '2026-09-15', { authState: 'guest' });
  assert(snapshot.modules.every((item) => item.module !== 'water'), 'unsupported water module is omitted rather than fabricated');
  assert(snapshot.modules.every((item) => Object.values(item.values).every((value) => value !== null)), 'snapshot contains no null fabricated values');
  assert(snapshot.configurationId === 'widget_empty' && snapshot.date === '2026-09-15', 'snapshot identity is deterministic');

  await saveData(WIDGET_CONFIG_STORAGE_KEY, [base('widget_local', ['tasks'])]);
  const guestSnapshot = await buildWidgetSnapshot(base('widget_local', ['tasks']), '2026-09-15', { authState: 'guest' });
  assert(Array.isArray(guestSnapshot.modules), 'guest/local widget projection is allowed');
  const authSnapshot = await buildWidgetSnapshot(base('widget_local', ['tasks']), '2026-09-15', { authState: 'authenticated' });
  assert(JSON.stringify(guestSnapshot.modules) === JSON.stringify(authSnapshot.modules), 'local widget output does not depend on authentication');

  const invalid = base('invalid', ['tasks']);
  invalid.preset = 'invalid' as WidgetConfiguration['preset'];
  invalid.density = 'invalid' as WidgetConfiguration['density'];
  await saveWidgetConfigurations([invalid]);
  const normalized = (await getWidgetConfigurations())[0];
  assert(normalized.preset === 'custom' && normalized.density === 'compact', 'invalid preset and density values normalize safely');

  const privateBoundary = base('private', ['tasks', 'daily_pulse', 'daily_plan', 'life_intelligence']);
  await saveData(WIDGET_CONFIG_STORAGE_KEY, [privateBoundary]);
  const localBoundary = await buildWidgetSnapshot(privateBoundary, '2026-09-15', { authState: 'guest' });
  assert(localBoundary.modules.every((item) => !['globalStats', 'leaderboard', 'community', 'globalChallenges'].includes(item.module)), 'global/private modules are absent from the widget contract');
  assert(localBoundary.degradedDomains.every((domain) => domain !== 'sync' && domain !== 'conflicts'), 'sync and conflict metadata are never exposed in snapshots');

  const noDomainData = base('empty_domains', ['tasks', 'habits', 'workout', 'sleep', 'recovery', 'calories', 'protein', 'carbohydrates', 'fat', 'finance_spending', 'finance_budget', 'savings', 'books', 'goals']);
  await saveData('jeevya:tasks', []);
  await saveData('jeevya:habits', []);
  await saveData('jeevya:habit-logs', []);
  await saveData('jeevya:finance:accounts', []);
  await saveData('jeevya:finance:transactions', []);
  await saveData('jeevya:finance:budgets', []);
  await saveData('jeevya:finance:savings-goals', []);
  await saveData('jeevya:books', []);
  const emptySnapshot = await buildWidgetSnapshot(noDomainData, '2026-09-15', { authState: 'guest' });
  assert(emptySnapshot.modules.length === 0, 'missing domain data omits modules instead of fabricating zeros');

  const degraded = base('degraded', ['tasks']);
  window.localStorage.setItem('jeevya:tasks', 'not-json');
  const degradedSnapshot = await buildWidgetSnapshot(degraded, '2026-09-15', { authState: 'guest' });
  assert(degradedSnapshot.modules.length === 0 && degradedSnapshot.degradedDomains.includes('tasks'), 'degraded domain data produces a safe unavailable module state');
  await saveData('jeevya:tasks', []);

  const metricSelection = base('metric_selection', ['tasks']);
  metricSelection.selectedMetrics = ['dueToday'];
  const metricSnapshot = await buildWidgetSnapshot(metricSelection, '2026-09-15', { authState: 'guest' });
  assert(metricSnapshot.modules.every((item) => Object.keys(item.values).every((key) => key === 'dueToday')), 'selected metrics constrain the projected values safely');

  const deterministicA = await buildWidgetSnapshot(base('deterministic', ['tasks', 'habits']), '2026-09-15', { authState: 'guest' });
  const deterministicB = await buildWidgetSnapshot(base('deterministic', ['tasks', 'habits']), '2026-09-15', { authState: 'guest' });
  assert(JSON.stringify({ ...deterministicA, generatedAt: undefined }) === JSON.stringify({ ...deterministicB, generatedAt: undefined }), 'widget projection values and ordering are deterministic for the same state');
  await saveData(WIDGET_CONFIG_STORAGE_KEY, [degraded]);
  const deleted = await deleteWidgetConfiguration('degraded');
  assert(deleted.length === 1 && deleted[0].id === DEFAULT_WIDGET_CONFIGURATION.id, 'configuration deletion preserves a valid default');

  console.log(`\n=== RESULT: ${passed}/${total} passed, ${failed} failed ===`);
  if (failed) process.exitCode = 1;
})();




