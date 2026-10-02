import { toDomainError } from '@/lib/domainError';

export interface RetryPolicy {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_POLICY: Required<Omit<RetryPolicy, 'shouldRetry'>> = {
  attempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 4000,
  jitter: 0.2,
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(operation: () => Promise<T>, policy: RetryPolicy = {}): Promise<T> {
  const config = { ...DEFAULT_POLICY, ...policy };
  let lastError: unknown;
  for (let attempt = 1; attempt <= config.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const domainError = toDomainError(error);
      const allowed = config.shouldRetry?.(error, attempt) ?? domainError.retryable;
      if (!allowed || attempt >= config.attempts) throw error;
      const exponential = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** (attempt - 1));
      const jitter = exponential * config.jitter * Math.random();
      await sleep(exponential + jitter);
    }
  }
  throw lastError;
}
