export type AnalyticsRange = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsFreshness {
  generatedAt: string;
  sourceUpdatedAt?: string;
  stale: boolean;
}

export interface AnalyticsSourceRef {
  domain: string;
  recordIds: string[];
}

export interface AnalyticsMetric<T = number> {
  key: string;
  value: T;
  unit: string;
  range: AnalyticsDateRange;
  freshness: AnalyticsFreshness;
  sources?: AnalyticsSourceRef[];
}

export interface AnalyticsInsight {
  id: string;
  title: string;
  detail: string;
  reason: string;
  generatedAt: string;
  sourceRefs: AnalyticsSourceRef[];
  confidence?: number;
}
