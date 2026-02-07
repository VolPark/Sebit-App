import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        })),
        rpc: vi.fn().mockResolvedValue({ data: [], error: null })
    }
}));

let mockSessionUser: any = { user: { id: 'test-user' } };

vi.mock('@/lib/api/auth', () => ({
    verifySession: vi.fn(() => Promise.resolve(mockSessionUser)),
    unauthorizedResponse: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
    }))
}));

vi.mock('@/lib/companyConfig', () => ({
    CompanyConfig: {
        features: {
            enableAML: true,
            enableAccounting: true
        }
    }
}));

vi.mock('@/lib/aml/sanctions/eu', () => ({
    EUSanctionsService: {
        fetchList: vi.fn().mockResolvedValue('<xml></xml>'),
        parseAndSave: vi.fn().mockResolvedValue(10)
    },
    EUSanctionsProvider: vi.fn().mockImplementation(() => ({})),
    euProvider: {}
}));

vi.mock('@/lib/aml/sanctions', () => ({
    updateList: vi.fn().mockResolvedValue({ success: true, records: 5 }),
    updateAllLists: vi.fn().mockResolvedValue({ success: ['EU'], failed: [], skipped: [], totalRecords: 5 })
}));

vi.mock('@/lib/aml/config', () => ({
    getActiveListIds: vi.fn().mockReturnValue(['EU', 'CZ']),
    logConfigStatus: vi.fn(),
    SANCTION_LISTS: {
        EU: { id: 'EU', name: 'EU Consolidated List', url: 'https://example.com/eu', enabled: true, format: 'xml', description: '' },
        OFAC: { id: 'OFAC', name: 'US OFAC SDN', url: 'https://example.com/ofac', enabled: false, format: 'xml', description: '' },
        CZ: { id: 'CZ', name: 'CZ MZV List', url: 'https://example.com/cz', enabled: true, format: 'csv', description: '' },
        AMLA: { id: 'AMLA', name: 'EU AMLA', url: '', enabled: false, format: 'xml', description: '' },
    },
}));

vi.mock('@/lib/logger', () => {
    const noop = vi.fn();
    const childFn = vi.fn(() => ({ info: noop, warn: noop, error: noop, debug: noop, child: childFn }));
    return {
        createLogger: vi.fn(() => ({ info: noop, warn: noop, error: noop, debug: noop, child: childFn })),
        logger: { sync: { child: childFn } }
    };
});

describe('AML API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionUser = { user: { id: 'test-user' } };
    });

    describe('POST /api/aml/check', () => {
        it('should return 401 when not authenticated', async () => {
            mockSessionUser = null;

            const { POST } = await import('@/app/api/aml/check/route');
            const req = createMockRequest('POST', '/api/aml/check', {
                body: { name: 'Test Person' }
            });

            const response = await POST(req);
            expect(response.status).toBe(401);
        });

        it('should return 400 for missing name', async () => {
            const { POST } = await import('@/app/api/aml/check/route');
            const req = createMockRequest('POST', '/api/aml/check', {
                body: {}
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
        });

        it('should return 400 for empty name', async () => {
            const { POST } = await import('@/app/api/aml/check/route');
            const req = createMockRequest('POST', '/api/aml/check', {
                body: { name: '' }
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
        });

        it('should accept valid request with name', async () => {
            const { POST } = await import('@/app/api/aml/check/route');
            const req = createMockRequest('POST', '/api/aml/check', {
                body: { name: 'John Doe' }
            });

            const response = await POST(req);
            expect(response.status).not.toBe(400);
        });

        it('should accept optional fields', async () => {
            const { POST } = await import('@/app/api/aml/check/route');
            const req = createMockRequest('POST', '/api/aml/check', {
                body: {
                    name: 'John Doe',
                    dob: '1990-01-01',
                    country: 'CZ'
                }
            });

            const response = await POST(req);
            expect(response.status).not.toBe(400);
        });
    });

    describe('POST /api/aml/sanctions/sync', () => {
        it('should return 401 when not authenticated and no CRON_SECRET', async () => {
            mockSessionUser = null;

            const { POST } = await import('@/app/api/aml/sanctions/sync/route');
            const req = createMockRequest('POST', '/api/aml/sanctions/sync');

            const response = await POST(req);
            expect(response.status).toBe(401);
        });

        it('should return 400 for invalid listId', async () => {
            const { POST } = await import('@/app/api/aml/sanctions/sync/route');
            const req = createMockRequest('POST', '/api/aml/sanctions/sync', {
                body: { listId: 'INVALID_LIST' }
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
        });

        it('should accept valid listId EU', async () => {
            const { POST } = await import('@/app/api/aml/sanctions/sync/route');
            const req = createMockRequest('POST', '/api/aml/sanctions/sync', {
                body: { listId: 'EU' }
            });

            const response = await POST(req);
            expect(response.status).not.toBe(400);
        });
    });

    describe('POST /api/aml/sanctions/update-eu', () => {
        it('should return 401 when not authenticated', async () => {
            mockSessionUser = null;

            const { POST } = await import('@/app/api/aml/sanctions/update-eu/route');
            const req = createMockRequest('POST', '/api/aml/sanctions/update-eu');

            const response = await POST(req);
            expect(response.status).toBe(401);
        });
    });
});
