import { ANALYTICS_METRIC_DEFINITIONS, createAnalyticsRange, createFreshness, createInsight, createMetric, getStandardAnalyticsRange, uniqueSourceRefs } from '@/services/analyticsCore';
import { migrateSchema, parseVersionedDocument, versioned } from '@/services/schemaMigrations';

describe('shared analytics foundation', () => {
  it('normalizes date ranges and metrics', () => {
    const range = createAnalyticsRange('2026-09-01', '2026-09-07');
    const metric = createMetric('spend', 1200, 'INR', range);
    expect(metric.range).toEqual(range);
    expect(metric.value).toBe(1200);
    expect(metric.freshness.stale).toBe(false);
  });

  it('standardizes current and previous comparison ranges', () => {
    expect(getStandardAnalyticsRange('2026-09-24', 7)).toEqual({
      startDate: '2026-09-18',
      endDate: '2026-09-24',
      previousStartDate: '2026-09-11',
      previousEndDate: '2026-09-17',
    });
  });

  it('defines units centrally for shared metrics', () => {
    expect(ANALYTICS_METRIC_DEFINITIONS['workout:minutes'].unit).toBe('min');
    expect(ANALYTICS_METRIC_DEFINITIONS['tasks:completion-rate'].unit).toBe('%');
    expect(ANALYTICS_METRIC_DEFINITIONS['finance:expenses'].unit).toBe('currency');
  });
  it('tracks freshness and clamps insight confidence', () => {
    const freshness = createFreshness('2026-09-01T00:00:00.000Z', '2026-09-22T00:00:00.000Z', 24 * 60 * 60 * 1000);
    expect(freshness.stale).toBe(true);
    const insight = createInsight('i1', 'Test', 'Detail', 'Because the metric crossed the configured threshold.', [], 2);
    expect(insight.confidence).toBe(1);
    expect(insight.reason).toContain('configured threshold');
    expect(() => createInsight('i2', 'Test', 'Detail', '   ', [])).toThrow('reason is required');
  });

  it('deduplicates source references', () => {
    expect(uniqueSourceRefs([
      { domain: 'finance', recordIds: ['a', 'a', 'b'] },
      { domain: 'finance', recordIds: ['b', 'c'] },
    ])).toEqual([{ domain: 'finance', recordIds: ['a', 'b', 'c'] }]);
  });
});

describe('schema migrations', () => {
  it('migrates versioned data step by step', () => {
    const result = migrateSchema(versioned({ value: 1 }, 1), 3, {
      2: (data) => ({ ...data, value: data.value + 1 }),
      3: (data) => ({ ...data, value: data.value * 10 }),
    });
    expect(result).toEqual({ schemaVersion: 3, data: { value: 20 } });
  });

  it('rejects malformed versioned documents', () => {
    expect(() => parseVersionedDocument({ data: {} })).toThrow('schemaVersion');
  });
});
