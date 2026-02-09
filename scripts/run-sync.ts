
import { AccountingService } from '../lib/accounting/service';
import dotenv from 'dotenv';

import { getErrorMessage } from '@/lib/errors';
// Load env
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Initializing Service...');
    try {
        const service = await AccountingService.init();

        console.log('Starting Journal Sync...');
        const count = await service.syncAccountingJournal(Date.now() + 300000); // 5 min deadline
        console.log(`Sync finished. Processed ${count} records.`);

    } catch (e: unknown) {
        console.error('Sync failed:', e);
    }
}

main().catch(console.error);
