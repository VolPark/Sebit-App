
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load env
dotenv.config({ path: '.env.local' });

// --- UolClient Mini Implementation ---
interface UolConfig {
    baseUrl: string;
    email: string;
    apiKey: string;
}

class UolClient {
    private config: UolConfig;

    constructor(config: UolConfig) {
        this.config = config;
    }

    private getAuthHeader(): string {
        const credentials = Buffer.from(`${this.config.email}:${this.config.apiKey}`).toString('base64');
        return `Basic ${credentials}`;
    }

    async fetchApi(endpoint: string) {
        const url = `${this.config.baseUrl}${endpoint}`;
        // console.log(`Fetching ${url}`);
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Authorization': this.getAuthHeader()
            }
        });
        if (!res.ok) throw new Error(`API Error ${res.status}`);
        return await res.json();
    }

    async getAccountingRecords(params: { date_from?: string, date_to?: string, page?: number, per_page?: number } = {}) {
        const query = new URLSearchParams();
        if (params.date_from) query.append('date_from', params.date_from);
        if (params.date_to) query.append('date_till', params.date_to);
        if (params.page) query.append('page', String(params.page));
        if (params.per_page) query.append('per_page', String(params.per_page));

        return this.fetchApi(`/v1/accounting_records?${query.toString()}`);
    }
}

async function main() {
    console.log('Starting Standalone Sync...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Provider Config
    const { data: provider } = await supabase
        .from('accounting_providers')
        .select('*')
        .eq('code', 'uol')
        .single();

    if (!provider) {
        console.error('Provider not found');
        return;
    }

    const config = provider.config as any;
    const uolClient = new UolClient({
        baseUrl: config.baseUrl,
        email: config.email,
        apiKey: config.apiKey
    });

    // Sync 2025
    const year = 2025;
    const start = `${year}-01-01`;
    const end = `${year}-12-31`; // Sync whole year

    let page = 1;
    let hasNext = true;
    let totalSynced = 0;

    console.log(`Syncing Journal for year ${year}...`);

    while (hasNext) {
        console.log(`Fetching page ${page}...`);
        const res: any = await uolClient.getAccountingRecords({
            date_from: start,
            date_to: end,
            page: page,
            per_page: 100
        });

        const items = res.items || [];
        if (items.length === 0) break;

        const payload = items.map((item: any) => {
            const extractAccount = (val: any) => {
                if (!val) return '';
                if (typeof val === 'object') {
                    return val.chart_of_account_id || val.id || JSON.stringify(val);
                }
                if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
                    try {
                        const parsed = JSON.parse(val);
                        return parsed.chart_of_account_id || parsed.id || val;
                    } catch (e) {
                        return val;
                    }
                }
                return String(val);
            };

            // FIX: Use accounting_amount if available
            const amount = parseFloat(item.accounting_amount || item.amount || '0');

            return {
                uol_id: String(item.id),
                date: item.date,
                account_md: extractAccount(item.account_md || item.debit_account),
                account_d: extractAccount(item.account_d || item.credit_account),
                amount: amount,
                currency: 'CZK',
                text: item.text || item.description,
                fiscal_year: year
            };
        });

        const { error } = await supabase
            .from('accounting_journal')
            .upsert(payload, { onConflict: 'uol_id' });

        if (error) {
            console.error('Error upserting:', error);
            throw error;
        }

        totalSynced += items.length;

        if (res._meta.pagination?.next) page++;
        else hasNext = false;
    }

    console.log(`Sync Complete. Synced ${totalSynced} records.`);
}

main().catch(console.error);
