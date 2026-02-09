import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { getDashboardData, getDetailedStats } from '@/lib/dashboard';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { NextRequest } from 'next/server';

import { getErrorMessage } from '@/lib/errors';
// Allow streaming responses up to 60 seconds for larger context processing
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Security: Verify user session first
  const session = await verifySession(req);
  if (!session) {
    return unauthorizedResponse();
  }

  // Rate limiting check (now using authenticated user ID)
  const clientId = getClientIdentifier(req, session.user?.id);
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.aiChat);

  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetAt);
  }

  const body = await req.json();
  const chatSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }).passthrough()).min(1).max(200),
  });
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors
    }), { status: 400 });
  }
  const { messages } = parsed.data;

  // Use SERVICE_ROLE key to bypass RLS for AI context
  const supabaseInfo = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Fetch Data - OPTIMIZED: Only fetch recent history (Current Year + Last Year)
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 1;
  const startDateIso = `${startYear}-01-01`;

  const { data: klienti } = await supabaseInfo.from('klienti').select('*');
  const { data: pracovnici } = await supabaseInfo.from('pracovnici').select('*');
  const { data: akce } = await supabaseInfo.from('akce').select('*').gte('created_at', startDateIso).or(`is_completed.eq.false`); // Keep active projects regardless of date
  const { data: prace } = await supabaseInfo.from('prace').select('*').gte('datum', startDateIso);
  const { data: mzdy } = await supabaseInfo.from('mzdy').select('*').gte('rok', startYear);
  const { data: fixed_costs } = await supabaseInfo.from('fixed_costs').select('*').gte('rok', startYear);
  const { data: divisions } = await supabaseInfo.from('divisions').select('*');
  const { data: worker_divisions } = await supabaseInfo.from('worker_divisions').select('*');
  const { data: nabidky } = await supabaseInfo.from('nabidky').select('*').gte('created_at', startDateIso);
  const { data: nabidky_stavy } = await supabaseInfo.from('nabidky_stavy').select('*');
  const { data: polozky_nabidky } = await supabaseInfo.from('polozky_nabidky').select('*'); // Should ideally filter by nabidka_id from fetched nabidky, but fetching all for now is safer for relations if not huge
  const { data: polozky_typy } = await supabaseInfo.from('polozky_typy').select('*');
  const { data: finance } = await supabaseInfo.from('finance').select('*').gte('datum', startDateIso);
  const { data: profiles } = await supabaseInfo.from('profiles').select('*');
  const { data: organizations } = await supabaseInfo.from('organizations').select('*');
  const { data: organization_members } = await supabaseInfo.from('organization_members').select('*');
  const { data: app_admins } = await supabaseInfo.from('app_admins').select('*');
  const { data: accounting_providers } = await supabaseInfo.from('accounting_providers').select('*');

  // HEAVY TABLES: Filter by date & Exclude raw_data
  const { data: accounting_documents } = await supabaseInfo
    .from('accounting_documents')
    .select('id, provider_id, external_id, type, number, supplier_name, supplier_ico, amount, currency, issue_date, due_date, tax_date, description, status, updated_at, supplier_dic, paid_amount, amount_czk, exchange_rate, created_at')
    .gte('issue_date', startDateIso);

  const { data: accounting_mappings } = await supabaseInfo
    .from('accounting_mappings')
    .select('*')
    .gte('created_at', startDateIso);

  const { data: accounting_sync_logs } = await supabaseInfo
    .from('accounting_sync_logs')
    .select('*')
    .gte('started_at', startDateIso)
    .order('started_at', { ascending: false })
    .limit(50); // Limit logs

  const { data: currency_rates } = await supabaseInfo.from('currency_rates').select('*').gte('date', startDateIso);

  const { data: accounting_journal } = await supabaseInfo
    .from('accounting_journal')
    .select('*')
    .gte('date', startDateIso);

  const { data: accounting_bank_movements } = await supabaseInfo
    .from('accounting_bank_movements')
    .select('id, bank_account_id, movement_id, date, amount, currency, variable_symbol, description, created_at') // Exclude raw_data
    .gte('date', startDateIso);

  const { data: accounting_accounts } = await supabaseInfo.from('accounting_accounts').select('*');
  const { data: accounting_bank_accounts } = await supabaseInfo.from('accounting_bank_accounts').select('*');

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
  ORGANIZATIONS {
    uuid id PK
    text name
    text slug
    timestamptz created_at
  }

  DIVISIONS {
    int8 id PK
    text nazev
    uuid organization_id FK
    timestamptz created_at
  }

  APP_ADMINS {
    uuid user_id PK "FK_auth_users"
  }

  PROFILES {
    uuid id PK "FK_auth_users"
    app_role role
    text full_name
    timestamptz updated_at
  }

  ORGANIZATION_MEMBERS {
    uuid id PK
    uuid organization_id FK
    uuid user_id "FK_auth_users"
    text role
    timestamptz created_at
  }

  PRACOVNICI {
    int8 id PK
    text jmeno
    numeric hodinova_mzda
    text telefon
    bool is_active
    uuid organization_id FK
    uuid user_id "FK_auth_users"
    text role
  }

  KLIENTI {
    int8 id PK
    text nazev
    numeric sazba
    text email
    text poznamka
    uuid organization_id FK
    text ico
    text dic
    text address
  }

  AKCE {
    int8 id PK
    text nazev
    date datum
    int8 klient_id FK
    numeric cena_klient
    numeric material_klient
    numeric material_my
    numeric odhad_hodin
    timestamptz created_at
    bool is_completed
    uuid organization_id FK
    int8 division_id FK
    text project_type
  }

  NABIDKY_STAVY {
    int8 id PK
    text nazev
    text color
    int4 poradi
  }

  NABIDKY {
    int8 id PK
    timestamptz created_at
    text nazev
    int8 klient_id FK
    numeric celkova_cena
    text stav
    text poznamka
    int8 akce_id FK
    int8 stav_id FK
    text cislo
    date platnost_do
    int8 division_id FK
  }

  POLOZKY_NABIDKY {
    int8 id PK
    int8 nabidka_id FK
    text nazev
    text typ
    numeric mnozstvi
    numeric cena_ks
    numeric celkem
    text popis
    text obrazek_url
    numeric sazba_dph
  }

  POLOZKY_TYPY {
    int8 id PK
    text nazev
    timestamptz created_at
  }

  FINANCE {
    int8 id PK
    date datum
    text typ
    numeric castka
    text poznamka
    text popis
    uuid organization_id FK
    int8 division_id FK
    int8 akce_id FK
    text variable_symbol
    text invoice_number
    date due_date
    text supplier_ico
    text supplier_name
    text payment_method
    text category
  }

  FIXED_COSTS {
    int8 id PK
    text nazev
    numeric castka
    int4 rok
    int4 mesic
    timestamptz created_at
    uuid organization_id FK
    int8 division_id FK
  }

  MZDY {
    int8 id PK
    int8 pracovnik_id FK
    int4 mesic
    int4 rok
    numeric hruba_mzda
    numeric faktura
    numeric priplatek
    timestamptz created_at
    uuid organization_id FK
    numeric celkova_castka
  }

  PRACE {
    int8 id PK
    date datum
    text popis
    numeric pocet_hodin
    int8 klient_id FK
    int8 pracovnik_id FK
    int8 akce_id FK
    uuid organization_id FK
    int8 division_id FK
  }

  WORKER_DIVISIONS {
    int8 id PK
    int8 worker_id FK
    int8 division_id FK
    uuid organization_id FK
    timestamptz created_at
  }

  ACCOUNTING_PROVIDERS {
    int8 id PK
    text code
    text name
    bool is_enabled
    jsonb config
    timestamptz created_at
  }

  ACCOUNTING_DOCUMENTS {
    int8 id PK
    int8 provider_id FK
    text external_id
    text type
    text number
    text supplier_name
    text supplier_ico
    numeric amount
    text currency
    date issue_date
    date due_date
    date tax_date
    text description
    text status
    jsonb raw_data
    timestamptz created_at
    timestamptz updated_at
    text supplier_dic
    numeric paid_amount
    numeric amount_czk
    numeric exchange_rate
  }

  ACCOUNTING_MAPPINGS {
    int8 id PK
    int8 document_id FK
    int8 akce_id FK
    int8 pracovnik_id FK
    int8 division_id FK
    text cost_category
    numeric amount
    text note
    timestamptz created_at
    numeric amount_czk
  }

  ACCOUNTING_SYNC_LOGS {
    int8 id PK
    int8 provider_id FK
    timestamptz started_at
    timestamptz ended_at
    text status
    int4 records_processed
    text error_message
  }

  CURRENCY_RATES {
    date date PK
    text currency PK
    numeric rate
    numeric amount
    timestamptz created_at
  }

  ACCOUNTING_JOURNAL {
    int8 id PK
    text uol_id
    date date
    text account_md
    text account_d
    numeric amount
    text currency
    text text
    int4 fiscal_year
    timestamptz created_at
  }

  ACCOUNTING_BANK_MOVEMENTS {
    int8 id PK
    text bank_account_id
    text movement_id
    date date
    numeric amount
    text currency
    text variable_symbol
    text description
    jsonb raw_data
    timestamptz created_at
  }

  ACCOUNTING_ACCOUNTS {
    int8 id PK
    text code
    text name
    text type
    bool active
    timestamptz created_at
  }

  ACCOUNTING_BANK_ACCOUNTS {
    text bank_account_id PK
    text custom_name
    timestamptz created_at
    timestamptz updated_at
    text account_number
    text bank_code
    text currency
    numeric opening_balance
    text name
    timestamptz last_synced_at
  }

  %% Foreign key relationships
  DIVISIONS ||--o{ ORGANIZATIONS : "organization_id -> id"
  DIVISIONS ||--o{ ACCOUNTING_MAPPINGS : "division_id -> id"
  DIVISIONS ||--o{ PRACE : "division_id -> id"
  DIVISIONS ||--o{ WORKER_DIVISIONS : "division_id -> id"
  DIVISIONS ||--o{ NABIDKY : "division_id -> id"
  DIVISIONS ||--o{ AKCE : "division_id -> id"
  DIVISIONS ||--o{ FINANCE : "division_id -> id"
  DIVISIONS ||--o{ FIXED_COSTS : "division_id -> id"

  ORGANIZATIONS ||--o{ DIVISIONS : "id -> organization_id"
  ORGANIZATIONS ||--o{ WORKER_DIVISIONS : "id -> organization_id"
  ORGANIZATIONS ||--o{ PRACE : "id -> organization_id"
  ORGANIZATIONS ||--o{ MZDY : "id -> organization_id"
  ORGANIZATIONS ||--o{ FIXED_COSTS : "id -> organization_id"
  ORGANIZATIONS ||--o{ FINANCE : "id -> organization_id"
  ORGANIZATIONS ||--o{ AKCE : "id -> organization_id"
  ORGANIZATIONS ||--o{ KLIENTI : "id -> organization_id"
  ORGANIZATIONS ||--o{ PRACOVNICI : "id -> organization_id"
  ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : "id -> organization_id"

  PRACOVNICI ||--o{ WORKER_DIVISIONS : "id -> worker_id"
  PRACOVNICI ||--o{ PRACE : "id -> pracovnik_id"
  PRACOVNICI ||--o{ MZDY : "id -> pracovnik_id"
  PRACOVNICI ||--o{ ACCOUNTING_MAPPINGS : "id -> pracovnik_id"

  KLIENTI ||--o{ PRACE : "id -> klient_id"
  KLIENTI ||--o{ AKCE : "id -> klient_id"
  KLIENTI ||--o{ NABIDKY : "id -> klient_id"

  AKCE ||--o{ FINANCE : "id -> akce_id"
  AKCE ||--o{ ACCOUNTING_MAPPINGS : "id -> akce_id"
  AKCE ||--o{ NABIDKY : "id -> akce_id"
  AKCE ||--o{ PRACE : "id -> akce_id"

  NABIDKY_STAVY ||--o{ NABIDKY : "id -> stav_id"

  NABIDKY ||--o{ POLOZKY_NABIDKY : "id -> nabidka_id"

  ACCOUNTING_PROVIDERS ||--o{ ACCOUNTING_SYNC_LOGS : "id -> provider_id"
  ACCOUNTING_PROVIDERS ||--o{ ACCOUNTING_DOCUMENTS : "id -> provider_id"

  ACCOUNTING_DOCUMENTS ||--o{ ACCOUNTING_MAPPINGS : "id -> document_id"

  ACCOUNTING_MAPPINGS ||--o{ DIVISIONS : "division_id -> id"
  ACCOUNTING_MAPPINGS ||--o{ PRACOVNICI : "pracovnik_id -> id"
  ACCOUNTING_MAPPINGS ||--o{ AKCE : "akce_id -> id"
  ACCOUNTING_MAPPINGS ||--o{ ACCOUNTING_DOCUMENTS : "document_id -> id"

  ACCOUNTING_SYNC_LOGS ||--o{ ACCOUNTING_PROVIDERS : "provider_id -> id"

  MZDY ||--o{ PRACOVNICI : "pracovnik_id -> id"

  PRACE ||--o{ PRACOVNICI : "pracovnik_id -> id"
  PRACE ||--o{ KLIENTI : "klient_id -> id"
  PRACE ||--o{ AKCE : "akce_id -> id"

  WORKER_DIVISIONS ||--o{ PRACOVNICI : "worker_id -> id"
  WORKER_DIVISIONS ||--o{ DIVISIONS : "division_id -> id"

  FINANCE ||--o{ ORGANIZATIONS : "organization_id -> id"
  FINANCE ||--o{ DIVISIONS : "division_id -> id"
  FINANCE ||--o{ AKCE : "akce_id -> id"

  FIXED_COSTS ||--o{ ORGANIZATIONS : "organization_id -> id"
  FIXED_COSTS ||--o{ DIVISIONS : "division_id -> id"

  ACCOUNTING_BANK_ACCOUNTS ||--o{ ACCOUNTING_BANK_MOVEMENTS : "bank_account_id -> bank_account_id"
    }`;

  const systemPrompt = `
    Jsi AI finanční, účetní, daňový a provozní analytik pro firmu "${process.env.NEXT_PUBLIC_COMPANY_NAME || 'Interiéry Horyna'}".
    Tvým úkolem je odpovídat na dotazy majitele na základě poskytnuté databáze a vysvětlovat kontext, případně porovnávat s benchmarkem.
    
    Máš k dispozici data z databáze (FILTROVÁNO: POUZE AKTUÁLNÍ A MINULÝ ROK - ${startYear} a ${currentYear}) a také PŘEDPOČÍTANÉ STATISTIKY z dashboardu.
    Pokud uživatel vyžaduje straší data, upozorni ho, že vidíš detailně pouze poslední 2 roky, ale můžeš se pokusit odpovědět z obecných statistik pokud jsou dostupné.
    
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

    --- ÚČETNÍ POSKYTOVATELÉ (accounting_providers) ---
    ${JSON.stringify(accounting_providers)}

    --- ÚČETNÍ DOKLADY (accounting_documents) ---
    ${JSON.stringify(accounting_documents)}

    --- ÚČETNÍ MAPOVÁNÍ (accounting_mappings) ---
    ${JSON.stringify(accounting_mappings)}

    --- LOGY SYNCHRONIZACE (accounting_sync_logs) ---
    ${JSON.stringify(accounting_sync_logs)}

    --- KURZOVNÍ LÍSTEK (currency_rates) ---
    ${JSON.stringify(currency_rates)}

    --- ÚČETNÍ DENÍK (accounting_journal) ---
    ${JSON.stringify(accounting_journal)}

    --- BANKOVNÍ POHYBY (accounting_bank_movements) ---
    ${JSON.stringify(accounting_bank_movements)}

    --- ÚČTOVÝ ROZVRH (accounting_accounts) ---
    ${JSON.stringify(accounting_accounts)}

    --- BANKOVNÍ ÚČTY (accounting_bank_accounts) ---
    ${JSON.stringify(accounting_bank_accounts)}


    PRAVIDLA A PRIORITY:
    1. **PRIORITA DAT (CRITICAL):**
       - Pro odpovědi ohledně financí, zisků, nákladů a fakturace VŽDY primárně analyzuj tabulky:
         - **accounting_journal** (Účetní deník - nejpřesnější zdroj pravdy)
         - **accounting_documents** (Faktury)
         - **accounting_bank_movements** (Bankovní pohyby)
       - Použij tabulku **accounting_accounts** pro překlad čísel účtů (MD/D) na srozumitelné názvy (např. 501 -> Spotřeba materiálu).
       - Teprve pokud v těchto tabulkách data CHYBÍ (nebo je modul vypnutý), použij **DASHBOARD STATISTIKY** nebo **finance**.
    2. Odpovídej pouze česky.
    3. Použij formátování Markdown pro lepší přehlednost:
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
    4. Pokud se ptám na zisk/tržby za rok, podívej se primárně do účetních dat a teprve pak do "DASHBOARD STATISTIKY".
      - Když se bude volat tool get_dashboard_stats, nebo get_detailed_stats se explicitně zeptej za jaké období se ptá. (např. posledních 12 měsíců, minulý rok, tento rok) a dle toho správněj volej tool.
    5. NIKDY nepoužívej formátování kódu (backticky) pro finanční částky. Částky piš normálně tučně nebo v textu (např. **100 000 CZK**).
    6. Analýzy prováděj důkladně.
    7. Vždy zkontroluj jaký je aktuální datum dle obecné funkce (nespoléhat na info z ai modelu), aby tvé analýzy byli relevantní zárovn toto datum ber jako součást analýzy.
    8. Můžeš dohledávat data na internetu, či čerpat ze své znalosti aby jsi mohl jasně vysvětlit vše podstatné.
    9. při vykreslování progress barů používej vždy barvy podle aplikace.
    10. Při vykreslování progress barů vždy využívej syntaxi "progress: 50 %", a podobně v tomto stylu.
    11. Pokud uživatel explicitně požádá o vysvětlení datových zdrojů nebo vysvětluješ složitou logiku databáze, vlož vizuální referenci na tabulku.
        - Reference musí být ve formátu JSON code blocku s jazykem 'table'.
        - NEPOUŽÍVEJ to pro běžné odpovědi. Jen když je to nutné pro technické vysvětlení.
        - Příklad:
          \`\`\`table
          {
            "name": "klienti",
            "description": "Evidence všech zákazníků a jejich sazeb pro fakturaci."
          }
          \`\`\`

    12. Pokud uživatel nerozumí konkrétnímu sloupci nebo se ptá na význam dat, vlož referenci na atribut.
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
    
    13. [CRITICAL] Pokud uvádíš PŘÍKLADY DAT (např. seznam pracovníků, seznam projektů), NIKDY je nevypisuj jako text nebo bullet pointy.
        - VŽDY je naformátuj jako JSON pole objektů uvnitř code blocku s jazykem 'json'.
        - Toto umožní aplikaci vykreslit je jako krásnou interaktivní tabulku.
        - Příklad:
          \`\`\`json
          [
            { "jmeno": "Jan Novák", "pozice": "Truhlář" },
            { "jmeno": "Petr Svoboda", "pozice": "Lakýrník" }
          ]
          \`\`\`

    14. [CRITICAL] ODKAZOVÁNÍ NA REPORTY:
        Pokud uživatel žádá o zobrazení celého reportu (výsledovka, rozvaha, deník, saldokonto), NEVYPISUJ ho do chatu.
        Místo toho odpověz stručně a nabídni odkaz na příslušnou stránku v aplikaci:
        - Výsledovka (Profit & Loss): [Zobrazit Výsledovku](/accounting/reports/profit-loss)
        - Rozvaha (Balance Sheet): [Zobrazit Rozvahu](/accounting/reports/balance-sheet)
        - Hlavní kniha (General Ledger): [Zobrazit Hlavní knihu](/accounting/reports/general-ledger)
        - Účetní deník (Journal): [Zobrazit Deník](/accounting/reports/journal)
        - Pohledávky (Receivables): [Zobrazit Pohledávky](/accounting/reports/receivables)
        - Závazky (Payables): [Zobrazit Závazky](/accounting/reports/payables)
        - Bankovní účty (Bank Accounts): [Zobrazit Bankovní účty](/accounting/bank-accounts)

        Použij syntaxi Markdown pro odkaz: \`[Text odkazu](URL)\`.
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
              // @ts-ignore - AI SDK complex generics
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
              // @ts-ignore - AI SDK complex generics
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
                    details: error instanceof Error ? getErrorMessage(error) : String(error)
                  };
                }
              }
            })
          }
        });
      } catch (err: unknown) {
        // Determine if it was our timeout or a real API error
        if ((err instanceof Error && err.name === 'AbortError') || controller.signal.aborted) {
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
      } catch (err: unknown) {
        if ((err instanceof Error && err.name === 'AbortError') || controller.signal.aborted) {
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

    } catch (error: unknown) {
      // Ensure timeout is cleared if error occurs
      if (timeoutId) clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? getErrorMessage(error) : String(error);
      const isTimeout = errorMessage.includes("timed out");

      // Format log nicely
      const failureLog = `[AI Fallback] [FAILURE] Model ${userModelName} failed after ${duration}ms. Reason: ${errorMessage}`;
      console.warn(failureLog);
      attemptLogs.push(failureLog);

      // Log to file for persistence
      try {
        const fs = await import('fs');
        const path = await import('path');
        const stack = error instanceof Error ? error.stack : 'No stack';
        fs.appendFileSync(path.join(process.cwd(), 'chat-error.log'), `[${new Date().toISOString()}] ${failureLog}\nStack: ${stack || 'No stack'}\n\n`);
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
