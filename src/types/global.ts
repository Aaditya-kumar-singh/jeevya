export type JeevyaGlobalMetricType = 'count' | 'sum' | 'average' | 'rate' | 'ratio';

export type JeevyaGlobalPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type JeevyaGlobalGeographicLevel = 'global' | 'country' | 'region' | 'city';

export interface JeevyaGlobalMetric {
  metricName: string;
  metricType: JeevyaGlobalMetricType;
  period: JeevyaGlobalPeriod;
  periodStart: string;
  periodEnd: string;
  geographicLevel?: JeevyaGlobalGeographicLevel;
  geographicCode?: string;
  aggregateValue: number;
  aggregateCount: number;
  createdAt: string;
  updatedAt: string;
  dataVersion: number;
  schemaVersion: number;
}

export type JeevyaGlobalDataStatus = 'available' | 'unavailable' | 'empty' | 'auth_required' | 'invalid';

export type JeevyaGlobalComparisonStatus = 'available' | 'insufficient_data' | 'unavailable' | 'auth_required' | 'invalid' | 'incompatible';

export type JeevyaGlobalRankingBand = 'bottom' | 'lower' | 'middle' | 'upper' | 'top';

export type JeevyaGlobalChallengeStatus = 'upcoming' | 'active' | 'completed' | 'unavailable' | 'invalid';

export type JeevyaGlobalParticipationStatus = 'eligible' | 'unavailable' | 'insufficient_data' | 'auth_required' | 'invalid';

export interface JeevyaGlobalDataResult {
  status: JeevyaGlobalDataStatus;
  metrics: JeevyaGlobalMetric[];
  error: string | null;
}

export interface JeevyaGlobalMetricQuery {
  metricName?: string;
  metricType?: JeevyaGlobalMetricType;
  period?: JeevyaGlobalPeriod;
  periodStart?: string;
  periodEnd?: string;
  geographicLevel?: JeevyaGlobalGeographicLevel;
  geographicCode?: string;
}

export interface JeevyaGlobalMetricDefinition {
  metricName: string;
  metricType: JeevyaGlobalMetricType;
  unit: string;
  meaning: string;
  supportedPeriods: readonly JeevyaGlobalPeriod[];
  higherIsMeaningful?: boolean;
  lowerIsMeaningful?: boolean;
}

export type JeevyaGlobalComparisonKind = 'period' | 'geographic';

export interface JeevyaGlobalComparison {
  current: JeevyaGlobalMetric;
  previous: JeevyaGlobalMetric | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  kind?: JeevyaGlobalComparisonKind;
}

export type JeevyaGlobalTrend = 'up' | 'down' | 'unchanged' | 'insufficient_data';

export interface JeevyaGlobalComparisonResult {
  status: JeevyaGlobalComparisonStatus;
  comparison: JeevyaGlobalComparison | null;
  trend: JeevyaGlobalTrend;
  error: string | null;
}

export interface JeevyaGlobalRankingDistributionBand {
  band: JeevyaGlobalRankingBand;
  minimumValue: number;
  maximumValue: number;
  populationCount: number;
}

export interface JeevyaGlobalRankingDistribution {
  metricName: string;
  metricType: JeevyaGlobalMetricType;
  period: JeevyaGlobalPeriod;
  periodStart: string;
  periodEnd: string;
  geographicLevel?: JeevyaGlobalGeographicLevel;
  geographicCode?: string;
  totalPopulation: number;
  bands: readonly JeevyaGlobalRankingDistributionBand[];
  dataVersion: number;
  schemaVersion: number;
}

export interface JeevyaGlobalRankingBandResult {
  status: JeevyaGlobalComparisonStatus;
  band: JeevyaGlobalRankingBand | null;
  error: string | null;
}

export interface JeevyaGlobalChallenge {
  challengeId: string;
  title: string;
  description: string;
  metricName: string;
  metricType: JeevyaGlobalMetricType;
  targetValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  geographicLevel?: JeevyaGlobalGeographicLevel;
  geographicCode?: string;
  participantCount: number;
  completionCount: number;
  dataVersion: number;
  schemaVersion: number;
  status: JeevyaGlobalChallengeStatus;
}

export interface JeevyaGlobalCommunityAggregate {
  metricName: string;
  metricType: JeevyaGlobalMetricType;
  period: JeevyaGlobalPeriod;
  periodStart: string;
  periodEnd: string;
  totalParticipants: number;
  aggregateActivity: number;
  completionRate: number;
  aggregateTrend: JeevyaGlobalTrend;
  geographicLevel?: JeevyaGlobalGeographicLevel;
  geographicCode?: string;
  dataVersion: number;
  schemaVersion: number;
}

export interface JeevyaGlobalChallengeResult {
  status: JeevyaGlobalChallengeStatus;
  challenge: JeevyaGlobalChallenge | null;
  error: string | null;
}

export interface JeevyaGlobalParticipationResult {
  status: JeevyaGlobalParticipationStatus;
  error: string | null;
}

export const JEEVYA_GLOBAL_METRIC_FIELDS = [
  'metricName', 'metricType', 'period', 'periodStart', 'periodEnd',
  'geographicLevel', 'geographicCode', 'aggregateValue', 'aggregateCount',
  'createdAt', 'updatedAt', 'dataVersion', 'schemaVersion',
] as const;

export const JEEVYA_GLOBAL_SCHEMA_VERSION = 1;

export function isJeevyaGlobalMetric(value: unknown): value is JeevyaGlobalMetric {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return typeof r.metricName === 'string' && typeof r.metricType === 'string' &&
    typeof r.period === 'string' && typeof r.periodStart === 'string' && typeof r.periodEnd === 'string' &&
    (r.geographicLevel === undefined || typeof r.geographicLevel === 'string') &&
    (r.geographicCode === undefined || typeof r.geographicCode === 'string') &&
    typeof r.aggregateValue === 'number' && Number.isFinite(r.aggregateValue) &&
    typeof r.aggregateCount === 'number' && Number.isFinite(r.aggregateCount) &&
    Number.isInteger(r.aggregateCount) && r.aggregateCount >= 5 &&
    typeof r.createdAt === 'string' && typeof r.updatedAt === 'string' &&
    typeof r.dataVersion === 'number' && Number.isInteger(r.dataVersion) && r.dataVersion >= 1 &&
    typeof r.schemaVersion === 'number' && Number.isInteger(r.schemaVersion) && r.schemaVersion >= 1;
}
