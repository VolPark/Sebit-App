# Fleet (Flotila) Module - Dokumentace

Kompletní modul pro správu vozového parku s automatickým načítáním dat vozidel.

## 🚀 Funkce

### ✅ Základní správa vozidel
- **CRUD operace** - vytvoření, úprava, mazání, zobrazení
- **Filtry a vyhledávání** - podle stavu, SPZ, značky, modelu, VIN
- **Statistiky** - celkový počet vozidel, aktivních, v servisu, blížící se STK/pojištění
- **Přidělení pracovníkům** - dropdown se seznamem zaměstnanců
- **Kompletní data** - pojištění, STK, nákupní cena, leasing, barva

### 🔍 Automatické načítání dat z VIN (zdarma)
- **NHTSA VIN Decoder API** - zdarma, bez API klíče
- Funguje pro vozidla z **EU i USA**
- Automaticky načte:
  - Značku (Make)
  - Model
  - Rok výroby
  - Typ paliva
- Podporované značky: BMW, Mercedes, VW, Audi, Škoda, Seat, Renault, Peugeot, Citroën, Fiat, Alfa Romeo a další

### 🚗 BMW CarData Integration (pro BMW vozidla)
- **Real-time telemetrie** z BMW Connected Drive
- Automatická synchronizace:
  - Aktuální nájezd (mileage)
  - Stav paliva/baterie
  - Poloha vozidla (GPS)
  - Stav dveří a oken
- OAuth 2.0 autorizace
- Automatické obnovení tokenů

---

## 📦 Instalace

### 1. Spuštění databázové migrace

Otevřete Supabase Studio SQL Editor a spusťte:

```sql
-- Zkopírujte obsah souboru db/migrations/001_flotila_schema.sql
```

Ověření:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'vozidla%';
-- Očekávaný výsledek: vozidla, vozidla_udrzba, vozidla_palivo
```

### 2. Aktivace modulu

V `.env.local` nastavte:
```bash
NEXT_PUBLIC_ENABLE_FLEET="true"
```

### 3. Restart dev serveru
```bash
npm run dev
```

Modul bude dostupný na `/flotila` v sidebaru pod "Provoz".

---

## 🔧 Konfigurace BMW CarData (volitelné)

### Krok 1: Registrace na BMW Developer Portal

1. Přejděte na **https://developer.bmw.com/**
2. Vytvořte účet a novou aplikaci
3. Získejte **Client ID** a **Client Secret**

### Krok 2: Nastavení Redirect URI

V BMW Developer Portal nastavte redirect URI:
```
https://vase-domena.com/api/bmw/callback
```

Pro localhost development:
```
http://localhost:3000/api/bmw/callback
```

### Krok 3: Přidání do .env.local

```bash
# BMW CarData OAuth
BMW_CLIENT_ID="your-client-id"
BMW_CLIENT_SECRET="your-client-secret"
BMW_REDIRECT_URI="https://vase-domena.com/api/bmw/callback"
```

### Krok 4: Připojení BMW vozidla

1. V aplikaci přidejte BMW vozidlo (VIN začínající `WBA`, `WBS`, nebo `WBY`)
2. Po uložení se zobrazí tlačítko "Připojit BMW CarData"
3. Klikněte a autorizujte přístup ve svém BMW Connected Drive účtu
4. Data se začnou automaticky synchronizovat

---

## 🎯 Použití

### Přidání nového vozidla

1. Klikněte "Přidat vozidlo"
2. **Zadejte VIN** (17 znaků)
3. Klikněte **"🔍 Načíst z VIN"**
   - Automaticky se doplní značka, model, rok a typ paliva
   - Pro BMW se zobrazí info o možnosti aktivace CarData
4. Doplňte zbývající údaje:
   - SPZ
   - Nájezd
   - Přidělený pracovník
   - Pojištění (pojišťovna, datum expirace)
   - STK datum
   - Kupní cena, datum pořízení
   - Leasing (checkbox)
5. Uložte

### Filtry a vyhledávání

- **Filtry stavu**: Vše | Aktivní | Servis | Neaktivní | Vyřazeno
- **Vyhledávání**: SPZ, značka, model nebo VIN

### Editace vozidla

1. Klikněte "Detail" u vozidla
2. Upravte pole
3. Uložte

### Mazání vozidla

1. Klikněte "Smazat"
2. Potvrďte akci

---

## 🔄 BMW CarData Sync

### Manuální synchronizace

Pro BMW vozidla s aktivovaným CarData:

```javascript
// Frontend call
const response = await fetch('/api/bmw/sync-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vehicleId: 123 })
});

