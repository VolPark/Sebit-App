# Analýza stavu aplikace SEBIT-App

**Datum**: 2026-02-06
**Verze**: 0.1.0
**Celkový rozsah**: 255 souborů, ~39 400 řádků TypeScript/TSX kódu

---

## Celkové hodnocení: 58/100

| Oblast | Skóre | Váha | Vážený podíl |
|--------|-------|------|---------------|
| Architektura & Struktura | 72/100 | 20% | 14.4 |
| Kvalita kódu & TypeScript | 55/100 | 20% | 11.0 |
| Bezpečnost | 62/100 | 20% | 12.4 |
| Testování | 12/100 | 15% | 1.8 |
| Frontend & UX | 58/100 | 15% | 8.7 |
| DevOps & Konfigurace | 65/100 | 10% | 6.5 |
| **Celkem** | | | **54.8 ≈ 58** |

---

## 1. Architektura & Struktura — 72/100

### Co je dobře
- **Jasná adresářová struktura** — App Router správně využitý s `app/`, `components/`, `lib/`, `hooks/`, `context/`
- **White-label konfigurace** — Elegantní řešení v `lib/companyConfig.ts` s env proměnnými
- **Feature flags** — Granulární řízení modulů (dashboard, finance, accounting, AML, inventory)
- **Oddělení API logiky** — Business logika v `lib/services/`, API route handlery v `app/api/`
- **Middleware** — Centrální auth middleware pro všechny routy
- **Protected routes** — Skupina `(protected)/` pro autentizované stránky

### Problémy

#### KRITICKÉ: Obří soubory
| Soubor | Řádků | Problém |
|--------|-------|---------|
| `lib/dashboard-beta.ts` | 1 769 | Monolitický soubor pro dashboard kalkulace |
| `lib/dashboard.ts` | 1 700 | Duplicitní verze dashboard logiky |
| `app/dashboard/page.tsx` | 986 | Page component s příliš mnoho logiky |
| `lib/accounting/service.ts` | 866 | Accounting sync engine — přijatelné, ale na hraně |
| `app/api/chat/route.ts` | 841 | AI chat route — příliš velký |
| `app/vykazy/page.tsx` | 775 | Page component by měl být rozdělen |

#### STŘEDNÍ: Duplicitní dashboard
Existují dvě paralelní verze dashboardu:
- `lib/dashboard.ts` (1 700 řádků)
- `lib/dashboard-beta.ts` (1 769 řádků)
- `app/dashboard/page.tsx` + `app/dashboard-beta/`

To je **technický dluh** — dvě paralelní implementace téhož.

### Doporučení
1. **Rozdělit velké soubory** na menší moduly (max 300-400 řádků)
2. **Konsolidovat dashboard** — vybrat jednu verzi a druhou smazat
3. **Extrahovat page logiku** do custom hooks a komponent

---

## 2. Kvalita kódu & TypeScript — 55/100

### Co je dobře
- **Strict mode** zapnutý v tsconfig.json
- **Path aliasy** (`@/*`) správně nakonfigurované
- Konzistentní použití `NextRequest`/`NextResponse`
- Centrální auth helper (`lib/api/auth.ts`)

### Problémy

#### KRITICKÉ: 291 výskytů `: any` ve 40+ souborech
Nejhorší soubory:
| Soubor | Počet `any` |
|--------|-------------|
| `lib/dashboard-beta.ts` | 64 |
| `lib/dashboard.ts` | 62 |
| `components/AiMessageBubble.tsx` | 20 |
| `components/AppSidebar.tsx` | 18 |
| `app/vykazy/page.tsx` | 10 |
| `lib/accounting/uol-client.ts` | 8 |
| `lib/services/dashboard/labor-service.ts` | 8 |

#### KRITICKÉ: `ignoreBuildErrors: true`
V `next.config.ts` jsou TypeScript chyby ignorované při buildu. To znamená, že:
- Typové chyby se mohou dostat do produkce
- Neexistuje žádná záchranná síť

#### STŘEDNÍ: 119 výskytů `console.log/warn/error`
Aplikace má strukturovaný logger (`lib/logger.ts`), ale mnoho komponent stále používá `console.*` místo něj. Nekonzistentní logování znesnadňuje monitoring.

#### STŘEDNÍ: Nekonzistentní error handling
- API routy mají různé patterns — některé vracejí `{ error: string }`, jiné `{ message: string }`
- Chybí centrální error response helper

