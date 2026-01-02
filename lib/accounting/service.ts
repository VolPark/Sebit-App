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

            await this.completeLog(logId, 'success');
            return { sales: salesCount, purchase: purchaseCount };
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
}
