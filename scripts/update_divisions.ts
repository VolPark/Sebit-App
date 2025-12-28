
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Prioritize Service Role Key for admin operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE env vars. Need SUPABASE_SERVICE_ROLE_KEY for this operation.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_DIVISION_NAME = "Stínící technika";
const KEYWORDS = [
    'žaluzie',
    'rolety',
    'markýzy',
    'sítě',
    'plisse',
    'screen',
    'zastiňovací',
    'stínění'
];

async function run() {
    console.log("--- Starting Division Update Script ---");

    // 1. Get or Create Division
    let divisionId: number | null = null;
    let { data: divisions, error: divError } = await supabase.from('divisions').select('*').eq('nazev', TARGET_DIVISION_NAME);

    if (divError) {
        console.error("Error fetching divisions:", divError);
        return;
    }

    if (!divisions || divisions.length === 0) {
        console.log(`Division '${TARGET_DIVISION_NAME}' not found. Creating...`);
        const { data: newDiv, error: createError } = await supabase.from('divisions').insert({ nazev: TARGET_DIVISION_NAME }).select();
        if (createError) {
            console.error("Error creating division:", createError);
            return;
        }
        if (newDiv && newDiv.length > 0) {
            divisionId = newDiv[0].id;
            console.log(`Created Division ID: ${divisionId}`);
        }
    } else {
        divisionId = divisions[0].id;
        console.log(`Found Existing Division ID: ${divisionId}`);
    }

    if (!divisionId) {
        console.error("Failed to obtain Division ID.");
        return;
    }

    // 2. Fetch Projects
    console.log("Fetching all projects (akce)...");
    // Fetch limited columns to save bandwidth? No, we need name.
    const { data: akce, error: akceError } = await supabase.from('akce').select('id, nazev, division_id');

    if (akceError) {
        console.error("Error fetching akce:", akceError);
        return;
    }

    if (!akce || akce.length === 0) {
        console.log("No projects found.");
        return;
    }

    console.log(`Scanning ${akce.length} projects...`);

    let updatedCount = 0;
    const updates = [];

    for (const a of akce) {
        // Skip if already correct
        if (a.division_id === divisionId) continue;

        const nameLower = (a.nazev || '').toLowerCase();
        const matches = KEYWORDS.some(kw => nameLower.includes(kw));

        if (matches) {
            console.log(`[MATCH] Updating '${a.nazev}' (ID: ${a.id}) -> Division ${divisionId}`);
            updates.push(supabase.from('akce').update({ division_id: divisionId }).eq('id', a.id));
            updatedCount++;
        }
    }

    if (updatedCount > 0) {
        console.log(`Executing ${updatedCount} updates...`);
        await Promise.all(updates);
        console.log("Updates completed.");
    } else {
        console.log("No matching projects found needing update.");
    }

    console.log("--- Script Finished ---");
}

run();
