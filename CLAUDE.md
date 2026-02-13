# CLAUDE.md - AI Assistant Guide for Sebit-App

This document provides essential context for AI assistants working with this codebase.

## Project Overview

**Sebit-App** is a white-label internal management system for Czech service companies (Interiery Horyna and SEBIT Solutions). It handles:

- Client and project management
- Price offers/quotes with PDF generation
- Workforce management and payroll
- Financial tracking and accounting integration
- Time tracking and reporting
- AML compliance (Anti-Money Laundering)
- Inventory management

**Architecture**: Single codebase with environment-based white-labeling. Each deployment (Vercel) has its own Supabase database and branding.

**Primary Language**: Czech (variable names, UI text, database columns)

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| UI | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database | Supabase (PostgreSQL) | Latest |
| Auth | Supabase Auth (JWT) | - |
| PDF | @react-pdf/renderer | 4.x |
| Drag & Drop | @dnd-kit/core + sortable | 6.x / 10.x |
| AI | Vercel AI SDK + Google Generative AI | Latest |

## Quick Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm start        # Start production server
```

## Directory Structure

```
app/                      # Next.js App Router pages
├── api/                  # API routes (30 endpoints)
│   ├── accounting/       # Accounting sync and reports
│   ├── aml/              # AML compliance endpoints
│   ├── chat/             # AI assistant streaming
│   ├── cron/             # Scheduled jobs (daily-tasks)
│   ├── proxy-image/      # SSRF-protected image proxy
│   └── vehicles/         # Vehicle registry lookup (VIN)
├── (protected)/          # Auth-guarded routes (accounting, management)
├── dashboard/            # Main analytics dashboard
├── nabidky/              # Offers/quotes module
├── klienti/              # Client management
├── pracovnici/           # Employee management
├── mzdy/                 # Payroll
├── vykazy/               # Work reports
├── finance/              # Financial transactions
├── aml/                  # AML compliance module
└── inventory/            # Inventory management

components/               # React components (80 files)
├── nabidky/              # Offer-specific (form, PDF, table)
├── accounting/           # Accounting UI components
├── finance/              # Finance components
├── flotila/              # Fleet components (10 files)
│   ├── FleetStats.tsx    # Statistics cards
│   ├── FleetTable.tsx    # Data table with filters
│   ├── VehicleModal.tsx  # Full-screen modal (95vw x 90vh) with 6 tabs
│   ├── RsvDataGrid.tsx   # Shared read-only definition-list grid for RSV data
│   └── tabs/             # Vehicle detail tabs
│       ├── VehicleBasicTab.tsx         # Editable basic info + VIN decoder
│       ├── VehicleEngineTab.tsx        # Engine & drivetrain (RSV read-only)
│       ├── VehicleBodyTab.tsx          # Body & dimensions (RSV read-only)
│       ├── VehicleEmissionsTab.tsx     # Emissions (RSV read-only)
│       ├── VehicleRegistrationTab.tsx  # Registration & documents (RSV read-only)
│       └── VehicleOperationsTab.tsx    # Operations & costs (editable)
├── AppSidebar.tsx        # Main navigation
├── AppShell.tsx          # Layout wrapper
└── AiChat.tsx            # AI assistant UI

lib/                      # Business logic and utilities
├── api/                  # API helpers (auth.ts, nabidky-api.ts, flotila-api.ts)
├── accounting/           # Accounting service (UOL integration)
├── vehicles/             # Czech Vehicle Registry API client (RSV Datova kostka)
├── services/             # Domain services (payroll, timesheet, etc.)
├── types/                # TypeScript interfaces
├── aml/                  # AML compliance logic
├── dashboard.ts          # Dashboard calculations (large file)
├── companyConfig.ts      # Environment-based configuration
├── supabase.ts           # Database client
└── logger.ts             # Structured logging

context/                  # React Context providers
├── AuthContext.tsx       # User session and role
└── FaceAuthContext.tsx   # Biometric auth state

