import { buildLifeInsights } from '@/services/lifeIntelligence';
import { validateAnalyticsMetricRegistry } from '@/services/advancedAnalyticsIntelligence';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';

function state(): JeevyaDailyState {
  return {
    date: '2026-09-24',
    tasks: { total: 2, dueToday: 1, overdue: 1, completedToday: 0, active: 2, overdueTasks: [{ id: 'task-1', title: 'Late task' }], incompleteDueTodayTasks: [{ id: 'task-2', title: 'Today task' }] },
    habits: { activeToday: 1, completedToday: 0, completionRate: 0, remainingToday: [{ id: 'habit-1', name: 'Habit' }], todayHabits: [{ id: 'habit-1', name: 'Habit', description: '', isCompleted: false }] },
    health: { activeWorkout: false, activeWorkoutId: null, completedWorkoutsToday: 0, completedWorkoutMinutes: 0, completedWorkoutIds: [], sleepRecordId: 'sleep-1', recoveryRecordId: undefined, sleep: { date: '2026-09-24', durationMinutes: 300, quality: 'fair' }, recovery: null },
    nutrition: { summary: { date: '2026-09-24', totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } } as never, targets: null, energy: {} as never, todayFoodLogIds: ['food-1'] },
    finance: { accountCount: 1, currencyBreakdown: { INR: 1000 }, transactionsToday: 1, incomeToday: 0, expenseToday: 100, todayTransactionIds: ['tx-1'] },
    books: { currentlyReading: 1, readingBooks: [{ id: 'book-1', title: 'Book', currentPage: 1, totalPages: 10 }] },
    journal: { entryCountToday: 1, hasEntryToday: true, latestEntry: { id: 'journal-1', title: 'Entry', mood: 'good', updatedAt: '2026-09-24T10:00:00Z' } },
    goals: [{ id: 'goal-1', status: 'behind' } as never],
    dataQuality: { degradedDomains: [] },
  };
}

describe('advanced intelligence', () => {
  it('links life insights to real source record IDs', () => {
    const insights = buildLifeInsights(state());
    const overdue = insights.find((item) => item.id === 'life-tasks-overdue');
    const finance = insights.find((item) => item.id === 'life-finance-active');
    expect(overdue?.sourceRefs).toEqual([{ domain: 'tasks', recordIds: ['task-1', 'task-2'] }]);
    expect(finance?.sourceRefs).toEqual([{ domain: 'finance', recordIds: ['tx-1'] }]);
  });

  it('has a complete metric registry', () => {
    const result = validateAnalyticsMetricRegistry([
      'tasks:completed','tasks:completion-rate','tasks:overdue','tasks:created','habits:completions','habits:completion-rate','habits:active-consistency',
      'workout:sessions','workout:minutes','workout:sets','sleep:average-duration','sleep:records','nutrition:logged-days','nutrition:meals',
      'finance:income','finance:expenses','finance:net-flow','finance:transactions','books:completed','books:pages','books:activity',
      'journal:entries','journal:active-days','goals:completed','recovery:history',
    ]);
    expect(result).toEqual({ valid: true, missing: [] });
  });
});
