# Business analýza SEBIT-App — Přidaná hodnota a návrhy

**Datum**: 2026-02-07
**Cíl**: Zhodnotit business kvalitu aplikace a navrhnout co by měla obsahovat

---

## Celkové business hodnocení: 68/100

Aplikace pokrývá klíčové potřeby české servisní firmy, ale má mezery v automatizaci, notifikacích a analytice.

---

## Přehled modulů a jejich úplnost

| Modul | Úplnost | Business hodnota | Komentář |
|-------|---------|-----------------|----------|
| Dashboard & KPI | 70% | Vysoká | Komplexní metriky, ale chybí benchmarking a trendy |
| Nabídky/Offers | 80% | Velmi vysoká | PDF generování, stavy, vazba na klienta — solidní |
| Klienti/CRM | 40% | Střední | Základní evidence, chybí CRM funkce |
| Pracovníci | 55% | Střední | Evidence + mzdové sazby, chybí skills/certifikace |
| Mzdy/Payroll | 75% | Vysoká | Výpočty, vazba na účetnictví, role-based přístup |
| Finance | 60% | Střední | Příjmy/výdaje, ale chybí cashflow predikce |
| Výkazy/Reporting | 65% | Vysoká | Pracovní výkazy s časovým sledováním |
| Účetnictví/UOL | 85% | Velmi vysoká | Hluboká integrace s UOL, sync, journal, reports |
| AML Compliance | 70% | Vysoká | EU/OFAC/CZ sankční seznamy, screening |
| Inventura/Sklad | 75% | Vysoká | QR kódy, multi-sklad, pohyby, dodavatelské katalogy |
| AI Asistent | 80% | Velmi vysoká | Přístup ke všem datům, streaming, rate limiting |
| Dodavatelé | 50% | Střední | SFTP sync, katalogy, ale jen jeden provider |

---

## Detailní analýza po modulech

### 1. Dashboard & KPI — 70%

**Co umí:**
- KPI přehled firmy: tržby, náklady, marže, počet projektů
- Přehled zaměstnanců: vytížení, hodinové sazby, odpracované hodiny
- Přehled klientů: tržby per klient, počet projektů
- Experimentální metriky
- Filtrování podle období, klienta, divize
- Beta verze dashboardu s moderním designem

**Co chybí a mělo by tam být:**
- **Trend šipky** — u každého KPI zobrazit % změnu oproti minulému období
- **Cíle/Targets** — nastavitelné cíle pro KPI (např. cílová marže 35%)
- **Alerting** — upozornění když KPI klesne pod prahovou hodnotu
- **Cashflow predikce** — na základě splatností faktur a fixních nákladů
- **Pipeline přehled** — kolik nabídek je v jaké fázi a jejich hodnota
- **Widget customizace** — uživatel si přizpůsobí dashboard layout

---

### 2. Nabídky — 80%

**Co umí:**
- CRUD nabídek s vazbou na klienta a projekt
- Položky nabídky s cenami, množstvím, jednotkami
- PDF generování s firemním brandingem (logo, barvy, podpis)
- Stavy nabídek (custom workflow)
- Číslo nabídky, platnost do
- Filtrování podle divize

**Co chybí:**
- **Šablony nabídek** — opakující se nabídky ze šablony
- **Verze nabídek** — historie změn, porovnání verzí
- **Online sdílení** — odkaz pro klienta na web verzi (bez PDF)
- **E-podpis** — klient může nabídku schválit online
- **Automatický follow-up** — připomínka pokud klient neodpověděl do X dní
- **Konverzní poměr** — statistika kolik nabídek se přeměnilo v zakázku
- **Duplikace nabídky** — rychlé vytvoření kopie existující nabídky

---

### 3. Klienti/CRM — 40%

**Co umí:**
- Základní evidence: název, IČO, DIČ, email, adresa, poznámka
- Hodinová sazba per klient
- Seznam projektů klienta

**Co chybí (zásadně):**
- **Kontaktní osoby** — více kontaktů per firma (obchodní, technický, fakturační)
- **Historie komunikace** — poznámky o schůzkách, hovorech, emailech
- **Dokumenty** — přílohy smluv, objednávek
- **Tagy/Kategorie** — segmentace klientů (VIP, aktivní, neaktivní)
- **Lifetime value** — celkový obrat per klient za celou dobu
- **Upozornění** — klient bez aktivity X měsíců
- **Adresář** — vícero adres (fakturační, dodací, provozovna)

