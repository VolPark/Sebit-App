
export interface UolConfig {
    baseUrl: string;
    email: string;
    apiKey: string;
}

export interface UolPagination {
    first: string;
    last: string;
    next?: string;
    prev?: string;
}

export interface UolMeta {
    href: string;
    pagination?: UolPagination;
}

// Minimal interfaces based on providing listing/detail data
export interface UolSalesInvoiceItem {
    invoice_id: number;
    variable_symbol: number;
    issue_date: string;
    due_date: string;
    total_amount: string; // API returns string "182806.8"
    currency: { currency_id: string };
    buyer: { _meta: { href: string } }; // Link to contact
    text: string | null;
    items: { description: string; total_price: string; quantity: string; unit_price: string }[];
    _meta: { href: string };
}

export interface UolPurchaseInvoiceItem {
    invoice_id: number;
    variable_symbol: number;
    issue_date: string;
    due_date: string;
    total_amount: string;
    currency: { currency_id: string };
    seller: { _meta: { href: string } };
    description: string;
    items: { description: string; total_price: string; }[];
    _meta: { href: string };
}

export interface UolContactItem {
    contact_id: string;
    name: string;
    company_number: string; // ICO
    vatin: string; // DIC
    city: string;
    street: string;
    postal_code: string;
    _meta: { href: string };
}

export class UolClient {
    private config: UolConfig;

    constructor(config: UolConfig) {
        this.config = config;
    }

    private getAuthHeader(): string {
        const credentials = Buffer.from(`${this.config.email}:${this.config.apiKey}`).toString('base64');
        return `Basic ${credentials}`;
    }

    private async fetchApi<T>(endpoint: string): Promise<T> {
        const url = `${this.config.baseUrl}${endpoint}`;
        console.log(`[UOL Client] Fetching ${url}`);

        // Check if endpoint already contains query params
        const separator = endpoint.includes('?') ? '&' : '?';
        // Add page/per_page defaults if needed? 
        // Actually the user wants to sync incrementally, but for listing we might need pagination loop.
        // For now simple fetch.

        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Authorization': this.getAuthHeader()
            }
        });

        if (!res.ok) {
            throw new Error(`UOL API Error ${res.status}: ${res.statusText}`);
        }

        return await res.json() as T;
    }

    async getSalesInvoices(page = 1, perPage = 20) {
        return this.fetchApi<{ items: UolSalesInvoiceItem[], _meta: UolMeta }>(`/v1/sales_invoices?page=${page}&per_page=${perPage}`);
    }

    async getPurchaseInvoices(page = 1, perPage = 20) {
        return this.fetchApi<{ items: UolPurchaseInvoiceItem[], _meta: UolMeta }>(`/v1/purchase_invoices?page=${page}&per_page=${perPage}`);
    }

    async getReceivables() {
        // No pagination logic added yet, just simple fetch as per probe
        return this.fetchApi<{ items: any[] }>(`/v1/receivables`);
    }

    async getInvoiceDetail(endpointUrl: string) {
        // The href in _meta is a full URL, we need to handle that or relative path.
        // If endpointUrl starts with http, use it directly (but with our auth).
        // Verify duplicate base url issue.
        let path = endpointUrl;
        if (endpointUrl.startsWith(this.config.baseUrl)) {
            path = endpointUrl.replace(this.config.baseUrl, '');
        }
        return this.fetchApi<any>(path);
    }

    async getContacts(page = 1, perPage = 20) {
        // hidden=all included to get all relevant contacts? User used hidden=all in example.
        return this.fetchApi<{ items: UolContactItem[], _meta: UolMeta }>(`/v1/contacts?page=${page}&per_page=${perPage}&hidden=all&vat_payer=all&business_entity=all`);
    }

    async getContactDetail(endpointUrl: string) {
        let path = endpointUrl;
        if (endpointUrl.startsWith(this.config.baseUrl)) {
            path = endpointUrl.replace(this.config.baseUrl, '');
        }
        return this.fetchApi<any>(path);
    }
}
