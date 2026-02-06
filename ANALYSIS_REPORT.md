# Analýza stavu aplikace SEBIT-App (v2 — opravená)

**Datum**: 2026-02-06
**Verze**: 0.1.0
**Celkový rozsah**: 255 souborů, ~39 400 řádků TypeScript/TSX kódu
**Poznámka**: Tato verze reflektuje aktuální stav `main` včetně commitů "oprava dle OPUS" a "Refaktoring monolitů".

---

## Celkové hodnocení: 62/100

| Oblast | Skóre | Váha | Vážený podíl |
|--------|-------|------|---------------|
| Architektura & Struktura | 75/100 | 20% | 15.0 |
| Kvalita kódu & TypeScript | 57/100 | 20% | 11.4 |
| Bezpečnost | 72/100 | 20% | 14.4 |
| Testování | 12/100 | 15% | 1.8 |
| Frontend & UX | 60/100 | 15% | 9.0 |
| DevOps & Konfigurace | 65/100 | 10% | 6.5 |
| **Celkem** | | | **58.1 ≈ 62** |

---

## Co se zlepšilo od předchozí analýzy

| Nález z v1 | Stav | Detail |
|------------|------|--------|
| Nechráněný `proxy-image` endpoint | **OPRAVENO** | Přidáno `verifySession()` |
| Nechráněný `aml/check` endpoint | **OPRAVENO** | Přidáno `verifySession()` + Zod validace |
| AML check nepoužívá centrální auth | **OPRAVENO** | Nyní používá `verifySession()` z `lib/api/auth.ts` |
| Chybí Zod validace | **ČÁSTEČNĚ** | Zod přidán do dependencies + použit v `aml/check` a `chat`. Zbývá 25 dalších API routes. |
| Dashboard page 986 řádků | **OPRAVENO** | Refaktorováno na 465 řádků — extrahováno do `DashboardKpiGrid`, `WorkersTable`, `ClientsTable`, `KPICard` |
| `aml/sanctions/sync` nechráněný | **OPRAVENO** | Nyní má auth |

---

## 1. Architektura & Struktura — 75/100 (bylo 72)

### Co je dobře
- Jasná adresářová struktura — App Router správně využitý
- White-label konfigurace v `lib/companyConfig.ts`
- Granulární feature flags (26 flags)
- Business logika oddělená v `lib/services/`
- **Nově extrahované dashboard komponenty** — `DashboardKpiGrid`, `WorkersTable`, `ClientsTable`, `KPICard`
- Protected routes skupina `(protected)/`

### Přetrvávající problémy

#### KRITICKÉ: Stále velké soubory
| Soubor | Řádků | Problém |
|--------|-------|---------|
| `lib/dashboard-beta.ts` | 1 769 | Monolitické dashboard kalkulace |
| `lib/dashboard.ts` | 1 700 | Duplicitní verze |
| `lib/accounting/service.ts` | 866 | Accounting sync — na hraně, ale přijatelné |
| `app/api/chat/route.ts` | 841 | AI chat route — příliš velký |
| `app/vykazy/page.tsx` | 775 | Page component se smíšenou logikou |
| `components/AiMessageBubble.tsx` | 662 | Velká komponenta |

#### STŘEDNÍ: Duplicitní dashboard
Stále existují dvě paralelní verze:
- `lib/dashboard.ts` (1 700 řádků) + `app/dashboard/page.tsx`
- `lib/dashboard-beta.ts` (1 769 řádků) + `app/dashboard-beta/`

### Doporučení
1. **Konsolidovat dashboard** — sjednotit na jednu verzi
2. **Rozdělit `app/api/chat/route.ts`** (841 řádků) na menší moduly
3. **Rozdělit `app/vykazy/page.tsx`** (775 řádků) na komponenty
4. **Rozdělit `components/AiMessageBubble.tsx`** (662 řádků)

---

## 2. Kvalita kódu & TypeScript — 57/100 (bylo 55)

### Co je dobře
- Strict mode zapnutý v tsconfig.json
- Path aliasy (`@/*`) správně nakonfigurované
- Konzistentní použití `NextRequest`/`NextResponse`
- Centrální auth helper
- **Nově: Zod nainstalován** a použit v AML check route