---

### 4. Pracovníci — 55%

**Co umí:**
- Evidence: jméno, telefon, hodinová mzda, aktivní/neaktivní
- Přiřazení k divizi
- Vazba na uživatelský účet (user_id)
- Role (worker types)

**Co chybí:**
- **Dovednosti/Certifikace** — jaké práce může vykonávat, platnost certifikátů
- **Dostupnost/Kalendář** — kdy je k dispozici, dovolená, nemoc
- **Dokumenty** — pracovní smlouva, BOZP, zdravotní prohlídky
- **Hodnocení výkonu** — produktivita, kvalita práce
- **Kontaktní údaje** — email, adresa, datum narození, rodné číslo
- **Nákladový přehled** — celkový náklad na zaměstnance (mzda + odvody + benefity)
- **Onboarding checklist** — pro nové zaměstnance

---

### 5. Mzdy/Payroll — 75%

**Co umí:**
- Měsíční mzdové záznamy per pracovník
- Propojení s odpracovanými hodinami
- Propojení s účetními náklady (accounting_mappings)
- Role-based přístup (office nevidí vlastníky)

**Co chybí:**
- **Automatický výpočet** — z odpracovaných hodin × sazba automaticky
- **Příplatky** — přesčasy, svátky, víkendy, noční
- **Srážky** — zálohy, exekuce, stravenky
- **Export pro účetní** — formát pro mzdovou účetní (CSV/XML)
- **Roční přehled** — daňové podklady, přehled za rok
- **Hromadné zadání** — rychlé zadání mezd pro všechny pracovníky

---

### 6. Finance — 60%

**Co umí:**
- Evidence příjmů a výdajů (transakce)
- Fixní náklady (měsíční)
- Vazba na projekty a divize
- Přehled per období

**Co chybí:**
- **Cashflow výhled** — predikce na základě splatností a fixních nákladů
- **Rozpočty** — plán vs. skutečnost per projekt/divize
- **Opakující se transakce** — automatické generování z fixních nákladů
- **Bankovní napojení** — automatický import z banky (ČS, KB, ČSOB, Fio)
- **Párování faktur** — automatické párování plateb s fakturami
- **Grafy trendů** — vizualizace vývoje příjmů/výdajů v čase
- **Upomínky** — automatické upomínky na nezaplacené faktury

---

### 7. Výkazy/Time Tracking — 65%

**Co umí:**
- Pracovní výkazy per pracovník, projekt, datum
- Filtrování a přehledy
- Timesheet PDF generování

**Co chybí:**
- **Mobilní zadávání** — zjednodušené rozhraní pro telefon
- **GPS lokace** — ověření přítomnosti na pracovišti
- **Timer** — stopky pro sledování času v reálném čase
- **Schvalování** — workflow: pracovník → vedoucí → schváleno
- **Automatické vyplnění** — z rozvrhu nebo předchozího týdne
- **Přehledy produktivity** — porovnání odhadovaných vs. skutečných hodin

---

### 8. Účetnictví/UOL — 85%

**Co umí:**
- Plná integrace s UOL účetním systémem
- Sync faktur (příjem, vydané)
- Účetní deník (journal)
- Bankovní pohyby
- Hlavní kniha, výkaz zisků a ztrát, rozvaha
- DPH kontrolní hlášení
- Burn rate analýza
- Daňový odhad
- Kurzový lístek ČNB

**Co chybí:**
- **Automatické párování** — faktury s bankovními pohyby
- **Upozornění na splatnost** — faktury po splatnosti
- **Cash flow statement** — výkaz peněžních toků
- **Meziroční srovnání** — porovnání období rok za rokem

---

### 9. AML Compliance — 70%

**Co umí:**
- Screening proti EU, OFAC a CZ sankčním seznamům
- Automatický denní update seznamů (cron)
- AML check s logováním
- AML Tester stránka

**Co chybí:**
- **Pravidelné re-screening** — automatická kontrola existujících klientů
- **Risk scoring** — klasifikace klientů podle rizika
- **Audit trail** — kompletní historie všech kontrol
- **PEP kontrola** — politicky exponované osoby
- **Beneficial ownership** — skuteční vlastníci (UBO)
- **Report generování** — AML zprávy pro regulátora

