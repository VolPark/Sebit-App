
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
    private rateLimiter = new RateLimiter(30, 10000); // 30 requests per 10 seconds (General)
    private receivablesLimiter = new RateLimiter(10, 10000); // 10 requests per 10 seconds (Receivables)

    constructor(config: UolConfig) {
        this.config = config;
    }

    private getAuthHeader(): string {
        const credentials = Buffer.from(`${this.config.email}:${this.config.apiKey}`).toString('base64');
        return `Basic ${credentials}`;
    }

    private async fetchApi<T>(endpoint: string): Promise<T> {
        const url = `${this.config.baseUrl}${endpoint}`;
        // console.log(`[UOL Client] Fetching ${url}`);

        let attempt = 0;
        const maxRetries = 3;

        while (attempt < maxRetries) {
            try {
                // Rate Limiting
                // Check if endpoint relates to receivables
                if (endpoint.includes('/receivables')) {
                    await this.receivablesLimiter.throttle();
                } else {
                    await this.rateLimiter.throttle();
                }

                const res = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': this.getAuthHeader()
                    }
                });

                if (res.status === 429) {
                    console.warn(`[UOL Client] Rate limit exceeded (429) for ${url}. Waiting 10s...`);
                    await new Promise(resolve => setTimeout(resolve, 11000)); // 11s wait
                    attempt++;
                    continue;
                }

                if (!res.ok) {
                    throw new Error(`UOL API Error ${res.status}: ${res.statusText}`);
                }

                return await res.json() as T;
            } catch (e: any) {
                // Rethrow normal errors, but retry on network errors if needed? 
                // For now only retry on 429 handled above. 
                // If it's the last attempt, allow error to bubble.
                if (attempt === maxRetries - 1) throw e;
                throw e; // Rethrow other errors immediately
            }
        }
        throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
    }

    async getSalesInvoices(page = 1, perPage = 50) {
        return this.fetchApi<{ items: UolSalesInvoiceItem[], _meta: UolMeta }>(`/v1/sales_invoices?page=${page}&per_page=${perPage}`);
    }

    async getPurchaseInvoices(page = 1, perPage = 50) {
        return this.fetchApi<{ items: UolPurchaseInvoiceItem[], _meta: UolMeta }>(`/v1/purchase_invoices?page=${page}&per_page=${perPage}`);
    }

    async getReceivables(page = 1, perPage = 50) {
        return this.fetchApi<{ items: any[], _meta: UolMeta }>(`/v1/receivables?page=${page}&per_page=${perPage}`);
    }

    async getPayables(page = 1, perPage = 50) {
        return this.fetchApi<{ items: any[], _meta: UolMeta }>(`/v1/payables?page=${page}&per_page=${perPage}`);
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

    async getContacts(page = 1, perPage = 50) {
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

    async getBankAccounts() {
        return this.fetchApi<{ items: any[], _meta: UolMeta }>('/v1/my_bank_accounts?page=1&per_page=100');
    }

    async getBankAccountDetail(id: string) {
        return this.fetchApi<any>(`/v1/my_bank_accounts/${id}`);
    }

    async getBankMovements(accountId: string, params: { page?: number, per_page?: number } = {}) {
        const query = new URLSearchParams();
        if (params.page) query.append('page', String(params.page));
        if (params.per_page) query.append('per_page', String(params.per_page));

        // We cannot filter by account ID on API side (causes 500). 
        // We must filter manually in the route.

        return this.fetchApi<{ items: any[], _meta: UolMeta }>(`/v1/bank_movements?${query.toString()}`);
    }

    async getAllBankMovements(accountId: string) {
        let allFilteredItems: any[] = [];
        let currentPage = 1;
        const PER_PAGE = 100;
        const MAX_PAGES = 50; // Safety limit

        while (currentPage <= MAX_PAGES) {
            const movementsRes = await this.getBankMovements(accountId, { page: currentPage, per_page: PER_PAGE });
            const pageItems = movementsRes.items || [];

            if (pageItems.length === 0) break;

            const filtered = pageItems.filter((item: any) => {
                const itemId = item.bank_account?.bank_account_id || item.bank_account_id;
                return String(itemId) === String(accountId);
            });

            allFilteredItems = [...allFilteredItems, ...filtered];

            if (!movementsRes._meta.pagination?.next) break;
            currentPage++;
        }
        return allFilteredItems;
    }

    async getAccountingRecords(params: { date_from?: string, date_to?: string, page?: number, per_page?: number } = {}) {
        const query = new URLSearchParams();
        if (params.date_from) query.append('date_from', params.date_from);
        if (params.date_to) query.append('date_till', params.date_to); // check if till or to. Docs usually date_till. Browser search said date_till.
        // wait, browser output for Step 52 said params were ['date_from', 'date_till', ...]
        if (params.page) query.append('page', String(params.page));
        if (params.per_page) query.append('per_page', String(params.per_page));

        return this.fetchApi<{ items: any[], _meta: UolMeta }>(`/v1/accounting_records?${query.toString()}`);
    }
}

class RateLimiter {
    private timestamps: number[] = [];
    private readonly limit: number;
    private readonly windowMs: number;

    constructor(limit: number, windowMs: number) {
        this.limit = limit;
        this.windowMs = windowMs;
    }

    async throttle() {
        while (true) {
            const now = Date.now();
            // Remove timestamps older than the window
            this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

            if (this.timestamps.length < this.limit) {
                this.timestamps.push(now);
                return;
            }

            // Wait for the oldest timestamp to expire
            const oldest = this.timestamps[0];
            const waitTime = this.windowMs - (now - oldest) + 100; // +100ms buffer
            if (waitTime > 0) {
                // console.log(`Rate limit reached (${this.limit}/${this.windowMs}ms). Waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
}
