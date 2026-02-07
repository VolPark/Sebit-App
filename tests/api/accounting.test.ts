import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Helper to create mock requests
function createMockRequest(
    method: string,
    url: string,
    options: { body?: any; headers?: Record<string, string> } = {}
) {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
        method,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
}

// Mock all external dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        })),
        rpc: vi.fn().mockResolvedValue({ data: [], error: null })
    }
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        })),
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
        }
    }))
}));

let mockSessionUser: any = { user: { id: 'test-user' } };

vi.mock('@/lib/api/auth', () => ({
    verifySession: vi.fn(() => Promise.resolve(mockSessionUser)),
    unauthorizedResponse: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
    }))
}));

vi.mock('@/lib/accounting/service', () => ({
    AccountingService: {
        init: vi.fn().mockResolvedValue({
            syncAll: vi.fn().mockResolvedValue({})
        })
    }
}));

vi.mock('@/lib/accounting/uol-client', () => ({
    UolClient: vi.fn()
}));

vi.mock('@/lib/logger', () => {
    const noop = vi.fn();
    const childFn = vi.fn(() => ({ info: noop, warn: noop, error: noop, debug: noop, child: childFn }));
    return {
        createLogger: vi.fn(() => ({ info: noop, warn: noop, error: noop, debug: noop, child: childFn })),
        logger: { sync: { child: childFn } }
    };
});

vi.mock('@/lib/currency-sync', () => ({
    syncDocumentCurrency: vi.fn().mockResolvedValue(undefined)
}));

describe('Accounting API Endpoints - Auth Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionUser = { user: { id: 'test-user' } };
    });

    describe('POST /api/accounting/bank-accounts/update', () => {
        it('should return 401 when not authenticated', async () => {
            mockSessionUser = null;

            const { POST } = await import('@/app/api/accounting/bank-accounts/update/route');
            const req = createMockRequest('POST', '/api/accounting/bank-accounts/update', {
                body: { bank_account_id: '123' }
            });

            const response = await POST(req);
            expect(response.status).toBe(401);
        });

        it('should return 400 for invalid body', async () => {
            const { POST } = await import('@/app/api/accounting/bank-accounts/update/route');
            const req = createMockRequest('POST', '/api/accounting/bank-accounts/update', {
                body: {} // Missing required field
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
        });

        it('should accept valid request body', async () => {
            const { POST } = await import('@/app/api/accounting/bank-accounts/update/route');
            const req = createMockRequest('POST', '/api/accounting/bank-accounts/update', {
                body: { bank_account_id: '123', custom_name: 'Test Account' }
            });

            const response = await POST(req);
            // Should not be 400 (validation passed)
            expect(response.status).not.toBe(400);
        });
    });

    describe('POST /api/accounting/settings/accounts/rename', () => {
        it('should return 401 when not authenticated', async () => {
            mockSessionUser = null;

            const { POST } = await import('@/app/api/accounting/settings/accounts/rename/route');
            const req = createMockRequest('POST', '/api/accounting/settings/accounts/rename', {
                body: { code: '311', name: 'Test' }
            });

            const response = await POST(req);
            expect(response.status).toBe(401);
        });

        it('should return 400 for empty code', async () => {
            const { POST } = await import('@/app/api/accounting/settings/accounts/rename/route');
            const req = createMockRequest('POST', '/api/accounting/settings/accounts/rename', {
                body: { code: '', name: 'Test' }
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
        });

        it('should return 400 for missing name', async () => {
            const { POST } = await import('@/app/api/accounting/settings/accounts/rename/route');
            const req = createMockRequest('POST', '/api/accounting/settings/accounts/rename', {
                body: { code: '311' }
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/accounting/sync-currency', () => {
        it('should return 401 when not authenticated', async () => {
            mockSessionUser = null;

            const { POST } = await import('@/app/api/accounting/sync-currency/route');
            const req = createMockRequest('POST', '/api/accounting/sync-currency', {
                body: { docId: 123 }
            });

            const response = await POST(req);
            expect(response.status).toBe(401);
        });

        it('should return 400 for missing docId', async () => {
            const { POST } = await import('@/app/api/accounting/sync-currency/route');
            const req = createMockRequest('POST', '/api/accounting/sync-currency', {
                body: {}
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
        });

        it('should coerce string docId to number', async () => {
            const { POST } = await import('@/app/api/accounting/sync-currency/route');
            const req = createMockRequest('POST', '/api/accounting/sync-currency', {
                body: { docId: '123' }
            });

            const response = await POST(req);
            // Should not be 400 (validation should coerce)
            expect(response.status).not.toBe(400);
        });
    });
});

describe('Accounting API Endpoints - CRON Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionUser = null; // CRON tests: no user session
    });

    describe('POST /api/accounting/sync', () => {
        it('should return 401 without CRON_SECRET', async () => {
            const { POST } = await import('@/app/api/accounting/sync/route');
            const req = createMockRequest('POST', '/api/accounting/sync');

            const response = await POST(req);
            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/accounting/sync/journal', () => {
        it('should return 401 without CRON_SECRET', async () => {
            const { POST } = await import('@/app/api/accounting/sync/journal/route');
            const req = createMockRequest('POST', '/api/accounting/sync/journal');

            const response = await POST(req);
            expect(response.status).toBe(401);
        });
    });
});
