// Phase A5: persistence/repository foundation and Tasks pilot tests.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { taskRepository } from '@/services/repositories/tasks';
import { loadData, saveData } from '@/lib/storage';
import { createTask, getTasks, migrateLegacyTasks, updateTask } from '@/services/tasks';

const TASKS_KEY = 'lifeos:tasks';
const LEGACY_TASKS_KEY = '@lifeos/tasks/v1';
const MIGRATION_KEY = 'lifeos:tasks:migration:v1';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function reset(): Promise<void> {
  await AsyncStorage.clear();
}

(async () => {
  let passed = 0;
  const check = async (name: string, fn: () => Promise<void>) => {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  };

  await reset();

  await check('repository get returns fallback when missing', async () => {
    assert((await taskRepository.get([])).length === 0, 'missing repository value should use fallback');
  });

  await check('repository set/get round-trips serialized data', async () => {
    const value = [{ id: 'r1', title: 'Repository task' } as never];
    await taskRepository.set(value);
    const stored = await taskRepository.get([]);
    assert(stored[0]?.id === 'r1', 'repository round-trip failed');
  });

  await check('repository value survives a fresh repository instance', async () => {
    await taskRepository.set([{ id: 'reload-me' } as never]);
    const freshRepository = new (await import('@/lib/repository')).AsyncStorageRepository<unknown[]>(TASKS_KEY);
    const result = await freshRepository.get([]);
    assert((result[0] as { id?: string })?.id === 'reload-me', 'persisted value did not survive repository recreation');
  });

  await check('repository malformed data falls back safely', async () => {
    await AsyncStorage.setItem(TASKS_KEY, '{not-json');
    assert((await taskRepository.get([])).length === 0, 'malformed data should use fallback');
  });

  await check('repository remove clears persisted value', async () => {
    await taskRepository.set([{ id: 'remove-me' } as never]);
    await taskRepository.remove();
    assert((await taskRepository.get([])).length === 0, 'repository remove failed');
  });

  await check('repository concurrent writes preserve the final write', async () => {
    await Promise.all([
      taskRepository.set([{ id: 'first' } as never]),
      taskRepository.set([{ id: 'second' } as never]),
      taskRepository.set([{ id: 'third' } as never]),
    ]);
    const result = await taskRepository.get([]);
    assert(result[0]?.id === 'third', 'serialized writes did not preserve ordering');
  });

  await check('Tasks service still creates and updates through the repository', async () => {
    await reset();
    const created = await createTask({ title: 'A5 task' });
    const updated = await updateTask(created.id, { title: 'A5 updated' });
    assert(updated?.title === 'A5 updated', 'task update failed');
    assert((await getTasks()).some((task) => task.id === created.id), 'task persistence failed');
    assert((await loadData<unknown>(TASKS_KEY, null)) !== null, 'canonical key was not written');
  });

  await check('Tasks migration remains compatible', async () => {
    await reset();
    await saveData(LEGACY_TASKS_KEY, [{ id: 'legacy-a5', title: 'Legacy', completed: false }]);
    await migrateLegacyTasks();
    const tasks = await getTasks();
    assert(tasks.some((task) => task.id === 'legacy-a5'), 'legacy task did not migrate');
    const marker = await loadData<{ version?: number } | null>(MIGRATION_KEY, null);
    assert(marker?.version === 1, 'migration marker missing');
  });

  console.log(`TASK REPOSITORY A5: ${passed} passed, 0 failed`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
