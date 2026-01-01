import { NextResponse } from 'next/server';
import { AccountingService } from '@/lib/accounting/service';

// Force dynamic since we use external APIs/DB
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        // 1. Load Config (Service init does this now)
        // 2. Init Service
        const service = await AccountingService.init();

        // 3. Run Sync
        const stats = await service.syncAll();

        return NextResponse.json({ success: true, stats });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
