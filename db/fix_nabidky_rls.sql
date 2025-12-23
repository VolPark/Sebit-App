-- DISABLE RLS FOR OFFERS MODULE (TEMPORARY FIX)
-- Run this script in Supabase SQL Editor to bypass "42501" errors completely.

-- 1. NABIDKY (Offers) - Disable security to allow all operations
ALTER TABLE "public"."nabidky" DISABLE ROW LEVEL SECURITY;

-- 2. POLOZKY_NABIDKY (Offer Items)
ALTER TABLE "public"."polozky_nabidky" DISABLE ROW LEVEL SECURITY;

-- 3. POLOZKY_TYPY (Item Types)
ALTER TABLE "public"."polozky_typy" DISABLE ROW LEVEL SECURITY;

-- Reload schema caches
NOTIFY pgrst, 'reload schema';
