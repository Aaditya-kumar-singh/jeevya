// Phase A1: Task storage unification tests.
// Run: npx tsx --import ./src/__tests__/mock-setup.ts src/__tests__/task-storage-a1.test.ts

import { loadData, saveData } from '@/lib/storage';
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  completeTask,
  migrateLegacyTasks,
  TASKS_KEY,
} from '@/services/tasks';
import { getTodayISO } from '@/types/tasks';

const LEGACY_TASKS_KEY = '@lifeos/tasks/v1';
const MIGRATION_KEY = 'lifeos:tasks:migration:v1';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function legacyTask(id: string, title: string, completed = false) {
  return {
    id,
    title,
    completed,
    priority: 'high',
    dueDate: 'Today · 9:00 AM',
    createdAt: '2026-09-01T10:00:00.000Z',
  };
}

async function reset() {
  await saveData(TASKS_KEY, []);
  await saveData(LEGACY_TASKS_KEY, []);
  await saveData(MIGRATION_KEY, null);
}

(async () => {
  let passed = 0;

  const check = async (name: string, fn: () => Promise<void> | void) => {
    await reset();
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  };

  await check('canonical storage is lifeos:tasks', async () => {
    const task = await createTask({ title: 'Canonical task' });
    const stored = await loadData<unknown>(TASKS_KEY, null);
    const legacy = await loadData<unknown>(LEGACY_TASKS_KEY, null);
    assert(Array.isArray(stored), 'canonical store should be an array');
    assert((stored as { id: string }[]).some((item) => item.id === task.id), 'task missing from canonical store');
    assert(Array.isArray(legacy) && legacy.length === 0, 'legacy store must not receive new writes');
  });

  await check('legacy data migrates into canonical storage', async () => {
    await saveData(LEGACY_TASKS_KEY, [legacyTask('legacy-1', 'Migrated task', true)]);
    const tasks = await getTasks();
    assert(tasks.length === 1, 'legacy task was not migrated');
    assert(tasks[0].id === 'legacy-1', 'wrong migrated ID');
    assert(tasks[0].title === 'Migrated task', 'wrong migrated title');
    assert(tasks[0].completed === true, 'completed state was lost');
    assert(tasks[0].description === '', 'missing description was not normalized');
    assert(tasks[0].subtasks.length === 0, 'missing subtasks were not normalized');
    assert(tasks[0].labelIds.length === 0, 'missing labels were not normalized');
  });

  await check('migration is idempotent', async () => {
    await saveData(LEGACY_TASKS_KEY, [legacyTask('legacy-1', 'Migrated task')]);
    await migrateLegacyTasks();
    await migrateLegacyTasks();
    const canonical = await loadData<{ id: string }[]>(TASKS_KEY, []);
    assert(canonical.filter((task) => task.id === 'legacy-1').length === 1, 'duplicate migration occurred');
    const marker = await loadData<{ version?: number } | null>(MIGRATION_KEY, null);
    assert(marker?.version === 1, 'migration marker missing');
  });

  await check('canonical data wins over legacy duplicate IDs', async () => {
    await saveData(TASKS_KEY, [{ ...legacyTask('same-id', 'Canonical title'), priority: 'low' }]);
    await saveData(LEGACY_TASKS_KEY, [legacyTask('same-id', 'Legacy title')]);
    const tasks = await getTasks();
    assert(tasks.length === 1, 'duplicate task remained');
    assert(tasks[0].title === 'Canonical title', 'legacy data overwrote canonical data');
    assert(tasks[0].priority === 'low', 'canonical fields were overwritten');
  });

  await check('duplicate IDs inside legacy data are imported once', async () => {
    await saveData(LEGACY_TASKS_KEY, [legacyTask('dup', 'First'), legacyTask('dup', 'Second')]);
    const tasks = await getTasks();
    assert(tasks.filter((task) => task.id === 'dup').length === 1, 'legacy duplicate was imported twice');
  });

  await check('CRUD works after migration', async () => {
    await saveData(LEGACY_TASKS_KEY, [legacyTask('legacy-crud', 'Legacy CRUD')]);
    await getTasks();
    const created = await createTask({ title: 'Created after migration', priority: 'medium' });
    const updated = await updateTask(created.id, { title: 'Updated after migration', completed: true });
    assert(updated?.completed === true, 'update failed after migration');
    assert((await getTasks()).some((task) => task.id === created.id && task.title === 'Updated after migration'), 'updated task missing');
    assert(await deleteTask(created.id), 'delete failed after migration');
    assert(!(await getTasks()).some((task) => task.id === created.id), 'deleted task still exists');
    assert((await getTasks()).some((task) => task.id === 'legacy-crud'), 'migrated task was lost during CRUD');
  });

  await check('recurrence behavior works after migration', async () => {
    await saveData(LEGACY_TASKS_KEY, [legacyTask('legacy-recur', 'Legacy recurring')]);
    await getTasks();
    const today = getTodayISO();
    const task = await createTask({
      title: 'Recurring after migration',
      dueDate: today,
      recurrence: {
        type: 'daily',
        interval: 1,
        startDate: today,
        endDate: null,
        weekdays: [],
      },
    });
    const result = await completeTask(task.id);
    assert(result.task?.completed === true, 'recurring task did not complete');
    assert(result.nextOccurrence !== null, 'next occurrence was not generated');
    assert(result.nextOccurrence?.seriesId === task.seriesId, 'series ID was not preserved');
    const stored = await getTasks();
    assert(stored.filter((item) => item.seriesId === task.seriesId).length === 2, 'recurrence created the wrong number of tasks');
  });

  await check('legacy storage remains read-only after migration', async () => {
    const legacy = [legacyTask('legacy-safe', 'Legacy safe')];
    await saveData(LEGACY_TASKS_KEY, legacy);
    await getTasks();
    const before = JSON.stringify(await loadData(LEGACY_TASKS_KEY, []));
    await createTask({ title: 'Canonical only' });
    const after = JSON.stringify(await loadData(LEGACY_TASKS_KEY, []));
    assert(before === after, 'migration modified legacy storage');
  });

  console.log(`TASK STORAGE A1: ${passed} passed, 0 failed`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
