import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIdentifier,
  RATE_LIMITS,
} from '../rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    // Reset module state between tests by manipulating time
    vi.useFakeTimers()
  })

  describe('checkRateLimit', () => {
    it('allows first request and returns correct remaining count', () => {
      const result = checkRateLimit('test-user-1', { maxRequests: 5, windowMs: 60000 })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.resetAt).toBeGreaterThan(Date.now())
    })

    it('allows requests up to the limit', () => {
      const config = { maxRequests: 3, windowMs: 60000 }
      const identifier = 'test-user-2'

      const result1 = checkRateLimit(identifier, config)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(2)

      const result2 = checkRateLimit(identifier, config)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(1)

      const result3 = checkRateLimit(identifier, config)
      expect(result3.allowed).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('blocks requests that exceed the limit', () => {
      const config = { maxRequests: 2, windowMs: 60000 }
      const identifier = 'test-user-3'

      checkRateLimit(identifier, config) // 1st
      checkRateLimit(identifier, config) // 2nd

      const result = checkRateLimit(identifier, config) // 3rd - should be blocked

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('resets limit after window expires', () => {
      const config = { maxRequests: 2, windowMs: 60000 }
      const identifier = 'test-user-4'

      // Use up the limit
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)
      const blockedResult = checkRateLimit(identifier, config)
      expect(blockedResult.allowed).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(61000)

      // Should be allowed again
      const result = checkRateLimit(identifier, config)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('handles different identifiers independently', () => {
      const config = { maxRequests: 1, windowMs: 60000 }

      checkRateLimit('user-a', config)
      const resultA = checkRateLimit('user-a', config)
      expect(resultA.allowed).toBe(false)

      // Different identifier should still be allowed
      const resultB = checkRateLimit('user-b', config)
      expect(resultB.allowed).toBe(true)
    })
  })

  describe('rateLimitResponse', () => {
    it('returns 429 status code', async () => {
      const resetAt = Date.now() + 30000
      const response = rateLimitResponse(resetAt)

      expect(response.status).toBe(429)
    })

    it('includes Retry-After header', async () => {
      const resetAt = Date.now() + 30000
      const response = rateLimitResponse(resetAt)

      const retryAfter = response.headers.get('Retry-After')
      expect(retryAfter).toBeDefined()
      expect(Number(retryAfter)).toBeGreaterThan(0)
    })

    it('includes X-RateLimit-Reset header', async () => {
      const resetAt = Date.now() + 30000
      const response = rateLimitResponse(resetAt)

      const resetHeader = response.headers.get('X-RateLimit-Reset')
      expect(resetHeader).toBe(String(resetAt))
    })

    it('returns JSON error message', async () => {
      const resetAt = Date.now() + 30000
      const response = rateLimitResponse(resetAt)

      const body = await response.json()
      expect(body.error).toBe('Too Many Requests')
      expect(body.retryAfter).toBeDefined()
    })
  })

  describe('getClientIdentifier', () => {
    it('returns user identifier when userId is provided', () => {
      const request = new Request('http://localhost/api/test')
      const identifier = getClientIdentifier(request, 'user-123')

      expect(identifier).toBe('user:user-123')
    })

    it('returns IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })
      const identifier = getClientIdentifier(request)

      expect(identifier).toBe('ip:192.168.1.1')
    })

    it('returns IP from x-real-ip header when x-forwarded-for is missing', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'x-real-ip': '192.168.1.2' },
      })
      const identifier = getClientIdentifier(request)

      expect(identifier).toBe('ip:192.168.1.2')
    })

    it('returns unknown when no IP headers present', () => {
      const request = new Request('http://localhost/api/test')
      const identifier = getClientIdentifier(request)

      expect(identifier).toBe('ip:unknown')
    })

    it('prefers userId over IP headers', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      })
      const identifier = getClientIdentifier(request, 'user-456')

      expect(identifier).toBe('user:user-456')
    })
  })

  describe('RATE_LIMITS', () => {
    it('has correct aiChat configuration', () => {
      expect(RATE_LIMITS.aiChat.maxRequests).toBe(10)
      expect(RATE_LIMITS.aiChat.windowMs).toBe(60000)
    })

    it('has correct accountingSync configuration', () => {
      expect(RATE_LIMITS.accountingSync.maxRequests).toBe(5)
      expect(RATE_LIMITS.accountingSync.windowMs).toBe(60000)
    })

    it('has correct general configuration', () => {
      expect(RATE_LIMITS.general.maxRequests).toBe(100)
      expect(RATE_LIMITS.general.windowMs).toBe(60000)
    })

    it('has correct auth configuration', () => {
      expect(RATE_LIMITS.auth.maxRequests).toBe(5)
      expect(RATE_LIMITS.auth.windowMs).toBe(60000)
    })
  })
})
