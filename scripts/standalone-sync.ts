
import dotenv from 'dotenv';
import path from 'path';

// Load env first
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    console.log("Starting Standalone Sync (Full Integration)...");

    // Dynamic import to ensure env vars are loaded
    const { AccountingService } = await import('../lib/accounting/service');

    try {
        console.log("Initializing AccountingService...");
        // Assuming provider code 'uol' is default or passed as arg?
        // Service.init defaults to 'uol' if not passed.
        const service = await AccountingService.init();

        console.log("Running Full Sync...");
        const stats = await service.syncAll();

        console.log("Sync Complete. Stats:");
        console.log(JSON.stringify(stats, null, 2));

    } catch (e) {
        console.error("Standalone Sync Failed:", e);
        process.exit(1);
    }
}

main().catch(console.error);
