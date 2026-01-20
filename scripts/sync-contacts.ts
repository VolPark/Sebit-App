
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

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
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Authorization': this.getAuthHeader()
            }
        });
        if (!res.ok) throw new Error(`API Error ${res.status}`);
        return await res.json();
    }

    async getContacts(params: { page?: number, per_page?: number } = {}) {
        const query = new URLSearchParams();
        query.append('page', String(params.page || 1));
        query.append('per_page', String(params.per_page || 100));
        query.append('hidden', 'all'); // Include hidden? Maybe 'false' is better but user example used 'all'
        query.append('vat_payer', 'all');
        query.append('business_entity', 'all');

        return this.fetchApi(`/v1/contacts?${query.toString()}`);
    }
}

async function main() {
    console.log('Starting Contact Sync...');
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

    let page = 1;
    let hasNext = true;
    let totalSynced = 0;

    while (hasNext) {
        console.log(`Fetching page ${page}...`);
        const res: any = await uolClient.getContacts({ page, per_page: 100 });
        const items = res.items || [];

        if (items.length === 0) break;

        const payload = items.map((item: any) => {
            const address = item.addresses?.[0] || {};
            const bank = item.bank_accounts?.[0] || {};

            return {
                id: item.contact_id,
                name: item.name,
                company_number: item.company_number,
                vatin: item.vatin,
                city: address.city,
                street: address.street,
                postal_code: address.postal_code,
                country: item.country_id || address.country_id,
                account_number: bank.iban || bank.bank_account,
                updated_at: new Date().toISOString()
            };
        });

        // Upsert to accounting_contacts
        const { error } = await supabase
            .from('accounting_contacts')
            .upsert(payload, { onConflict: 'id' });

        if (error) {
            console.error('Error upserting contacts:', error);
            // Don't throw, just log and maybe continue?
            // If table missing, this will fail repeatedly.
            if (error.code === '42P01') { // undefined_table
                console.error("Table 'accounting_contacts' does not exist. Please run migration.");
                process.exit(1);
            }
        } else {
            totalSynced += items.length;
        }

        if (res._meta.pagination?.next) page++;
        else hasNext = false;
    }

    console.log(`Synced ${totalSynced} contacts.`);
}

main().catch(console.error);
