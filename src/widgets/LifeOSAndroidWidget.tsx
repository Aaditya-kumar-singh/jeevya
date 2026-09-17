import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetModule, WidgetModuleSnapshot, WidgetSnapshot } from '@/types/widgets';

type WidgetSize = 'small' | 'medium' | 'large';

interface LifeOSAndroidWidgetProps {
  snapshot: WidgetSnapshot;
  width: number;
  height: number;
  dark?: boolean;
}

const MODULE_LABELS: Record<WidgetModule, string> = {
  tasks: 'Tasks',
  habits: 'Habits',
  workout: 'Workout',
  sleep: 'Sleep',
  recovery: 'Recovery',
  calories: 'Calories',
  protein: 'Protein',
  carbohydrates: 'Carbohydrates',
  fat: 'Fat',
  water: 'Water',
  finance_spending: 'Spending',
  finance_budget: 'Budget',
  savings: 'Savings',
  books: 'Books',
  goals: 'Goals',
  daily_pulse: 'Daily Pulse',
  daily_plan: 'Daily Plan',
  life_intelligence: 'Life Intelligence',
};

const VALUE_LABELS: Record<string, string> = {
  total: 'Total',
  dueToday: 'Due today',
  overdue: 'Overdue',
  completedToday: 'Completed today',
  scheduled: 'Scheduled',
  completionRate: 'Completion',
  active: 'Active',
  completedMinutes: 'Minutes',
  durationMinutes: 'Duration',
  quality: 'Quality',
  readinessScore: 'Readiness',
  readinessLevel: 'Level',
  calories: 'Calories',
  protein: 'Protein',
  carbohydrates: 'Carbs',
  fat: 'Fat',
  expenseToday: 'Today',
  transactionsToday: 'Transactions',
  totalBudget: 'Budget',
  totalSpent: 'Spent',
  remaining: 'Remaining',
  percentage: 'Progress',
  current: 'Current',
  target: 'Target',
  currentlyReading: 'Reading',
  activeToday: 'Active today',
  pending: 'Pending',
  completed: 'Completed',
  itemCount: 'Items',
  focusCount: 'Focus',
  progressCount: 'Progress',
  insightCount: 'Insights',
  warningCount: 'Warnings',
};

function getSize(width: number, height: number): WidgetSize {
  if (width >= 250 || height >= 180) return 'large';
  if (width >= 160 || height >= 110) return 'medium';
  return 'small';
}

function maxModules(size: WidgetSize, density: WidgetSnapshot['density']): number {
  if (size === 'large') return density === 'detailed' ? 10 : 8;
  if (size === 'medium') return density === 'detailed' ? 8 : 6;
  return density === 'detailed' ? 5 : 4;
}

function formatValue(key: string, value: number | string | boolean): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'completionRate' || key === 'percentage') return `${value}%`;
  if (key === 'durationMinutes' || key === 'completedMinutes') return `${value} min`;
  return String(value);
}

function formatModule(module: WidgetModuleSnapshot): string {
  const entries = Object.entries(module.values);
  return entries
    .map(([key, value]) => `${VALUE_LABELS[key] ?? key}: ${formatValue(key, value)}`)
    .join('  •  ');
}

function moduleText(module: WidgetModuleSnapshot): string {
  return `${MODULE_LABELS[module.module]}  ${formatModule(module)}`;
}

function renderWidget(snapshot: WidgetSnapshot, width: number, height: number, dark: boolean): React.JSX.Element {
  const size = getSize(width, height);
  const modules = snapshot.modules.slice(0, maxModules(size, snapshot.density));
  const background = dark ? '#12141F' : '#FFFFFF';
  const border = dark ? '#232840' : '#E2E3F0';
  const text = dark ? '#F1F5F9' : '#0F0F19';
  const secondary = dark ? '#94A3B8' : '#6B7280';
  const primary = dark ? '#00F5D4' : '#6366F1';
  const padding = size === 'small' ? 10 : 14;
  const titleSize = size === 'small' ? 14 : 16;
  const valueSize = snapshot.density === 'detailed' ? 12 : 11;

  const rows = modules.map((module) => (
    <FlexWidget
      key={module.module}
      style={{
        width: 'match_parent',
        paddingVertical: 5,
        paddingHorizontal: 2,
        borderBottomWidth: 1,
        borderBottomColor: border,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `personalityimprovement://${module.action.navigationTarget}` }}
      accessibilityLabel={module.action.label}
    >
      <TextWidget
        text={moduleText(module)}
        maxLines={snapshot.density === 'detailed' ? 2 : 1}
        truncate="END"
        style={{
          color: text,
          fontSize: valueSize,
          fontWeight: '500',
          width: 'match_parent',
        }}
      />
    </FlexWidget>
  ));

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        padding,
        backgroundColor: background,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: border,
        flexGap: 2,
      }}
      clickAction="OPEN_APP"
      accessibilityLabel="LifeOS widget"
    >
      <FlexWidget style={{ width: 'match_parent', paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget
          text={snapshot.title || 'LifeOS'}
          maxLines={1}
          truncate="END"
          style={{ color: text, fontSize: titleSize, fontWeight: '700' }}
        />
        <TextWidget
          text={snapshot.date}
          maxLines={1}
          style={{ color: secondary, fontSize: 9, textAlign: 'right' }}
        />
      </FlexWidget>
      {rows.length > 0 ? rows : (
        <FlexWidget style={{ width: 'match_parent', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget
            text={snapshot.degradedDomains.length ? 'Some data is unavailable' : 'No selected data available'}
            maxLines={2}
            truncate="END"
            style={{ color: secondary, fontSize: 11, textAlign: 'center' }}
          />
        </FlexWidget>
      )}
      {snapshot.degradedDomains.length > 0 && rows.length > 0 ? (
        <TextWidget
          text="Some data unavailable"
          maxLines={1}
          style={{ color: primary, fontSize: 9, fontWeight: '600', paddingTop: 2 }}
        />
      ) : null}
    </FlexWidget>
  );
}

export function LifeOSAndroidWidget({ snapshot, width, height, dark = false }: LifeOSAndroidWidgetProps) {
  return renderWidget(snapshot, width, height, dark);
}

export function renderLifeOSAndroidWidget(snapshot: WidgetSnapshot, width: number, height: number): { light: React.JSX.Element; dark: React.JSX.Element } {
  return {
    light: renderWidget(snapshot, width, height, false),
    dark: renderWidget(snapshot, width, height, true),
  };
}
