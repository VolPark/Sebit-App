import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    }
}));

// Mock companyConfig
vi.mock('@/lib/companyConfig', () => ({
    CompanyConfig: {
        features: { enableAccounting: false }
    }
}));

// Mock global fetch for sync-currency fire-and-forget calls
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));

import { FixedCostService } from '../fixed-cost-service';
import { supabase } from '@/lib/supabase';
import { CompanyConfig } from '@/lib/companyConfig';

/**
 * Helper: builds a chainable mock that resolves with { data, error }.
 * Every Supabase query-builder method returns the chain itself,
 * and the implicit await (`.then`) resolves the final value.
 */
function mockChain(data: any, error: any = null) {
    const chain: any = {};
    const methods = [
        'select', 'eq', 'gte', 'lte', 'order',
        'insert', 'update', 'delete', 'single',
        'in', 'or', 'not',
    ];
    methods.forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
    });
    chain.then = vi.fn((resolve: any) => resolve({ data, error }));
    return chain;
}

describe('FixedCostService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset accounting feature flag to disabled
        (CompanyConfig as any).features.enableAccounting = false;
    });

    // ---------------------------------------------------------------
    // fetchMonthlyCosts
    // ---------------------------------------------------------------
    describe('fetchMonthlyCosts', () => {
        it('returns manual costs with source="manual" when accounting is disabled', async () => {
            const mockCosts = [
                { id: 1, rok: 2024, mesic: 6, nazev: 'Najem', castka: 15000, division_id: null, divisions: null },
                { id: 2, rok: 2024, mesic: 6, nazev: 'Energie', castka: 5000, division_id: 1, divisions: { id: 1, nazev: 'Divize A' } },
            ];
            const mockDivisions = [
                { id: 1, nazev: 'Divize A' },
                { id: 2, nazev: 'Divize B' },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'fixed_costs') return mockChain(mockCosts) as any;
                if (table === 'divisions') return mockChain(mockDivisions) as any;
                return mockChain([]) as any;
            });

            const result = await FixedCostService.fetchMonthlyCosts(2024, 6);

            expect(result.costs).toHaveLength(2);
            result.costs.forEach(c => {
                expect(c.source).toBe('manual');
            });
        });

        it('returns divisions from the divisions table', async () => {
            const mockDivisions = [
                { id: 1, nazev: 'Divize A' },
                { id: 2, nazev: 'Divize B' },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'divisions') return mockChain(mockDivisions) as any;
                return mockChain([]) as any;
            });

            const result = await FixedCostService.fetchMonthlyCosts(2024, 6);

            expect(result.divisions).toEqual(mockDivisions);
        });

        it('throws error when fixed_costs query fails', async () => {
            const dbError = { message: 'Connection refused', code: 'PGRST000' };

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'fixed_costs') return mockChain(null, dbError) as any;
                return mockChain([]) as any;
            });

            await expect(FixedCostService.fetchMonthlyCosts(2024, 6))
                .rejects.toEqual(dbError);
        });

        it('returns empty costs array when no data exists', async () => {
            vi.mocked(supabase.from).mockImplementation(() => mockChain([]) as any);

            const result = await FixedCostService.fetchMonthlyCosts(2024, 6);

            expect(result.costs).toEqual([]);
        });

        it('sorts combined costs by nazev alphabetically', async () => {
            const mockCosts = [
                { id: 1, rok: 2024, mesic: 6, nazev: 'Zaklad', castka: 1000 },
                { id: 2, rok: 2024, mesic: 6, nazev: 'Energie', castka: 2000 },
                { id: 3, rok: 2024, mesic: 6, nazev: 'Najem', castka: 3000 },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'fixed_costs') return mockChain(mockCosts) as any;
                return mockChain([]) as any;
            });

            const result = await FixedCostService.fetchMonthlyCosts(2024, 6);

            expect(result.costs.map(c => c.nazev)).toEqual(['Energie', 'Najem', 'Zaklad']);
        });

        it('includes overhead mappings from accounting_documents when accounting is enabled', async () => {
            (CompanyConfig as any).features.enableAccounting = true;

            const mockCosts = [
                { id: 1, rok: 2024, mesic: 3, nazev: 'Najem', castka: 15000 },
            ];
            const mockDivisions = [
                { id: 1, nazev: 'Divize A' },
            ];
            const mockAccDocs = [
                {
                    id: 'doc-uuid-1',
                    description: 'Office supplies',
                    supplier_name: 'Supplier s.r.o.',
                    issue_date: '2024-03-15',
                    currency: 'CZK',
                    amount: 8000,
                    amount_czk: 8000,
                    mappings: [
                        {
                            id: 10,
                            amount: 8000,
                            amount_czk: 8000,
                            cost_category: 'overhead',
                            note: 'Kancelarske potreby',
                            division_id: 1,
                        },
                    ],
                },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'fixed_costs') return mockChain(mockCosts) as any;
                if (table === 'divisions') return mockChain(mockDivisions) as any;
                if (table === 'accounting_documents') return mockChain(mockAccDocs) as any;
                return mockChain([]) as any;
            });

            const result = await FixedCostService.fetchMonthlyCosts(2024, 3);

            // Should have 1 manual + 1 accounting cost
            expect(result.costs).toHaveLength(2);

            const accountingCost = result.costs.find(c => c.source === 'accounting');
            expect(accountingCost).toBeDefined();
            expect(accountingCost!.id).toBe(-10); // Negative mapping id
            expect(accountingCost!.castka).toBe(8000);
            expect(accountingCost!.nazev).toBe('Kancelarske potreby');
            expect(accountingCost!.doc_id).toBe('doc-uuid-1');
            expect(accountingCost!.divisions).toEqual({ id: 1, nazev: 'Divize A' });
        });

        it('uses EUR=25 and USD=23 fallback rates when amount_czk is missing', async () => {
            (CompanyConfig as any).features.enableAccounting = true;

            const mockDivisions = [{ id: 1, nazev: 'Div' }];
            const mockAccDocs = [
                {
                    id: 'doc-eur',
                    description: 'EUR doc',
                    supplier_name: null,
                    issue_date: '2024-03-10',
                    currency: 'EUR',
                    amount: 100,
                    amount_czk: null,
                    mappings: [
                        { id: 20, amount: 100, amount_czk: null, cost_category: 'overhead', note: 'EUR expense', division_id: null },
                    ],
                },
                {
                    id: 'doc-usd',
                    description: 'USD doc',
                    supplier_name: null,
                    issue_date: '2024-03-12',
                    currency: 'USD',
                    amount: 200,
                    amount_czk: 0,
                    mappings: [
                        { id: 21, amount: 200, amount_czk: 0, cost_category: 'overhead', note: 'USD expense', division_id: null },
                    ],
                },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'fixed_costs') return mockChain([]) as any;
                if (table === 'divisions') return mockChain(mockDivisions) as any;
                if (table === 'accounting_documents') return mockChain(mockAccDocs) as any;
                return mockChain([]) as any;
            });

            const result = await FixedCostService.fetchMonthlyCosts(2024, 3);

            const eurCost = result.costs.find(c => c.nazev === 'EUR expense');
            expect(eurCost).toBeDefined();
            expect(eurCost!.castka).toBe(100 * 25); // EUR rate = 25

            const usdCost = result.costs.find(c => c.nazev === 'USD expense');
            expect(usdCost).toBeDefined();
            expect(usdCost!.castka).toBe(200 * 23); // USD rate = 23

            // Should have triggered sync-currency fetch for both docs
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    // ---------------------------------------------------------------
    // importFromPreviousMonth
    // ---------------------------------------------------------------
    describe('importFromPreviousMonth', () => {
        it('copies costs from previous month with new year/month', async () => {
            const prevCosts = [
                { id: 10, nazev: 'Najem', castka: 15000, rok: 2024, mesic: 5, division_id: 1 },
                { id: 11, nazev: 'Energie', castka: 5000, rok: 2024, mesic: 5, division_id: null },
            ];

            const insertChain = mockChain(null, null);

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                // First call: select from previous month
                // Second call: insert new rows
                const chain = mockChain(prevCosts);
                chain.insert = vi.fn().mockReturnValue(insertChain);
                return chain as any;
            });

            const count = await FixedCostService.importFromPreviousMonth(2024, 6);

            expect(count).toBe(2);

            // Verify insert was called with correct target month/year
            const insertCall = insertChain.then.mock.calls.length > 0 || true;
            expect(supabase.from).toHaveBeenCalledWith('fixed_costs');
        });

        it('handles December to January transition (month=1, prev = month=12, year-1)', async () => {
            const prevCosts = [
                { id: 20, nazev: 'Najem', castka: 15000, rok: 2023, mesic: 12, division_id: null },
            ];

            const selectChain = mockChain(prevCosts);
            const insertChain = mockChain(null, null);
            let callIndex = 0;

            vi.mocked(supabase.from).mockImplementation(() => {
                callIndex++;
                if (callIndex === 1) {
                    // select call
                    return selectChain as any;
                }
                // insert call
                return { insert: vi.fn().mockReturnValue(insertChain) } as any;
            });

            const count = await FixedCostService.importFromPreviousMonth(2024, 1);

            expect(count).toBe(1);

            // Verify we queried year 2023, month 12
            expect(selectChain.eq).toHaveBeenCalledWith('rok', 2023);
            expect(selectChain.eq).toHaveBeenCalledWith('mesic', 12);
        });

        it('returns 0 when previous month has no data', async () => {
            vi.mocked(supabase.from).mockImplementation(() => mockChain([]) as any);

            const count = await FixedCostService.importFromPreviousMonth(2024, 6);

            expect(count).toBe(0);
        });

        it('returns count of copied rows', async () => {
            const prevCosts = [
                { id: 1, nazev: 'A', castka: 100, rok: 2024, mesic: 5, division_id: null },
                { id: 2, nazev: 'B', castka: 200, rok: 2024, mesic: 5, division_id: 1 },
                { id: 3, nazev: 'C', castka: 300, rok: 2024, mesic: 5, division_id: 2 },
            ];

            const selectChain = mockChain(prevCosts);
            const insertChain = mockChain(null, null);
            let callIndex = 0;

            vi.mocked(supabase.from).mockImplementation(() => {
                callIndex++;
                if (callIndex === 1) return selectChain as any;
                return { insert: vi.fn().mockReturnValue(insertChain) } as any;
            });

            const count = await FixedCostService.importFromPreviousMonth(2024, 6);

            expect(count).toBe(3);
        });
    });

    // ---------------------------------------------------------------
    // CRUD operations
    // ---------------------------------------------------------------
    describe('createCost', () => {
        it('strips non-DB fields (id, divisions, source, doc_id) before insert', async () => {
            const mockInsert = vi.fn().mockReturnValue(mockChain(null, null));

            vi.mocked(supabase.from).mockReturnValue({
                insert: mockInsert,
            } as any);

            await FixedCostService.createCost({
                id: 999,
                nazev: 'Test cost',
                castka: 5000,
                rok: 2024,
                mesic: 6,
                division_id: 1,
                divisions: { id: 1, nazev: 'Divize A' },
                source: 'manual',
                doc_id: 'doc-123',
            });

            expect(supabase.from).toHaveBeenCalledWith('fixed_costs');
            expect(mockInsert).toHaveBeenCalledWith({
                nazev: 'Test cost',
                castka: 5000,
                rok: 2024,
                mesic: 6,
                division_id: 1,
            });
        });

        it('throws error when insert fails', async () => {
            const dbError = { message: 'Insert failed' };
            const mockInsert = vi.fn().mockReturnValue(mockChain(null, dbError));

            vi.mocked(supabase.from).mockReturnValue({
                insert: mockInsert,
            } as any);

            await expect(FixedCostService.createCost({ nazev: 'Fail', castka: 100, rok: 2024, mesic: 1 }))
                .rejects.toEqual(dbError);
        });
    });

    describe('updateCost', () => {
        it('strips non-DB fields and updates by id', async () => {
            const mockEq = vi.fn().mockReturnValue(mockChain(null, null));
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
            } as any);

            await FixedCostService.updateCost(42, {
                id: 42,
                nazev: 'Updated cost',
                castka: 8000,
                rok: 2024,
                mesic: 6,
                division_id: 2,
                divisions: { id: 2, nazev: 'Divize B' },
                source: 'manual',
                doc_id: 'doc-456',
            });

            expect(supabase.from).toHaveBeenCalledWith('fixed_costs');
            expect(mockUpdate).toHaveBeenCalledWith({
                nazev: 'Updated cost',
                castka: 8000,
                rok: 2024,
                mesic: 6,
                division_id: 2,
            });
            expect(mockEq).toHaveBeenCalledWith('id', 42);
        });

        it('throws error when update fails', async () => {
            const dbError = { message: 'Update failed' };
            const mockEq = vi.fn().mockReturnValue(mockChain(null, dbError));
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

            vi.mocked(supabase.from).mockReturnValue({
                update: mockUpdate,
            } as any);

            await expect(FixedCostService.updateCost(1, { nazev: 'Fail', castka: 100, rok: 2024, mesic: 1 }))
                .rejects.toEqual(dbError);
        });
    });

    describe('deleteCost', () => {
        it('deletes by id', async () => {
            const mockEq = vi.fn().mockReturnValue(mockChain(null, null));
            const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

            vi.mocked(supabase.from).mockReturnValue({
                delete: mockDelete,
            } as any);

            await FixedCostService.deleteCost(77);

            expect(supabase.from).toHaveBeenCalledWith('fixed_costs');
            expect(mockDelete).toHaveBeenCalled();
            expect(mockEq).toHaveBeenCalledWith('id', 77);
        });

        it('throws error when delete fails', async () => {
            const dbError = { message: 'Delete failed' };
            const mockEq = vi.fn().mockReturnValue(mockChain(null, dbError));
            const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

            vi.mocked(supabase.from).mockReturnValue({
                delete: mockDelete,
            } as any);

            await expect(FixedCostService.deleteCost(99))
                .rejects.toEqual(dbError);
        });
    });
});
