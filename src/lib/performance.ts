const now = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
};

const enabled = process.env.NODE_ENV !== 'production';
const thresholdMs = 4;

export function profileSync<T>(label: string, work: () => T): T {
  if (!enabled) return work();
  const started = now();
  try {
    return work();
  } finally {
    const elapsed = now() - started;
    if (elapsed >= thresholdMs) console.info(`[Jeevya][perf] ${label}: ${elapsed.toFixed(1)}ms`);
  }
}

export async function profileAsync<T>(label: string, work: () => Promise<T>): Promise<T> {
  if (!enabled) return work();
  const started = now();
  try {
    return await work();
  } finally {
    const elapsed = now() - started;
    if (elapsed >= thresholdMs) console.info(`[Jeevya][perf] ${label}: ${elapsed.toFixed(1)}ms`);
  }
}
