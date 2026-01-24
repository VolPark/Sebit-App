export type ProjectType = 'STANDARD' | 'SERVICE' | 'TM';

export interface Client {
    id: number;
    nazev: string;
}

export interface Division {
    id: number;
    nazev: string;
}

export interface Project {
    id: number;
    created_at?: string;
    nazev: string;
    datum: string; // ISO date string YYYY-MM-DD
    is_completed: boolean;

    klient_id: number | null;
    klienti?: Client; // Joined relation

    division_id: number | null;
    divisions?: Division; // Joined relation

    project_type: ProjectType;

    // Financials
    cena_klient: number; // For STANDARD
    material_klient: number;
    material_my: number;
    odhad_hodin: number;

    // Optional / Computed
    description?: string;
}

export interface ProjectFilters {
    divisionId?: number | null;
    showCompleted?: boolean;
}

export interface ProjectSortOptions {
    key: keyof Project | 'klient' | 'division';
    direction: 'asc' | 'desc';
}
