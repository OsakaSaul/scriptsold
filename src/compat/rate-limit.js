// Simple in-memory per-IP rate limiter.
// IMPORTANT: this is per server instance (per Cloudflare isolate / Node process).
// Across a horizontally scaled deployment each instance tracks its own counts,
// so the effective limit is limit * instance_count. Document this in the README.
//
// Usage:
//   const limiter = new RateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 });
//   const result = limiter.check(ip);
//   if (!result.ok) return 429 with Retry-After: result.retryAfter

export class RateLimiter {
  /**
   * @param {{ limit: number, windowMs: number }} opts
   *   limit    - max requests per window
   *   windowMs - window length in milliseconds
   */
  constructor({ limit = 30, windowMs = 10 * 60 * 1000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    // Map<ip, Array<timestamp>>
    this._hits = new Map();
  }

  /**
   * Check and record a request from `ip`.
   * @returns {{ ok: boolean, retryAfter: number }} retryAfter in seconds
   */
  check(ip, now = Date.now()) {
    const cutoff = now - this.windowMs;
    let hits = this._hits.get(ip) || [];
    // Drop expired entries
    hits = hits.filter((t) => t > cutoff);
    if (hits.length >= this.limit) {
      // Time until the oldest hit falls out of the window
      const retryAfter = Math.ceil((hits[0] + this.windowMs - now) / 1000);
      this._hits.set(ip, hits);
      return { ok: false, retryAfter: Math.max(1, retryAfter) };
    }
    hits.push(now);
    this._hits.set(ip, hits);
    return { ok: true, retryAfter: 0 };
  }

  /** Remove all entries (useful in tests). */
  reset() {
    this._hits.clear();
  }
}
