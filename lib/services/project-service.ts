import { supabase } from '@/lib/supabase';
import { Project, ProjectFilters } from '@/lib/types/project-types';

export const ProjectService = {
    /**
     * Fetches projects with optional filters.
     */
    async fetchProjects(filters: ProjectFilters = {}): Promise<Project[]> {
        let query = supabase
            .from('akce')
            .select('*, klienti(id, nazev), divisions(id, nazev)')
            .order('datum', { ascending: false });

        if (filters.showCompleted !== undefined) {
            query = query.eq('is_completed', filters.showCompleted);
        }

        if (filters.divisionId) {
            query = query.eq('division_id', filters.divisionId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Map joined data to strictly typed objects if needed, 
        // but supabase-js return type is usually compatible if we blindly cast or valid types.
        // We already defined the types in project-types.ts to match this structure.
        return data as unknown as Project[];
    },

    /**
     * Fetches all divisions for the dropdown.
     */
    async fetchDivisions(): Promise<{ id: number; nazev: string }[]> {
        const { data, error } = await supabase.from('divisions').select('id, nazev').order('id');
        if (error) throw error;
        return data || [];
    },

    /**
     * Fetches all clients for the dropdown.
     */
    async fetchClients(): Promise<{ id: number; nazev: string }[]> {
        const { data, error } = await supabase.from('klienti').select('id, nazev').order('nazev');
        if (error) throw error;
        return data || [];
    },

    /**
     * Helper to ensure a client exists. Returns the client ID.
     */
    async ensureClient(name: string): Promise<number> {
        // 1. Try to find existing (exact match, case insensitive?) -> simple insert usually handles duplicate by error or we just insert.
        // Logic from page.tsx was just INSERT, failing if duplicate? 
        // Supabase insert returns the new row.
        const { data, error } = await supabase
            .from('klienti')
            .insert({ nazev: name })
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    },

    /**
     * Create a new project.
     */
    async createProject(project: Partial<Project>): Promise<Project> {
        // Remove complex joined objects effectively, but typescript Partial<Project> helps.
        // We need to sanitize the payload to match DB columns.
        // The payload construction in page.tsx was manual. 
        // We expect the caller to pass sanitized fields or we sanitise here.

        const { id, klienti, divisions, created_at, ...payload } = project as any;

        // Safety check just in case types included them
        const dbPayload = {
            ...payload,
            // Ensure defaults if missing?
            is_completed: false // Default for new
        };

        const { data, error } = await supabase.from('akce').insert([dbPayload]).select().single();
        if (error) throw error;
        return data;
    },

    /**
     * Update an existing project.
     */
    async updateProject(id: number, project: Partial<Project>): Promise<Project> {
        const { id: _id, klienti, divisions, created_at, ...payload } = project as any;

        const { data, error } = await supabase.from('akce').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    /**
     * Delete a project.
     */
    async deleteProject(id: number): Promise<void> {
        const { error } = await supabase.from('akce').delete().eq('id', id);
        if (error) throw error;
    },

    /**
     * Toggle completion status.
     */
    async toggleProjectStatus(id: number, currentStatus: boolean): Promise<void> {
        const { error } = await supabase
            .from('akce')
            .update({ is_completed: !currentStatus })
            .eq('id', id);
        if (error) throw error;
    }
};
