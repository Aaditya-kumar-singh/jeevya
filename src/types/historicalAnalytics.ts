import type { CivilDate } from '@/lib/date';

export type HistoricalAnalyticsPeriod = 7 | 30 | 90;
export type HistoricalAnalyticsDomain = 'tasks' | 'habits' | 'workout' | 'sleep' | 'recovery' | 'nutrition' | 'finance' | 'books' | 'journal' | 'goals';
export type HistoricalAnalyticsFilter = 'all' | 'tasks' | 'habits' | 'health' | 'nutrition' | 'finance' | 'books' | 'journal' | 'goals';
export type HistoricalTrend = 'up' | 'down' | 'stable' | 'insufficient_data';
export type HistoricalStatus = 'improving' | 'declining' | 'stable' | 'insufficient_data';
export type HistoricalInterpretation = 'positive' | 'negative' | 'neutral' | 'informational';

export interface HistoricalMetric {
  id: string;
  domain: HistoricalAnalyticsDomain;
  label: string;
  unit?: string;
  currentValue: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  percentagePointChange?: number | null;
  rawTrend: HistoricalTrend;
  trend: HistoricalTrend;
  status: HistoricalStatus;
  interpretation: HistoricalInterpretation;
  dataQuality: 'complete' | 'degraded' | 'insufficient_data';
  route?: string;
}

export interface HistoricalAnalyticsPeriodInfo {
  startDate: CivilDate;
  endDate: CivilDate;
  previousStartDate: CivilDate;
  previousEndDate: CivilDate;
}

export interface HistoricalAnalyticsResult {
  period: HistoricalAnalyticsPeriod;
  range: HistoricalAnalyticsPeriodInfo;
  filter: HistoricalAnalyticsFilter;
  metrics: HistoricalMetric[];
  degradedDomains: HistoricalAnalyticsDomain[];
  errors: Partial<Record<HistoricalAnalyticsDomain, string>>;
}

export interface HistoricalAnalyticsQuery {
  period?: HistoricalAnalyticsPeriod;
  endDate?: CivilDate;
  filter?: HistoricalAnalyticsFilter;
}
