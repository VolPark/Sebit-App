
import { NextRequest, NextResponse } from 'next/server';
import { AccountingService } from '@/lib/accounting/service';
import { logger } from '@/lib/logger';

const log = logger.sync.child('AdminSync');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Security: Require CRON_SECRET for admin operations
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        log.warn('Unauthorized access attempt to admin sync endpoint');
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        log.info('Initializing Service...');
        const service = await AccountingService.init();

        log.info('Starting Journal Sync (5 min deadline)...');
        // Sync 2025
        const count = await service.syncAccountingJournal(Date.now() + 300000);

        return NextResponse.json({ success: true, count });
    } catch (e: any) {
        log.error('Sync failed:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
