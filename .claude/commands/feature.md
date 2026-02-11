Implementuj novou feature pro SEBIT-app.

## Postup

1. **Analýza požadavku**: Porozuměj, co je potřeba — přečti CLAUDE.md a ARCHITECTURE.md
2. **Plán**: Vytvoř stručný plán (které soubory, jaké změny, jaké závislosti)
3. **Databáze**: Pokud je potřeba nová tabulka/sloupec, vytvoř migraci v `db/migrations/`
4. **Backend**: API routes v `app/api/` s autentizací a validací
5. **Frontend**: React komponenty, stránky, navigace
6. **Feature flag**: Přidej do `lib/companyConfig.ts` pokud je to nový modul
7. **Navigace**: Aktualizuj `lib/app-navigation.ts` pro nové stránky
8. **Kontrola**: Spusť `npm run build` a `npm run lint`
9. **Validace**: Spusť agenta `validation-agent` — doplní Zod schémata, unit/integrační/E2E testy a zkontroluje bezpečnostní patterny
10. **Dokumentace**: Spusť agenta `docs-agent` — aktualizuje CLAUDE.md, README.md, ARCHITECTURE.md a další dokumentaci

## Kontext
- Všechno v češtině (UI text, proměnné, DB sloupce)
- Dodržuj existující vzory — podívej se na podobné moduly
- Použij relevantní subagenty (frontend-dev, backend-dev, db-architect)
- **Po dokončení implementace VŽDY spusť validation-agent a docs-agent**

## Úkol
$ARGUMENTS
