import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        })),
        rpc: vi.fn().mockResolvedValue({ data: [], error: null })
    }
}));

import { PayrollService } from '../payroll-service';
import { supabase } from '@/lib/supabase';

describe('PayrollService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getPayrollData', () => {
        it('should fetch and combine payroll data', async () => {
            const mockPracovnici = [
                { id: 1, jmeno: 'Jan Novák', hodinova_mzda: 300, is_active: true, user_id: null },
            ];
            const mockMzdy = [
                { id: 1, pracovnik_id: 1, rok: 2024, mesic: 1, celkova_castka: 30000 },
            ];

            // Setup mock chain
            vi.mocked(supabase.from).mockImplementation((table: string) => {
                const chain: any = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                };

                if (table === 'pracovnici') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockPracovnici, error: null }));
                } else if (table === 'mzdy') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockMzdy, error: null }));
                } else {
                    chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));
                }

                return chain;
            });

            const result = await PayrollService.getPayrollData(2024, 1, null);

            expect(result).toHaveLength(1);
            expect(result[0].jmeno).toBe('Jan Novák');
            expect(result[0].mzda?.celkova_castka).toBe(30000);
        });

        it('should filter out inactive workers without salary', async () => {
            const mockPracovnici = [
                { id: 1, jmeno: 'Active Worker', is_active: true, user_id: null },
                { id: 2, jmeno: 'Inactive Worker', is_active: false, user_id: null },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                const chain: any = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                };

                if (table === 'pracovnici') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockPracovnici, error: null }));
                } else {
                    chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));
                }

                return chain;
            });

            const result = await PayrollService.getPayrollData(2024, 1, null);

            // Only active worker should appear
            expect(result).toHaveLength(1);
            expect(result[0].jmeno).toBe('Active Worker');
        });

        it('should include inactive workers with salary records', async () => {
            const mockPracovnici = [
                { id: 1, jmeno: 'Inactive With Salary', is_active: false, user_id: null },
            ];
            const mockMzdy = [
                { id: 1, pracovnik_id: 1, rok: 2024, mesic: 1, celkova_castka: 25000 },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                const chain: any = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                };

                if (table === 'pracovnici') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockPracovnici, error: null }));
                } else if (table === 'mzdy') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockMzdy, error: null }));
                } else {
                    chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));
                }

                return chain;
            });

            const result = await PayrollService.getPayrollData(2024, 1, null);

            expect(result).toHaveLength(1);
            expect(result[0].is_active).toBe(false);
            expect(result[0].mzda).not.toBeNull();
        });

        it('should calculate totalWithCost correctly', async () => {
            const mockPracovnici = [
                { id: 1, jmeno: 'Worker', is_active: true, user_id: null },
            ];
            const mockMzdy = [
                { id: 1, pracovnik_id: 1, rok: 2024, mesic: 1, celkova_castka: 30000 },
            ];
            const mockMappings = [
                { amount: 5000, pracovnik_id: 1, accounting_documents: { issue_date: '2024-01-15' } },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                const chain: any = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                };

                if (table === 'pracovnici') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockPracovnici, error: null }));
                } else if (table === 'mzdy') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockMzdy, error: null }));
                } else if (table === 'accounting_mappings') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockMappings, error: null }));
                } else {
                    chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));
                }

                return chain;
            });

            const result = await PayrollService.getPayrollData(2024, 1, null);

            expect(result[0].mzda?.celkova_castka).toBe(30000);
            expect(result[0].mappedCost).toBe(5000);
            expect(result[0].totalWithCost).toBe(35000);
        });

        it('should filter owners for office role', async () => {
            const mockPracovnici = [
                { id: 1, jmeno: 'Owner', is_active: true, user_id: 'owner-uuid' },
                { id: 2, jmeno: 'Regular Worker', is_active: true, user_id: 'worker-uuid' },
            ];
            const mockProfiles = [
                { id: 'owner-uuid', role: 'owner' },
                { id: 'worker-uuid', role: 'worker' },
            ];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                const chain: any = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                };

                if (table === 'pracovnici') {
                    chain.then = vi.fn((resolve) => resolve({ data: mockPracovnici, error: null }));
                } else {
                    chain.then = vi.fn((resolve) => resolve({ data: [], error: null }));
                }

                return chain;
            });

            vi.mocked(supabase.rpc).mockResolvedValue({ data: mockProfiles, error: null });

            const result = await PayrollService.getPayrollData(2024, 1, 'office');

            // Office role should not see owner
            expect(result).toHaveLength(1);
            expect(result[0].jmeno).toBe('Regular Worker');
        });

        it('should throw error on database failure', async () => {
            vi.mocked(supabase.from).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => resolve({ data: null, error: { message: 'DB Error' } }))
            } as any));

            await expect(PayrollService.getPayrollData(2024, 1, null))
                .rejects.toThrow('Error fetching workers');
        });
    });

    describe('upsertMzda', () => {
        it('should call upsert with correct parameters', async () => {
            const mockUpsert = vi.fn().mockResolvedValue({ error: null });

            vi.mocked(supabase.from).mockReturnValue({
                upsert: mockUpsert
            } as any);

            await PayrollService.upsertMzda({
                pracovnik_id: 1,
                rok: 2024,
                mesic: 1,
                celkova_castka: 30000
            });

            expect(supabase.from).toHaveBeenCalledWith('mzdy');
            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({ pracovnik_id: 1, celkova_castka: 30000 }),
                { onConflict: 'pracovnik_id,rok,mesic' }
            );
        });
    });

    describe('deleteMzda', () => {
        it('should call delete with correct id', async () => {
            const mockEq = vi.fn().mockResolvedValue({ error: null });
            const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

            vi.mocked(supabase.from).mockReturnValue({
                delete: mockDelete
            } as any);

            await PayrollService.deleteMzda(123);

            expect(supabase.from).toHaveBeenCalledWith('mzdy');
            expect(mockDelete).toHaveBeenCalled();
            expect(mockEq).toHaveBeenCalledWith('id', 123);
        });
    });
});
