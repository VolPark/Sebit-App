/**
 * In-Memory Rate Limiter for API Routes
 * 
 * Uses a sliding window algorithm to limit requests.
 * Note: This is per-serverless-instance. For distributed rate limiting,
 * consider using Redis/Upstash.
 */

interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// In-memory store (per serverless instance)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;

    lastCleanup = now;
    for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) {
            store.delete(key);
        }
    }
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier for the client (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and metadata
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
    cleanup();

    const now = Date.now();
    const entry = store.get(identifier);

    // If no entry or window expired, create new entry
    if (!entry || entry.resetAt < now) {
        const newEntry: RateLimitEntry = {
            count: 1,
            resetAt: now + config.windowMs
        };
        store.set(identifier, newEntry);
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: newEntry.resetAt
        };
    }

    // Increment count
    entry.count++;

    // Check if exceeded
    if (entry.count > config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.resetAt
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt
    };
}

/**
 * Rate limit middleware helper for API routes
 * Returns a 429 response if rate limit is exceeded
 */
export function rateLimitResponse(resetAt: number): Response {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

    return new Response(
        JSON.stringify({
            error: 'Too Many Requests',
            message: 'Přílíš mnoho požadavků. Zkuste to znovu za chvíli.',
            retryAfter
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfter),
                'X-RateLimit-Reset': String(resetAt)
            }
        }
    );
}

/**
 * Get client identifier from request
 * Prefers user ID if available, falls back to IP
 */
export function getClientIdentifier(request: Request, userId?: string): string {
    if (userId) {
        return `user:${userId}`;
    }

    // Try to get IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return `ip:${forwarded.split(',')[0].trim()}`;
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return `ip:${realIp}`;
    }

    // Fallback to a generic identifier
    return 'ip:unknown';
}

// Pre-configured rate limit configs
export const RATE_LIMITS = {
    /** AI Chat - 10 requests per minute */
    aiChat: { maxRequests: 10, windowMs: 60 * 1000 },

    /** Accounting Sync - 5 requests per minute (heavy operation) */
    accountingSync: { maxRequests: 5, windowMs: 60 * 1000 },

    /** General API - 100 requests per minute */
    general: { maxRequests: 100, windowMs: 60 * 1000 },

    /** Auth attempts - 5 per minute */
    auth: { maxRequests: 5, windowMs: 60 * 1000 },
} as const;
