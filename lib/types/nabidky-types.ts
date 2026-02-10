export interface NabidkaStav {
    id: number;
    nazev: string;
    color: string;
    poradi: number;
}

export interface Nabidka {
    id: number;
    cislo?: string;
    nazev: string;
    klient_id?: number | null;
    akce_id?: number | null;
    poznamka?: string;
    description?: string; // Legacy field match
    platnost_do?: string; // New: Validity date
    stav_id?: number | null;
    celkova_cena: number;
    sleva_procenta?: number;
    created_at: string;
    updated_at: string;
    klienti?: {
        id: number;
        nazev: string;
    } | null;
    akce?: {
        id: number;
        nazev: string;
    } | null;
    uvodni_text?: string;
    division_id?: number | null;
    divisions?: {
        id: number;
        nazev: string;
    } | null;
    nabidky_stavy?: NabidkaStav | null;
}

export interface NabidkaPolozka {
    id: number;
    nabidka_id: number;
    nazev: string;
    typ: string; // Dynamic type
    popis?: string; // New: Description
    obrazek_url?: string; // New: Image URL
    mnozstvi: number;
    cena_ks: number;
    sazba_dph?: number; // New: VAT Rate (0, 12, 21)
    celkem: number;
    poradi?: number;
    je_sleva?: boolean;
}
