/**
 * Lightweight in-memory sliding window rate limiter for API routes.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipBuckets = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  ip: string,
  limit = 20,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);

  // Periodically sweep expired entries if map grows large
  if (ipBuckets.size > 5000) {
    for (const [key, val] of ipBuckets.entries()) {
      if (now > val.resetTime) {
        ipBuckets.delete(key);
      }
    }
  }

  if (!bucket || now > bucket.resetTime) {
    ipBuckets.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: bucket.resetTime,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetTime: bucket.resetTime,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
