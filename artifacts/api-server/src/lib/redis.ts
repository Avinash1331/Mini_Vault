
class InMemoryRedis {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();
  private rateLimitStore: Map<string, number[]> = new Map();

  set(key: string, value: string, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    });
  }

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  del(key: string): void {
    this.store.delete(key);
  }

  exists(key: string): boolean {
    return this.get(key) !== null;
  }

  checkRateLimit(key: string, maxCount: number, windowMs: number): { allowed: boolean; count: number } {
    const now = Date.now();
    const timestamps = (this.rateLimitStore.get(key) ?? []).filter(t => t > now - windowMs);
    if (timestamps.length >= maxCount) {
      this.rateLimitStore.set(key, timestamps);
      return { allowed: false, count: timestamps.length };
    }
    timestamps.push(now);
    this.rateLimitStore.set(key, timestamps);
    return { allowed: true, count: timestamps.length };
  }
}

export const redis = new InMemoryRedis();
