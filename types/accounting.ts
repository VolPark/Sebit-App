export interface AccountingDocument {
    id: number;
    provider_id: number;
    external_id: string;
    type: 'sales_invoice' | 'purchase_invoice';
    number: string;
    supplier_name: string | null;
    supplier_ico: string | null;
    supplier_dic: string | null;
    amount: number;
    paid_amount?: number; // Fetched from receivables/payables
    currency: string;
    issue_date: string;
    due_date: string;
    tax_date: string;
    description: string | null;
    status: string;
    raw_data: any;
    created_at: string;
    updated_at: string;
    accounting_mappings?: {
        id: number;
        amount: number;
    }[];
}

export interface AccountingProvider {
    id: number;
    code: string;
    name: string;
    is_enabled: boolean;
    config: any;
}
