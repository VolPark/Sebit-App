
import dotenv from 'dotenv';
import path from 'path';

// Load env before anything else
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    console.log("Loading AccountingService...");
    // Dynamic import to ensure env is loaded first
    const { AccountingService } = await import('../lib/accounting/service');

    console.log("Initializing AccountingService...");
    try {
        const service = await AccountingService.init('uol');
        console.log("Service initialized successfully.");

        console.log("Running syncContacts...");
        const count = await service.syncContacts();
        console.log(`Synced ${count} contacts.`);

        // Uncomment to test linking
        console.log("Running linkInvoices...");
        const linked = await service.linkInvoices();
        console.log(`Linked ${linked} invoices.`);

    } catch (e) {
        console.error("Initialization Failed:", e);
    }
}

main().catch(console.error);
