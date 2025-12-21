import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { getDashboardData } from '@/lib/dashboard';

// Allow streaming responses up to 60 seconds for larger context processing
export const maxDuration = 60;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Fetch COMPELTE Data (No limits, proper relation IDs)
    const { data: klienti } = await supabase.from('klienti').select('*');
    const { data: pracovnici } = await supabase.from('pracovnici').select('*');
    const { data: akce } = await supabase.from('akce').select('*');
    const { data: prace } = await supabase.from('prace').select('*');
    const { data: mzdy } = await supabase.from('mzdy').select('*');
    const { data: finance } = await supabase.from('finance').select('*');

    // 2. Fetch Calculated Stats (Dashboard View)
    // We use the same function as the dashboard to ensure consistency
    let dashboardStats = null;
    try {
        dashboardStats = await getDashboardData('last12months', {});
    } catch (e) {
        console.error("Failed to fetch dashboard stats for AI context", e);
    }

    const erDiagram = `
    erDiagram
    organizations ||--o{ klienti : owns
    organizations ||--o{ pracovnici : owns
    organizations ||--o{ akce : pro
    organizations ||--o{ finance : tracks

    klienti ||--o{ akce : "requested by"
    klienti ||--o{ prace : "billed for"
    
    pracovnici ||--o{ prace : "logs"
    pracovnici ||--o{ mzdy : "earns"

    akce ||--o{ prace : "composed of"
    
    klienti {
        bigint id PK
        text nazev
        numeric sazba
    }

    pracovnici {
        bigint id PK
        text jmeno
        numeric hodinova_mzda
    }

    akce {
        bigint id PK
        text nazev
        date datum
        numeric cena_klient
        numeric material_klient
        numeric material_my
        bigint klient_id FK
    }

    prace {
        bigint id PK
        date datum
        numeric pocet_hodin
        bigint pracovnik_id FK
        bigint akce_id FK
    }

    mzdy {
        bigint id PK
        integer mesic
        integer rok
        numeric celkova_castka
        bigint pracovnik_id FK
    }

    finance {
        bigint id PK
        text typ
        numeric castka
    }`;

    const systemPrompt = `
    Jsi AI finanční a provozní analytik pro firmu "Interiéry Horyna".
    Tvým úkolem je odpovídat na dotazy majitele na základě poskytnuté databáze.
    
    Máš k dispozici KOMPLETNÍ data z databáze ve formátu JSON a také PŘEDPOČÍTANÉ STATISTIKY z dashboardu.
    
    --- DASHBOARD STATISTIKY (POSLEDNÍCH 12 MĚSÍCŮ) ---
    Toto jsou oficiální čísla, která vidí uživatel v grafu. Používej je jako referenci pro souhrnné dotazy (zisk, tržby, náklady).
    ${JSON.stringify({
        celkove_trzby: dashboardStats?.totalRevenue,
        celkove_naklady: dashboardStats?.totalCosts,
        hruby_zisk: dashboardStats?.grossProfit,
        naklady_prace: dashboardStats?.totalLaborCost,
        naklady_material: dashboardStats?.totalMaterialCost,
        naklady_rezie: dashboardStats?.totalOverheadCost,
        vydelecne_akce: dashboardStats?.topClients, // Top clients usually drive revenue
        top_pracovnici: dashboardStats?.topWorkers
    }, null, 2)}

    SCHEMA (ER DIAGRAM):
    ${erDiagram}

    DATA Z DATABÁZE (JSON):

    --- KLIENTI (klienti) ---
    ${JSON.stringify(klienti)}

    --- PRACOVNÍCI (pracovnici) ---
    ${JSON.stringify(pracovnici)}

    --- PROJEKTY / AKCE (akce) ---
    ${JSON.stringify(akce)}

    --- VÝKAZY PRÁCE (prace) ---
    ${JSON.stringify(prace)}

    --- MZDY (mzdy) ---
    ${JSON.stringify(mzdy)}

    --- FINANCE (finance) ---
    ${JSON.stringify(finance)}

    PRAVIDLA:
    1. Odpovídej pouze česky.
    2. Použij formátování Markdown pro lepší přehlednost:
       - Používej **tučné** písmo pro klíčové částky a názvy.
       - Používej tabulky pro seznamy (např. seznam projektů).
       - Používej odrážky pro výčty.
    3. Pokud se ptám na zisk/tržby za rok, podívej se primárně do "DASHBOARD STATISTIKY", jsou nejpřesnější.
    4. NIKDY nepoužívej formátování kódu (backticky) pro finanční částky. Částky piš normálně tučně nebo v textu (např. **100 000 CZK**).
    5. Analýzy prováděj důkladně.
  `;

    // DEFINICE MODELŮ: 
    // Klíče jsou vaše preferované názvy (jak jste zadal).
    // Hodnoty jsou technická ID, která vyžaduje Google API (aby to nepadalo na 404).
    const models = [
        'gemini-3-flash-preview',     // "gemini-3-flash" equivalent (latest experimental)
        'gemini-2.5-flash',           // "gemini-2.5-flash" equivalent (high performant)
        'gemini-2.5-flash-lite',         // "gemini-flash" (standard fast)
        'gemini-flash'       // "gemini-2.5-flash-lite" (cheapest/fastest fallback)
    ];

    let lastError = null;

    for (const userModelName of models) {
        try {
            console.log(`[AI Fallback] User requested: ${userModelName}`);

            const result = streamText({
                model: google(userModelName),
                messages,
                system: systemPrompt,
            });

            return result.toTextStreamResponse();
        } catch (error) {
            console.error(`[AI Fallback] Model ${userModelName} (${apiModelId}) failed.`, error);
            lastError = error;
            // Zkusíme další v řadě...
        }
    }

    console.error("All AI models failed:", lastError);
    return new Response(JSON.stringify({ error: { message: "AI services are currently overloaded or unavailable. Please try again later." } }), { status: 503 });
}
