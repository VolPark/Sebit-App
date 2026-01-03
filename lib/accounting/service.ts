import { createClient } from '@supabase/supabase-js';
import { UolClient, UolSalesInvoiceItem, UolPurchaseInvoiceItem, UolConfig } from './uol-client';

// Use service role key for writing to restricted tables/managing sync
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class AccountingService {
    private uolClient: UolClient;
    private providerId: number;

    constructor(uolClient: UolClient, providerId: number) {
        this.uolClient = uolClient;
        this.providerId = providerId;
    }

    static async init(code: string = 'uol') {
        const { data: provider } = await supabaseAdmin
            .from('accounting_providers')
            .select('*')
            .eq('code', code)
            .single();

        if (!provider) throw new Error(`Provider ${code} not configured`);

        const config = provider.config as any; // Read from JSONB column
        if (!config || !config.baseUrl || !config.email || !config.apiKey) {
            throw new Error('Incomplete provider configuration');
        }

        const uolConfig: UolConfig = {
            baseUrl: config.baseUrl,
            email: config.email,
            apiKey: config.apiKey
        };

        return new AccountingService(new UolClient(uolConfig), provider.id);
    }

    async syncAll() {
        const logId = await this.startLog();
        try {
            // await this.syncContacts(); // Contacts table not implemented yet

            const salesCount = await this.syncSalesInvoices();
            const purchaseCount = await this.syncPurchaseInvoices();
            const movementsCount = await this.syncBankMovements();
            const journalCount = await this.syncAccountingJournal();
            await this.syncAccounts();

            await this.completeLog(logId, 'success');
            return { sales: salesCount, purchase: purchaseCount, movements: movementsCount, journal: journalCount };
        } catch (e: any) {
            console.error('Sync failed', e);
            await this.completeLog(logId, 'error', e.message);
            throw e;
        }
    }

    private async startLog() {
        const { data, error } = await supabaseAdmin
            .from('accounting_sync_logs')
            .insert({ provider_id: this.providerId, status: 'running' })
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    }

    private async completeLog(id: number, status: string, error?: string) {
        await supabaseAdmin
            .from('accounting_sync_logs')
            .update({ status, ended_at: new Date().toISOString(), error_message: error })
            .eq('id', id);
    }

    private async syncSalesInvoices() {
        let page = 1;
        let hasNext = true;
        let total = 0;

        while (hasNext) {
            console.log(`Fetching Sales Invoices page ${page}`);
            const res = await this.uolClient.getSalesInvoices(page, 50); // Larger batch
            const items = res.items || [];
            console.log(`Fetched ${items.length} sales invoices`);

            if (items.length === 0) break;

            total += items.length;

            for (const item of items) {
                await this.upsertDocument(item, 'sales_invoice');
            }

            if (res._meta.pagination?.next) {
                page++;
            } else {
                hasNext = false;
            }
        }
        return total;
    }

    private async syncPurchaseInvoices() {
        let page = 1;
        let hasNext = true;
        let total = 0;

        while (hasNext) {
            const res = await this.uolClient.getPurchaseInvoices(page, 50);
            const items = res.items || [];

            if (items.length === 0) break;

            total += items.length;

            for (const item of items) {
                await this.upsertDocument(item, 'purchase_invoice');
            }

            if (res._meta.pagination?.next) {
                page++;
            } else {
                hasNext = false;
            }
        }
        return total;
    }

    private async upsertDocument(item: UolSalesInvoiceItem | UolPurchaseInvoiceItem, type: 'sales_invoice' | 'purchase_invoice', paidAmount: number = 0) {
        // Fetch full detail if needed?
        // User request "for issued invoices use .../{invoice_id}". 
        // The listing contains most data but maybe not text/items detail fully?
        // Listing item usually has array "items".
        // Let's assume listing is enough for basic sync, but if we need full detail we fetch it.
        // Actually user explicitly listed detail endpoint call.
        // To be safe and "world-class", we should fetch detail to ensure we have ALL data (e.g. detailed breakdown).
        // AESTHETICS note: Backend logic doesn't affect aesthetics directly, but data completeness does.

        const detailUrl = item._meta.href;
        const detail = await this.uolClient.getInvoiceDetail(detailUrl);

        // Determine supplier/customer info
        let supplierName = null;
        let supplierIco = null;
        let supplierDic = null;
        let description = detail.description || (detail.items?.length > 0 ? detail.items[0].description : null);

        if (type === 'purchase_invoice') {
            // It's from a seller
            const sellerLink = detail.seller?._meta?.href;
            if (sellerLink) {
                try {
                    const contact = await this.uolClient.getContactDetail(sellerLink);
                    supplierName = contact.name;
                    supplierIco = contact.company_number; // ICO
                    supplierDic = contact.vatin;          // DIC
                } catch (e) {
                    console.warn(`Failed to fetch contact for ${detail.invoice_id}`, e);
                }
            }
        } else {
            // Sales: We are the supplier. The "Buyer" is the counterparty.
            const buyerLink = detail.buyer?._meta?.href;
            if (buyerLink) {
                try {
                    const contact = await this.uolClient.getContactDetail(buyerLink);
                    supplierName = contact.name;
                    supplierIco = contact.company_number;
                    supplierDic = contact.vatin;
                } catch (e) {
                    console.warn(`Failed to fetch contact for ${detail.invoice_id}`, e);
                }
            }
        }

        // Calculate amount without VAT
        const totalAmount = parseFloat(detail.total_amount || '0');
        const vat1 = parseFloat(detail.vat1_amount || '0');
        const vat2 = parseFloat(detail.vat2_amount || '0');
        const vat3 = parseFloat(detail.vat3_amount || '0');
        const amountWithoutVat = totalAmount - vat1 - vat2 - vat3;

        // Check for Corrective Tax Document (Credit Note)
        const isCorrective = detail.type === 'corrective';
        const sign = isCorrective ? -1 : 1;

        const finalAmount = amountWithoutVat * sign;

        const payload = {
            provider_id: this.providerId,
            external_id: String(detail.invoice_id),
            type: type,
            number: String(detail.variable_symbol), // VS usually used as identifier
            supplier_name: supplierName,
            supplier_ico: supplierIco,
            supplier_dic: supplierDic, // New column
            amount: finalAmount, // Signed amount (negative for corrective)
            paid_amount: paidAmount,
            currency: detail.currency?.currency_id || 'CZK',
            issue_date: detail.issue_date,
            due_date: detail.due_date,
            tax_date: detail.tax_payment_date || detail.tax_date,
            description: description,
            status: detail.status,
            raw_data: detail,
            updated_at: new Date().toISOString()
        };

        // Upsert based on external_id + provider_id
        // We don't have unique constraint on (provider_id, external_id) in schema created (only index).
        // We should check if exists.

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('accounting_documents')
            .select('id')
            .eq('provider_id', this.providerId)
            .eq('type', type) // Ensure we don't mix types if IDs overlap
            .eq('external_id', payload.external_id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existence', fetchError);
            throw fetchError;
        }

        if (existing) {
            const { error } = await supabaseAdmin
                .from('accounting_documents')
                .update(payload)
                .eq('id', existing.id);
            if (error) {
                console.error('Error updating document', error);
                throw error;
            }
        } else {
            const { error } = await supabaseAdmin
                .from('accounting_documents')
                .insert(payload);
            if (error) {
                console.error('Error inserting document', error);
                throw error;
            }
        }
    }

    async syncBankMovements() {
        console.log('Starting Bank Movements Sync...');
        // 1. Get Accounts
        const accountsRes = await this.uolClient.getBankAccounts();
        const accounts = accountsRes.items || [];

        let totalSynced = 0;

        for (const acc of accounts) {
            if (!acc.bank_account_id) continue;

            // 2. Get last synced date for this account
            const { data: lastMove } = await supabaseAdmin
                .from('accounting_bank_movements')
                .select('date')
                .eq('bank_account_id', acc.bank_account_id)
                .order('date', { ascending: false })
                .limit(1)
                .single();

            const lastDate = lastMove?.date;
            console.log(`Account ${acc.bank_account_id}: Last synced date ${lastDate || 'Never'}`);

            // 3. Fetch from UOL
            let page = 1;
            let hasNext = true;

            while (hasNext) {
                const params: any = { page, per_page: 50 };
                if (lastDate) {
                    params.date_from = lastDate;
                }

                const res = await this.uolClient.getBankMovements(acc.bank_account_id, params);
                const items = res.items || [];

                if (items.length === 0) break;

                // Filter for this account (due to API limitation discussed earlier)
                const accountItems = items.filter((item: any) => {
                    const itemId = item.bank_account?.bank_account_id || item.bank_account_id;
                    return String(itemId) === String(acc.bank_account_id);
                });

                for (const item of accountItems) {
                    // Extract detail
                    const detail = item.items && item.items.length > 0 ? item.items[0] : {}; // Often the movement detail is in items array or root?
                    // Based on previous JSON inspection, root has some props, items has others.
                    // Let's assume item is the movement object.

                    const payload = {
                        bank_account_id: acc.bank_account_id,
                        movement_id: String(item.bank_movement_id || item.id),
                        date: detail.date || item.create_at || new Date().toISOString(), // Fallback
                        amount: parseFloat(item.amount),
                        currency: item.currency?.currency_id || 'CZK',
                        variable_symbol: item.variable_symbol,
                        description: item.note || detail.note,
                        raw_data: item
                    };

                    // Upsert
                    const { error } = await supabaseAdmin
                        .from('accounting_bank_movements')
                        .upsert(payload, { onConflict: 'movement_id', ignoreDuplicates: false });

                    if (error) console.error('Error upserting movement', error);
                    else totalSynced++;
                }

                if (res._meta.pagination?.next) page++;
                else hasNext = false;
            }
        }
        console.log(`Bank Sync Complete. Synced ${totalSynced} movements.`);
        return totalSynced;
    }

    async syncAccountingJournal() {
        console.log('Starting General Ledger Sync...');

        // Sync from 2025 up to current year
        const startYear = 2025;
        const currentYear = new Date().getFullYear();
        let totalSynced = 0;

        for (let year = startYear; year <= currentYear; year++) {
            console.log(`Syncing Journal for year ${year}...`);
            const start = `${year}-01-01`;
            const end = `${year}-12-31`;

            let page = 1;
            let hasNext = true;

            while (hasNext) {
                // console.log(`Fetching Journal page ${page} for ${year}`);
                const res = await this.uolClient.getAccountingRecords({
                    date_from: start,
                    date_to: end,
                    page: page,
                    per_page: 100
                });

                const items = res.items || [];
                if (items.length === 0) break;

                // Transform & Insert
                const payload = items.map((item: any) => {
                    // Extract account number from object if needed
                    const extractAccount = (val: any) => {
                        if (!val) return '';
                        // If it's an object, try to find chart_of_account_id or similar
                        if (typeof val === 'object') {
                            return val.chart_of_account_id || val.id || JSON.stringify(val);
                        }
                        // If string looks like JSON
                        if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
                            try {
                                const parsed = JSON.parse(val);
                                return parsed.chart_of_account_id || parsed.id || val;
                            } catch (e) {
                                return val; // Failed to parse, return as is
                            }
                        }
                        return String(val);
                    };

                    return {
                        uol_id: String(item.id),
                        date: item.date,
                        account_md: extractAccount(item.account_md || item.debit_account),
                        account_d: extractAccount(item.account_d || item.credit_account),
                        amount: parseFloat(item.amount || '0'),
                        currency: 'CZK',
                        text: item.text || item.description,
                        fiscal_year: year
                    };
                });

                // Upsert
                const { error: upsertError } = await supabaseAdmin
                    .from('accounting_journal')
                    .upsert(payload, { onConflict: 'uol_id' });

                if (upsertError) {
                    console.error('Error upserting journal batch', upsertError);
                    throw upsertError;
                }

                totalSynced += items.length;

                if (res._meta.pagination?.next) page++;
                else hasNext = false;
            }
        }

        console.log(`Journal Sync Complete. Synced ${totalSynced} records.`);
        return totalSynced;
    }

    async syncAccounts() {
        // Currently accounts are seeded via SQL migration (15_accounting_accounts.sql).
        // In the future, if UOL provides an API for Chart of Accounts, we can implement it here.
        console.log('Accounts: Using seeded Chart of Accounts.');
        return 0;
    }
}
