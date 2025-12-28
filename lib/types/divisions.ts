export interface Division {
    id: number;
    nazev: string;
    organization_id: string;
    created_at: string;
}

export interface WorkerDivision {
    id: number;
    worker_id: number;
    division_id: number;
    organization_id: string;
    created_at: string;
}