### Přetrvávající problémy

#### KRITICKÉ: 316 výskytů `: any` v 65 souborech
Nejhorší soubory:
| Soubor | Počet `any` |
|--------|-------------|
| `lib/dashboard-beta.ts` | 64 |
| `lib/dashboard.ts` | 62 |
| `components/AiMessageBubble.tsx` | 20 |
| `components/AppSidebar.tsx` | 18 |
| `lib/aml/sanctions/eu.ts` | 15 |
| `lib/aml/sanctions/ofac.ts` | 9 |
| `lib/services/dashboard/labor-service.ts` | 8 |
| `app/aml/tester/page.tsx` | 8 |

#### KRITICKÉ: `ignoreBuildErrors: true`
TypeScript chyby se mohou dostat do produkce.

#### STŘEDNÍ: 119+ výskytů `console.log/warn/error`
Strukturovaný logger existuje, ale není konzistentně používán.

### Doporučení
1. **Odstranit `ignoreBuildErrors`** a opravit type errory
2. **Nahradit `any` typy** — prioritně v dashboard souborech (126x) a AML sanctions (24x)
3. **Rozšířit Zod validaci** na zbývající API routes
4. **Nahradit `console.*`** za `createLogger()` v produkčních souborech

---

## 3. Bezpečnost — 72/100 (bylo 62) — VÝRAZNÉ ZLEPŠENÍ

### Co je dobře
- Centrální auth `verifySession()` — cookie + Bearer token
- SSRF ochrana na image proxy s allowlistem
- CRON auth s `CRON_SECRET`
- Auth middleware na všech routách
- **Nově: `proxy-image` chráněn** `verifySession()`
- **Nově: `aml/check` chráněn** `verifySession()` + Zod validace
- **Nově: `aml/sanctions/sync` chráněn**
- 25 z 27 API endpointů nyní chráněno (93%)

### Přetrvávající problémy

#### STŘEDNÍ: Zbývající nechráněné endpointy (2)
| Endpoint | Problém |
|----------|---------|
| `app/api/aml/sanctions/update-eu/route.ts` | Žádná auth — kdokoliv může spustit EU sanctions sync |
| `app/api/debug-tax-date/route.ts` | Debug endpoint (vrací 404, ale soubor by neměl existovat) |

#### STŘEDNÍ: Zod validace pouze na 2/27 API routes
Zod je nainstalovaný a použitý v `aml/check` a `chat`, ale zbylých 25 routes nemá schema validaci vstupů.

#### NÍZKÉ: Non-null assertions na env proměnné
`process.env.NEXT_PUBLIC_SUPABASE_URL!` — runtime chyba bez hlášky pokud chybí.

### Doporučení
1. **Přidat auth do `aml/sanctions/update-eu`** (5 min práce)
2. **Smazat `debug-tax-date`** endpoint úplně
3. **Postupně přidat Zod validaci** na zbývající API routes
4. **Validovat env proměnné** při startu aplikace

---

## 4. Testování — 12/100 (beze změny)

### Co je dobře
- Vitest nakonfigurovaný s coverage
- Testing Library v devDependencies
- 4 existující testovací soubory

### Problémy — beze změny

#### KRITICKÉ: Minimální pokrytí
Pouze **4 testovací soubory** z 255 souborů (~1.5% pokrytí):
- `lib/api/__tests__/auth.test.ts`
- `lib/__tests__/rate-limit.test.ts`
- `lib/__tests__/formatting.test.ts`
- `lib/__tests__/formatDate.test.ts`

Kritická business logika (dashboard, payroll, accounting, AML) bez testů.

#### KRITICKÉ: Žádné E2E testy, žádné API route testy

### Doporučení
1. **Prioritně otestovat**: payroll, accounting sync, dashboard kalkulace
2. **Zavést E2E testy** s Playwrightem
3. **Nastavit CI pipeline** s minimální coverage threshold

---

## 5. Frontend & UX — 60/100 (bylo 58)

