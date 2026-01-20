
import { AccountingService } from '../lib/accounting/service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log("Testing AccountingService Contact Sync...");
    try {
        const service = await AccountingService.init('uol'); // Assuming 'uol' provider code

        // Test syncContacts
        const count = await service.syncContacts();
        console.log(`Synced ${count} contacts via Service.`);

        // Test linkInvoices (optional, might take time)
        const linked = await service.linkInvoices();
        console.log(`Linked ${linked} invoices via Service.`);

    } catch (e) {
        console.error("Service Error:", e);
    }
}

main().catch(console.error);
