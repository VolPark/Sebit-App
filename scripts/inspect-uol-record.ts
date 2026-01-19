
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Polyfill fetch if needed, but Node 24 has it.
import fs from 'fs';

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
        console.log(`Fetching ${url}`);
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Authorization': this.getAuthHeader()
            }
        });
        if (!res.ok) throw new Error(`API Error ${res.status}`);
        return await res.json();
    }
}
// -------------------------------------

async function main() {
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

    if (!config || !config.baseUrl || !config.email || !config.apiKey) {
        console.error('Invalid config');
        return;
    }

    const uolClient = new UolClient({
        baseUrl: config.baseUrl,
        email: config.email,
        apiKey: config.apiKey
    });

    console.log('Fetching records for 22.06.2025...');
    const res: any = await uolClient.fetchApi('/v1/accounting_records?date_from=2025-06-22&date_till=2025-06-22&per_page=100');

    const items = res.items || [];
    console.log(`Found ${items.length} items`);

    // Look for ID 162
    const item = items.find((i: any) => i.id == 162);

    if (item) {
        console.log('--- FOUND ITEM 162 ---');
        fs.writeFileSync('record_162.json', JSON.stringify(item, null, 2));
        console.log('Written to record_162.json');
    } else {
        console.log('Item 162 not found.');
    }
}

main().catch(console.error);
