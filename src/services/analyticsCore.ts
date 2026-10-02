import { addDays, isValidCivilDate, type CivilDate } from '@/lib/date';
import type { AnalyticsDateRange, AnalyticsFreshness, AnalyticsInsight, AnalyticsMetric, AnalyticsSourceRef } from '@/types/analyticsCore';

export type StandardAnalyticsPeriod = 7 | 30 | 90 | 365;

export function averageFinite(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function safeRate(part: number, total: number, decimals = 0): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  const value = (Math.max(0, part) / total) * 100;
  const factor = 10 ** Math.max(0, decimals);
  return Math.round(value * factor) / factor;
}

export const ANALYTICS_METRIC_DEFINITIONS = {
  'tasks:completed': { unit: 'tasks', description: 'Tasks completed during the selected range.' },
  'tasks:created': { unit: 'tasks', description: 'Tasks created during the selected range.' },
  'habits:active-consistency': { unit: 'completions/active habit', description: 'Completed habit logs per active habit during the selected range.' },
  'workout:sets': { unit: 'sets', description: 'Completed exercise sets in completed workout sessions.' },
  'sleep:records': { unit: 'records', description: 'Sleep records with valid recorded duration.' },
  'nutrition:logged-days': { unit: 'days', description: 'Distinct calendar days containing valid nutrition logs.' },
  'finance:net-flow': { unit: 'currency', description: 'Income minus expenses; currency must be interpreted from the source account.' },
  'finance:transactions': { unit: 'transactions', description: 'Valid income and expense transactions in the selected range.' },
  'books:activity': { unit: 'entries', description: 'Persisted reading-progress entries in the selected range.' },
  'journal:active-days': { unit: 'days', description: 'Distinct calendar days containing journal entries.' },
  'goals:completed': { unit: 'goals', description: 'Goals completed during the selected range when completion history is available.' },
  'recovery:history': { unit: 'score', description: 'Historical recovery/readiness score; populated only when historical recovery records exist.' },
  'tasks:completion-rate': { unit: '%', description: 'Completed tasks divided by tasks with activity in the selected range.' },
  'tasks:overdue': { unit: 'tasks', description: 'Tasks whose due date fell in the selected range and were not completed by that due date.' },
  'habits:completions': { unit: 'completions', description: 'Completed habit logs in the selected range.' },
  'habits:completion-rate': { unit: '%', description: 'Completed habit logs divided by scheduled habit opportunities represented by active habits.' },
  'workout:sessions': { unit: 'sessions', description: 'Completed workout sessions.' },
  'workout:minutes': { unit: 'min', description: 'Completed workout duration in minutes.' },
  'sleep:average-duration': { unit: 'min/night', description: 'Average recorded sleep duration per sleep record.' },
  'nutrition:meals': { unit: 'meals', description: 'Nutrition log entries recorded in the selected range.' },
  'finance:income': { unit: 'currency', description: 'Income transaction amount. Currency must be interpreted from the source account.' },
  'finance:expenses': { unit: 'currency', description: 'Expense transaction amount. Currency must be interpreted from the source account.' },
  'books:completed': { unit: 'books', description: 'Books completed in the selected range.' },
  'books:pages': { unit: 'pages', description: 'Pages progressed according to persisted reading progress entries.' },
  'journal:entries': { unit: 'entries', description: 'Journal entries dated in the selected range.' },
} as const;

export function createAnalyticsRange(startDate: string, endDate: string): AnalyticsDateRange {
  const validDate = (value: string) => value.length === 10 && value[4] === '-' && value[7] === '-' && [...value].every((char, index) => index === 4 || index === 7 || (char >= '0' && char <= '9'));
  if (!validDate(startDate) || !validDate(endDate)) throw new Error('Analytics dates must use YYYY-MM-DD.');
  if (startDate > endDate) throw new Error('Analytics start date cannot be after end date.');
  return { startDate, endDate };
}

export function getStandardAnalyticsRange(endDate: CivilDate, period: StandardAnalyticsPeriod) {
  if (!isValidCivilDate(endDate) || !Number.isInteger(period) || period < 1) throw new Error('Invalid analytics range.');
  const startDate = addDays(endDate, -(period - 1));
  const previousEndDate = startDate ? addDays(startDate, -1) : null;
  const previousStartDate = previousEndDate ? addDays(previousEndDate, -(period - 1)) : null;
  if (!startDate || !previousEndDate || !previousStartDate) throw new Error('Unable to calculate analytics range.');
  return { ...createAnalyticsRange(startDate, endDate), previousStartDate, previousEndDate };
}

export function createFreshness(sourceUpdatedAt?: string, generatedAt = new Date().toISOString(), maxAgeMs = 24 * 60 * 60 * 1000): AnalyticsFreshness {
  const sourceTime = sourceUpdatedAt ? Date.parse(sourceUpdatedAt) : NaN;
  const generatedTime = Date.parse(generatedAt);
  const stale = Number.isFinite(sourceTime) && Number.isFinite(generatedTime) && generatedTime - sourceTime > Math.max(0, maxAgeMs);
  return { generatedAt, sourceUpdatedAt, stale };
}

export function createMetric<T>(key: string, value: T, unit: string, range: AnalyticsDateRange, options: { sourceUpdatedAt?: string; sources?: AnalyticsSourceRef[] } = {}): AnalyticsMetric<T> {
  return { key, value, unit, range, freshness: createFreshness(options.sourceUpdatedAt), sources: options.sources };
}

export function createInsight(
  id: string,
  title: string,
  detail: string,
  reason: string,
  sourceRefs: AnalyticsSourceRef[],
  confidence?: number,
): AnalyticsInsight {
  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new Error('Analytics insight reason is required.');
  return {
    id,
    title,
    detail,
    reason: normalizedReason,
    generatedAt: new Date().toISOString(),
    sourceRefs: uniqueSourceRefs(sourceRefs),
    ...(confidence === undefined ? {} : { confidence: Math.max(0, Math.min(1, confidence)) }),
  };
}

export function uniqueSourceRefs(refs: AnalyticsSourceRef[]): AnalyticsSourceRef[] {
  const grouped = new Map<string, Set<string>>();
  for (const ref of refs) {
    if (!ref.domain) continue;
    const ids = grouped.get(ref.domain) ?? new Set<string>();
    ref.recordIds.filter(Boolean).forEach((id) => ids.add(id));
    grouped.set(ref.domain, ids);
  }
  return [...grouped.entries()].map(([domain, recordIds]) => ({ domain, recordIds: [...recordIds] }));
}