hooks/                    # Custom React hooks
├── useFinanceData.ts
├── usePayrollData.ts
└── ...

db/                       # Database
├── schema.sql            # Full PostgreSQL schema (5000+ lines)
└── migrations/           # Migration scripts

utils/supabase/           # Supabase client initialization
├── client.ts             # Browser client
├── server.ts             # Server-side client
└── admin.ts              # Service role client
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `lib/companyConfig.ts` | All environment variables and feature flags |
| `lib/api/auth.ts` | Session verification helpers |
| `lib/types/klient-types.ts` | Client interface, display presets for PDF (`ZobrazeniPreset`, `getVisibleFields`) |
| `lib/dashboard.ts` | Dashboard data aggregation (~2900 lines) |
| `lib/accounting/service.ts` | Accounting sync engine (~750 lines) |
| `lib/vehicles/czech-vehicle-api.ts` | Czech Vehicle Registry (RSV) API client with rate limiter |
| `middleware.ts` | Auth middleware for all routes |
| `db/schema.sql` | Complete database schema |
| `ARCHITECTURE.md` | Security patterns and API guidelines |

## Coding Conventions

### TypeScript

- **Strict mode** enabled
- Use `interface` for domain models, `type` for unions/primitives
- All new code must be TypeScript (no `.js` files in main codebase)
- Path alias: `@/*` maps to project root

### Components

- **Server Components** by default (no directive needed)
- **Client Components** require `'use client'` at file top
- Component files use PascalCase: `MyComponent.tsx`
- Utility files use camelCase: `myUtility.ts`

### API Routes

Always use this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

export async function GET(req: NextRequest) {
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    // Your logic here
    return NextResponse.json({ data });
}
```

For cron jobs, use Bearer token auth:

```typescript
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    // Your logic here
}
```

### Database Access

Use Supabase client directly (no ORM):

```typescript
import { createClient } from '@/utils/supabase/server';

const supabase = await createClient();
const { data, error } = await supabase
    .from('klienti')
    .select('*')
    .eq('organization_id', orgId);
```

For admin operations, use service role:

```typescript
import { createAdminClient } from '@/utils/supabase/admin';
const supabase = createAdminClient();
```

### Logging

Use structured logger:

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger({ module: 'MyModule' });
logger.info('Operation completed', { id: 123 });
logger.error('Failed', { error: err.message });
```

## Feature Flags

Features are controlled via environment variables in `lib/companyConfig.ts`:

```typescript
// Check if feature is enabled
if (CompanyConfig.features.enableDashboard) {
    // Show dashboard
}
```

Key flags:
- `NEXT_PUBLIC_ENABLE_DASHBOARD` - Main dashboard
- `NEXT_PUBLIC_ENABLE_OFFERS` - Offers module
- `NEXT_PUBLIC_ENABLE_FINANCE` - Finance module
- `NEXT_PUBLIC_ENABLE_ACCOUNTING` - Accounting integration
- `NEXT_PUBLIC_ENABLE_AML` - AML compliance
- `NEXT_PUBLIC_ENABLE_INVENTORY` - Inventory management

## Role-Based Access

Three roles defined in `AuthContext.tsx`:

| Role | Access Level |
|------|--------------|
| `owner` / `admin` | Full access |
| `office` | Business operations (no dashboard/settings) |
| `reporter` | Time reports only |

Check roles in components:

```typescript
const { role } = useAuth();
if (role === 'owner' || role === 'admin') {
    // Admin-only features
}
```

## Database Schema

Key tables (Czech naming):