const data = await response.json();
console.log(data.status);
// {
//   mileage: 45000,
//   fuelLevel: 75,
//   fuelRange: 500,
//   lastUpdate: "2026-02-09T10:00:00Z"
// }
```

### Automatická synchronizace (budoucí)

Můžete přidat cron job pro pravidelnou synchronizaci:

```typescript
// app/api/cron/sync-bmw-fleet/route.ts
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Sync all BMW vehicles with active CarData
  const supabase = createAdminClient();
  const { data: vehicles } = await supabase
    .from('vozidla')
    .select('id, vin, bmw_access_token, bmw_refresh_token, bmw_token_expiry')
    .eq('bmw_cardata_aktivni', true);

  for (const vehicle of vehicles || []) {
    try {
      const { accessToken } = await getValidBMWToken(
        vehicle.bmw_access_token,
        vehicle.bmw_refresh_token,
        vehicle.bmw_token_expiry
      );

      const status = await getBMWVehicleStatus(accessToken, vehicle.vin);

      await supabase
        .from('vozidla')
        .update({ najezd_km: status.mileage })
        .eq('id', vehicle.id);

      console.log(`✓ Synced vehicle ${vehicle.vin}`);
    } catch (error) {
      console.error(`✗ Failed to sync ${vehicle.vin}:`, error);
    }
  }

  return NextResponse.json({ success: true });
}
```

Poté v `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-bmw-fleet",
      "schedule": "0 6 * * *"
    }
  ]
}
```

---

## 📁 Struktura souborů

```
db/migrations/
  001_flotila_schema.sql          # Database schema (3 tables)

lib/
  api/flotila-api.ts               # Types + CRUD functions (~400 lines)
  vin-decoder.ts                   # NHTSA VIN Decoder (zdarma)
  bmw-cardata.ts                   # BMW CarData API client

app/
  flotila/page.tsx                 # Main fleet page
  api/bmw/
    callback/route.ts              # OAuth callback handler
    sync-status/route.ts           # Manual sync endpoint

components/flotila/
  FleetStats.tsx                   # Statistics cards
  FleetTable.tsx                   # Data table
  VehicleModal.tsx                 # Create/Edit modal (with VIN decoder)
```

---

## 🔒 Bezpečnost

### VIN Decoder
- ✅ Žádný API klíč není potřeba
- ✅ Veřejné NHTSA API (US Government)
- ✅ Bez rate limitů pro běžné použití

### BMW CarData
- ✅ OAuth 2.0 autorizace
- ✅ Tokeny šifrované v databázi
- ✅ Automatické obnovení tokenů
- ✅ Separate tokens per vehicle
- ⚠️ Vyžaduje BMW Connected Drive subscripci

---

## 📊 Databázové schéma

### Tabulka `vozidla`
```sql
- id (bigserial)
- vin (varchar(17), UNIQUE)
- spz (varchar(20), UNIQUE)
- znacka, model, rok_vyroby, typ_paliva
- stav (aktivni/servis/neaktivni/vyrazeno)
- najezd_km
- prideleny_pracovnik_id (FK -> pracovnici)
- pojisteni_do, pojistovna, stk_do
- datum_porizeni, kupni_cena, leasing
- bmw_cardata_aktivni (boolean)
- bmw_access_token, bmw_refresh_token, bmw_token_expiry
```

### Tabulka `vozidla_udrzba`
Údržba a servisy (pravidelný servis, opravy, STK, pneumatiky)

### Tabulka `vozidla_palivo`
Logování tankov (datum, litry, cena, nájezd)

---

## 🐛 Troubleshooting

### VIN Decoder nefunguje
- Ověřte, že VIN má přesně 17 znaků
- VIN nesmí obsahovat písmena I, O, Q
- Zkontrolujte internetové připojení (NHTSA API je externí)

### BMW CarData se nepřipojí
- Ověřte `BMW_CLIENT_ID`, `BMW_CLIENT_SECRET` v `.env.local`
- Zkontrolujte Redirect URI v BMW Developer Portal
- Ujistěte se, že máte aktivní BMW Connected Drive subscripci
- Vozidlo musí být registrované na vašem BMW účtu

### Token expiroval
- Tokeny se automaticky obnovují při každé synchronizaci
- Pokud obnovení selže, odpojte a znovu připojte vozidlo

---

## 📈 Budoucí rozšíření

- [ ] Detailní stránka vozidla (`/flotila/[vin]`)
- [ ] Modul údržby (přidání/zobrazení záznamů)
- [ ] Modul logování paliva
- [ ] Grafy nákladů a spotřeby
- [ ] Export do Excel/PDF
- [ ] Notifikace (blížící se STK, pojištění)
- [ ] Telematika pro ostatní značky (Mercedes ME, Audi Connect, atd.)
- [ ] Mapa s polohou vozidel (BMW CarData)

---

**Implementováno**: 2026-02-09
**Verze**: 1.0.0
**Status**: ✅ Production Ready (s výjimkou BMW CarData - vyžaduje konfiguraci)
