import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { verifySession, unauthorizedResponse } from '../auth'

// Mock Supabase clients
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

describe('auth', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifySession', () => {
    it('returns user when valid Bearer token is provided', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: mockGetUser },
      } as any)

      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const result = await verifySession(request)

      expect(result).toEqual({ user: mockUser })
      expect(mockGetUser).toHaveBeenCalledWith('valid-token')
    })

    it('returns null when Bearer token is invalid', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      })

      vi.mocked(createClient).mockReturnValue({
        auth: { getUser: mockGetUser },
      } as any)

      // Also mock the server client to return null
      const mockServerGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      })

      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: mockServerGetUser },
      } as any)

      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      })

      const result = await verifySession(request)

      expect(result).toBeNull()
    })

    it('falls back to cookie-based auth when no Bearer token', async () => {
      const mockServerGetUser = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: mockServerGetUser },
      } as any)

      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: 'sb-access-token=test-token',
        },
      })

      const result = await verifySession(request)

      expect(result).toEqual({ user: mockUser })
      expect(createServerClient).toHaveBeenCalled()
    })

    it('returns null when no auth method succeeds', async () => {
      const mockServerGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      })

      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: mockServerGetUser },
      } as any)

      const request = new NextRequest('http://localhost/api/test')

      const result = await verifySession(request)

      expect(result).toBeNull()
    })

    it('handles missing Authorization header gracefully', async () => {
      const mockServerGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      })

      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: mockServerGetUser },
      } as any)

      const request = new NextRequest('http://localhost/api/test')

      const result = await verifySession(request)

      expect(result).toBeNull()
      // Should not call createClient since there's no Bearer token
      expect(createClient).not.toHaveBeenCalled()
    })

    it('handles Authorization header without Bearer prefix', async () => {
      const mockServerGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      })

      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: mockServerGetUser },
      } as any)

      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          Authorization: 'Basic some-basic-auth',
        },
      })

      const result = await verifySession(request)

      expect(result).toBeNull()
      // Should not call createClient for non-Bearer auth
      expect(createClient).not.toHaveBeenCalled()
    })

    it('parses cookies correctly', async () => {
      const mockServerGetUser = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let capturedCookiesConfig: any
      vi.mocked(createServerClient).mockImplementation((url, key, config) => {
        capturedCookiesConfig = config
        return {
          auth: { getUser: mockServerGetUser },
        } as any
      })

      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          cookie: 'session=abc123; other=value; empty=',
        },
      })

      await verifySession(request)

      // Verify cookies parsing works
      const parsedCookies = capturedCookiesConfig.cookies.getAll()
      expect(parsedCookies).toContainEqual({ name: 'session', value: 'abc123' })
      expect(parsedCookies).toContainEqual({ name: 'other', value: 'value' })
    })
  })

  describe('unauthorizedResponse', () => {
    it('returns 401 status code', () => {
      const response = unauthorizedResponse()

      expect(response.status).toBe(401)
    })

    it('returns JSON error message', async () => {
      const response = unauthorizedResponse()
      const body = await response.json()

      expect(body).toEqual({ error: 'Unauthorized' })
    })

    it('has correct content-type header', () => {
      const response = unauthorizedResponse()

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})