### Doporučení
1. **Odstranit `ignoreBuildErrors`** a opravit všechny type errory
2. **Nahradit `any` typy** správnými typy — začít od dashboard souborů
3. **Nahradit `console.*`** za `createLogger()` ve všech produkčních souborech
4. **Sjednotit error response formát** napříč API

---

## 3. Bezpečnost — 62/100

### Co je dobře
- **Centrální auth** — `verifySession()` podporuje cookie i Bearer token
- **SSRF ochrana** — `proxy-image` route má allowlist, blokuje privátní IP
- **CRON auth** — Cron joby vyžadují `CRON_SECRET`
- **Middleware** — Auth middleware na všech routách (kromě statických)
- **Feature flags** — Moduly lze vypnout

### Problémy

#### KRITICKÉ: Nechráněné API endpointy
| Endpoint | Problém |
|----------|---------|
| `app/api/proxy-image/route.ts` | Žádná session verifikace — kdokoliv může proxy obrázky |
| `app/api/aml/sanctions/update-eu/route.ts` | Žádná auth — kdokoliv může spustit EU sanctions sync |
| `app/api/debug-tax-date/route.ts` | Debug endpoint v produkci (vrací 404, ale soubor by neměl existovat) |

#### STŘEDNÍ: AML check route nepoužívá `verifySession()`
`app/api/aml/check/route.ts` implementuje vlastní auth logiku místo centrálního `verifySession()`. Funkčně OK, ale nekonzistentní.

#### STŘEDNÍ: Chybí Zod validace
Pouze 1 soubor importuje Zod (`app/api/chat/route.ts`). Vstupní data z API requestů nejsou validována schématem — spoléhá se na TypeScript, který za runtime neexistuje.

#### NÍZKÉ: Non-null assertions (`!`) na env proměnné
`process.env.NEXT_PUBLIC_SUPABASE_URL!` — pokud env proměnná chybí, dojde k runtime chybě bez srozumitelné hlášky.

### Doporučení
1. **Přidat auth do všech API endpointů** — proxy-image, AML sanctions update
2. **Smazat debug endpoint** úplně
3. **Zavést Zod validaci** na všech API routes pro body, query params
4. **Validovat env proměnné** při startu aplikace (např. s Zod `.parse()`)

---

## 4. Testování — 12/100

### Co je dobře
- **Vitest nakonfigurovaný** — `npm run test`, `npm run test:run`, `npm run test:coverage`
- **Testing Library** v devDependencies
- Existují 4 testovací soubory

### Problémy

#### KRITICKÉ: Minimální pokrytí
Pouze **4 testovací soubory** z 255 souborů:
| Test | Co testuje |
|------|-----------|
| `lib/api/__tests__/auth.test.ts` | Auth helper |
| `lib/__tests__/rate-limit.test.ts` | Rate limiter |
| `lib/__tests__/formatting.test.ts` | Formátování |
| `lib/__tests__/formatDate.test.ts` | Datum formátování |

To je **~1.5% pokrytí** souborů. Kritická business logika jako dashboard kalkulace, payroll, accounting sync, AML checks nemají **žádné testy**.

#### KRITICKÉ: Žádné E2E testy
Žádný Playwright, Cypress, nebo jiný E2E framework.

#### KRITICKÉ: Žádné API route testy
27 API endpointů bez jediného testu.

### Doporučení
1. **Prioritně otestovat**:
   - `lib/services/payroll-service.ts` — výpočet mezd
   - `lib/accounting/service.ts` — sync s účetním systémem
   - `lib/dashboard.ts` — dashboard kalkulace
   - Všechny API routes
2. **Zavést E2E testy** s Playwrightem pro kritické flows (login, nabídky, finance)
3. **Nastavit CI pipeline** s minimální coverage threshold (alespoň 30% jako start)
4. **Code coverage reporting** — integrovat do PR workflow

---

## 5. Frontend & UX — 58/100

### Co je dobře
- **Moderní stack** — React 19, Next.js 16, Tailwind CSS 4
- **PDF generování** — Vlastní PDF šablony pro nabídky a timesheety
- **AI Chat** — Integrovaný AI asistent
- **Sidebar navigace** — `AppSidebar.tsx` s role-based menu
- **Suspense** — Používáno na 7 stránkách (dashboard, accounting, nabidky, login)
- **QR scanner** — Inventární modul s `html5-qrcode`

### Problémy

