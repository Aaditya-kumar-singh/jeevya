// ─── Task Analytics Hook (Phase 1G-C) ─────────────────────────────────────────
// Local/offline only: derives every metric from the existing useTasks() data
// via pure helpers in lib/task-analytics. No new fetching, no new storage.

import { useMemo, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import {
  completionByLabel,
  completionByPriority,
  computeTaskAnalytics,
  dailyTrend,
  type AnalyticsPeriod,
} from '@/lib/task-analytics';
import { getTodayISO } from '@/types/tasks';

export function useTaskAnalytics() {
  const { tasks, labels, loading, refreshing, error, refresh } = useTasks();
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);

  const today = getTodayISO();

  const summary = useMemo(
    () => computeTaskAnalytics(tasks, period, today),
    [tasks, period, today],
  );

  const byPriority = useMemo(() => completionByPriority(tasks), [tasks]);

  const byLabel = useMemo(
    () => completionByLabel(tasks, labels),
    [tasks, labels],
  );

  const trend = useMemo(
    () => dailyTrend(tasks, period, today),
    [tasks, period, today],
  );

  // Any task data at all (including archived) — drives the empty state.
  const hasData = tasks.length > 0;

  return {
    period,
    setPeriod,
    summary,
    byPriority,
    byLabel,
    trend,
    hasData,
    loading,
    refreshing,
    error,
    refresh,
  };
}
