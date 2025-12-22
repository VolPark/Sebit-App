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
    const { data: fixed_costs } = await supabase.from('fixed_costs').select('*');

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
    organizations ||--o{ fixed_costs : tracks

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

    fixed_costs {
        bigint id PK
        text nazev
        numeric castka
        int4 mesic
        int4 rok    
    }`;

    const systemPrompt = `
    Jsi AI finanční a provozní analytik pro firmu "Interiéry Horyna".
    Tvým úkolem je odpovídat na dotazy majitele na základě poskytnuté databáze a vysvětlovat kontext, případně porovnávat s benchmarkem.
    
    Máš k dispozici KOMPLETNÍ data z databáze ve formátu JSON a také PŘEDPOČÍTANÉ STATISTIKY z dashboardu.
    
    --- DASHBOARD STATISTIKY ---
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

    --- REŽIE (fixed_costs) ---
    ${JSON.stringify(fixed_costs)}


    PRAVIDLA:
    1. Odpovídej pouze česky.
    2. Použij formátování Markdown pro lepší přehlednost:
       - Používej **tučné** písmo pro klíčové částky a názvy.
       - Používej tabulky pro seznamy (např. seznam projektů).
       - Používej sekce pro výčty.
       - Používej mermaid pro vykreslování grafů.
         - PRO MERMAID: Vždy používej uvozovky pro texty v uzlech, např. A["Text uzlu"].
         - Nepoužívej diakritiku v ID uzlů (použij A, B, Uzel1, ne "Červenec").
         - Používej POUZE standardní směry: graph TD (shora dolů) nebo graph LR (zleva doprava). Nepoužívej jiné zkratky.
         - Vyhni se komplikovaným znakům.
         - Používej barvy ladící s aplikací (např. #FF0000 pro červené, atd...).
         - Vždy používej co nejpřehlednější a nejčitelnější verzi zobrazení grafu.
       - Načítej a používej data z tabulek bez ohledu na stav ukončení.
       - Nikdy nepoužívej technické názvy atributů v tabulkách, používej čitelné názvy.
       - Nikdy nepoužívej technické názvy tabulek, používej čitelné názvy.
    3. Pokud se ptám na zisk/tržby za rok, podívej se primárně do "DASHBOARD STATISTIKY", jsou nejpřesnější.
    4. NIKDY nepoužívej formátování kódu (backticky) pro finanční částky. Částky piš normálně tučně nebo v textu (např. **100 000 CZK**).
    5. Analýzy prováděj důkladně.
    6. Vždy zkontroluj jaký je aktuální datum dle obecné funkce (nespoléhat na info z ai modelu), aby tvé analýzy byli relevantní zárovn toto datum ber jako součást analýzy.
    7. Můžeš dohledávat data na internetu, či čerpat ze své znalosti aby jsi mohl jasně vysvětlit vše podstatné.
    8. při vykreslování progress barů používej vždy barvy podle aplikace.
    9. Při vykreslování progress barů vždy využívej syntaxi "progress: 50 %", a podobně v tomto stylu.
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
        let controller: AbortController | null = null;
        let timeoutId: NodeJS.Timeout | null = null;

        try {
            console.log(`[AI Fallback] STEP 1: Attempting model ${userModelName}`);

            // Create a controller for the connection timeout
            controller = new AbortController();

            // Set a timeout for the INITIAL connection/response
            // If the model doesn't start streaming within 8 seconds, we kill it and try next.
            timeoutId = setTimeout(() => {
                console.warn(`[AI Fallback] Connection timeout for ${userModelName} (8s)`);
                controller?.abort();
            }, 8000);

            const result = await streamText({
                model: google(userModelName),
                messages,
                system: systemPrompt,
                maxRetries: 0,
                abortSignal: controller.signal
            });
            console.log(`[AI Fallback] STEP 2: streamText created for ${userModelName}`);

            const stream = result.textStream;
            const iterator = stream[Symbol.asyncIterator]();

            console.log(`[AI Fallback] STEP 3: Peeking first chunk for ${userModelName}`);
            // This await will throw if the timeout fires before data arrives
            const firstChunk = await iterator.next();

            // Clear timeout immediately after getting first byte - connection is established
            if (timeoutId) clearTimeout(timeoutId);

            console.log(`[AI Fallback] STEP 4: First chunk received for ${userModelName}`);

            if (firstChunk.done) {
                console.warn(`[AI Fallback] Model ${userModelName} returned empty stream immediately. Treating as failure.`);
                throw new Error("Stream finished immediately (possible suppressed error)");
            }

            const cleanStream = new ReadableStream({
                async start(controller) {
                    controller.enqueue(firstChunk.value);
                    try {
                        for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
                            controller.enqueue(chunk);
                        }
                        controller.close();
                    } catch (error) {
                        // This catches streaming errors *after* a successful start
                        console.error(`[AI Fallback] Stream error for ${userModelName}:`, error);
                        controller.error(error);
                    }
                }
            });

            console.log(`[AI Fallback] STEP 5: Returning successful stream for ${userModelName}`);
            return new Response(cleanStream, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                }
            });

        } catch (error) {
            // Ensure timeout is cleared if error occurs
            if (timeoutId) clearTimeout(timeoutId);

            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[AI Fallback] CAUGHT ERROR for ${userModelName}:`, error);
            try {
                const fs = await import('fs');
                const path = await import('path');
                fs.appendFileSync(path.join(process.cwd(), 'chat-error.log'), `[${new Date().toISOString()}] Model ${userModelName} failed: ${errorMessage}\nStack: ${error instanceof Error ? error.stack : ''}\n\n`);
            } catch (fsError) {
                console.error("Failed to write to log file", fsError);
            }
            lastError = error;
            // Continue to next model in the loop
            console.log(`[AI Fallback] Retrying with next model...`);
        }
    }

    console.error("All AI models failed:", lastError);
    try {
        const fs = await import('fs');
        const path = await import('path');
        fs.appendFileSync(path.join(process.cwd(), 'chat-error.log'), `[${new Date().toISOString()}] ALL MODELS FAILED. Last error: ${lastError}\n\n`);
    } catch (e) { }

    return new Response(JSON.stringify({ error: { message: "AI services are currently overloaded or unavailable. Please try again later." } }), { status: 503 });
}
