import { NextRequest, NextResponse } from 'next/server';
import { AccountingService } from '@/lib/accounting/service';
import { verifySession } from '@/lib/api/auth';

// Force dynamic since we use external APIs/DB
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // Security: Require either CRON_SECRET (for cron jobs) OR user session (for manual sync)
    const authHeader = req.headers.get('Authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const session = await verifySession(req);

    if (!isCronAuth && !session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

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
