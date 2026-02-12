# SEBIT App - Architecture Notes

## 🏢 Single-Tenant Application

> **IMPORTANT:** This is a **single-tenant application** designed for **one company only** (SEBIT s.r.o.).

### What this means:

- ❌ **No multi-tenant logic** - No organization_id filtering, no tenant isolation
- ❌ **No Row Level Security (RLS)** - Using SERVICE_ROLE is intentional
- ❌ **No per-tenant data separation** - All data belongs to one company
- ✅ **Simple authentication** - Users are authenticated, but all see the same data
- ✅ **Direct database access** - No need for tenant context in queries

### Do NOT implement:

1. Organization/tenant ID columns or filtering
2. RLS policies on Supabase tables  
3. Multi-tenant middleware or context providers
4. Per-organization API scoping

### Keep it simple:

When adding new features, assume **all authenticated users belong to the same company** and have access to the same data. Role-based access control (admin vs. viewer) is sufficient.

---

## 🔐 API Security Patterns

> **CRITICAL:** All API endpoints MUST implement authentication. Unauthenticated endpoints are a security vulnerability.

### Authentication Helper

Use the shared authentication helper from `@/lib/api/auth`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

export async function GET(req: NextRequest) {
    // ALWAYS verify session first
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();
    
    // ... your handler logic
}
```

### Authentication Patterns by Endpoint Type

| Endpoint Type | Auth Pattern | Example |
|---------------|--------------|---------|
| **User-facing API** | `verifySession()` | Reports, analytics, settings |
| **Cron jobs** | `CRON_SECRET` Bearer token | `/api/cron/*` |
| **Dual-access** (user + cron) | `verifySession() OR CRON_SECRET` | `/api/accounting/sync` |
| **Public endpoints** | None (rare, must be justified) | None currently |

### Cron Job Authentication

```typescript
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    // ... handler logic
}
```

### Dual Authentication (User OR Cron)

```typescript
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const session = await verifySession(req);

    if (!isCronAuth && !session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    // ... handler logic
}
```

---

## 📁 API Route Structure

```
app/api/
├── accounting/
│   ├── analytics/       # Dashboard widgets (GET, auth: verifySession)
│   ├── reports/         # Financial reports (GET, auth: verifySession)
│   ├── settings/        # Config endpoints (POST, auth: verifySession)
│   ├── sync/            # Data sync (POST, auth: verifySession OR CRON_SECRET)
│   └── bank-accounts/   # Bank management (POST, auth: verifySession)
├── aml/                 # AML module (auth: verifySession or CRON_SECRET)
├── chat/                # AI chat (POST, auth: verifySession + rate limit)
├── cron/                # Scheduled jobs (auth: CRON_SECRET only)
├── proxy-image/         # Image proxy (GET, public but with SSRF protection)
└── vehicles/            # Vehicle registry lookup (POST, auth: verifySession, Zod validated)
```

---

## ⚠️ Security Checklist for New Endpoints

Before adding a new API endpoint, verify:

- [ ] Uses `NextRequest` type (not `Request`) for proper header access
- [ ] Calls `verifySession(req)` at the start of handler
- [ ] Returns `unauthorizedResponse()` if session is null
- [ ] Uses `createClient` with `SUPABASE_SERVICE_ROLE_KEY` for DB access
- [ ] No debug/development code in production
- [ ] Rate limiting for expensive operations (see `@/lib/rate-limit`)

---

## 🚫 Anti-Patterns to Avoid

1. **Never create unprotected endpoints** that access database
2. **Never use `Request` type** - always use `NextRequest` from `next/server`
3. **Never log sensitive data** (tokens, passwords, PII)
4. **Never create `/api/debug-*` routes** in production code
5. **Never trust user input** - always validate with Zod or similar

---

*Last updated: 2026-02-12*

