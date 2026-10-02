import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DailyPulse from '@/components/dashboard/DailyPulse';
import DashboardAttention from '@/components/dashboard/DashboardAttention';
import DashboardCustomization from '@/components/dashboard/DashboardCustomization';
import WeeklyMomentum from '@/components/dashboard/WeeklyMomentum';
import PaymentReviewCard from '@/components/dashboard/PaymentReviewCard';
import FinanceSnapshot from '@/components/dashboard/FinanceSnapshot';
import HealthSnapshot from '@/components/dashboard/HealthSnapshot';
import HomeHeader from '@/components/dashboard/HomeHeader';
import QuickActions from '@/components/dashboard/QuickActions';
import TaskPreview from '@/components/dashboard/TaskPreview';
import TodaysProgress from '@/components/dashboard/TodaysProgress';
import XPLevelCard from '@/components/dashboard/XPLevelCard';
import GoalProgressSnapshot from '@/components/dashboard/GoalProgressSnapshot';
import FloatingActionMenu from '@/components/dashboard/FloatingActionMenu';
import { DashboardErrorState, DashboardSkeleton } from '@/components/dashboard/DashboardStateSurface';
import { HabitPreview } from '@/components/dashboard/HabitPreview';
import { FadeInView } from '@/components/motion/FadeInView';
import { HeroWave } from '@/components/visuals/HeroWave';
import { toggleHabitCompletion } from '@/services/habits';
import { awardXP } from '@/services/xp';
import { todayCivilDate } from '@/lib/date';
import { useTasks } from '@/hooks/useTasks';
import { useDashboardState } from '@/hooks/useDashboardState';
import { getDashboardPreferences, type DashboardCardId, type DashboardPreferences } from '@/services/dashboardPreferences';
import type { DailyPulseItem } from '@/services/dailyPulse';
import type { DailyPlanItem } from '@/types/dailyPlan';

export default function HomeScreen() {
  const { complete: completeTask } = useTasks();
  const { data: dashboard, loading: dashboardLoading, error: dashboardError, refresh: refreshDashboard } = useDashboardState();
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => { void getDashboardPreferences().then(setPreferences); }, []);

  const handleHabitComplete = useCallback(async (habitId: string) => {
    const date = todayCivilDate();
    const log = await toggleHabitCompletion(habitId, date);
    if (log.completed) await awardXP({ source: 'habit', sourceId: log.id, action: 'habit_completed', date });
    await refreshDashboard();
  }, [refreshDashboard]);

  const handlePulseAction = useCallback(async (item: DailyPulseItem) => {
    if (!item.actionTargetId) return;
    if (item.actionType === 'complete_task') { await completeTask(item.actionTargetId); await refreshDashboard(); return; }
    if (item.actionType === 'complete_habit') await handleHabitComplete(item.actionTargetId);
  }, [completeTask, handleHabitComplete, refreshDashboard]);

  const handleDailyPlanAction = useCallback(async (item: DailyPlanItem) => {
    if (item.actionType === 'complete_task' && item.actionTargetId) { await completeTask(item.actionTargetId); await refreshDashboard(); return; }
    if (item.actionType === 'complete_habit' && item.actionTargetId) { await handleHabitComplete(item.actionTargetId); return; }
    if (item.navigationTarget) router.push(item.navigationTarget as never);
  }, [completeTask, handleHabitComplete, refreshDashboard]);

  const cards = useMemo<Record<DashboardCardId, ReactNode>>(() => ({
    pulse: <DailyPulse model={dashboard?.dailyPulse ?? null} loading={dashboardLoading} error={dashboardError} onAction={handlePulseAction} plan={dashboard?.dailyPlan ?? null} onPlanAction={handleDailyPlanAction} />,
    attention: <DashboardAttention items={dashboard?.attention ?? []} />,
    progress: <TodaysProgress completed={dashboard?.todayProgress.completed ?? 0} total={dashboard?.todayProgress.total ?? 0} />,
    quickActions: <QuickActions />,
    habits: <HabitPreview habits={dashboard?.habits.todayHabits ?? []} onComplete={handleHabitComplete} />,
    tasks: <TaskPreview tasks={dashboard?.tasks.incompleteDueTodayTasks ?? []} completedToday={dashboard?.tasks.completedToday ?? 0} dueToday={dashboard?.tasks.dueToday ?? 0} onComplete={async (taskId) => { await completeTask(taskId); await refreshDashboard(); }} />,
    health: <HealthSnapshot sleep={dashboard?.healthSnapshot.sleep} water={dashboard?.healthSnapshot.water} workout={dashboard?.healthSnapshot.workout} />,
    goals: <GoalProgressSnapshot snapshot={dashboard?.goalSnapshot ?? { total: 0, active: 0, completed: 0, behind: 0, upcoming: 0, averageProgressPercent: null, closestDeadline: null }} />,
    finance: <View className="gap-3"><PaymentReviewCard count={dashboard?.financeSnapshot.importedPaymentReviewCount ?? 0} /><FinanceSnapshot spent={dashboard?.financeSnapshot.spent ?? 0} budgetRemaining={dashboard?.financeSnapshot.budgetRemaining ?? 0} importedPaymentReviewCount={dashboard?.financeSnapshot.importedPaymentReviewCount ?? 0} /></View>,
  }), [completeTask, dashboard, dashboardError, dashboardLoading, handleDailyPlanAction, handleHabitComplete, handlePulseAction, refreshDashboard]);

  const order = preferences?.order ?? ['pulse','attention','progress','quickActions','habits','tasks','health','goals','finance'];
  const hidden = new Set(preferences?.hidden ?? []);
  const topPadding = Math.max(insets.top + 12, 48);

  return (
    <View className="flex-1 bg-background relative">
      <DashboardCustomization onChange={setPreferences} />
      <ScrollView className="flex-1 bg-background">
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 }}><HeroWave width={500} height={220} /></View>
        <View className="gap-4 px-5 pb-24" style={{ zIndex: 1, paddingTop: topPadding }}>
          <FadeInView delay={0}><HomeHeader /></FadeInView>
          <FadeInView delay={30}><XPLevelCard progress={dashboard?.xp ?? null} /></FadeInView>
          {!dashboard && dashboardLoading ? <DashboardSkeleton /> : null}
          {!dashboard && dashboardError ? <DashboardErrorState message={dashboardError} onRetry={() => void refreshDashboard()} /> : null}
          {dashboard ? order.map((id, index) => hidden.has(id) ? null : (
            <FadeInView key={id} delay={60 + index * 50}>{cards[id]}</FadeInView>
          )) : null}
          {dashboard ? <FadeInView delay={550}><WeeklyMomentum {...dashboard.weeklyMomentum} /></FadeInView> : null}
        </View>
      </ScrollView>
      <FloatingActionMenu />
    </View>
  );
}
