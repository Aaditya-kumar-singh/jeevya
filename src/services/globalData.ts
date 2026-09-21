import { supabase } from '@/lib/supabase';
import type {
  JeevyaGlobalComparisonResult, JeevyaGlobalComparisonStatus, JeevyaGlobalDataResult, JeevyaGlobalMetric,
  JeevyaGlobalMetricDefinition, JeevyaGlobalMetricQuery, JeevyaGlobalMetricType, JeevyaGlobalPeriod,
  JeevyaGlobalRankingBand, JeevyaGlobalRankingBandResult, JeevyaGlobalRankingDistribution,
  JeevyaGlobalRankingDistributionBand, JeevyaGlobalChallenge, JeevyaGlobalChallengeStatus,
  JeevyaGlobalCommunityAggregate, JeevyaGlobalParticipationStatus, JeevyaGlobalTrend,
} from '@/types/global';

const GLOBAL_METRIC_COLUMNS = 'metric_name,metric_type,period,period_start,period_end,geographic_level,geographic_code,aggregate_value,aggregate_count,created_at,updated_at,data_version,schema_version';
const PERIODS: JeevyaGlobalPeriod[] = ['day', 'week', 'month', 'quarter', 'year'];
const TYPES: JeevyaGlobalMetricType[] = ['count', 'sum', 'average', 'rate', 'ratio'];
const GEOGRAPHIES = ['global', 'country', 'region', 'city'] as const;
const MIN_COHORT = 5;

// Only server-approved metrics belong here. No demonstration/sample production metrics are defined.
export const JEEVYA_GLOBAL_METRIC_DEFINITIONS: readonly JeevyaGlobalMetricDefinition[] = [];

const unavailable = (error: string): JeevyaGlobalDataResult => ({ status: 'unavailable', metrics: [], error });
const invalid = (error: string): JeevyaGlobalDataResult => ({ status: 'invalid', metrics: [], error });

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validQuery(query: JeevyaGlobalMetricQuery): boolean {
  if (query.metricName !== undefined && !JEEVYA_GLOBAL_METRIC_DEFINITIONS.some((d) => d.metricName === query.metricName)) return false;
  if (query.metricType !== undefined && !TYPES.includes(query.metricType)) return false;
  if (query.period !== undefined && !PERIODS.includes(query.period)) return false;
  if (query.periodStart !== undefined && !validDate(query.periodStart)) return false;
  if (query.periodEnd !== undefined && !validDate(query.periodEnd)) return false;
  if (query.periodStart && query.periodEnd && query.periodStart > query.periodEnd) return false;
  if (query.geographicLevel !== undefined && !GEOGRAPHIES.includes(query.geographicLevel)) return false;
  if (query.geographicCode !== undefined && (!query.geographicLevel || !query.geographicCode.trim())) return false;
  return true;
}

function isMetricShapeValid(metric: JeevyaGlobalMetric): boolean {
  return typeof metric.metricName === 'string' && TYPES.includes(metric.metricType) && PERIODS.includes(metric.period) &&
    validDate(metric.periodStart) && validDate(metric.periodEnd) && metric.periodEnd >= metric.periodStart &&
    (!metric.geographicLevel || GEOGRAPHIES.includes(metric.geographicLevel)) &&
    (!metric.geographicCode || !!metric.geographicLevel) && Number.isFinite(metric.aggregateValue) &&
    Number.isInteger(metric.aggregateCount) && metric.aggregateCount >= MIN_COHORT &&
    Number.isInteger(metric.dataVersion) && metric.dataVersion >= 1 && metric.schemaVersion === 1;
}

