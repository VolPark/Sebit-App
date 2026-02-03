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

*Last updated: 2026-02-03*
