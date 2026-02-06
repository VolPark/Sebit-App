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
            enableAccounting: true
        }
    }
}));

vi.mock('@/lib/suppliers/service', () => ({
    SupplierService: {
        registerProvider: vi.fn(),
        syncSupplier: vi.fn().mockResolvedValue({ success: true })
    }
}));

vi.mock('@/lib/suppliers/providers/demos-trade', () => ({
    DemosTradeProvider: vi.fn()
}));

describe('CRON API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSessionUser = { user: { id: 'test-user' } };
    });

    describe('POST /api/cron/daily-tasks', () => {
        it('should return 401 without CRON_SECRET', async () => {
            const { POST } = await import('@/app/api/cron/daily-tasks/route');
            const req = createMockRequest('POST', '/api/cron/daily-tasks');

            const response = await POST(req);
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

    describe('POST /api/admin/sync-journal', () => {
        it('should return 401 when not authenticated', async () => {
            mockSessionUser = null;

            const { POST } = await import('@/app/api/admin/sync-journal/route');
            const req = createMockRequest('POST', '/api/admin/sync-journal');

            const response = await POST(req);
            expect(response.status).toBe(401);
        });
    });
});