| Table | Purpose |
|-------|---------|
| `klienti` | Clients/customers (`kontaktni_osoba`, `telefon`, `web`, `ico`, `dic`, `address`, `email`) |
| `pracovnici` | Employees |
| `akce` | Projects/jobs |
| `nabidky` | Price offers (`sleva_procenta`, `uvodni_text`, `zobrazeni_klienta`, `zobrazeni_klienta_pole`) |
| `polozky_nabidky` | Offer line items (`poradi`, `je_sleva`, `celkem` = generated) |
| `nabidky_stavy` | Offer statuses (with color) |
| `polozky_typy` | Offer item types (dynamic) |
| `prace` | Work logs |
| `mzdy` | Payroll records |
| `finance` | Income/expense transactions |
| `fixed_costs` | Recurring monthly costs |
| `accounting_documents` | Synced invoices |
| `accounting_mappings` | Invoice-to-project links |
| `divisions` | Business divisions |
| `organizations` | Multi-tenant support |
| `vozidla` | Company vehicles (`vin`, `spz`, `znacka`, `model`, `vin_data` JSONB, `vin_data_fetched_at`, BMW CarData fields) |
| `vozidla_udrzba` | Vehicle maintenance/service records |
| `vozidla_palivo` | Fuel log entries |
| `bmw_oauth_states` | CSRF tokens for BMW OAuth flow |

Full schema: `db/schema.sql`

## Common Tasks

### Adding a New Page

1. Create `app/your-page/page.tsx`
2. Add navigation item in `lib/app-navigation.ts`
3. Add feature flag if needed in `lib/companyConfig.ts`

### Adding an API Endpoint

1. Create `app/api/your-endpoint/route.ts`
2. Always implement authentication (see patterns above)
3. Add rate limiting for expensive operations using `@/lib/rate-limit`

### Adding a Database Table

1. Write migration in `db/migrations/`
2. Update types in `lib/types/`
3. Add to `lib/database.types.ts` if auto-generated

### Working with Offers (Nabidky)

- API: `lib/api/nabidky-api.ts`
- Types: `lib/types/nabidky-types.ts` (`CreateOfferItemPayload`, `UpdateOfferItemPayload`, etc.)
- Client types: `lib/types/klient-types.ts` (`Klient`, `ZobrazeniPreset`, `KlientField`, `getVisibleFields`)
- Components: `components/nabidky/`
- PDF generation: `components/nabidky/OfferPdf.tsx`
- Detail page: `app/nabidky/[id]/page.tsx`

Key features:
- **Drag & drop reordering** via `@dnd-kit` (`poradi` column, `reorderOfferItems()`)
- **Discount system**: Global % discount (`sleva_procenta`) + discount items (`je_sleva`, negative `cena_ks`)
- **Custom intro text**: Editable PDF intro (`uvodni_text` column)
- **Client display presets**: Configurable client info in PDF via `zobrazeni_klienta` column (presets: `zakladni`, `b2b`, `plny`, `vlastni`) and `zobrazeni_klienta_pole` (JSONB array for custom field selection)
- **Important**: `celkem` in `polozky_nabidky` is a **GENERATED column** (`mnozstvi * cena_ks`) — never pass it in insert/update

### VIN Decoder (Hybrid, 3-tier)
- **Primary**: **Czech Vehicle Registry (RSV Datova kostka)** via `lib/vehicles/czech-vehicle-api.ts` -- official CZ government data (brand, model, fuel, STK, emissions, 70+ fields). Requires `CZECH_GOV_API_KEY`. Rate limited to 27 req/min.
- **Secondary**: **Local Decoder** (`lib/vin-decoder.ts` & `lib/vin-data/`) -- supports Skoda, VW, Hyundai, Kia, BMW, Renault.
- **Fallback**: **NHTSA API** (Global/US) -- free, no API key needed.
- **API Endpoint**: `POST /api/vehicles/vin-lookup` -- Zod-validated, saves raw RSV data to `vozidla.vin_data` JSONB column.
- **UI Flow**: `VehicleModal.tsx` is a full-screen modal (95vw x 90vh) with 6 tabs displaying all RSV data. Modal fetches full vehicle detail (including `vin_data`) on open, so RSV tabs show saved data without re-decoding VIN.
- **Tabs**: Zakladni udaje (editable) | Motor a pohon | Karoserie a rozmery | Emise | Registrace a doklady | Provoz a naklady (editable)
- **Shared component**: `RsvDataGrid.tsx` renders read-only definition-list grids for RSV data. Supports multi-value fields (rendered as bulleted lists) and structured DalsiZaznamy records.

