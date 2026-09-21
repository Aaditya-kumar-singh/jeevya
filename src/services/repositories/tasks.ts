import { createAsyncStorageRepository, type Repository } from '@/lib/repository';
import type { Task } from '@/types/tasks';

export const TASKS_REPOSITORY_KEY = 'jeevya:tasks';

export type TaskRepository = Repository<Task[]>;

export const taskRepository: TaskRepository = createAsyncStorageRepository<Task[]>(TASKS_REPOSITORY_KEY);
