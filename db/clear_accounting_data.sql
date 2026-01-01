-- Skript pro vymazání dat účetnictví (zachová nastavení providerů)

-- Používáme TRUNCATE pro rychlé smazání všech řádků a resetování ID sekvencí
-- CASCADE zajistí smazání závislých záznamů (i když zde je mažeme všechny najednou)
-- RESTART IDENTITY resetuje počítadla ID zpět na 1

TRUNCATE TABLE 
    public.accounting_mappings, 
    public.accounting_documents, 
    public.accounting_sync_logs 
RESTART IDENTITY CASCADE;
