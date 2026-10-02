import { DomainError, toDomainError, isRetryableError } from '@/lib/domainError';
import { withRetry } from '@/lib/retryPolicy';

describe('reliability core', () => {
  test('normalizes common failures into retry-aware domain errors', () => {
    expect(toDomainError(new Error('Network request failed')).code).toBe('network');
    expect(isRetryableError(new Error('timeout'))).toBe(true);
    expect(toDomainError(new Error('Invalid persisted JSON')).code).toBe('corrupt_data');
    expect(new DomainError('Denied', 'permission').retryable).toBe(false);
  });

  test('central retry policy retries transient operations and succeeds', async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts += 1;
      if (attempts < 2) throw new Error('network unavailable');
      return 'ok';
    }, { attempts: 3, baseDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });
});