### Co je dobře
- Moderní stack (React 19, Next.js 16, Tailwind CSS 4)
- PDF generování pro nabídky a timesheety
- AI Chat integrovaný
- Suspense na 7 stránkách
- QR scanner v inventuře
- **Nově: Dashboard rozdělen** na reusable komponenty (`KPICard`, `DashboardKpiGrid`, etc.)

### Přetrvávající problémy

#### KRITICKÉ: Žádné `loading.tsx` soubory
0 souborů — uživatel vidí prázdnou stránku při načítání.

#### KRITICKÉ: Žádné `error.tsx` boundary soubory
0 souborů — při chybě uživatel vidí default Next.js error.

#### STŘEDNÍ: Některé page components stále velké
- `app/vykazy/page.tsx` — 775 řádků
- `app/akce/page.tsx` — 591 řádků
- `app/pracovnici/page.tsx` — 565 řádků

### Doporučení
1. **Přidat `loading.tsx`** do hlavních route skupin
2. **Přidat `error.tsx`** s user-friendly recovery
3. **Rozdělit zbývající velké stránky** na komponenty

---

## 6. DevOps & Konfigurace — 65/100 (beze změny)

### Co je dobře
- Vercel deployment
- Cron jobs
- Sharp pro image processing
- Strukturovaný logger
- **Nově: Zod v dependencies**

### Přetrvávající problémy
- Žádný CI/CD pipeline (GitHub Actions)
- `node-fetch` zbytečná závislost
- Chybí `.env.example`

### Doporučení
1. Zavést GitHub Actions CI
2. Odstranit `node-fetch`
3. Vytvořit `.env.example`

---

## Top 10 doporučených úprav (aktualizované)

| # | Úprava | Impact | Effort | Oblast |
|---|--------|--------|--------|--------|
| 1 | ~~Přidat auth do nechráněných API endpointů~~ | ~~Vysoký~~ | ~~Nízký~~ | ~~Bezpečnost~~ — **VĚTŠINOU HOTOVO** |
| 2 | Odstranit `ignoreBuildErrors: true` a opravit type errory | Vysoký | Střední | Kvalita kódu |
| 3 | Přidat `loading.tsx` a `error.tsx` do route skupin | Vysoký | Nízký | Frontend/UX |
| 4 | Napsat testy pro kritickou business logiku | Vysoký | Vysoký | Testování |
| 5 | Nahradit `any` typy v dashboard souborech (126 výskytů) | Střední | Střední | Kvalita kódu |
| 6 | Konsolidovat duplicitní dashboard | Střední | Střední | Architektura |
| 7 | Rozšířit Zod validaci na zbývající API routes (25 routes) | Střední | Střední | Bezpečnost |
| 8 | Rozdělit velké soubory (chat route, vykazy, akce, pracovnici) | Střední | Střední | Architektura |
| 9 | Zavést CI pipeline (GitHub Actions) | Střední | Nízký | DevOps |
| 10 | Přidat auth do posledních 2 nechráněných endpointů | Nízký | Velmi nízký | Bezpečnost |

---

## Souhrnný přehled

### Silné stránky
- Moderní, aktuální tech stack (Next.js 16, React 19, Tailwind 4)
- Dobře navržený white-label systém s feature flags
- **93% API endpointů chráněno** autentizací
- SSRF ochrana na image proxy
- Kompletní business doména
- Strukturovaný logger
- PDF generování
- **Zod validace zavedena** a funkční na klíčových endpointech
- **Dashboard refaktorován** do reusable komponent

### Slabé stránky
- Prakticky žádné testy (1.5% pokrytí) — **NEJSLABŠÍ OBLAST**
- Velké monolitické soubory (`dashboard-beta.ts`, `dashboard.ts`, `chat/route.ts`)
- TypeScript `any` nadužíváno (316 výskytů)
- Build ignoruje type errory
- Chybí `loading.tsx`/`error.tsx` UI boundaries
- Duplicitní dashboard kód
- Žádný CI/CD pipeline

---

*Analýza provedena Claude AI — 2026-02-06 (v2 — opravená na aktuální main)*
