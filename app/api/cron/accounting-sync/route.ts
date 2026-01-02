import { NextResponse } from 'next/server';
import { AccountingService } from '@/lib/accounting/service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // 1. Security Check
        const authHeader = req.headers.get('Authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Init Service
        const service = await AccountingService.init();

        // 3. Run Sync
        const stats = await service.syncAll();

        return NextResponse.json({ success: true, stats });
    } catch (e: any) {
        console.error('Cron Sync Failed:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
