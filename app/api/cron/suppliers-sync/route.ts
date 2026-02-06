import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { SupplierService } from '@/lib/suppliers/service';
import { DemosTradeProvider } from '@/lib/suppliers/providers/demos-trade';
import { CompanyConfig } from '@/lib/companyConfig';

const supplierSyncSchema = z.object({
    supplierId: z.string().uuid().optional(),
}).optional();

// Register providers (in real app, do this globally)
SupplierService.registerProvider('sftp_demos', new DemosTradeProvider());

export async function POST(req: NextRequest) {
    // Security: Require CRON_SECRET for sync operations
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Feature Flag Check
    if (!CompanyConfig.features.enableInventory) {
        return NextResponse.json({
            success: true,
            status: 'skipped',
            reason: 'Inventory Disabled'
        });
    }

    try {
        const rawBody = await req.json().catch(() => ({}));
        const parsed = supplierSyncSchema.safeParse(rawBody);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { supplierId } = parsed.data || {};

        let query = supabase.from('suppliers').select('*').eq('is_active', true);
        if (supplierId) {
            query = query.eq('id', supplierId);
        }

        const { data: suppliers, error } = await query;

        if (error) throw error;

        const results = [];

        for (const supplier of suppliers || []) {
            try {
                const provider = SupplierService.getProvider(supplier.type as any);
                const items = await provider.fetchItems(supplier.config);

                // Upsert items logic
                // For valid upsert with huge datasets, consider batching or direct SQL.
                // Here we iterate or use upsert.

                // Batch upsert 50 items at a time
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

                    if (upsertError) console.error('Upsert Error:', upsertError);
                    else insertedCount += chunk.length;
                }

                // Update sync timestamp
                await supabase.from('suppliers').update({ last_sync_at: new Date() }).eq('id', supplier.id);

                results.push({ supplier: supplier.name, status: 'success', count: insertedCount });
            } catch (e: any) {
                console.error(`Sync failed for ${supplier.name}:`, e);
                results.push({ supplier: supplier.name, status: 'failed', error: e.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (e: any) {
        console.error('Cron Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