#### KRITICKÉ: Žádné loading.tsx soubory
0 souborů `loading.tsx` v celé aplikaci. Next.js App Router loading states nejsou využité — uživatel vidí prázdnou stránku při načítání.

#### KRITICKÉ: Žádné error.tsx boundary soubory
0 souborů `error.tsx`. Při chybě na stránce uživatel uvidí default Next.js error bez možnosti recovery.

#### STŘEDNÍ: Page components příliš velké
Stránky jako `dashboard/page.tsx` (986 řádků), `vykazy/page.tsx` (775 řádků), `akce/page.tsx` (591 řádků) obsahují příliš mnoho logiky. Měly by delegovat na menší komponenty.

#### STŘEDNÍ: Omezená responsivita
Aplikace je primárně desktop — potřeba ověřit mobilní zobrazení.

#### NÍZKÉ: Accessibility
Omezené použití ARIA atributů a sémantického HTML.

### Doporučení
1. **Přidat `loading.tsx`** do všech hlavních route skupin
2. **Přidat `error.tsx`** do root a klíčových sekcí
3. **Rozdělit velké stránky** na menší client/server komponenty
4. **Audit přístupnosti** — klávesová navigace, screen reader podpora

---

## 6. DevOps & Konfigurace — 65/100

### Co je dobře
- **Vercel deployment** — standardní, spolehlivý
- **Cron jobs** — denní úlohy přes `/api/cron/daily-tasks`
- **Sharp** pro image processing
- **Strukturovaný logger** připravený
- **Git** — verzovaný projekt

### Problémy

#### STŘEDNÍ: Žádný CI/CD pipeline
Chybí GitHub Actions nebo jiný CI s:
- Lint kontrolou
- Type check kontrolou
- Test runner
- Build verifikací

#### STŘEDNÍ: `node-fetch` v dependencies
Next.js 16 má nativní `fetch` — `node-fetch` je zbytečná závislost.

#### NÍZKÉ: Chybí `.env.example`
Nový vývojář nemá referenci, jaké env proměnné nastavit.

### Doporučení
1. **Zavést GitHub Actions CI** — lint, typecheck, testy na každém PR
2. **Odstranit `node-fetch`** — použít nativní fetch
3. **Vytvořit `.env.example`** se všemi potřebnými proměnnými

---

## Top 10 doporučených úprav (podle priority)

| # | Úprava | Impact | Effort | Oblast |
|---|--------|--------|--------|--------|
| 1 | Přidat auth do nechráněných API endpointů | Vysoký | Nízký | Bezpečnost |
| 2 | Odstranit `ignoreBuildErrors: true` a opravit type errory | Vysoký | Střední | Kvalita kódu |
| 3 | Přidat `loading.tsx` a `error.tsx` do route skupin | Vysoký | Nízký | Frontend/UX |
| 4 | Napsat testy pro kritickou business logiku (payroll, accounting) | Vysoký | Vysoký | Testování |
| 5 | Nahradit `any` typy v dashboard souborech (126 výskytů) | Střední | Střední | Kvalita kódu |
| 6 | Konsolidovat duplicitní dashboard (dashboard.ts vs dashboard-beta.ts) | Střední | Střední | Architektura |
| 7 | Zavést Zod validaci na API route vstupy | Střední | Střední | Bezpečnost |
| 8 | Rozdělit velké soubory (>500 řádků) na menší moduly | Střední | Střední | Architektura |
| 9 | Zavést CI pipeline (GitHub Actions) | Střední | Nízký | DevOps |
| 10 | Nahradit `console.*` za structured logger | Nízký | Nízký | Kvalita kódu |

---

## Souhrnný přehled silných a slabých stránek

### Silné stránky
- Moderní, aktuální tech stack (Next.js 16, React 19, Tailwind 4)
- Dobře navržený white-label systém s feature flags
- Funkční auth middleware a session management
- Dobré SSRF ochrany na image proxy
- Kompletní business doména (nabídky, mzdy, účetnictví, AML, inventura)
- Strukturovaný logger připravený k použití
- PDF generování pro nabídky a timesheety

### Slabé stránky
- Prakticky žádné testy (1.5% pokrytí)
- Velké monolitické soubory (dashboard 1700+ řádků)
- TypeScript `any` nadužíváno (291 výskytů)
- Build ignoruje type errory
- Chybí loading/error UI boundaries
- Nechráněné API endpointy
- Žádný CI/CD pipeline
- Duplicitní kód (dva dashboardy)

---

*Analýza provedena Claude AI — 2026-02-06*
