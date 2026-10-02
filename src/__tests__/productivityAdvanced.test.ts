jest.mock('@/services/tasks', () => ({
  getTasks: jest.fn(),
  updateTask: jest.fn(),
}));
jest.mock('@/services/habits', () => ({
  getHabits: jest.fn(),
  getHabitLogs: jest.fn(),
  setHabitCompletion: jest.fn(),
}));

import { getTasks, updateTask } from '@/services/tasks';
import {
  setRecurrenceException,
  getRecurrenceExceptions,
  setCarryForwardRule,
  getCarryForwardRule,
  setTaskLinks,
  getTaskLinks,
  createHabitTemplate,
  getHabitTemplates,
  setHabitSkipWindow,
  isHabitSkipped,
  setHabitNote,
  getHabitNotes,
} from '@/services/productivityAdvanced';

const mockStore = new Map<string, unknown>();
jest.mock('@/lib/storage', () => ({
  loadData: jest.fn(async (key: string, fallback: unknown) => mockStore.has(key) ? mockStore.get(key) : fallback),
  saveData: jest.fn(async (key: string, value: unknown) => { mockStore.set(key, value); }),
}));

describe('advanced productivity infrastructure', () => {
  beforeEach(() => mockStore.clear());

  test('persists recurrence exceptions and carry-forward rules', async () => {
    await setRecurrenceException('task-1', { date: '2026-09-25', action: 'skip' });
    expect((await getRecurrenceExceptions('task-1'))[0].action).toBe('skip');
    await setCarryForwardRule('task-1', { enabled: true, maxDays: 45, preserveTime: true });
    expect(await getCarryForwardRule('task-1')).toEqual({ enabled: true, maxDays: 30, preserveTime: true });
  });

  test('persists task domain links', async () => {
    await setTaskLinks('task-1', ['goal-1', 'goal-1'], ['habit-1']);
    expect(await getTaskLinks('task-1')).toMatchObject({ goalIds: ['goal-1'], habitIds: ['habit-1'] });
  });

  test('persists reusable habit templates, skip windows and notes', async () => {
    const template = await createHabitTemplate({ name: 'Read', description: '', icon: 'book', color: '#fff', frequency: 'daily', days: [], targetCount: 20, reminderTime: null });
    expect((await getHabitTemplates())[0].id).toBe(template.id);
    await setHabitSkipWindow({ habitId: 'habit-1', startDate: '2026-09-25', endDate: '2026-09-27', reason: 'Vacation' });
    expect(await isHabitSkipped('habit-1', '2026-09-26')).toBe(true);
    await setHabitNote('habit-1', '2026-09-25', 'Travel day');
    expect((await getHabitNotes('habit-1'))[0].note).toBe('Travel day');
  });
});

