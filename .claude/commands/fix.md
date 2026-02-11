Oprav bug nebo problém v SEBIT-app.

## Postup

1. **Pochop problém**: Co se děje? Jaký je očekávaný vs. skutečný výsledek?
2. **Lokalizuj**: Najdi relevantní soubory (Grep, Glob, čti kód)
3. **Reprodukuj**: Ověř, že problém existuje (`npm run dev`, `npm run build`)
4. **Root cause**: Identifikuj skutečnou příčinu, nejen symptom
5. **Oprav**: Minimální, cílená oprava — nerefaktoruj nesouvisející kód
6. **Ověř**: Spusť build a lint, ověř že oprava funguje
7. **Regrese**: Zkontroluj, že oprava nerozbila nic jiného
8. **Validace**: Spusť agenta `validation-agent` — zkontroluje a doplní chybějící testy a validace pro opravu
9. **Dokumentace**: Spusť agenta `docs-agent` — aktualizuje dokumentaci pokud oprava změnila chování nebo strukturu

## Pravidla
- Opravuj jen to, co je rozbité — neměň funkční kód
- Pokud je potřeba debug skript, vytvoř ho v `scripts/`
- Nepřidávej debug routes do API
- Loguj přes structured logger, ne console.log
- **Po dokončení opravy VŽDY spusť validation-agent a docs-agent**

## Problém k vyřešení
$ARGUMENTS
