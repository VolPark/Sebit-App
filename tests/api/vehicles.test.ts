import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

function createMockRequest(
    method: string,
    url: string,
    options: { body?: Record<string, unknown>; headers?: Record<string, string> } = {}
) {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
        method,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
}

// --- Mocks ---

let mockSessionUser: { user: { id: string } } | null = { user: { id: 'test-user' } };

vi.mock('@/lib/api/auth', () => ({
    verifySession: vi.fn(() => Promise.resolve(mockSessionUser)),
    unauthorizedResponse: vi.fn(() =>
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    )
}));

const mockLookupByVIN = vi.fn();
const mockMapPalivoToTypPaliva = vi.fn();
const mockParseRsvDate = vi.fn();

vi.mock('@/lib/vehicles/czech-vehicle-api', () => ({
    lookupByVIN: (...args: unknown[]) => mockLookupByVIN(...args),
    mapPalivoToTypPaliva: (...args: unknown[]) => mockMapPalivoToTypPaliva(...args),
    parseRsvDate: (...args: unknown[]) => mockParseRsvDate(...args),
}));

const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock('@/utils/supabase/admin', () => ({
    createAdminClient: vi.fn(() => ({
        from: vi.fn(() => ({
            update: (...args: unknown[]) => {
                mockUpdate(...args);
                return {
                    eq: (...eqArgs: unknown[]) => {
                        mockEq(...eqArgs);
                        return { error: null };
                    }
                };
            }
        }))
    }))
}));

vi.mock('@/lib/logger', () => ({
    createLogger: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }))
}));

vi.mock('@/lib/companyConfig', () => ({
    CompanyConfig: {
        api: {
            czechVehicleRegistry: {
                apiKey: 'test-api-key',
                baseUrl: 'https://api.dataovozidlech.cz'
            }
        }
    }
}));

describe('API: POST /api/vehicles/vin-lookup', () => {
    let POST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSessionUser = { user: { id: 'test-user' } };

        // Default mock implementations
        mockMapPalivoToTypPaliva.mockReturnValue('benzin');
        mockParseRsvDate.mockReturnValue('2026-06-15');

        const mod = await import('@/app/api/vehicles/vin-lookup/route');
        POST = mod.POST;
    });

    it('should return 401 without authentication', async () => {
        mockSessionUser = null;
        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'WBAPH5C55BA123456' }
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('should return 400 for missing VIN', async () => {
        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: {}
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('Validation failed');
    });

    it('should return 400 for VIN shorter than 17 characters', async () => {
        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'WBAPH5C55BA12' }
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should return 400 for VIN with invalid characters (I, O, Q)', async () => {
        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'WBAPH5C55OA123456' } // O is invalid
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should return 400 for non-integer vehicleId', async () => {
        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'WBAPH5C55BA123456', vehicleId: 3.5 }
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('should return 404 when vehicle not found in registry', async () => {
        mockLookupByVIN.mockResolvedValue({ Status: 0, Data: null });

        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'WBAPH5C55BA123456' }
        });
        const res = await POST(req);
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toContain('nenalezeno');
    });

    it('should return 200 with mapped data on successful lookup', async () => {
        mockLookupByVIN.mockResolvedValue({
            Status: 1,
            Data: {
                VIN: 'WBAPH5C55BA123456',
                TovarniZnacka: 'BMW',
                ObchodniOznaceni: '520d',
                VozidloKaroserieBarva: 'ČERNÁ',
                Palivo: 'NM',
                VozidloElektricke: 'NE',
                VozidloHybridni: 'NE',
                PravidelnaTechnickaProhlidkaDo: '2026-06-15T00:00:00',
                DatumPrvniRegistrace: '2020-03-01T00:00:00',
                StatusNazev: 'V provozu',
            }
        });

        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'WBAPH5C55BA123456' }
        });
        const res = await POST(req);
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data).toBeDefined();
        expect(json.mapped).toBeDefined();
        expect(json.mapped.znacka).toBe('BMW');
    });

    it('should save vin_data to database when vehicleId is provided', async () => {
        mockLookupByVIN.mockResolvedValue({
            Status: 1,
            Data: {
                VIN: 'WBAPH5C55BA123456',
                TovarniZnacka: 'BMW',
                ObchodniOznaceni: '520d',
                Palivo: 'NM',
                VozidloElektricke: 'NE',
                VozidloHybridni: 'NE',
                StatusNazev: 'V provozu',
            }
        });

        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'WBAPH5C55BA123456', vehicleId: 42 }
        });
        const res = await POST(req);
        expect(res.status).toBe(200);

        // Verify database update was called
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                vin_data: expect.any(Object),
                vin_data_fetched_at: expect.any(String),
            })
        );
        expect(mockEq).toHaveBeenCalledWith('id', 42);
    });

    it('should return 500 when lookupByVIN throws', async () => {
        mockLookupByVIN.mockRejectedValue(new Error('API timeout'));

        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'WBAPH5C55BA123456' }
        });
        const res = await POST(req);
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toContain('API timeout');
    });

    it('should uppercase the VIN before lookup', async () => {
        mockLookupByVIN.mockResolvedValue({ Status: 0, Data: null });

        const req = createMockRequest('POST', '/api/vehicles/vin-lookup', {
            body: { vin: 'wbaph5c55ba123456' }
        });
        await POST(req);

        expect(mockLookupByVIN).toHaveBeenCalledWith('WBAPH5C55BA123456');
    });
});
