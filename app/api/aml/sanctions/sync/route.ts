import { NextRequest, NextResponse } from 'next/server';
import { CompanyConfig } from '@/lib/companyConfig';
import { updateAllLists, updateList } from '@/lib/aml/sanctions';
import { SanctionListId, getActiveListIds, logConfigStatus } from '@/lib/aml/config';
import { createLogger } from '@/lib/logger';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

const logger = createLogger({ module: 'API:AML:Sync' });

/**
 * POST /api/aml/sanctions/sync
 * 
 * Updates all active sanction lists or a specific one.
 * 
 * Body (optional):
 * - listId: 'EU' | 'OFAC' | 'CZ' | 'AMLA' - Update only this list
 * - all: boolean - Update all active lists (default if no listId)
 */
export async function POST(req: NextRequest) {
    // Security: Allow CRON_SECRET (for cron jobs) or user session (for admin UI)
    const authHeader = req.headers.get('Authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!isCron) {
        const session = await verifySession(req);
        if (!session) return unauthorizedResponse();
    }

    if (!CompanyConfig.features.enableAML) {
        return NextResponse.json({ error: 'AML Module Disabled' }, { status: 403 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { listId } = body as { listId?: SanctionListId };

        // Log current configuration
        logConfigStatus();

        if (listId) {
            // Update specific list
            logger.info(`Updating single list: ${listId}`);
            const result = await updateList(listId);

            if (!result.success) {
                return NextResponse.json({
                    success: false,
                    error: result.error
                }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                message: `Successfully updated ${result.records} entities from ${listId}.`,
                listId,
                records: result.records
            });
        }

        // Update all active lists
        logger.info('Updating all active sanction lists...');
        const activeIds = getActiveListIds();
        logger.info(`Active lists: ${activeIds.join(', ')}`);

        const result = await updateAllLists();

        return NextResponse.json({
            success: result.failed.length === 0,
            message: `Updated ${result.success.length} lists with ${result.totalRecords} total records.`,
            details: {
                success: result.success,
                failed: result.failed,
                skipped: result.skipped,
                totalRecords: result.totalRecords
            }
        });

    } catch (error: any) {
        logger.error('Sanctions Sync Failed:', error);
        return NextResponse.json({
            error: error.message || 'Update failed'
        }, { status: 500 });
    }
}

/**
 * GET /api/aml/sanctions/sync
 * 
 * Returns current configuration status
 */
export async function GET(req: NextRequest) {
    // Security: Verify user session
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    if (!CompanyConfig.features.enableAML) {
        return NextResponse.json({ error: 'AML Module Disabled' }, { status: 403 });
    }

    const activeIds = getActiveListIds();

    return NextResponse.json({
        activeLists: activeIds,
        totalActive: activeIds.length,
        message: `${activeIds.length} sanction lists are currently active.`
    });
}
