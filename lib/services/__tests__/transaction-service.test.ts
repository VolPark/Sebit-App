import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

import { TransactionService } from '../transaction-service';
import { supabase } from '@/lib/supabase';

function createMockChain(resolvedData: any) {
    const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
    };
    chain.then = vi.fn((resolve) => resolve(resolvedData));
    return chain;
}

describe('TransactionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchTransactions', () => {
        it('should return all 4 data sets without filters', async () => {
            const mockTransactions = [{ id: 1, castka: 1000 }];
            const mockDivisions = [{ id: 1, nazev: 'Divize A' }];
            const mockProjects = [{ id: 1, nazev: 'Projekt', klient_id: 1 }];
            const mockClients = [{ id: 1, nazev: 'Klient', ico: '12345678' }];

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'finance') {
                    return createMockChain({ data: mockTransactions, error: null });
                } else if (table === 'divisions') {
                    return createMockChain({ data: mockDivisions, error: null });
                } else if (table === 'akce') {
                    return createMockChain({ data: mockProjects, error: null });
                } else if (table === 'klienti') {
                    return createMockChain({ data: mockClients, error: null });
                }
                return createMockChain({ data: [], error: null });
            });

            const result = await TransactionService.fetchTransactions();

            expect(result.transactions).toEqual(mockTransactions);
            expect(result.divisions).toEqual(mockDivisions);
            expect(result.projects).toEqual(mockProjects);
            expect(result.clients).toEqual(mockClients);
        });

        it('should apply divisionId filter to finance query', async () => {
            const financeChain = createMockChain({ data: [], error: null });

            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'finance') {
                    return financeChain;
                }
                return createMockChain({ data: [], error: null });
            });

            await TransactionService.fetchTransactions({ divisionId: 3 });

            expect(financeChain.eq).toHaveBeenCalledWith('division_id', 3);
        });

        it('should throw error when finance query fails', async () => {
            vi.mocked(supabase.from).mockImplementation((table: string) => {
                if (table === 'finance') {
                    return createMockChain({ data: null, error: { message: 'DB Error' } });
                }
                return createMockChain({ data: [], error: null });
            });

            await expect(TransactionService.fetchTransactions())
                .rejects.toEqual({ message: 'DB Error' });
        });

        it('should return empty arrays when all queries return null data', async () => {
            vi.mocked(supabase.from).mockImplementation(() => {
                return createMockChain({ data: null, error: null });
            });

            const result = await TransactionService.fetchTransactions();

            expect(result.transactions).toEqual([]);
            expect(result.divisions).toEqual([]);
            expect(result.projects).toEqual([]);
            expect(result.clients).toEqual([]);
        });
    });

    describe('createTransaction', () => {
        it('should strip joined fields and insert to finance', async () => {
            const chain = createMockChain({ error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const input = {
                id: 99,
                castka: 5000,
                typ: 'prijem',
                datum: '2024-01-15',
                divisions: { id: 1, nazev: 'Div' },
                akce: { id: 2, nazev: 'Project' },
                created_at: '2024-01-01',
            } as any;

            await TransactionService.createTransaction(input);

            expect(supabase.from).toHaveBeenCalledWith('finance');
            expect(chain.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    castka: 5000,
                    typ: 'prijem',
                    datum: '2024-01-15',
                })
            );
            const insertArg = chain.insert.mock.calls[0][0];
            expect(insertArg).not.toHaveProperty('id');
            expect(insertArg).not.toHaveProperty('divisions');
            expect(insertArg).not.toHaveProperty('akce');
            expect(insertArg).not.toHaveProperty('created_at');
        });

        it('should throw on insert error', async () => {
            const chain = createMockChain({ error: { message: 'Insert failed' } });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await expect(TransactionService.createTransaction({ castka: 100 } as any))
                .rejects.toEqual({ message: 'Insert failed' });
        });
    });

    describe('updateTransaction', () => {
        it('should strip joined fields and update by id', async () => {
            const chain = createMockChain({ error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const input = {
                id: 10,
                castka: 7000,
                divisions: { id: 1, nazev: 'Div' },
                akce: { id: 2, nazev: 'Project' },
                created_at: '2024-01-01',
            } as any;

            await TransactionService.updateTransaction(10, input);

            expect(supabase.from).toHaveBeenCalledWith('finance');
            expect(chain.update).toHaveBeenCalledWith(
                expect.objectContaining({ castka: 7000 })
            );
            const updateArg = chain.update.mock.calls[0][0];
            expect(updateArg).not.toHaveProperty('id');
            expect(updateArg).not.toHaveProperty('divisions');
            expect(updateArg).not.toHaveProperty('akce');
            expect(updateArg).not.toHaveProperty('created_at');
            expect(chain.eq).toHaveBeenCalledWith('id', 10);
        });
    });

    describe('deleteTransaction', () => {
        it('should call delete with the correct id', async () => {
            const chain = createMockChain({ error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await TransactionService.deleteTransaction(15);

            expect(supabase.from).toHaveBeenCalledWith('finance');
            expect(chain.delete).toHaveBeenCalled();
            expect(chain.eq).toHaveBeenCalledWith('id', 15);
        });

        it('should throw on delete error', async () => {
            const chain = createMockChain({ error: { message: 'Cannot delete' } });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await expect(TransactionService.deleteTransaction(15))
                .rejects.toEqual({ message: 'Cannot delete' });
        });
    });
});
