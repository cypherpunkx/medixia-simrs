import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitOptions {
  limit?: number; // Maximum requests allowed
  windowMs?: number; // Time window in milliseconds
}

class SlidingWindowRateLimiter {
  private store = new Map<string, RateLimitRecord>();

  /**
   * Check whether a client has exceeded their rate limit.
   */
  public check(
    identifier: string,
    options: RateLimitOptions = {}
  ): { success: boolean; limit: number; remaining: number; resetMs: number } {
    const limit = options.limit || 120; // 120 requests
    const windowMs = options.windowMs || 60000; // per 1 minute
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.store.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(identifier, record);
    }

    // Filter out timestamps older than the active window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldestInWindow = record.timestamps[0] || now;
      const resetMs = Math.max(0, oldestInWindow + windowMs - now);
      return {
        success: false,
        limit,
        remaining: 0,
        resetMs,
      };
    }

    // Record this request
    record.timestamps.push(now);

    return {
      success: true,
      limit,
      remaining: limit - record.timestamps.length,
      resetMs: windowMs,
    };
  }

  /**
   * Periodically purge expired records to prevent memory leak
   */
  public cleanup(maxIdleMs: number = 300000): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (
        record.timestamps.length === 0 ||
        now - record.timestamps[record.timestamps.length - 1] > maxIdleMs
      ) {
        this.store.delete(key);
      }
    }
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter();

// Run periodic cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    globalRateLimiter.cleanup();
  }, 300000);
}

/**
 * Extract client IP or identifier safely
 */
export function getClientIdentifier(req: Request | NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Higher-order helper to wrap API handlers with Rate Limiting and Server-Timing Telemetry
 */
export function applyRateLimit(
  req: Request | NextRequest,
  options?: RateLimitOptions
): NextResponse | null {
  const clientId = getClientIdentifier(req);
  const result = globalRateLimiter.check(clientId, options);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Too Many Requests. Silakan tunggu beberapa saat.",
        rateLimit: {
          limit: result.limit,
          remaining: result.remaining,
          retryAfterSeconds: Math.ceil(result.resetMs / 1000),
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.resetMs / 1000)),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  }

  return null;
}
