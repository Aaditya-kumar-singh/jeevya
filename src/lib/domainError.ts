export type DomainErrorCode =
  | 'validation'
  | 'storage'
  | 'network'
  | 'timeout'
  | 'conflict'
  | 'auth_required'
  | 'permission'
  | 'not_found'
  | 'corrupt_data'
  | 'unknown';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(message: string, code: DomainErrorCode = 'unknown', options?: { retryable?: boolean; cause?: unknown }) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.retryable = options?.retryable ?? ['network', 'timeout', 'storage'].includes(code);
    this.cause = options?.cause;
  }
}

export function toDomainError(error: unknown, fallback = 'Something went wrong.'): DomainError {
  if (error instanceof DomainError) return error;
  const message = error instanceof Error ? error.message : String(error ?? fallback);
  const lower = message.toLowerCase();
  if (/network|fetch|offline|connection/.test(lower)) return new DomainError(message, 'network', { cause: error });
  if (/timeout|timed out/.test(lower)) return new DomainError(message, 'timeout', { cause: error });
  if (/storage|asyncstorage|quota/.test(lower)) return new DomainError(message, 'storage', { cause: error });
  if (/permission|denied|unauthorized|forbidden/.test(lower)) return new DomainError(message, 'permission', { retryable: false, cause: error });
  if (/invalid|malformed|corrupt|parse/.test(lower)) return new DomainError(message, 'corrupt_data', { retryable: false, cause: error });
  return new DomainError(message || fallback, 'unknown', { cause: error });
}

export function isRetryableError(error: unknown): boolean {
  return toDomainError(error).retryable;
}
