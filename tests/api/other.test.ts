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
            enableInventory: true,
            enableAccounting: true,
            enableAML: true
        }
    }
}));

vi.mock('@/lib/suppliers/service', () => ({
    SupplierService: {
        registerProvider: vi.fn(),
        getProvider: vi.fn(),
        syncSupplier: vi.fn().mockResolvedValue({ success: true })
    }
}));

vi.mock('@/lib/suppliers/providers/demos-trade', () => ({
    DemosTradeProvider: vi.fn()
}));

vi.mock('@/lib/aml/sanctions', () => ({
    updateAllLists: vi.fn().mockResolvedValue({ success: [], failed: [], skipped: [], totalRecords: 0 }),
    updateList: vi.fn().mockResolvedValue({ success: true, records: 0 })
}));

vi.mock('@/lib/accounting/service', () => ({
    AccountingService: {
        init: vi.fn().mockResolvedValue({
            syncAll: vi.fn().mockResolvedValue({}),
            syncAccountingJournal: vi.fn().mockResolvedValue(0)
        })
    }
}));

vi.mock('@/lib/logger', () => {
    const noop = vi.fn();
    const childFn = vi.fn(() => ({ info: noop, warn: noop, error: noop, debug: noop, child: childFn }));
    return {
        createLogger: vi.fn(() => ({ info: noop, warn: noop, error: noop, debug: noop, child: childFn })),
        logger: { sync: { child: childFn } }
    };
});

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
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
        }
    }))
}));

describe('CRON API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionUser = { user: { id: 'test-user' } };
    });

    describe('GET /api/cron/daily-tasks', () => {
        it('should return 401 without CRON_SECRET', async () => {
            const { GET } = await import('@/app/api/cron/daily-tasks/route');
            const req = createMockRequest('GET', '/api/cron/daily-tasks');

            const response = await GET(req);
            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/cron/suppliers-sync', () => {
        it('should return 401 without CRON_SECRET', async () => {
            const { POST } = await import('@/app/api/cron/suppliers-sync/route');
            const req = createMockRequest('POST', '/api/cron/suppliers-sync');

            const response = await POST(req);
            expect(response.status).toBe(401);
        });

        it('should return 400 for invalid UUID', async () => {
            vi.stubEnv('CRON_SECRET', 'test-secret');

            // Need to re-import with new env
            vi.resetModules();
            const { POST } = await import('@/app/api/cron/suppliers-sync/route');
            const req = createMockRequest('POST', '/api/cron/suppliers-sync', {
                headers: { 'Authorization': 'Bearer test-secret' },
                body: { supplierId: 'not-a-uuid' }
            });

            const response = await POST(req);
            expect(response.status).toBe(400);
        });
    });
});

describe('Admin API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionUser = { user: { id: 'test-user' } };
    });

    describe('GET /api/admin/sync-journal', () => {
        it('should return 401 when not authenticated', async () => {
            const { GET } = await import('@/app/api/admin/sync-journal/route');
            const req = createMockRequest('GET', '/api/admin/sync-journal');

            const response = await GET(req);
            expect(response.status).toBe(401);
        });
    });
});
