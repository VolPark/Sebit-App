Proveď bezpečný refactoring v SEBIT-app.

## Postup

1. **Před refactorem**: 
   - `git status` — ověř čistý working tree
   - `npm run build` — ověř že build prochází
   - Přečti relevantní soubory a pochop kontext

2. **Plán refactoringu**:
   - Jaké soubory budou dotčeny?
   - Jaké jsou závislosti (grep pro importy)?
   - Co se může rozbít?

3. **Implementace**:
   - Malé, atomické kroky
   - Po každém kroku ověř že build stále prochází
   - Zachovej existující API kontrakty
   - Zachovej existující DB schema

4. **Ověření**:
   - `npm run build` — build prochází
   - `npm run lint` — žádné nové chyby
   - `npx tsc --noEmit` — typy OK
   - Zkontroluj že se nezměnilo chování

5. **Validace**: Spusť agenta `validation-agent` — ověří že refactoring nezlomil testy a doplní chybějící validace
6. **Dokumentace**: Spusť agenta `docs-agent` — aktualizuje dokumentaci pokud se změnila struktura souborů nebo API

## Pravidla
- NIKDY neměň DB schema při refactoringu
- NIKDY neměň API kontrakty (request/response formát)
- Zachovej zpětnou kompatibilitu
- Pokud soubor > 500 řádků, zvažuj rozdělení
- Extrahuj opakující se logiku do lib/services/
- **Po dokončení refactoringu VŽDY spusť validation-agent a docs-agent**

## Co refaktorovat
$ARGUMENTS
