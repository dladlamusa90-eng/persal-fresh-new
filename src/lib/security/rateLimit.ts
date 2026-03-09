type Bucket = {
  count: number;
  windowStartedAt: number;
};

type Lockout = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const buckets = new Map<string, Bucket>();
const lockouts = new Map<string, Lockout>();

function now() {
  return Date.now();
}

export function takeRateLimitToken(key: string, windowMs: number, maxRequests: number) {
  const current = now();
  const existing = buckets.get(key);

  if (!existing || current - existing.windowStartedAt > windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: current });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= maxRequests) {
    const retryAfterMs = Math.max(0, windowMs - (current - existing.windowStartedAt));
    return { allowed: false, retryAfterMs };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function isAuthLocked(key: string) {
  const current = now();
  const existing = lockouts.get(key);
  if (!existing) return { locked: false, retryAfterMs: 0 };

  if (existing.blockedUntil > current) {
    return { locked: true, retryAfterMs: existing.blockedUntil - current };
  }

  if (current - existing.windowStartedAt > 15 * 60 * 1000) {
    lockouts.delete(key);
    return { locked: false, retryAfterMs: 0 };
  }

  return { locked: false, retryAfterMs: 0 };
}

export function registerAuthFailure(
  key: string,
  maxFailures = 5,
  lockMs = 15 * 60 * 1000,
  windowMs = 15 * 60 * 1000
) {
  const current = now();
  const existing = lockouts.get(key);

  if (!existing || current - existing.windowStartedAt > windowMs) {
    lockouts.set(key, {
      failures: 1,
      windowStartedAt: current,
      blockedUntil: 0,
    });
    return;
  }

  existing.failures += 1;
  if (existing.failures >= maxFailures) {
    existing.blockedUntil = current + lockMs;
  }
}

export function clearAuthFailures(key: string) {
  lockouts.delete(key);
}