## Important Constraints

### Single-Tenant Architecture

This app is **single-tenant** per deployment:
- No organization_id filtering needed in most queries
- No RLS policies (uses SERVICE_ROLE intentionally)
- All users in one deployment share data

See `ARCHITECTURE.md` for details.

### Security Requirements

- All API endpoints MUST use `verifySession()` or CRON_SECRET
- Never create unprotected database endpoints
- Use `NextRequest` type (not `Request`)
- Rate limit AI/sync endpoints
- Validate user input (Zod recommended)

### Build Configuration

- TypeScript errors are ignored in build (`ignoreBuildErrors: true` in next.config.ts)
- ESLint errors don't block builds
- Fix type errors even if build passes

## What NOT to Do

1. **Don't add multi-tenant logic** - Each deployment is single-tenant
2. **Don't create debug routes** - No `/api/debug-*` in production
3. **Don't log sensitive data** - No tokens, passwords, or PII in logs
4. **Don't skip authentication** - Every API route needs auth
5. **Don't use `Request` type** - Always use `NextRequest` from `next/server`
6. **Don't add RLS policies** - App uses service role key intentionally
7. **Don't create unnecessary abstractions** - Keep it simple

## Post-Change Agents (MANDATORY)

After every code change, run these two agents **in parallel** before considering the task complete:

1. **validation-agent** — Ensures test coverage, Zod schemas, security patterns, and coding standards. Adds or updates tests for any modified/new code.
2. **docs-agent** — Updates CLAUDE.md, README.md, ARCHITECTURE.md, and all project documentation to reflect the changes.

This is a **blocking requirement** — no task is done until both agents have run and their output is clean.

## External Integrations

### UOL (Accounting System)

- Configuration: `lib/companyConfig.ts` -> `api.uol`
- Client: `lib/accounting/uol-client.ts`
- Sync service: `lib/accounting/service.ts`

### CNB (Czech National Bank)

- Currency rates sync: `lib/currency-sync.ts`
- Daily rates stored in `currency_rates` table

### Czech Vehicle Registry (RSV Datova kostka)

- API client: `lib/vehicles/czech-vehicle-api.ts`
- Endpoint: `POST /api/vehicles/vin-lookup`
- Configuration: `lib/companyConfig.ts` -> `api.czechVehicleRegistry`
- Environment variable: `CZECH_GOV_API_KEY`
- Rate limit: 27 requests/minute (sliding window)
- Returns 70+ fields: brand, model, fuel, STK, emissions, dimensions, registration history, multi-value fields (tires, weights)
- Raw response cached in `vozidla.vin_data` (JSONB)
- `CzechVehicleData` interface includes all RSV fields (MotorCislo, RozmeryDelkaDo, VozidloAutonomniStupen, RzVarianta, etc.)

## Debugging

Utility scripts are in `/scripts/` directory:
- `debug-*.ts` - Debugging tools
- `inspect-*.ts` - Data inspection
- `check-*.ts` - Validation scripts
- `test-*.ts` - Manual test utilities

Run with: `npx tsx scripts/your-script.ts`

## Deployment

- **Platform**: Vercel
- **Cron**: Daily at 02:00 UTC (`/api/cron/daily-tasks`)
- **Environment**: Set all `NEXT_PUBLIC_*` variables per deployment
- **Database**: Separate Supabase project per client

## Getting Help

- Check `README.md` for detailed feature documentation
- Check `ARCHITECTURE.md` for security patterns
- Database schema in `db/schema.sql`
- Type definitions in `lib/types/`

---

*Last updated: 2026-02-13* (RSV data persistence, multi-value fields as lists, DalsiZaznamy structured parsing)