function mapMetric(row: unknown): JeevyaGlobalMetric | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.metric_name !== 'string' || !TYPES.includes(r.metric_type as JeevyaGlobalMetricType) ||
      !PERIODS.includes(r.period as JeevyaGlobalPeriod) || typeof r.period_start !== 'string' || !validDate(r.period_start) ||
      typeof r.period_end !== 'string' || !validDate(r.period_end) || r.period_end < r.period_start ||
      (r.geographic_level !== null && r.geographic_level !== undefined && !GEOGRAPHIES.includes(r.geographic_level as typeof GEOGRAPHIES[number])) ||
      (r.geographic_code !== null && r.geographic_code !== undefined && typeof r.geographic_code !== 'string') ||
      (r.geographic_code !== null && r.geographic_code !== undefined && r.geographic_level === null) ||
      typeof r.aggregate_value !== 'number' || !Number.isFinite(r.aggregate_value) ||
      typeof r.aggregate_count !== 'number' || !Number.isInteger(r.aggregate_count) || r.aggregate_count < MIN_COHORT ||
      typeof r.created_at !== 'string' || typeof r.updated_at !== 'string' ||
      typeof r.data_version !== 'number' || !Number.isInteger(r.data_version) || r.data_version < 1 ||
      typeof r.schema_version !== 'number' || !Number.isInteger(r.schema_version) || r.schema_version !== 1) return null;
  const definition = JEEVYA_GLOBAL_METRIC_DEFINITIONS.find((d) => d.metricName === r.metric_name && d.metricType === r.metric_type);
  if (!definition || !definition.supportedPeriods.includes(r.period as JeevyaGlobalPeriod)) return null;
  return {
    metricName: r.metric_name, metricType: r.metric_type as JeevyaGlobalMetricType,
    period: r.period as JeevyaGlobalPeriod, periodStart: r.period_start, periodEnd: r.period_end,
    ...(r.geographic_level ? { geographicLevel: r.geographic_level as JeevyaGlobalMetric['geographicLevel'] } : {}),
    ...(r.geographic_code ? { geographicCode: r.geographic_code } : {}),
    aggregateValue: r.aggregate_value, aggregateCount: r.aggregate_count,
    createdAt: r.created_at, updatedAt: r.updated_at, dataVersion: r.data_version, schemaVersion: r.schema_version,
  };
}

export async function readGlobalMetrics(query: JeevyaGlobalMetricQuery = {}): Promise<JeevyaGlobalDataResult> {
  if (!validQuery(query)) return invalid('Invalid global metric query.');
  let session;
  try { session = (await supabase.auth.getSession()).data.session; } catch { return unavailable('Global data is currently unavailable.'); }
  if (!session?.user?.id) return { status: 'auth_required', metrics: [], error: 'Global data requires an authenticated account.' };
  try {
    let request = supabase.from('jeevya_global_metrics').select(GLOBAL_METRIC_COLUMNS);
    if (query.metricName) request = request.eq('metric_name', query.metricName);
    if (query.metricType) request = request.eq('metric_type', query.metricType);
    if (query.period) request = request.eq('period', query.period);
    if (query.periodStart) request = request.gte('period_start', query.periodStart);
    if (query.periodEnd) request = request.lte('period_end', query.periodEnd);
    if (query.geographicLevel) request = request.eq('geographic_level', query.geographicLevel);
    if (query.geographicCode) request = request.eq('geographic_code', query.geographicCode);
    const { data, error } = await request.order('period_start', { ascending: true }).order('metric_name', { ascending: true }).order('geographic_level', { ascending: true, nullsFirst: true });
    if (error) return unavailable('Global data is currently unavailable.');
    const raw = Array.isArray(data) ? data : [];
    const metrics = raw.map(mapMetric);
    if (metrics.some((m) => m === null)) return invalid('Global data contained malformed or unapproved statistics.');
    return metrics.length ? { status: 'available', metrics: metrics as JeevyaGlobalMetric[], error: null } : { status: 'empty', metrics: [], error: null };
  } catch { return unavailable('Global data is currently unavailable.'); }
}

