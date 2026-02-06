Proveď code review posledních změn v SEBIT-app.

## Postup

1. Zjisti poslední změny: `git diff HEAD~3` nebo `git log --oneline -10`
2. Zkontroluj každý změněný soubor podle priorit:
   - **Bezpečnost**: Auth, input validace, logging citlivých dat
   - **Správnost**: Typy, error handling, null checks
   - **Konvence**: NextRequest, logger, naming, patterns
   - **Architektura**: Single-tenant, no RLS, no abstractions
   - **Výkon**: N+1 queries, pagination, loading states
3. Vypiš nálezy se severitou (❌ Critical, ⚠️ Warning, ✅ Good)
4. Shrň doporučení

## Formát výstupu
```
## Security
[nálezy]

## Correctness  
[nálezy]

## Conventions
[nálezy]

## Summary
[celkové hodnocení a seznam požadovaných změn]
```

## Rozsah review
$ARGUMENTS
