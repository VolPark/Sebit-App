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
    stav_id?: number | null;
    // stav: string; // Deprecated, use stav_id relation
    celkova_cena: number;
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
    nabidky_stavy?: NabidkaStav | null;
}

export interface NabidkaPolozka {
    id: number;
    nabidka_id: number;
    nazev: string;
    typ: 'skrinka' | 'spotrebic' | 'sluzba' | 'ostatni';
    mnozstvi: number;
    cena_ks: number;
    celkem: number;
}
