import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// import csv from 'csv-parse/sync'; // We might not have this, better use simple split

// Load env
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Reading CSV...');
    const csvPath = path.join(process.cwd(), 'public', 'accounts_journal.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    // Parse CSV (Custom parser since we don't know if csv-parse is installed)
    const lines = csvContent.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',');
    // Headers: Datum,Zápis,Částka,MD,DAL,Typ,Kód,Číslo,Popis

    // Helper to parse line respecting quotes
    const parseLine = (line: string) => {
        const res = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                res.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        res.push(current);
        return res;
    };

    const csvEntries = new Map();
    let totalCsvAmount = 0;

    for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        if (cols.length < 5) continue;

        const dateStr = cols[0]; // 10.02.2025
        const id = cols[1]; // Zápis
        // Amount: "10 000,00" -> 10000.00
        const amountStr = cols[2].replace(/\s/g, '').replace(',', '.').replace(/"/g, '');
        const amount = parseFloat(amountStr);
        const md = cols[3];
        const dal = cols[4];

        const entry = {
            id,
            date: dateStr,
            amount,
            md,
            dal,
            raw: lines[i]
        };

        csvEntries.set(id, entry);
        if (!isNaN(amount)) totalCsvAmount += amount;
    }

    console.log(`CSV Loaded: ${csvEntries.size} entries.`);

    console.log('Fetching Supabase Data for 2025...');
    const { data: dbEntries, error } = await supabase
        .from('accounting_journal')
        .select('*')
        .eq('fiscal_year', 2025);

    if (error) {
        console.error('Error fetching DB:', error);
        return;
    }

    console.log(`DB Loaded: ${dbEntries.length} entries.`);

    // Compare
    const missingInDb = [];
    const missingInCsv = [];
    const mismatches = [];

    // Check matching by ID
    const dbMap = new Map();
    let totalDbAmount = 0;

    for (const item of dbEntries) {
        dbMap.set(item.uol_id, item);
        totalDbAmount += item.amount;
    }

    // 1. Missing in DB
    for (const [id, csvItem] of csvEntries) {
        if (!dbMap.has(id)) {
            missingInDb.push(csvItem);
        } else {
            // Check content mismatch
            const dbItem = dbMap.get(id);
            // Amount mismatch?
            if (Math.abs(dbItem.amount - csvItem.amount) > 0.01) {
                mismatches.push({
                    id,
                    reason: 'Amount mismatch',
                    csv: csvItem.amount,
                    db: dbItem.amount
                });
            }
        }
    }

    // 2. Missing in CSV
    for (const [id, dbItem] of dbMap) {
        if (!csvEntries.has(id)) {
            missingInCsv.push(dbItem);
        }
    }

    const logStream = fs.createWriteStream('comparison_result.txt');
    const log = (msg: string) => {
        console.log(msg);
        logStream.write(msg + '\n');
    };

    log('--- Comparison Results ---');
    log(`Total CSV Amount Sum (approx checks): ${totalCsvAmount.toFixed(2)}`);
    log(`Total DB Amount Sum (approx checks): ${totalDbAmount.toFixed(2)}`);
    log(`Difference: ${(totalCsvAmount - totalDbAmount).toFixed(2)} CZK`);

    log(`\nMissing in DB (Present in CSV): ${missingInDb.length}`);
    missingInDb.forEach(item => {
        log(`[CSV Only] ID: ${item.id}, Date: ${item.date}, Amount: ${item.amount}, MD: ${item.md}, DAL: ${item.dal}`);
    });

    log(`\nMissing in CSV (Present in DB): ${missingInCsv.length}`);
    missingInCsv.forEach(item => {
        log(`[DB Only] ID: ${item.uol_id}, Date: ${item.date}, Amount: ${item.amount}, Account MD: ${item.account_md}, Account D: ${item.account_d}`);
    });

    log(`\nMismatches: ${mismatches.length}`);
    mismatches.forEach(m => {
        log(`[Mismatch] ID: ${m.id}, ${m.reason} - CSV: ${m.csv} vs DB: ${m.db}`);
    });

    logStream.end();

}

main().catch(console.error);
