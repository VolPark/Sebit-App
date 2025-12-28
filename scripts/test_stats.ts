
import { getDetailedStats } from '../lib/dashboard';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client for env loading if needed, but we rely on Next.js env loading or manual
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE env vars. Make sure to run with --env-file .env.local");
    process.exit(1);
}

async function runTest() {
    console.log("--- Starting getDetailedStats Test ---");

    try {
        // 1. Global Stats
        console.log("\n1. Fetching Global Stats (Last 12 Months)...");
        const globalStats = await getDetailedStats('last12months');
        console.log(`Global Workers: ${globalStats.workers.length}`);
        console.log(`Global Clients: ${globalStats.clients.length}`);
        if (globalStats.clients.length > 0) {
            console.log(`Top Client: ${globalStats.clients[0].name} - Overhead: ${globalStats.clients[0].overheadCost}`);
        }

        // 2. Division Filter
        console.log("\n2. Fetching Stats for Non-Existent Division (ID: 999999)...");
        const emptyStats = await getDetailedStats('last12months', { divisionId: 999999 });
        console.log(`Workers found: ${emptyStats.workers.length} (Expected 0 or low)`);

        // 3. Worker Filter (Critical for Overhead bug)
        if (globalStats.workers.length > 0) {
            const workerId = globalStats.workers[0].id;
            console.log(`\n3. Fetching Stats for Worker ID: ${workerId} (${globalStats.workers[0].name})...`);
            const workerStats = await getDetailedStats('last12months', { pracovnikId: workerId });
            console.log(`Worker Entries: ${workerStats.workers.length}`);
            if (workerStats.workers.length > 0) {
                console.log(`Worker Total Wages: ${workerStats.workers[0].totalWages}`);
                console.log(`Worker Total Hours: ${workerStats.workers[0].totalHours}`);

                // Check implicit overhead via Client Stats
                if (workerStats.clients.length > 0) {
                    console.log(`Top Client Overhead (Filtered by Worker): ${workerStats.clients[0].overheadCost}`);
                    console.log(`Top Client Labor (Filtered by Worker): ${workerStats.clients[0].laborCost}`);
                } else {
                    console.log("No clients found for this worker in this period.");
                }
            }
        }

        console.log("\n--- Test Completed Successfully ---");
    } catch (error) {
        console.error("\n!!! TEST FAILED !!!", error);
    }
}

runTest();
