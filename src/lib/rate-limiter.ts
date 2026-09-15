/**
 * Rate Limiter
 *
 * In-memory rate limiting implementation using sliding window algorithm.
 * Tracks IP-based request counts to prevent abuse while allowing legitimate access.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// In-memory storage for rate limits
// In production, consider using Redis for distributed systems
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

/**
 * Rate limit configuration from environment variables
 */
export const RATE_LIMIT_CONFIG = {
  inboxAccess: {
    maxRequests: Number(process.env.INBOX_ACCESS_RATE_LIMIT) || 50,
    windowMs: (Number(process.env.RATE_LIMIT_WINDOW_HOURS) || 1) * 60 * 60 * 1000,
  },
  inboxCreation: {
    maxRequests: Number(process.env.INBOX_CREATION_RATE_LIMIT) || 10,
    windowMs: (Number(process.env.RATE_LIMIT_WINDOW_HOURS) || 1) * 60 * 60 * 1000,
  },
  apiAccess: {
    maxRequests: Number(process.env.API_RATE_LIMIT) || 100,
    windowMs: (Number(process.env.RATE_LIMIT_WINDOW_HOURS) || 1) * 60 * 60 * 1000,
  },
} as const;

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Start cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL);
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (typically IP address)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and retry info if limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry exists or window has expired, create new entry
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific identifier (for testing or admin purposes)
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status for an identifier
 * @param identifier - Unique identifier to check
 * @returns Current rate limit entry or undefined if not found
 */
export function getRateLimitStatus(
  identifier: string,
): RateLimitEntry | undefined {
  return rateLimitStore.get(identifier);
}

/**
 * Extract client IP address from request headers
 * @param headers - Request headers object
 * @returns Client IP address
 */
export function extractClientIP(headers: Headers): string {
  // Check various headers for the real IP
  const forwardedFor = headers.get("x-forwarded-for");
  const realIP = headers.get("x-real-ip");
  const cfConnectingIP = headers.get("cf-connecting-ip");

  if (cfConnectingIP) {
    // Cloudflare
    return cfConnectingIP.split(",")[0].trim();
  }

  if (forwardedFor) {
    // Standard proxy header
    return forwardedFor.split(",")[0].trim();
  }

  if (realIP) {
    // Nginx proxy
    return realIP;
  }

  // Fallback (though this might be the proxy IP)
  return "unknown";
}

/**
 * Create a rate limit middleware function
 * @param config - Rate limit configuration
 * @returns Middleware function that can be used in API routes
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (identifier: string) => {
    return checkRateLimit(identifier, config);
  };
}

/**
 * Specific rate limiters for common use cases
 */
export const inboxAccessLimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIG.inboxAccess,
);

export const inboxCreationLimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIG.inboxCreation,
);

export const apiAccessLimiter = createRateLimitMiddleware(
  RATE_LIMIT_CONFIG.apiAccess,
);
