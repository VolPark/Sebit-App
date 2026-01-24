export type TransactionType = 'Příjem' | 'Výdej';

export interface Division {
    id: number;
    nazev: string;
}

export interface Transaction {
    id: number;
    created_at?: string;
    datum: string; // ISO date

    typ: TransactionType;
    castka: number;
    popis: string;

    // Relations
    division_id?: number | null;
    divisions?: Division;

    akce_id?: number | null;
    akce?: { id: number; nazev: string; klient_id?: number }; // Joined

    // Details
    variable_symbol?: string;
    invoice_number?: string;
    supplier_ico?: string;
    supplier_name?: string;
    category?: string;
    payment_method?: string;
    due_date?: string;
}

export interface FixedCost {
    id: number;
    rok: number;
    mesic: number;
    nazev: string;
    castka: number;

    division_id?: number | null;
    divisions?: Division;

    // Helper field to distinguish manual vs imported (accounting)
    source?: 'manual' | 'accounting';
    doc_id?: string; // If accounting
}

export interface TransactionFilters {
    divisionId?: number | null;
}
