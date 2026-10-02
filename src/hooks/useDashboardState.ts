import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { todayCivilDate, type CivilDate } from '@/lib/date';
import { getJeevyaDailyState } from '@/services/jeevyaIntegration';
import { buildDailyPlan } from '@/services/dailyPlan';
import { getBudgetSpending } from '@/services/finance';
import { getXPEvents } from '@/services/xp';
import { buildDashboardState } from '@/services/dashboard';
import { getPendingPaymentImports } from '@/services/paymentImports';
import { getDashboardCache, setDashboardCache } from '@/services/dashboardCache';
import type { DashboardState } from '@/types/dashboard';
import { profileSync } from '@/lib/performance';

export function useDashboardState(initialDate: CivilDate = todayCivilDate()) {
  const [date, setDate] = useState<CivilDate>(initialDate);
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const dateRef = useRef<CivilDate>(initialDate);
  const hasDataRef = useRef(false);

  const load = useCallback(async (nextDate?: CivilDate, force = false) => {
    const targetDate = nextDate ?? dateRef.current;
    const requestId = ++requestIdRef.current;

    if (!hasDataRef.current) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const month = targetDate.slice(0, 7);
      const cached = await getDashboardCache(targetDate);
      if (cached && requestId === requestIdRef.current && !force) {
        hasDataRef.current = true;
        dateRef.current = targetDate;
        setDate(targetDate);
        setData(cached);
        return cached;
      }
      const [dailyState, budgetResult, xpEvents, pendingImports] = await Promise.all([
        getJeevyaDailyState(targetDate),
        getBudgetSpending(month)
          .then((spending) => ({ spending, failed: false }))
          .catch(() => ({ spending: [], failed: true })),
        getXPEvents(),
        getPendingPaymentImports().catch(() => []),
      ]);

      const dailyPlan = buildDailyPlan(dailyState, budgetResult.spending);
      const dashboard = profileSync('dashboard:build', () =>
        buildDashboardState(dailyState, dailyPlan, xpEvents, pendingImports.length, budgetResult.spending),
      );

      if (budgetResult.failed && !dashboard.dataQuality.degradedDomains.includes('finance')) {
        dashboard.dataQuality.degradedDomains.push('finance');
      }

      if (requestId !== requestIdRef.current || !mountedRef.current) return dashboard;

      dateRef.current = targetDate;
      hasDataRef.current = true;
      setDate(targetDate);
      setData(dashboard);
      void setDashboardCache(targetDate, dashboard);
      return dashboard;
    } catch (cause) {
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      const message = cause instanceof Error ? cause.message : 'Failed to load dashboard';
      setError(message);
      throw cause;
    } finally {
      if (requestId === requestIdRef.current && mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load(initialDate);

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [initialDate, load]);

  useFocusEffect(
    useCallback(() => {
      if (hasDataRef.current) void load();
    }, [load]),
  );

  const refresh = useCallback(async () => load(undefined, true), [load]);

  const changeDate = useCallback((nextDate: CivilDate) => {
    void load(nextDate);
  }, [load]);

  return {
    date,
    data,
    loading,
    refreshing,
    error,
    load,
    refresh,
    setDate: changeDate,
  };
}
