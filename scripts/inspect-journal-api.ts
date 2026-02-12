
import { UolClient } from '../lib/accounting/uol-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function inspect() {
    // @ts-expect-error - Debug script, config would be loaded from env in real usage
    const client = new UolClient({
        baseUrl: process.env.UOL_API_BASE_URL || '',
        email: process.env.UOL_API_EMAIL || '',
        apiKey: process.env.UOL_API_KEY || ''
    });
    console.log('Fetching Journal for 2025-10-01 to 2025-10-05...');

    const res = await client.getAccountingRecords({
        date_from: '2025-10-01',
        date_to: '2025-10-31',
        page: 1,
        per_page: 5
    });

    if (res.items && res.items.length > 0) {
        console.log('First item keys:', Object.keys(res.items[0]));
        console.log('First item doc_number:', res.items[0].doc_number);
        console.log('First item text:', res.items[0].text);
        console.log('Full First Item:', JSON.stringify(res.items[0], null, 2));
    } else {
        console.log('No items found.');
    }
}

inspect().catch(console.error);
