import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { UolClient } from '../lib/accounting/uol-client';

dotenv.config({ path: '.env.local' });

async function main() {
    const uol = new UolClient({
        baseUrl: 'https://sebitsolutio.ucetnictvi.uol.cz/api',
        email: 'sebek@sebit.cz',
        apiKey: process.env.UOL_API_KEY || ''
    });

    console.log('Fetching purchase invoices...');
    const res = await uol.getPurchaseInvoices(1, 1);
    const item = res.items[0];

    if (item) {
        console.log('Fetching detail for:', item._meta.href);
        const detail = await uol.getInvoiceDetail(item._meta.href);
        fs.writeFileSync('document_sample.json', JSON.stringify(detail, null, 2));
        console.log('Saved to document_sample.json. Doc Number:', detail.doc_number, 'VS:', detail.variable_symbol, 'ID:', detail.invoice_id);
    } else {
        console.log('No invoices found.');
    }
}

main().catch(console.error);
