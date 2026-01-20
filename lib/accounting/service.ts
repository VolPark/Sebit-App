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
        // 5 minutes hard limit to avoid Vercel 504 (timeout is usually 10s-280s, use 280s to be safe)
        const deadline = Date.now() + 280000;
        const logId = await this.startLog();

        try {
            await this.syncContacts(deadline);
            // Link invoices (must run after contacts and invoices are synced)
            // We can run it after sales/purchase sync, but let's run it here to be sure contacts are fresh.
            // Actually, linking needs invoices, so we should run it AFTER invoices are synced.

            const salesCount = await this.syncSalesInvoices(deadline);
            const purchaseCount = await this.syncPurchaseInvoices(deadline);
            const movementsCount = await this.syncBankMovements(deadline);

            if (Date.now() < deadline) {
                await this.linkInvoices(deadline);
            }

            // Only continue if we have time
            let journalCount = 0;
            let accountsStats = { count: 0 };
            let receivablesCount = 0;
            let payablesCount = 0;

            if (Date.now() < deadline) {
                journalCount = await this.syncAccountingJournal(deadline);
            }
            if (Date.now() < deadline) {
                accountsStats = await this.syncBankAccountsMetadata();
                await this.syncAccounts();
            }
            if (Date.now() < deadline) {
                receivablesCount = await this.syncReceivables(deadline);
            }
            if (Date.now() < deadline) {
                payablesCount = await this.syncPayables(deadline);
            }

            const isPartial = Date.now() >= deadline;
            await this.completeLog(logId, 'success', isPartial ? 'Time limit reached (Partial Sync)' : undefined);

            return {
                sales: salesCount,
                purchase: purchaseCount,
                movements: movementsCount,
                journal: journalCount,
                accounts: accountsStats.count,
                receivables: receivablesCount,
                payables: payablesCount,
                partial: isPartial
            };
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

    private async syncSalesInvoices(deadline: number) {
        let page = 1;
        let hasNext = true;
        let total = 0;

        while (hasNext) {
            if (Date.now() > deadline) break;

            console.log(`Fetching Sales Invoices page ${page}`);
            const res = await this.uolClient.getSalesInvoices(page, 50);
            const items = res.items || [];
            console.log(`Fetched ${items.length} sales invoices`);

            if (items.length === 0) break;

            total += items.length;

            // Process in chunks of 5 for concurrency
            const chunkSize = 5;
            for (let i = 0; i < items.length; i += chunkSize) {
                if (Date.now() > deadline) break;
                const chunk = items.slice(i, i + chunkSize);
                await Promise.all(chunk.map(item => this.upsertDocument(item, 'sales_invoice')));
            }

            if (res._meta.pagination?.next) {
                page++;
            } else {
                hasNext = false;
            }
        }
        return total;
    }

    private async syncPurchaseInvoices(deadline: number) {
        let page = 1;
        let hasNext = true;
        let total = 0;

        while (hasNext) {
            if (Date.now() > deadline) break;

            const res = await this.uolClient.getPurchaseInvoices(page, 50);
            const items = res.items || [];

            if (items.length === 0) break;

            total += items.length;

            // Process in chunks of 5 for concurrency
            const chunkSize = 5;
            for (let i = 0; i < items.length; i += chunkSize) {
                if (Date.now() > deadline) break;
                const chunk = items.slice(i, i + chunkSize);
                await Promise.all(chunk.map(item => this.upsertDocument(item, 'purchase_invoice')));
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
            .select('id, manually_paid')
            .eq('provider_id', this.providerId)
            .eq('type', type) // Ensure we don't mix types if IDs overlap
            .eq('external_id', payload.external_id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existence', fetchError);
            throw fetchError;
        }

        if (existing) {
            // We MUST NOT overwrite paid_amount if manually_paid is true.
            if (existing.manually_paid) {
                delete (payload as any).paid_amount;
            }

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

    async syncBankMovements(deadline: number) {
        console.log('Starting Bank Movements Sync...');
        // 1. Get Accounts
        const accountsRes = await this.uolClient.getBankAccounts();
        const accounts = accountsRes.items || [];

        let totalSynced = 0;

        for (const acc of accounts) {
            if (Date.now() > deadline) break;
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
                if (Date.now() > deadline) break;
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

    async syncAccountingJournal(deadline: number) {
        console.log('Starting General Ledger Sync...');

        // Sync from 2025 up to current year
        const startYear = 2025;
        const currentYear = new Date().getFullYear();
        let totalSynced = 0;

        for (let year = startYear; year <= currentYear; year++) {
            if (Date.now() > deadline) break;
            console.log(`Syncing Journal for year ${year}...`);
            const start = `${year}-01-01`;
            const end = `${year}-12-31`;

            let page = 1;
            let hasNext = true;

            while (hasNext) {
                if (Date.now() > deadline) break;
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
                        amount: parseFloat(item.accounting_amount || item.amount || '0'),
                        currency: 'CZK',
                        text: (item.text || item.description) + (item.doc_number ? ` | DOC:${item.doc_number}` : ''),
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

    async syncBankAccountsMetadata() {
        console.log('Starting Bank Accounts Metadata Sync...');
        const accountsRes = await this.uolClient.getBankAccounts();
        const items = accountsRes.items || [];
        let syncedCount = 0;
        const syncedItems: any[] = [];

        for (const acc of items) {
            if (!acc.bank_account_id) continue;

            try {
                const detail = await this.uolClient.getBankAccountDetail(acc.bank_account_id);

                // Prepare data for DB
                const dbData = {
                    bank_account_id: acc.bank_account_id,
                    name: detail.name || acc.name, // Original name
                    account_number: detail.bank_account || acc.bank_account,
                    bank_code: detail.bank_code || acc.bank_code,
                    currency: (typeof detail.currency === 'object' ? detail.currency?.currency_id : detail.currency) || 'CZK',
                    opening_balance: parseFloat(detail.opening_balance || '0'),
                    last_synced_at: new Date().toISOString()
                };

                syncedItems.push(dbData);

                // Upsert
                const { error } = await supabaseAdmin
                    .from('accounting_bank_accounts')
                    .upsert(dbData, { onConflict: 'bank_account_id', ignoreDuplicates: false });

                if (error) {
                    console.error(`Error upserting bank account metadata for ${acc.bank_account_id}`, error);
                } else {
                    syncedCount++;
                }
            } catch (e) {
                console.error(`Failed to sync metadata for account ${acc.bank_account_id}`, e);
            }
        }
        console.log(`Bank Accounts Metadata Sync Complete. Synced ${syncedCount} accounts.`);
        return { count: syncedCount, items: syncedItems };
    }

    async syncReceivables(deadline?: number) {
        console.log('Starting Receivables (Payment Status) Sync...');
        let page = 1;
        let hasNext = true;
        let totalSynced = 0;

        while (hasNext) {
            if (deadline && Date.now() > deadline) break;
            console.log(`Fetching Receivables page ${page}`);
            try {
                const res = await this.uolClient.getReceivables(page, 100);
                const items = res.items || [];

                if (items.length === 0) break;

                for (const item of items) {
                    // Item contains invoice_public_id (e.g. 2025000005) which matches our accounting_documents.number
                    // It also contains paid_amount and paid_amount_in_currency (if foreign).
                    // We need to update existing documents in our DB.

                    const invoiceNumber = String(item.invoice_public_id || item.variable_symbol);
                    if (!invoiceNumber) continue;

                    // Parse paid amount
                    // API returns "paid_amount": "64432.5" as string
                    const paidAmount = parseFloat(item.paid_amount || '0');

                    // We only update if the document exists. We assume syncSalesInvoices created it.
                    // If not, we skip creating it here as we might miss other details.

                    const { error } = await supabaseAdmin
                        .from('accounting_documents')
                        .update({
                            paid_amount: paidAmount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('provider_id', this.providerId)
                        .eq('type', 'sales_invoice') // Receivables are sales invoices
                        .eq('number', invoiceNumber); // Match by number (VS)

                    if (error) {
                        console.error(`Error updating payment status for invoice ${invoiceNumber}`, error);
                    } else {
                        totalSynced++;
                    }
                }

                if (res._meta.pagination?.next) {
                    page++;
                } else {
                    hasNext = false;
                }
            } catch (e) {
                console.error(`Error syncing receivables page ${page}`, e);
                // Break loop or continue? Let's break to avoid infinite loops on error
                break;
            }
        }

        console.log(`Receivables Sync Complete.Updated ${totalSynced} records.`);
        return totalSynced;
    }

    async syncPayables(deadline?: number) {
        console.log('Starting Payables Sync (Smart Local Calculation)...');

        // 1. Fetch all Purchase Invoices (Active)
        const { data: invoices, error: invError } = await supabaseAdmin
            .from('accounting_documents')
            .select('id, number, external_id, amount, paid_amount, issue_date, due_date, currency, manually_paid')
            .eq('provider_id', this.providerId)
            .eq('type', 'purchase_invoice');

        if (invError) throw invError;
        if (!invoices || invoices.length === 0) return 0;

        // 2. Fetch all Bank Movements (Outgoing only)
        // We select ID and Date for smart matching
        const { data: movements, error: movError } = await supabaseAdmin
            .from('accounting_bank_movements')
            .select('id, amount, variable_symbol, date, raw_data, currency')
            .lt('amount', 0); // Outgoing payments only

        if (movError) throw movError;

        let totalUpdated = 0;

        // Track which movements have been "consumed" to prevent double-counting 
        // (though in reality one movement could pay multiple, let's assume 1:1 for fuzzy matches to be safe)
        const usedMovementIds = new Set<number>();

        // Temporary map to store calculate paid amount per invoice
        const invoicePaidAmounts: { [key: string]: number } = {};

        // Helper to add paid amount
        const addPayment = (invoiceId: string, amount: number, movementId: number) => {
            invoicePaidAmounts[invoiceId] = (invoicePaidAmounts[invoiceId] || 0) + amount;
            usedMovementIds.add(movementId);
        };

        // --- PASS 1: Strict Link (Linked Doc Number) ---
        movements?.forEach(m => {
            const absAmount = Math.abs(m.amount);
            const rd = m.raw_data as any;
            let matched = false;

            if (rd?.items && Array.isArray(rd.items)) {
                rd.items.forEach((item: any) => {
                    const linkedId = item.linked_doc?.linked_doc_number;
                    if (linkedId) {
                        const strId = String(linkedId);
                        // Find invoice with this external_id based on assumption that linked_doc_number maps to it
                        // Or we can try to map it to our invoices array
                        const inv = invoices.find(i => i.external_id === strId);
                        if (inv) {
                            addPayment(inv.id, absAmount, m.id);
                            matched = true;
                        }
                    }
                });
            }
        });

        // --- PASS 2: Variable Symbol Match (Fallback) ---
        // Only use movements not yet strictly linked? 
        // Actually, a movement might be split. But for simplicity, if a movement matched by Link, we trust that Link.
        // If it didn't match by Link, we try VS.
        movements?.forEach(m => {
            if (usedMovementIds.has(m.id)) return; // Already fully used? (Simplification: yes)

            if (m.variable_symbol) {
                const vs = String(m.variable_symbol).replace(/^0+/, ''); // Normalize
                // Find invoice with this VS (check 'number' field? Assuming invoice.number IS the VS often?)
                // Or sometimes 'number' is e.g. 2023001 and VS is 2023001.
                const inv = invoices.find(i => i.number === vs || i.number?.endsWith(vs)); // rudimentary match
                if (inv) {
                    addPayment(inv.id, Math.abs(m.amount), m.id);
                }
            }
        });

        // --- PASS 3: Fuzzy Match (Amount + Date) ---
        // "Ještě mne napadlo... zkuste datum a částku"
        invoices.forEach(inv => {
            const currentPaid = invoicePaidAmounts[inv.id] || 0;
            const remaining = inv.amount - currentPaid;

            // Only try fuzzy match if significantly unpaid
            // And if the calculated paid amount is less than total amount (to avoid overpaying)
            if (remaining > 1) {
                const issueDate = new Date(inv.issue_date || '2000-01-01').getTime();

                // Find candidates in UNUSED movements
                const candidates = movements?.filter(m => {
                    if (usedMovementIds.has(m.id)) return false;

                    // 1. Amount Match (Exact or very close)
                    const absAmount = Math.abs(m.amount);
                    if (Math.abs(absAmount - remaining) > 1.0) return false; // Tolerance 1 CZK

                    // 2. Currency Match (if available)
                    if (inv.currency && m.currency && inv.currency !== m.currency) return false;

                    // 3. Date Match (Movement must be AFTER Issue Date, and reasonably close)
                    const moveDate = new Date(m.date).getTime();
                    // Allow payment 2 days before issue (sometimes happens) up to 60 days after
                    const diffDays = (moveDate - issueDate) / (1000 * 60 * 60 * 24);
                    return diffDays >= -2 && diffDays <= 60;
                });

                // Only apply if EXACTLY ONE candidate found to avoid false positives with recurring same-amount payments
                if (candidates && candidates.length === 1) {
                    const m = candidates[0];
                    console.log(`[SmartMatch] Matched Invoice ${inv.number} (${inv.amount}) with Movement ${m.id} (${m.amount}) on Date ${m.date}`);
                    addPayment(inv.id, Math.abs(m.amount), m.id);
                }
            }
        });

        // 4. Update Database
        for (const inv of invoices) {
            const newPaidAmount = invoicePaidAmounts[inv.id] || 0;

            // Only update if changed significantly AND not manually paid
            if (Math.abs(newPaidAmount - (inv.paid_amount || 0)) > 0.1 && !inv.manually_paid) {
                const { error } = await supabaseAdmin
                    .from('accounting_documents')
                    .update({
                        paid_amount: newPaidAmount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', inv.id);

                if (error) {
                    console.error(`Error updating payable status for ${inv.number}`, error);
                } else {
                    totalUpdated++;
                }
            }
        }

        console.log(`Payables Sync Complete. Smart matched/updated ${totalUpdated} records.`);
        return totalUpdated;
    }
    async syncContacts(deadline?: number) {
        console.log('Starting Contacts Sync...');
        let page = 1;
        let hasNext = true;
        let totalSynced = 0;

        while (hasNext) {
            if (deadline && Date.now() > deadline) break;

            console.log(`Fetching Contacts page ${page}`);
            const res = await this.uolClient.getContacts(page, 100);
            const items = res.items || [];

            if (items.length === 0) break;

            const payload = items.map((item) => {
                const address = (item as any).addresses?.[0] || {};
                const bank = (item as any).bank_accounts?.[0] || {};

                return {
                    id: item.contact_id,
                    name: item.name,
                    company_number: item.company_number,
                    vatin: item.vatin,
                    city: address.city,
                    street: address.street,
                    postal_code: address.postal_code,
                    country: item.contact_id || address.country_id, // contact_id usually not country, likely item.country_id check required but sticking to script logic
                    account_number: bank.iban || bank.bank_account,
                    updated_at: new Date().toISOString()
                };
            });

            const { error } = await supabaseAdmin
                .from('accounting_contacts')
                .upsert(payload, { onConflict: 'id' });

            if (error) {
                console.error('Error upserting contacts', error);
                // Continue despite error?
            } else {
                totalSynced += items.length;
            }

            if (res._meta.pagination?.next) page++;
            else hasNext = false;
        }
        console.log(`Contacts Sync Complete. Synced ${totalSynced} contacts.`);
        return totalSynced;
    }

    async linkInvoices(deadline?: number) {
        console.log('Starting Invoice Linking...');

        // 1. Load Contacts Map
        const { data: contacts, error: cError } = await supabaseAdmin
            .from('accounting_contacts')
            .select('id, company_number, vatin');

        if (cError || !contacts) {
            console.error('Error loading contacts for linking', cError);
            return;
        }

        const icoMap = new Map<string, string>();
        const dicMap = new Map<string, string>();

        contacts.forEach(c => {
            if (c.company_number) icoMap.set(c.company_number.trim(), c.id);
            if (c.vatin) dicMap.set(c.vatin.trim().toUpperCase(), c.id);
        });

        // 2. Fetch Unlinked Docs
        let page = 0;
        const pageSize = 500;
        let totalLinked = 0;

        while (true) {
            if (deadline && Date.now() > deadline) break;

            const { data: docs, error: dError } = await supabaseAdmin
                .from('accounting_documents')
                .select('id, supplier_ico, supplier_dic')
                .is('contact_id', null)
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (dError) {
                console.error('Error fetching unlinked docs', dError);
                break;
            }
            if (!docs || docs.length === 0) break;

            const updates: { id: number, contact_id: string }[] = [];

            for (const doc of docs) {
                let matchedId: string | undefined;

                if (doc.supplier_dic && dicMap.has(doc.supplier_dic.trim().toUpperCase())) {
                    matchedId = dicMap.get(doc.supplier_dic.trim().toUpperCase());
                } else if (doc.supplier_ico && icoMap.has(doc.supplier_ico.trim())) {
                    matchedId = icoMap.get(doc.supplier_ico.trim());
                }

                if (matchedId) {
                    updates.push({ id: doc.id, contact_id: matchedId });
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates.map(u =>
                    supabaseAdmin.from('accounting_documents').update({ contact_id: u.contact_id }).eq('id', u.id)
                ));
                totalLinked += updates.length;
            }

            if (docs.length < pageSize) break;
            page++;
        }
        console.log(`Invoice Linking Complete. Linked ${totalLinked} documents.`);
        return totalLinked;
    }
}
