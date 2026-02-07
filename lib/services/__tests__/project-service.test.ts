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
            single: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

import { ProjectService } from '../project-service';
import { supabase } from '@/lib/supabase';

function createMockChain(resolvedData: any) {
    const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
    };
    chain.then = vi.fn((resolve) => resolve(resolvedData));
    return chain;
}

describe('ProjectService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchProjects', () => {
        it('should query akce with joins and return projects without filters', async () => {
            const mockProjects = [
                { id: 1, nazev: 'Projekt A', is_completed: false, klienti: { id: 1, nazev: 'Firma' }, divisions: { id: 1, nazev: 'Divize' } },
            ];

            const chain = createMockChain({ data: mockProjects, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await ProjectService.fetchProjects();

            expect(supabase.from).toHaveBeenCalledWith('akce');
            expect(chain.select).toHaveBeenCalledWith('*, klienti(id, nazev), divisions(id, nazev)');
            expect(chain.order).toHaveBeenCalledWith('datum', { ascending: false });
            // No eq calls for filters
            expect(result).toEqual(mockProjects);
        });

        it('should apply showCompleted filter when provided', async () => {
            const chain = createMockChain({ data: [], error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await ProjectService.fetchProjects({ showCompleted: true });

            expect(chain.eq).toHaveBeenCalledWith('is_completed', true);
        });

        it('should apply divisionId filter when provided', async () => {
            const chain = createMockChain({ data: [], error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await ProjectService.fetchProjects({ divisionId: 5 });

            expect(chain.eq).toHaveBeenCalledWith('division_id', 5);
        });

        it('should throw error on database failure', async () => {
            const chain = createMockChain({ data: null, error: { message: 'Query failed' } });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await expect(ProjectService.fetchProjects())
                .rejects.toEqual({ message: 'Query failed' });
        });
    });

    describe('fetchDivisions', () => {
        it('should return divisions ordered by id', async () => {
            const mockDivisions = [
                { id: 1, nazev: 'Divize A' },
                { id: 2, nazev: 'Divize B' },
            ];

            const chain = createMockChain({ data: mockDivisions, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await ProjectService.fetchDivisions();

            expect(supabase.from).toHaveBeenCalledWith('divisions');
            expect(chain.select).toHaveBeenCalledWith('id, nazev');
            expect(chain.order).toHaveBeenCalledWith('id');
            expect(result).toEqual(mockDivisions);
        });

        it('should throw on error', async () => {
            const chain = createMockChain({ data: null, error: { message: 'Divisions error' } });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await expect(ProjectService.fetchDivisions())
                .rejects.toEqual({ message: 'Divisions error' });
        });
    });

    describe('fetchClients', () => {
        it('should return clients ordered by nazev', async () => {
            const mockClients = [
                { id: 1, nazev: 'Alpha' },
                { id: 2, nazev: 'Beta' },
            ];

            const chain = createMockChain({ data: mockClients, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await ProjectService.fetchClients();

            expect(supabase.from).toHaveBeenCalledWith('klienti');
            expect(chain.select).toHaveBeenCalledWith('id, nazev');
            expect(chain.order).toHaveBeenCalledWith('nazev');
            expect(result).toEqual(mockClients);
        });
    });

    describe('ensureClient', () => {
        it('should insert a new client and return the id', async () => {
            const chain = createMockChain({ data: { id: 42 }, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const result = await ProjectService.ensureClient('Nova Firma');

            expect(supabase.from).toHaveBeenCalledWith('klienti');
            expect(chain.insert).toHaveBeenCalledWith({ nazev: 'Nova Firma' });
            expect(chain.select).toHaveBeenCalledWith('id');
            expect(chain.single).toHaveBeenCalled();
            expect(result).toBe(42);
        });

        it('should throw on insert error', async () => {
            const chain = createMockChain({ data: null, error: { message: 'Duplicate' } });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await expect(ProjectService.ensureClient('Existing'))
                .rejects.toEqual({ message: 'Duplicate' });
        });
    });

    describe('createProject', () => {
        it('should strip joined fields and set is_completed to false', async () => {
            const chain = createMockChain({ data: { id: 10, nazev: 'New Project', is_completed: false }, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const input = {
                id: 999,
                nazev: 'New Project',
                klient_id: 1,
                klienti: { id: 1, nazev: 'Client' },
                divisions: { id: 2, nazev: 'Div' },
                created_at: '2024-01-01',
            } as any;

            const result = await ProjectService.createProject(input);

            expect(supabase.from).toHaveBeenCalledWith('akce');
            expect(chain.insert).toHaveBeenCalledWith([
                expect.objectContaining({
                    nazev: 'New Project',
                    klient_id: 1,
                    is_completed: false,
                })
            ]);
            // Verify stripped fields are NOT in the insert payload
            const insertArg = chain.insert.mock.calls[0][0][0];
            expect(insertArg).not.toHaveProperty('id');
            expect(insertArg).not.toHaveProperty('klienti');
            expect(insertArg).not.toHaveProperty('divisions');
            expect(insertArg).not.toHaveProperty('created_at');
            expect(result).toEqual({ id: 10, nazev: 'New Project', is_completed: false });
        });
    });

    describe('updateProject', () => {
        it('should strip joined fields and update by id', async () => {
            const chain = createMockChain({ data: { id: 5, nazev: 'Updated' }, error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            const input = {
                id: 5,
                nazev: 'Updated',
                klienti: { id: 1, nazev: 'Client' },
                divisions: { id: 2, nazev: 'Div' },
                created_at: '2024-01-01',
            } as any;

            const result = await ProjectService.updateProject(5, input);

            expect(supabase.from).toHaveBeenCalledWith('akce');
            expect(chain.update).toHaveBeenCalledWith(
                expect.objectContaining({ nazev: 'Updated' })
            );
            const updateArg = chain.update.mock.calls[0][0];
            expect(updateArg).not.toHaveProperty('id');
            expect(updateArg).not.toHaveProperty('klienti');
            expect(updateArg).not.toHaveProperty('divisions');
            expect(updateArg).not.toHaveProperty('created_at');
            expect(chain.eq).toHaveBeenCalledWith('id', 5);
            expect(result).toEqual({ id: 5, nazev: 'Updated' });
        });
    });

    describe('deleteProject', () => {
        it('should call delete with the correct id', async () => {
            const chain = createMockChain({ error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await ProjectService.deleteProject(7);

            expect(supabase.from).toHaveBeenCalledWith('akce');
            expect(chain.delete).toHaveBeenCalled();
            expect(chain.eq).toHaveBeenCalledWith('id', 7);
        });

        it('should throw on delete error', async () => {
            const chain = createMockChain({ error: { message: 'FK constraint' } });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await expect(ProjectService.deleteProject(7))
                .rejects.toEqual({ message: 'FK constraint' });
        });
    });

    describe('toggleProjectStatus', () => {
        it('should toggle true to false', async () => {
            const chain = createMockChain({ error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await ProjectService.toggleProjectStatus(3, true);

            expect(supabase.from).toHaveBeenCalledWith('akce');
            expect(chain.update).toHaveBeenCalledWith({ is_completed: false });
            expect(chain.eq).toHaveBeenCalledWith('id', 3);
        });

        it('should toggle false to true', async () => {
            const chain = createMockChain({ error: null });
            vi.mocked(supabase.from).mockReturnValue(chain);

            await ProjectService.toggleProjectStatus(3, false);

            expect(chain.update).toHaveBeenCalledWith({ is_completed: true });
            expect(chain.eq).toHaveBeenCalledWith('id', 3);
        });
    });
});
