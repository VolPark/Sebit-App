import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { getDashboardData, getDetailedStats } from '@/lib/dashboard';
import { z } from 'zod';

// Allow streaming responses up to 60 seconds for larger context processing
export const maxDuration = 60;

export async function POST(req: Request) {
    const { messages } = await req.json();

    // Use SERVICE_ROLE key to bypass RLS for AI context
    const supabaseInfo = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Fetch COMPELTE Data (No limits, proper relation IDs)
    const { data: klienti } = await supabaseInfo.from('klienti').select('*');
    const { data: pracovnici } = await supabaseInfo.from('pracovnici').select('*');
    const { data: akce } = await supabaseInfo.from('akce').select('*');
    const { data: prace } = await supabaseInfo.from('prace').select('*');
    const { data: mzdy } = await supabaseInfo.from('mzdy').select('*');
    const { data: fixed_costs } = await supabaseInfo.from('fixed_costs').select('*');
    const { data: divisions } = await supabaseInfo.from('divisions').select('*');
    const { data: worker_divisions } = await supabaseInfo.from('worker_divisions').select('*');
    const { data: nabidky } = await supabaseInfo.from('nabidky').select('*');
    const { data: nabidky_stavy } = await supabaseInfo.from('nabidky_stavy').select('*');
    const { data: polozky_nabidky } = await supabaseInfo.from('polozky_nabidky').select('*');
    const { data: polozky_typy } = await supabaseInfo.from('polozky_typy').select('*');
    const { data: finance } = await supabaseInfo.from('finance').select('*');
    const { data: profiles } = await supabaseInfo.from('profiles').select('*');
    const { data: organizations } = await supabaseInfo.from('organizations').select('*');
    const { data: organization_members } = await supabaseInfo.from('organization_members').select('*');
    const { data: app_admins } = await supabaseInfo.from('app_admins').select('*');

    // 2. Fetch Calculated Stats (Dashboard View)
    // We use the same function as the dashboard to ensure consistency
    let dashboardStats = null;
    try {
        dashboardStats = await getDashboardData('last12months', {}, supabaseInfo);
    } catch (e) {
        console.error("Failed to fetch dashboard stats for AI context", e);
    }

    const erDiagram = `
    erDiagram
    organizations ||--o{ klienti : "owns"
    organizations ||--o{ pracovnici : "employs"
    organizations ||--o{ akce : "manages"
    organizations ||--o{ fixed_costs : "tracks"
    organizations ||--o{ divisions : "has"
    organizations ||--o{ nabidky : "issues"
    organizations ||--o{ finance : "records"
    organizations ||--o{ organization_members : "has members"

    divisions ||--o{ akce : "categorizes"
    divisions ||--o{ prace : "categorizes"
    divisions ||--o{ fixed_costs : "allocated to"
    divisions ||--o{ worker_divisions : "staffed by"
    divisions ||--o{ nabidky : "categorizes"
    divisions ||--o{ finance : "categorizes"

    klienti ||--o{ akce : "requested by"
    klienti ||--o{ prace : "billed for"
    klienti ||--o{ nabidky : "receives"

    pracovnici ||--o{ prace : "logs"
    pracovnici ||--o{ mzdy : "earns"
    pracovnici ||--o{ worker_divisions : "belongs to"
    
    akce ||--o{ prace : "composed of"
    akce ||--o{ nabidky : "related to"

    nabidky ||--o{ polozky_nabidky : "contains"
    nabidky }|--|| nabidky_stavy : "has status"
    
    profiles ||--o{ organization_members : "is member of"

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
        bigint division_id FK
    }

    divisions {
        bigint id PK
        text nazev
    }
    
    worker_divisions {
        bigint id PK
        bigint worker_id FK
        bigint division_id FK
    }

    nabidky {
        bigint id PK
        text nazev
        numeric celkova_cena
        bigint stav_id FK
        bigint klient_id FK
        bigint division_id FK
    }

    nabidky_stavy {
        bigint id PK
        text nazev
        text color
    }

    polozky_nabidky {
        bigint id PK
        bigint nabidka_id FK
        text nazev
        numeric mnozstvi
        numeric cena_ks
        numeric celkem
    }

    finance {
        bigint id PK
        date datum
        text typ "Příjem/Výdej"
        numeric castka
        text popis
        bigint division_id FK
    }

    profiles {
        uuid id PK
        text full_name
        text role
    }
    
    organization_members {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        text role
    }`;

    const systemPrompt = `
    Jsi AI finanční a provozní analytik pro firmu "${process.env.NEXT_PUBLIC_COMPANY_NAME || 'Interiéry Horyna'}".
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

    --- DIVIZE (divisions) ---
    ${JSON.stringify(divisions)}

    --- PRACOVNÍCI V DIVIZÍCH (worker_divisions) ---
    ${JSON.stringify(worker_divisions)}

    --- NABÍDKY (nabidky) ---
    ${JSON.stringify(nabidky)}

    --- STAVY NABÍDEK (nabidky_stavy) ---
    ${JSON.stringify(nabidky_stavy)}

    --- POLOŽKY NABÍDEK (polozky_nabidky) ---
    ${JSON.stringify(polozky_nabidky)}

    --- TYPY POLOŽEK (polozky_typy) ---
    ${JSON.stringify(polozky_typy)}

    --- FINANCE / POKLADNA (finance) ---
    ${JSON.stringify(finance)}

    --- UŽIVATELSKÉ PROFILY (profiles) ---
    ${JSON.stringify(profiles)}

    --- ORGANIZACE (organizations) ---
    ${JSON.stringify(organizations)}

    --- ČLENOVÉ ORGANIZACÍ (organization_members) ---
    ${JSON.stringify(organization_members)}

    --- APP ADMINI (app_admins) ---
    ${JSON.stringify(app_admins)}


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
    10. Pokud uživatel explicitně požádá o vysvětlení datových zdrojů nebo vysvětluješ složitou logiku databáze, vlož vizuální referenci na tabulku.
        - Reference musí být ve formátu JSON code blocku s jazykem 'table'.
        - NEPOUŽÍVEJ to pro běžné odpovědi. Jen když je to nutné pro technické vysvětlení.
        - Příklad:
          \`\`\`table
          {
            "name": "klienti",
            "description": "Evidence všech zákazníků a jejich sazeb pro fakturaci."
          }
          \`\`\`

    11. Pokud uživatel nerozumí konkrétnímu sloupci nebo se ptá na význam dat, vlož referenci na atribut.
        - Reference musí být ve formátu JSON code blocku s jazykem 'attribute'.
        - NEPOUŽÍVEJ to automaticky. Jen jako vysvětlivku pro složitá data.
        - Příklad:
          \`\`\`attribute
          {
            "table": "klienti",
            "name": "sazba",
            "description": "Hodinová sazba v CZK účtovaná klientovi."
          }
          \`\`\`
    
    12. [CRITICAL] Pokud uvádíš PŘÍKLADY DAT (např. seznam pracovníků, seznam projektů), NIKDY je nevypisuj jako text nebo bullet pointy.
        - VŽDY je naformátuj jako JSON pole objektů uvnitř code blocku s jazykem 'json'.
        - Toto umožní aplikaci vykreslit je jako krásnou interaktivní tabulku.
        - Příklad:
          \`\`\`json
          [
            { "id": 1, "jmeno": "Jan Novák", "pozice": "Truhlář" },
            { "id": 2, "jmeno": "Petr Svoboda", "pozice": "Lakýrník" }
          ]
          \`\`\`
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
    const attemptLogs: string[] = [];

    for (let i = 0; i < models.length; i++) {
        const userModelName = models[i];
        const attemptNum = i + 1;
        let controller: AbortController | null = null;
        let timeoutId: NodeJS.Timeout | null = null;
        const startTime = Date.now();

        try {
            console.log(`[AI Fallback] [ATTEMPT ${attemptNum}/${models.length}] Trying model: ${userModelName}`);

            // Create a controller for the connection timeout
            controller = new AbortController();

            // Set a timeout for the INITIAL connection/response
            // If the model doesn't start streaming within 30 seconds, we kill it and try next.
            timeoutId = setTimeout(() => {
                const duration = Date.now() - startTime;
                console.warn(`[AI Fallback] [TIMEOUT] Model ${userModelName} timed out after ${duration}ms (limit 30s). Aborting.`);
                controller?.abort();
            }, 30000);

            let result;
            try {
                result = await streamText({
                    model: google(userModelName),
                    messages,
                    system: systemPrompt,
                    // @ts-ignore
                    maxSteps: 5,
                    maxRetries: 0,
                    abortSignal: controller.signal,
                    // @ts-ignore
                    tools: {
                        get_dashboard_stats: tool({
                            description: 'Získá souhrnné statistiky (tržby, náklady, zisk) za určité období.',
                            parameters: z.object({
                                period: z.enum(['last12months', 'thisYear', 'lastYear']).describe('Období pro statistiky. Default: last12months'),
                                divisionId: z.number().optional().describe('ID divize pro filtrování. Nevyplňuj pro celou firmu.'),
                                klientId: z.number().optional().describe('ID klienta pro filtrování.'),
                                pracovnikId: z.number().optional().describe('ID pracovníka pro filtrování.')
                            }),
                            execute: async ({ period, divisionId, klientId, pracovnikId }: { period?: 'last12months' | 'thisYear' | 'lastYear', divisionId?: number, klientId?: number, pracovnikId?: number }) => {
                                console.log('[AI Tool] get_dashboard_stats calling...', { period, divisionId, klientId, pracovnikId });
                                const currentYear = new Date().getFullYear();
                                let periodArg: 'last12months' | { year: number } = 'last12months';
                                if (period === 'thisYear') periodArg = { year: currentYear };
                                if (period === 'lastYear') periodArg = { year: currentYear - 1 };
                                if (period === 'last12months') periodArg = 'last12months';

                                return await getDashboardData(periodArg, { divisionId: divisionId || null, klientId: klientId || null, pracovnikId: pracovnikId || null }, supabaseInfo);
                            }
                        }),
                        get_detailed_stats: tool({
                            description: 'Získá detailní měsíční rozpad a grafy pro tržby, náklady a zisk.',
                            parameters: z.object({
                                period: z.enum(['last12months', 'thisYear', 'lastYear']).describe('Období pro statistiky. Default: last12months'),
                                divisionId: z.number().optional().describe('ID divize pro filtrování.'),
                                klientId: z.number().optional().describe('ID klienta pro filtrování.'),
                                pracovnikId: z.number().optional().describe('ID pracovníka pro filtrování.')
                            }),
                            execute: async ({ period, divisionId, klientId, pracovnikId }: { period?: 'last12months' | 'thisYear' | 'lastYear', divisionId?: number, klientId?: number, pracovnikId?: number }) => {
                                console.log('[AI Tool] get_detailed_stats calling...', { period, divisionId, klientId, pracovnikId });
                                try {
                                    const currentYear = new Date().getFullYear();
                                    let periodArg: 'last12months' | { year: number } = 'last12months';
                                    if (period === 'thisYear') periodArg = { year: currentYear };
                                    if (period === 'lastYear') periodArg = { year: currentYear - 1 };
                                    if (period === 'last12months') periodArg = 'last12months';

                                    const stats = await getDetailedStats(periodArg, { divisionId: divisionId || null, klientId: klientId || null, pracovnikId: pracovnikId || null }, supabaseInfo);

                                    return stats;
                                } catch (error) {
                                    console.error('[(AI Tool] get_detailed_stats FAILED:', error);
                                    return {
                                        error: "Failed to fetch detailed stats.",
                                        details: error instanceof Error ? error.message : String(error)
                                    };
                                }
                            }
                        })
                    }
                });
            } catch (err: any) {
                // Determine if it was our timeout or a real API error
                if (err.name === 'AbortError' || controller.signal.aborted) {
                    throw new Error(`Connection timed out`);
                }
                throw err;
            }

            // Note: streamText might return, but the stream itself might fail immediately.
            const stream = result.textStream;
            const iterator = stream[Symbol.asyncIterator]();

            // This await will throw if the timeout fires before data arrives
            let firstChunk;
            try {
                firstChunk = await iterator.next();
            } catch (err: any) {
                if (err.name === 'AbortError' || controller.signal.aborted) {
                    throw new Error(`Connection timed out during stream init`);
                }
                throw err;
            }

            // Clear timeout immediately after getting first byte - connection is established
            if (timeoutId) clearTimeout(timeoutId);

            if (firstChunk.done) {
                throw new Error("Stream finished immediately (received empty response)");
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
                        console.error(`[AI Fallback] [STREAM ERROR] Model ${userModelName} failed mid-stream:`, error);
                        controller.error(error);
                    }
                }
            });

            console.log(`[AI Fallback] [SUCCESS] Model ${userModelName} responded successfully in ${Date.now() - startTime}ms.`);
            return new Response(cleanStream, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                }
            });

        } catch (error: any) {
            // Ensure timeout is cleared if error occurs
            if (timeoutId) clearTimeout(timeoutId);

            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isTimeout = errorMessage.includes("timed out");

            // Format log nicely
            const failureLog = `[AI Fallback] [FAILURE] Model ${userModelName} failed after ${duration}ms. Reason: ${errorMessage}`;
            console.warn(failureLog);
            attemptLogs.push(failureLog);

            // Log to file for persistence
            try {
                const fs = await import('fs');
                const path = await import('path');
                fs.appendFileSync(path.join(process.cwd(), 'chat-error.log'), `[${new Date().toISOString()}] ${failureLog}\nStack: ${error.stack || 'No stack'}\n\n`);
            } catch (fsError) {
                // ignore logging errors
            }

            lastError = error;
            if (i < models.length - 1) {
                console.log(`[AI Fallback] ... switching to next backup model ...`);
            }
        }
    }

    console.error(`[AI Fallback] [CRITICAL] All ${models.length} models failed. Returning 503.`);

    // Log final summary to file
    try {
        const fs = await import('fs');
        const path = await import('path');
        fs.appendFileSync(path.join(process.cwd(), 'chat-error.log'), `[${new Date().toISOString()}] ALL MODELS FAILED. Summary:\n${attemptLogs.join('\n')}\n\n`);
    } catch (e) { }

    return new Response(JSON.stringify({
        error: {
            message: "AI services are currently overloaded or unavailable. Please try again later.",
            details: attemptLogs
        }
    }), { status: 503 });
}
