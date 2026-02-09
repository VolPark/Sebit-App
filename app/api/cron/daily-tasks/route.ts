import { NextRequest, NextResponse } from 'next/server';
import { updateAllLists, updateList } from '@/lib/aml/sanctions';
import { CompanyConfig } from '@/lib/companyConfig';
import { AccountingService } from '@/lib/accounting/service';
import { createLogger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { SupplierService } from '@/lib/suppliers/service';
import { DemosTradeProvider } from '@/lib/suppliers/providers/demos-trade';
import { getErrorMessage } from '@/lib/errors';
// Zod: No user input to validate (CRON_SECRET auth only)

const log = createLogger({ module: 'Cron:DailyTasks' });

// Register providers
SupplierService.registerProvider('sftp_demos', new DemosTradeProvider());

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Security: Require CRON_SECRET for cron operations
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {};

    try {
        // 1. All Sanction Lists Update (EU, OFAC, CZ, etc.)
        if (CompanyConfig.features.enableAML) {
            log.info('Starting Sanction Lists Update (all active)...');
            try {
                const syncResults = await updateAllLists();
                results.sanctionLists = {
                    status: syncResults.failed.length === 0 ? 'success' : 'partial',
                    success: syncResults.success,
                    failed: syncResults.failed,
                    skipped: syncResults.skipped,
                    totalRecords: syncResults.totalRecords,
                };
            } catch (e: unknown) {
                results.sanctionLists = { status: 'failed', error: getErrorMessage(e) };
            }
        } else {
            results.sanctionLists = { status: 'skipped', reason: 'AML Disabled' };
        }

        // 2. Accounting Sync
        if (CompanyConfig.features.enableAccounting) {
            log.info('Starting Accounting Sync...');
            try {
                const service = await AccountingService.init();
                const stats = await service.syncAll();
                results.accountingSync = { status: 'success', stats };
            } catch (e: unknown) {
                log.error('Accounting Sync Failed:', e);
                results.accountingSync = { status: 'failed', error: getErrorMessage(e) };
            }
        } else {
            results.accountingSync = { status: 'skipped', reason: 'Accounting Disabled' };
        }

        // 3. Suppliers Catalog Sync
        if (CompanyConfig.features.enableInventory) {
            log.info('Starting Suppliers Catalog Sync...');
            try {
                const { data: suppliers, error } = await supabase
                    .from('suppliers')
                    .select('*')
                    .eq('is_active', true);

                if (error) throw error;

                const supplierResults = [];
                for (const supplier of suppliers || []) {
                    try {
                        const provider = SupplierService.getProvider(supplier.type as any);
                        const items = await provider.fetchItems(supplier.config);

                        // Batch upsert
                        const chunkSize = 50;
                        let insertedCount = 0;
                        for (let i = 0; i < items.length; i += chunkSize) {
                            const chunk = items.slice(i, i + chunkSize).map(item => ({
                                supplier_id: supplier.id,
                                code: item.code,
                                name: item.name,
                                description: item.description,
                                price: item.price,
                                currency: item.currency || 'CZK',
                                unit: item.unit,
                                image_url: item.image_url,
                                category: item.category,
                                updated_at: new Date().toISOString()
                            }));

                            const { error: upsertError } = await supabase
                                .from('supplier_items')
                                .upsert(chunk, { onConflict: 'supplier_id, code' });

                            if (!upsertError) insertedCount += chunk.length;
                        }

                        await supabase.from('suppliers').update({ last_sync_at: new Date() }).eq('id', supplier.id);
                        supplierResults.push({ supplier: supplier.name, status: 'success', count: insertedCount });
                    } catch (e: unknown) {
                        supplierResults.push({ supplier: supplier.name, status: 'failed', error: getErrorMessage(e) });
                    }
                }
                results.suppliersSync = { status: 'success', suppliers: supplierResults };
            } catch (e: unknown) {
                log.error('Suppliers Sync Failed:', e);
                results.suppliersSync = { status: 'failed', error: getErrorMessage(e) };
            }
        } else {
            results.suppliersSync = { status: 'skipped', reason: 'Inventory Disabled' };
        }

    } catch (error: unknown) {
        log.error('Daily Task Failed:', error);
        return NextResponse.json({ error: getErrorMessage(error), partialResults: results }, { status: 500 });
    }

    return NextResponse.json({ success: true, results });
}