---

### 10. Inventura/Sklad — 75%

**Co umí:**
- Evidence položek s EAN, SKU, popisem
- Multi-sklad (centers) s barevným rozlišením
- Pohyby: příjem, výdej, audit, vrácení, transfer
- QR kód skenování
- Minimální množství (alert)
- Dodavatelský katalog (SFTP sync s Demos Trade)
- Obrázky položek

**Co chybí:**
- **Automatické objednávky** — když klesne pod minimum, navrhnout objednávku
- **Sériová čísla / šarže** — sledování per kus
- **Inventurní protokol** — PDF výstup pro inventuru
- **Nákladová cena** — FIFO/LIFO výpočet
- **Více dodavatelů** — zatím jen Demos Trade provider

---

### 11. AI Asistent — 80%

**Co umí:**
- Přístup ke VŠEM firemním datům (klienti, projekty, finance, účetnictví...)
- Google Generative AI (Gemini)
- Streaming odpovědí
- Rate limiting per uživatel
- ER diagram jako kontext
- Dashboard stats jako kontext

**Co chybí:**
- **Akce z chatu** — "Vytvoř nabídku pro klienta X" přímo z AI
- **Grafy v odpovědích** — vizualizace dat přímo v chatu
- **Předpřipravené dotazy** — tlačítka s častými otázkami
- **Export odpovědí** — uložení/sdílení AI analýzy
- **Kontextové napovídání** — AI proaktivně upozorní na anomálie

---

## Co aplikaci CHYBÍ jako celek

### KRITICKÉ (vysoký business dopad)

| # | Feature | Dopad | Detail |
|---|---------|-------|--------|
| 1 | **Notifikační systém** | Vysoký | Žádné emaily, push notifikace, in-app notifikace. Uživatel se nedozví o změnách pokud se nepřihlásí. |
| 2 | **Schvalovací workflow** | Vysoký | Nabídky, výkazy, mzdy — vše bez schvalovacích kroků. Není vidět kdo co schválil. |
| 3 | **Kontaktní osoby u klientů** | Vysoký | Firma má jednoho klienta ale více kontaktních osob. Základní CRM funkcionalita. |
| 4 | **Cashflow predikce** | Vysoký | Firma neví kolik bude mít na účtu za měsíc. Data pro výpočet existují (faktury, fixní náklady). |
| 5 | **Mobilní optimalizace** | Vysoký | Pracovníci v terénu potřebují zadávat výkazy a skenovat QR z mobilu. |

### STŘEDNÍ (zlepšení efektivity)

| # | Feature | Detail |
|---|---------|--------|
| 6 | **CSV/Excel export** | Žádný export dat kromě PDF. Pro účetní, banku, úřady potřeba tabulkových výstupů. |
| 7 | **Šablony nabídek** | Opakující se nabídky se musí vytvářet od nuly. |
| 8 | **Audit trail** | Kdo kdy co změnil. Důležité pro compliance a řešení sporů. |
| 9 | **Kalendářní plánování** | Plánování pracovníků na projekty s vizualizací obsazenosti. |
| 10 | **Automatické upomínky** | Faktury po splatnosti, expirující nabídky, blížící se termíny. |

### NÍZKÉ (nice-to-have)

| # | Feature | Detail |
|---|---------|--------|
| 11 | Dark mode | Preferovaný vizuální režim |
| 12 | Globální vyhledávání | Hledání napříč klienty, projekty, nabídkami |
| 13 | Klávesové zkratky | Produktivita pro power usery |
| 14 | Onboarding tour | Pro nové uživatele |
| 15 | Vícejazyčnost | Pokud firma expanduje mimo ČR |

---

## Srovnání s konkurencí na trhu

### Jak si SEBIT-App stojí vs. české nástroje pro servisní firmy

