import { buildDashboardState } from '@/services/dashboard';
import type { DailyPlanModel } from '@/types/dailyPlan';
import type { JeevyaDailyState } from '@/types/jeevyaIntegration';
import { calculateDailyNutrition, calculateDailyEnergy } from '@/services/nutrition';

function makeState(overrides: Partial<JeevyaDailyState> = {}): JeevyaDailyState {
  return {
    date: '2026-09-24',
    tasks: {
      total: 4,
      dueToday: 2,
      overdue: 1,
      completedToday: 1,
      active: 4,
      overdueTasks: [{ id: 'task-1', title: 'Overdue task' }],
      incompleteDueTodayTasks: [{ id: 'task-2', title: 'Due task' }],
    },
    habits: {
      activeToday: 2,
      completedToday: 1,
      completionRate: 50,
      remainingToday: [{ id: 'habit-1', name: 'Read' }],
    },
    health: {
      activeWorkout: false,
      activeWorkoutId: null,
      completedWorkoutsToday: 0,
      completedWorkoutMinutes: 0,
      sleep: null,
      recovery: null,
    },
    nutrition: {
      summary: calculateDailyNutrition('2026-09-24', [], [], []),
      targets: null,
      energy: calculateDailyEnergy('2026-09-24', [], [], [], null, []),
    },
    finance: {
      accountCount: 1,
      currencyBreakdown: { INR: 1000 },
      transactionsToday: 1,
      incomeToday: 0,
      expenseToday: 200,
    },
    books: { currentlyReading: 1, readingBooks: [] },
    journal: { entryCountToday: 0, hasEntryToday: false, latestEntry: null },
    goals: [],
    dataQuality: { degradedDomains: [] },
    ...overrides,
  };
}

function makePlan(overrides: Partial<DailyPlanModel> = {}): DailyPlanModel {
  return {
    date: '2026-09-24',
    items: [{
      id: 'tasks:task:task-1:complete',
      source: 'tasks',
      sourceRecordId: 'task-1',
      title: 'Overdue task',
      description: 'Overdue task',
      priority: 'high',
      status: 'overdue',
      navigationTarget: '/tasks/task-1',
      actionType: 'complete_task',
      actionTargetId: 'task-1',
      actionLabel: 'Complete task',
    }],
    summary: { total: 1, pending: 0, overdue: 1, dueToday: 0, completed: 0, actionable: 1 },
    dataQuality: { degradedDomains: [] },
    ...overrides,
  };
}

describe('buildDashboardState', () => {
  it('maps real domain state without inventing values', () => {
    const dashboard = buildDashboardState(makeState(), makePlan());

    expect(dashboard.tasks.completedToday).toBe(1);
    expect(dashboard.tasks.overdue).toBe(1);
    expect(dashboard.habits.completedToday).toBe(1);
    expect(dashboard.finance.expenseToday).toBe(200);
    expect(dashboard.xp.totalXp).toBe(0);
    expect(dashboard.goalSnapshot.total).toBe(0);
    expect(dashboard.todayProgress.completed).toBe(2);
    expect(dashboard.todayProgress.total).toBe(4);
    expect(dashboard.todayProgress.percent).toBe(50);
    expect(dashboard.attention[0]?.id).toBe('plan:tasks:task:task-1:complete');
  });

  it('builds a real goal snapshot from configured goals', () => {
    const dashboard = buildDashboardState(makeState({ goals: [
      { id: 'books:1', title: 'Read', source: 'books', metric: 'books_completed', targetValue: 4, currentValue: 2, progressPercentage: 50, status: 'active' },
      { id: 'finance:1', title: 'Save', source: 'finance', metric: 'savings_amount', targetValue: 10000, currentValue: 2000, progressPercentage: 20, status: 'behind', endDate: '2026-10-01' },
      { id: 'books:2', title: 'Done', source: 'books', metric: 'pages_read', targetValue: 100, currentValue: 100, progressPercentage: 100, status: 'completed' },
    ] }), makePlan());

    expect(dashboard.goalSnapshot.total).toBe(3);
    expect(dashboard.goalSnapshot.active).toBe(1);
    expect(dashboard.goalSnapshot.behind).toBe(1);
    expect(dashboard.goalSnapshot.completed).toBe(1);
    expect(dashboard.goalSnapshot.averageProgressPercent).toBe(57);
    expect(dashboard.goalSnapshot.closestDeadline).toBe('2026-10-01');
    expect(dashboard.attention.some((item) => item.source === 'goals')).toBe(true);
  });

  it('merges degraded domains from the two existing aggregation layers', () => {
    const dashboard = buildDashboardState(
      makeState({ dataQuality: { degradedDomains: ['health'] } }),
      makePlan({ dataQuality: { degradedDomains: ['finance'] } }),
    );

    expect(dashboard.dataQuality.degradedDomains.sort()).toEqual(['finance', 'health']);
  });

  it('calculates task completion from the current dashboard task state', () => {
    const dashboard = buildDashboardState(
      makeState({
        tasks: {
          total: 10,
          dueToday: 4,
          overdue: 0,
          completedToday: 3,
          active: 10,
          overdueTasks: [],
          incompleteDueTodayTasks: [],
        },
      }),
      makePlan({ items: [], summary: { total: 0, pending: 0, overdue: 0, dueToday: 0, completed: 0, actionable: 0 } }),
    );

    expect(dashboard.tasks.completionPercent).toBe(30);
  });

  it('does not duplicate attention items', () => {
    const plan = makePlan({
      items: [
        makePlan().items[0],
        makePlan().items[0],
      ],
    });

    const dashboard = buildDashboardState(makeState(), plan);
    expect(dashboard.attention.filter((item) => item.id === 'plan:tasks:task:task-1:complete')).toHaveLength(1);
  });
});
