export type LifeOSGlobalMetricType = 'count' | 'sum' | 'average' | 'rate' | 'ratio';

export type LifeOSGlobalPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type LifeOSGlobalGeographicLevel = 'global' | 'country' | 'region' | 'city';

export interface LifeOSGlobalMetric {
  metricName: string;
  metricType: LifeOSGlobalMetricType;
  period: LifeOSGlobalPeriod;
  periodStart: string;
  periodEnd: string;
  geographicLevel?: LifeOSGlobalGeographicLevel;
  geographicCode?: string;
  aggregateValue: number;
  aggregateCount: number;
  createdAt: string;
  updatedAt: string;
  dataVersion: number;
  schemaVersion: number;
}

export type LifeOSGlobalDataStatus = 'available' | 'unavailable' | 'empty' | 'auth_required' | 'invalid';

export type LifeOSGlobalComparisonStatus = 'available' | 'insufficient_data' | 'unavailable' | 'auth_required' | 'invalid' | 'incompatible';

export type LifeOSGlobalRankingBand = 'bottom' | 'lower' | 'middle' | 'upper' | 'top';

export type LifeOSGlobalChallengeStatus = 'upcoming' | 'active' | 'completed' | 'unavailable' | 'invalid';

export type LifeOSGlobalParticipationStatus = 'eligible' | 'unavailable' | 'insufficient_data' | 'auth_required' | 'invalid';

export interface LifeOSGlobalDataResult {
  status: LifeOSGlobalDataStatus;
  metrics: LifeOSGlobalMetric[];
  error: string | null;
}

export interface LifeOSGlobalMetricQuery {
  metricName?: string;
  metricType?: LifeOSGlobalMetricType;
  period?: LifeOSGlobalPeriod;
  periodStart?: string;
  periodEnd?: string;
  geographicLevel?: LifeOSGlobalGeographicLevel;
  geographicCode?: string;
}

export interface LifeOSGlobalMetricDefinition {
  metricName: string;
  metricType: LifeOSGlobalMetricType;
  unit: string;
  meaning: string;
  supportedPeriods: readonly LifeOSGlobalPeriod[];
  higherIsMeaningful?: boolean;
  lowerIsMeaningful?: boolean;
}

export type LifeOSGlobalComparisonKind = 'period' | 'geographic';

export interface LifeOSGlobalComparison {
  current: LifeOSGlobalMetric;
  previous: LifeOSGlobalMetric | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  kind?: LifeOSGlobalComparisonKind;
}

export type LifeOSGlobalTrend = 'up' | 'down' | 'unchanged' | 'insufficient_data';

export interface LifeOSGlobalComparisonResult {
  status: LifeOSGlobalComparisonStatus;
  comparison: LifeOSGlobalComparison | null;
  trend: LifeOSGlobalTrend;
  error: string | null;
}

export interface LifeOSGlobalRankingDistributionBand {
  band: LifeOSGlobalRankingBand;
  minimumValue: number;
  maximumValue: number;
  populationCount: number;
}

export interface LifeOSGlobalRankingDistribution {
  metricName: string;
  metricType: LifeOSGlobalMetricType;
  period: LifeOSGlobalPeriod;
  periodStart: string;
  periodEnd: string;
  geographicLevel?: LifeOSGlobalGeographicLevel;
  geographicCode?: string;
  totalPopulation: number;
  bands: readonly LifeOSGlobalRankingDistributionBand[];
  dataVersion: number;
  schemaVersion: number;
}

export interface LifeOSGlobalRankingBandResult {
  status: LifeOSGlobalComparisonStatus;
  band: LifeOSGlobalRankingBand | null;
  error: string | null;
}

export interface LifeOSGlobalChallenge {
  challengeId: string;
  title: string;
  description: string;
  metricName: string;
  metricType: LifeOSGlobalMetricType;
  targetValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  geographicLevel?: LifeOSGlobalGeographicLevel;
  geographicCode?: string;
  participantCount: number;
  completionCount: number;
  dataVersion: number;
  schemaVersion: number;
  status: LifeOSGlobalChallengeStatus;
}

export interface LifeOSGlobalCommunityAggregate {
  metricName: string;
  metricType: LifeOSGlobalMetricType;
  period: LifeOSGlobalPeriod;
  periodStart: string;
  periodEnd: string;
  totalParticipants: number;
  aggregateActivity: number;
  completionRate: number;
  aggregateTrend: LifeOSGlobalTrend;
  geographicLevel?: LifeOSGlobalGeographicLevel;
  geographicCode?: string;
  dataVersion: number;
  schemaVersion: number;
}

export interface LifeOSGlobalChallengeResult {
  status: LifeOSGlobalChallengeStatus;
  challenge: LifeOSGlobalChallenge | null;
  error: string | null;
}

export interface LifeOSGlobalParticipationResult {
  status: LifeOSGlobalParticipationStatus;
  error: string | null;
}

export const LIFEOS_GLOBAL_METRIC_FIELDS = [
  'metricName', 'metricType', 'period', 'periodStart', 'periodEnd',
  'geographicLevel', 'geographicCode', 'aggregateValue', 'aggregateCount',
  'createdAt', 'updatedAt', 'dataVersion', 'schemaVersion',
] as const;

export const LIFEOS_GLOBAL_SCHEMA_VERSION = 1;

export function isLifeOSGlobalMetric(value: unknown): value is LifeOSGlobalMetric {
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