| Feature | SEBIT-App | ABRA FlexiBee | Pohoda | Money S3 | iDoklad |
|---------|-----------|---------------|--------|----------|---------|
| Nabídky/Kalkulace | **Ano + PDF** | Ano | Ano | Ano | Základní |
| Sklad/Inventura | **Ano + QR** | Ano | Ano | Ano | Ne |
| Mzdy | Základní | Plné | Plné | Plné | Ne |
| Účetnictví | **UOL integrace** | Nativní | Nativní | Nativní | Základní |
| CRM | Základní | Základní | Ne | Ano | Ne |
| AML Compliance | **Ano** | Ne | Ne | Ne | Ne |
| AI Asistent | **Ano** | Ne | Ne | Ne | Ne |
| Time tracking | Ano | Plugin | Plugin | Ano | Ne |
| Mobilní app | Responsive web | Nativní | Ne | Plugin | Nativní |
| White-label | **Ano** | Ne | Ne | Ne | Ne |
| Custom dashboardy | **Ano** | Omezené | Ne | Omezené | Ne |
| E-podpis | Ne | Plugin | Ne | Ne | Ne |
| Notifikace | **Ne** | Email | Email | Email | Email |
| API | REST | REST | XML | ISDOC | REST |

### Unikátní konkurenční výhody SEBIT-App:
1. **AI asistent s přístupem ke všem datům** — žádný český ERP toto nemá
2. **AML compliance modul** — unikátní pro malou firmu
3. **White-label** — jeden kód, více firem
4. **Moderní UX** — React 19 + Tailwind vs. staré desktopové aplikace
5. **Vlastní dashboardy** — hlubší analytika než většina konkurence

### Kde konkurence vede:
1. **Mzdová agenda** — FlexiBee/Pohoda mají kompletní mzdy včetně odvodů
2. **Bankovní napojení** — přímé napojení na banky
3. **Fakturace** — kompletní vydané/přijaté faktury s ISDOC
4. **Notifikace** — emailové upomínky, workflow
5. **Mobilní nativní app** — offline podpora

---

## Doporučená roadmapa (podle business priority)

### Q1 2026 — "Komunikace a automatizace"
| # | Feature | Effort | Business value |
|---|---------|--------|---------------|
| 1 | Notifikační systém (in-app + email) | 3-4 dny | Kritická |
| 2 | Kontaktní osoby u klientů | 1-2 dny | Vysoká |
| 3 | CSV/Excel export dat | 2-3 dny | Vysoká |
| 4 | Schvalovací workflow pro nabídky | 2-3 dny | Vysoká |

### Q2 2026 — "Finanční inteligence"
| # | Feature | Effort | Business value |
|---|---------|--------|---------------|
| 5 | Cashflow predikce | 3-4 dny | Vysoká |
| 6 | Automatické upomínky (splatnost faktur) | 2 dny | Vysoká |
| 7 | Trend indikátory na dashboardu | 1 den | Střední |
| 8 | Šablony nabídek + duplikace | 1-2 dny | Střední |

### Q3 2026 — "Mobilita a terén"
| # | Feature | Effort | Business value |
|---|---------|--------|---------------|
| 9 | Mobilní optimalizované zadávání výkazů | 3-4 dny | Vysoká |
| 10 | Kalendářní plánování pracovníků | 4-5 dní | Střední |
| 11 | Dovednosti a certifikace pracovníků | 1-2 dny | Střední |
| 12 | Audit trail (kdo co změnil) | 2-3 dny | Střední |

### Q4 2026 — "AI a automatizace"
| # | Feature | Effort | Business value |
|---|---------|--------|---------------|
| 13 | AI akce z chatu (vytvoř nabídku, přidej klienta) | 3-4 dny | Vysoká |
| 14 | Automatické objednávky ze skladu | 2-3 dny | Střední |
| 15 | Globální vyhledávání | 2 dny | Střední |
| 16 | AML automatický re-screening klientů | 1-2 dny | Střední |

---

## Shrnutí

**SEBIT-App je solidní interní systém s unikátními features (AI, AML, white-label), ale chybí mu "connecting tissue" — notifikace, workflow, a export dat, které z něj udělají plnohodnotný nástroj pro každodenní práci.**

Největší quick win je **notifikační systém** — bez něj uživatelé musí aktivně kontrolovat změny, což snižuje adopci. Druhý je **CSV export** — každá účetní/banka ho vyžaduje.

Celková business hodnota: **68/100** s potenciálem na **85+** po implementaci roadmapy Q1-Q2.

---

*Business analýza provedena Claude AI — 2026-02-07*
