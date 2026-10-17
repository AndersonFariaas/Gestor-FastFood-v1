interface Attempt {
  count: number;
  until: number;
}

/** Limitador em memória: após `max` falhas, bloqueia a chave por `windowMs`. */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const attempts = new Map<string, Attempt>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, a] of attempts) if (a.until < now) attempts.delete(key);
  }, windowMs).unref();

  return {
    isBlocked(key: string): boolean {
      const a = attempts.get(key);
      return a !== undefined && a.count >= max && a.until > Date.now();
    },
    fail(key: string): void {
      const a = attempts.get(key);
      const count = a && a.until > Date.now() ? a.count + 1 : 1;
      attempts.set(key, { count, until: Date.now() + windowMs });
    },
    reset(key: string): void {
      attempts.delete(key);
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
