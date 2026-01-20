
import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function main() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!dbUrl) {
        console.error('Missing DATABASE_URL or POSTGRES_URL');
        return;
    }

    console.log('Connecting to DB...');
    const sqlUrl = dbUrl + "?sslmode=require"; // Supabase often requires SSL
    const sql = postgres(sqlUrl);

    try {
        const migrationPath = path.join(__dirname, '../supabase/migrations/20260120095500_add_contacts.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log("Executing migration...");
        await sql.unsafe(migrationSql);
        console.log("Migration applied successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await sql.end();
    }
}

main().catch(console.error);
