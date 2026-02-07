import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

import { TimesheetService } from '../timesheet-service';
import { supabase } from '@/lib/supabase';

function createMockChain(resolvedData: any) {
    const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
    };
    chain.then = vi.fn((resolve) => resolve(resolvedData));
    return chain;
}

describe('TimesheetService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchEntities', () => {
        it('should return deduplicated workers sorted by name for type "worker"', async () => {
            const mockData = [
                { pracovnici: { id: 2, jmeno: 'Zdenek' } },
                { pracovnici: { id: 1, jmeno: 'Adam' } },
                { pracovnici: { id: 2, jmeno: 'Zdenek' } }, // duplicate
            ];

            vi.mocked(supabase.from).mockReturnValue(
                createMockChain({ data: mockData, error: null })
            );

            const result = await TimesheetService.fetchEntities('worker', '2024-01');

            expect(supabase.from).toHaveBeenCalledWith('prace');
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ id: 1, name: 'Adam' });
            expect(result[1]).toEqual({ id: 2, name: 'Zdenek' });
        });

        it('should return deduplicated clients sorted by name for type "client"', async () => {
            const mockData = [
                { klienti: { id: 3, nazev: 'Firma C' } },
                { klienti: { id: 1, nazev: 'Firma A' } },
                { klienti: { id: 3, nazev: 'Firma C' } }, // duplicate
            ];

            vi.mocked(supabase.from).mockReturnValue(
                createMockChain({ data: mockData, error: null })
            );

            const result = await TimesheetService.fetchEntities('client', '2024-03');

            expect(supabase.from).toHaveBeenCalledWith('prace');
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ id: 1, name: 'Firma A' });
            expect(result[1]).toEqual({ id: 3, name: 'Firma C' });
        });

        it('should return empty array when response data is null', async () => {
            vi.mocked(supabase.from).mockReturnValue(
                createMockChain({ data: null, error: null })
            );

            const result = await TimesheetService.fetchEntities('worker', '2024-01');

            expect(result).toEqual([]);
        });

        it('should return empty array when response data is empty', async () => {
            vi.mocked(supabase.from).mockReturnValue(
                createMockChain({ data: [], error: null })
            );

            const result = await TimesheetService.fetchEntities('client', '2024-06');

            expect(result).toEqual([]);
        });

        it('should calculate correct date range including last day of month', async () => {
            const chain = createMockChain({ data: [], error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await TimesheetService.fetchEntities('worker', '2024-02');

            // February 2024 has 29 days (leap year)
            expect(chain.gte).toHaveBeenCalledWith('datum', '2024-02-01');
            expect(chain.lte).toHaveBeenCalledWith('datum', '2024-02-29');
        });
    });

    describe('fetchWorkLogs', () => {
        it('should map worker work log fields correctly', async () => {
            const mockData = [
                {
                    id: 10,
                    datum: '2024-01-15',
                    popis: 'Montaz',
                    pocet_hodin: 8,
                    akce: { nazev: 'Projekt X', klient_id: 1, klienti: { nazev: 'Firma A' } },
                    pracovnici: null
                }
            ];

            const chain = createMockChain({ data: mockData, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await TimesheetService.fetchWorkLogs('worker', 1, '2024-01');

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 10,
                date: '2024-01-15',
                project: 'Projekt X',
                description: 'Montaz',
                hours: 8,
                clientName: 'Firma A',
                workerName: undefined,
                workerRole: undefined
            });
        });

        it('should return empty array when data is null', async () => {
            const chain = createMockChain({ data: null, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await TimesheetService.fetchWorkLogs('worker', 1, '2024-01');

            expect(result).toEqual([]);
        });

        it('should return empty array when data is empty', async () => {
            const chain = createMockChain({ data: [], error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await TimesheetService.fetchWorkLogs('client', 5, '2024-03');

            expect(result).toEqual([]);
        });

        it('should throw error when query fails', async () => {
            const chain = createMockChain({ data: null, error: { message: 'DB Error' } });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await expect(TimesheetService.fetchWorkLogs('worker', 1, '2024-01'))
                .rejects.toEqual({ message: 'DB Error' });
        });

        it('should use "Bez projektu" when akce is null', async () => {
            const mockData = [
                {
                    id: 20,
                    datum: '2024-01-20',
                    popis: 'General work',
                    pocet_hodin: 4,
                    akce: null,
                    pracovnici: { jmeno: 'Karel', role: 'worker' }
                }
            ];

            const chain = createMockChain({ data: mockData, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await TimesheetService.fetchWorkLogs('client', 2, '2024-01');

            expect(result[0].project).toBe('Bez projektu');
            expect(result[0].workerName).toBe('Karel');
            expect(result[0].workerRole).toBe('worker');
        });
    });

    describe('getWorkerProfile', () => {
        it('should return {id, name} when worker is found', async () => {
            const chain = createMockChain({ data: { id: 5, jmeno: 'Jan Novak' }, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await TimesheetService.getWorkerProfile('user-uuid-123');

            expect(supabase.from).toHaveBeenCalledWith('pracovnici');
            expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-uuid-123');
            expect(chain.single).toHaveBeenCalled();
            expect(result).toEqual({ id: 5, name: 'Jan Novak' });
        });

        it('should return null when worker is not found', async () => {
            const chain = createMockChain({ data: null, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await TimesheetService.getWorkerProfile('nonexistent-uuid');

            expect(result).toBeNull();
        });
    });

    describe('getLastActiveMonth', () => {
        it('should return formatted "YYYY-MM" for the last active month', async () => {
            const chain = createMockChain({ data: { datum: '2024-03-15' }, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await TimesheetService.getLastActiveMonth(1);

            expect(supabase.from).toHaveBeenCalledWith('prace');
            expect(chain.eq).toHaveBeenCalledWith('pracovnik_id', 1);
            expect(chain.order).toHaveBeenCalledWith('datum', { ascending: false });
            expect(chain.limit).toHaveBeenCalledWith(1);
            expect(result).toBe('2024-03');
        });

        it('should return null when no work data exists', async () => {
            const chain = createMockChain({ data: null, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await TimesheetService.getLastActiveMonth(999);

            expect(result).toBeNull();
        });
    });
});