function previousEquivalentPeriod(metric: JeevyaGlobalMetric): { start: string; end: string } | null {
  const start = new Date(`${metric.periodStart}T00:00:00Z`);
  const end = new Date(`${metric.periodEnd}T00:00:00Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
  return { start: prevStart.toISOString().slice(0, 10), end: prevEnd.toISOString().slice(0, 10) };
}

const comparisonUnavailable = (status: JeevyaGlobalComparisonStatus, error: string | null = null): JeevyaGlobalComparisonResult => ({ status, comparison: null, trend: 'insufficient_data', error });
function sameMetricIdentity(left: JeevyaGlobalMetric, right: JeevyaGlobalMetric): boolean { return left.metricName === right.metricName && left.metricType === right.metricType && left.period === right.period; }
function sameGeography(left: JeevyaGlobalMetric, right: JeevyaGlobalMetric): boolean { return left.geographicLevel === right.geographicLevel && left.geographicCode === right.geographicCode; }
function compatibleGeographies(left: JeevyaGlobalMetric, right: JeevyaGlobalMetric): boolean { return sameGeography(left, right) || left.geographicLevel === 'global' || right.geographicLevel === 'global'; }
function buildComparison(current: JeevyaGlobalMetric, previous: JeevyaGlobalMetric, kind: 'period' | 'geographic'): JeevyaGlobalComparisonResult {
  const absoluteChange = current.aggregateValue - previous.aggregateValue;
  const percentageChange = previous.aggregateValue === 0 ? null : (absoluteChange / Math.abs(previous.aggregateValue)) * 100;
  const trend: JeevyaGlobalTrend = absoluteChange > 0 ? 'up' : absoluteChange < 0 ? 'down' : 'unchanged';
  return { status: 'available', comparison: { current, previous, absoluteChange, percentageChange, kind }, trend, error: null };
}

export async function compareGlobalMetric(metric: JeevyaGlobalMetric, previous: JeevyaGlobalMetric | null): Promise<JeevyaGlobalComparisonResult> {
  if (!isMetricShapeValid(metric)) return { status: 'invalid', comparison: null, trend: 'insufficient_data', error: 'Invalid current global metric.' };
  if (!previous) return { status: 'insufficient_data', comparison: { current: metric, previous: null, absoluteChange: null, percentageChange: null }, trend: 'insufficient_data', error: null };
  if (previous.metricName !== metric.metricName || previous.metricType !== metric.metricType || previous.geographicLevel !== metric.geographicLevel || previous.geographicCode !== metric.geographicCode) return { status: 'incompatible', comparison: null, trend: 'insufficient_data', error: 'Incompatible comparison metric.' };
  return buildComparison(metric, previous, 'period');
}

export function compareGlobalPeriods(current: JeevyaGlobalMetric, previous: JeevyaGlobalMetric | null): JeevyaGlobalComparisonResult {
  if (!isMetricShapeValid(current)) return comparisonUnavailable('invalid', 'Invalid current global metric.');
  if (!previous) return comparisonUnavailable('insufficient_data');
  if (!isMetricShapeValid(previous)) return comparisonUnavailable('invalid', 'Invalid previous global metric.');
  if (!sameMetricIdentity(current, previous) || !sameGeography(current, previous)) return comparisonUnavailable('incompatible', 'Incompatible period comparison metric.');
  const expectedPrevious = previousEquivalentPeriod(current);
  if (!expectedPrevious || previous.periodStart !== expectedPrevious.start || previous.periodEnd !== expectedPrevious.end) return comparisonUnavailable('incompatible', 'Comparison periods are not equivalent.');
  return buildComparison(current, previous, 'period');
}

export function compareGlobalAggregates(current: JeevyaGlobalMetric, reference: JeevyaGlobalMetric | null): JeevyaGlobalComparisonResult {
  if (!isMetricShapeValid(current)) return comparisonUnavailable('invalid', 'Invalid current global metric.');
  if (!reference) return comparisonUnavailable('insufficient_data');
  if (!isMetricShapeValid(reference)) return comparisonUnavailable('invalid', 'Invalid reference global metric.');
  if (!sameMetricIdentity(current, reference) || current.periodStart !== reference.periodStart || current.periodEnd !== reference.periodEnd) return comparisonUnavailable('incompatible', 'Metric, type, period, or date range is incompatible.');
  if (!compatibleGeographies(current, reference)) return comparisonUnavailable('incompatible', 'Geographic levels are incompatible.');
  return buildComparison(current, reference, 'geographic');
}

function validRankingBand(band: unknown): band is JeevyaGlobalRankingBand { return band === 'bottom' || band === 'lower' || band === 'middle' || band === 'upper' || band === 'top'; }
function validateRankingDistribution(distribution: JeevyaGlobalRankingDistribution): JeevyaGlobalRankingDistributionBand[] | null {
  if (!distribution || !validDate(distribution.periodStart) || !validDate(distribution.periodEnd) || distribution.periodEnd < distribution.periodStart ||
      !GEOGRAPHIES.includes((distribution.geographicLevel ?? 'global') as typeof GEOGRAPHIES[number]) ||
      (distribution.geographicCode !== undefined && (!distribution.geographicLevel || !distribution.geographicCode.trim())) ||
      !Number.isInteger(distribution.totalPopulation) || distribution.totalPopulation < MIN_COHORT || !Number.isInteger(distribution.dataVersion) || distribution.dataVersion < 1 || distribution.schemaVersion !== 1 ||
      !TYPES.includes(distribution.metricType) || !PERIODS.includes(distribution.period)) return null;
  const ordered = [...distribution.bands];
  const expected: JeevyaGlobalRankingBand[] = ['bottom', 'lower', 'middle', 'upper', 'top'];
  if (ordered.length !== expected.length) return null;
  ordered.sort((a, b) => expected.indexOf(a.band) - expected.indexOf(b.band));
  let total = 0; let previousMaximum: number | null = null;
  for (let index = 0; index < ordered.length; index += 1) {
    const band = ordered[index];
    if (band.band !== expected[index] || !validRankingBand(band.band) || !Number.isFinite(band.minimumValue) || !Number.isFinite(band.maximumValue) || band.minimumValue > band.maximumValue || !Number.isInteger(band.populationCount) || band.populationCount < 1 || (previousMaximum !== null && band.minimumValue <= previousMaximum)) return null;
    total += band.populationCount; previousMaximum = band.maximumValue;
  }
  return total === distribution.totalPopulation ? ordered : null;
}

export function calculateGlobalRankingBand(value: JeevyaGlobalMetric, distribution: JeevyaGlobalRankingDistribution | null): JeevyaGlobalRankingBandResult {
  if (!isMetricShapeValid(value)) return { status: 'invalid', band: null, error: 'Invalid aggregate value.' };
  if (!distribution) return { status: 'insufficient_data', band: null, error: null };
  const bands = validateRankingDistribution(distribution);
  if (!bands) return { status: 'invalid', band: null, error: 'Invalid or insufficient population distribution.' };
  if (value.metricName !== distribution.metricName || value.metricType !== distribution.metricType || value.period !== distribution.period || value.periodStart !== distribution.periodStart || value.periodEnd !== distribution.periodEnd || value.geographicLevel !== distribution.geographicLevel || value.geographicCode !== distribution.geographicCode) return { status: 'incompatible', band: null, error: 'Ranking distribution is incompatible with the aggregate metric.' };
  const match = bands.find((band) => value.aggregateValue >= band.minimumValue && value.aggregateValue <= band.maximumValue);
  return match ? { status: 'available', band: match.band, error: null } : { status: 'insufficient_data', band: null, error: null };
}

function validChallengeText(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function validCount(value: unknown, allowZero = false): value is number { return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value) && (allowZero ? value >= 0 : value >= MIN_COHORT); }
function validChallengeStatus(status: unknown): status is JeevyaGlobalChallengeStatus { return status === 'upcoming' || status === 'active' || status === 'completed' || status === 'unavailable' || status === 'invalid'; }
function validGlobalChallengeShape(challenge: JeevyaGlobalChallenge): boolean {
  return !!challenge && validChallengeText(challenge.challengeId) && validChallengeText(challenge.title) && typeof challenge.description === 'string' &&
    validChallengeText(challenge.metricName) && TYPES.includes(challenge.metricType) && Number.isFinite(challenge.targetValue) && validChallengeText(challenge.unit) &&
    validDate(challenge.startDate) && validDate(challenge.endDate) && challenge.endDate >= challenge.startDate &&
    GEOGRAPHIES.includes((challenge.geographicLevel ?? 'global') as typeof GEOGRAPHIES[number]) &&
    (challenge.geographicCode === undefined || (!!challenge.geographicLevel && challenge.geographicLevel !== 'global' && validChallengeText(challenge.geographicCode))) &&
    validCount(challenge.participantCount, true) && validCount(challenge.completionCount, true) && challenge.completionCount <= challenge.participantCount &&
    (challenge.participantCount === 0 || challenge.participantCount >= MIN_COHORT) && Number.isInteger(challenge.dataVersion) && challenge.dataVersion >= 1 &&
    challenge.schemaVersion === 1 && validChallengeStatus(challenge.status);
}

export function getGlobalChallengeLifecycle(challenge: JeevyaGlobalChallenge, today: string): JeevyaGlobalChallengeStatus {
  if (!validGlobalChallengeShape(challenge) || !validDate(today)) return 'invalid';
  if (today < challenge.startDate) return 'upcoming';
  if (today > challenge.endDate) return 'completed';
  return 'active';
}
export function validateGlobalChallenge(challenge: JeevyaGlobalChallenge): boolean { return validGlobalChallengeShape(challenge); }
export function isGlobalChallengeMetricCompatible(challenge: JeevyaGlobalChallenge, metric: JeevyaGlobalMetric): boolean {
  return validateGlobalChallenge(challenge) && isMetricShapeValid(metric) && challenge.metricName === metric.metricName && challenge.metricType === metric.metricType && metric.periodStart >= challenge.startDate && metric.periodEnd <= challenge.endDate;
}
export function validateGlobalCommunityAggregate(aggregate: JeevyaGlobalCommunityAggregate): boolean {
  return !!aggregate && validChallengeText(aggregate.metricName) && TYPES.includes(aggregate.metricType) && PERIODS.includes(aggregate.period) && validDate(aggregate.periodStart) && validDate(aggregate.periodEnd) && aggregate.periodEnd >= aggregate.periodStart && GEOGRAPHIES.includes((aggregate.geographicLevel ?? 'global') as typeof GEOGRAPHIES[number]) && (aggregate.geographicCode === undefined || (!!aggregate.geographicLevel && aggregate.geographicLevel !== 'global' && validChallengeText(aggregate.geographicCode))) && validCount(aggregate.totalParticipants) && Number.isFinite(aggregate.aggregateActivity) && Number.isFinite(aggregate.completionRate) && aggregate.completionRate >= 0 && aggregate.completionRate <= 1 && (aggregate.aggregateTrend === 'up' || aggregate.aggregateTrend === 'down' || aggregate.aggregateTrend === 'unchanged' || aggregate.aggregateTrend === 'insufficient_data') && Number.isInteger(aggregate.dataVersion) && aggregate.dataVersion >= 1 && aggregate.schemaVersion === 1;
}
export async function getGlobalParticipationStatus(challenge: JeevyaGlobalChallenge): Promise<JeevyaGlobalParticipationStatus> {
  if (!validateGlobalChallenge(challenge)) return 'invalid';
  try { const session = (await supabase.auth.getSession()).data.session; if (!session?.user?.id) return 'auth_required'; } catch { return 'unavailable'; }
  if (challenge.status !== 'active') return 'insufficient_data';
  if (challenge.participantCount < MIN_COHORT) return 'insufficient_data';
  return 'eligible';
}

export { previousEquivalentPeriod };
