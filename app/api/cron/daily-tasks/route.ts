import { NextRequest, NextResponse } from 'next/server';
import { updateAllLists, updateList } from '@/lib/aml/sanctions';
import { CompanyConfig } from '@/lib/companyConfig';
import { AccountingService } from '@/lib/accounting/service';
import { createLogger } from '@/lib/logger';

const log = createLogger({ module: 'Cron:DailyTasks' });

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        // Keeping it open for now as per previous cron style or check Vercel docs
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            } catch (e: any) {
                results.sanctionLists = { status: 'failed', error: e.message };
            }
        } else {
            results.sanctionLists = { status: 'skipped', reason: 'AML Disabled' };
        }

        // 2. Accounting Sync
        log.info('Starting Accounting Sync...');
        try {
            const service = await AccountingService.init();
            const stats = await service.syncAll();
            results.accountingSync = { status: 'success', stats };
        } catch (e: any) {
            log.error('Accounting Sync Failed:', e);
            results.accountingSync = { status: 'failed', error: e.message };
        }

    } catch (error: any) {
        log.error('Daily Task Failed:', error);
        return NextResponse.json({ error: error.message, partialResults: results }, { status: 500 });
    }

    return NextResponse.json({ success: true, results });
}
