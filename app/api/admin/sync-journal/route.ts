
import { NextResponse } from 'next/server';
import { AccountingService } from '@/lib/accounting/service';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[AdminSync] Initializing Service...');
        const service = await AccountingService.init();

        console.log('[AdminSync] Starting Journal Sync (5 min deadline)...');
        // Sync 2025
        const count = await service.syncAccountingJournal(Date.now() + 300000);

        return NextResponse.json({ success: true, count });
    } catch (e: any) {
        console.error('[AdminSync] Sync failed:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
