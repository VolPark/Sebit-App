-- update_pdf_schema.sql
-- Add columns for Enhanced PDF and Item Images

-- 1. Update NABIDKY table
ALTER TABLE "public"."nabidky"
ADD COLUMN IF NOT EXISTS "platnost_do" DATE;

-- 2. Update POLOZKY_NABIDKY table
ALTER TABLE "public"."polozky_nabidky"
ADD COLUMN IF NOT EXISTS "popis" TEXT,
ADD COLUMN IF NOT EXISTS "obrazek_url" TEXT,
ADD COLUMN IF NOT EXISTS "sazba_dph" NUMERIC DEFAULT 21;

-- 3. Attempt to create Storage Bucket (requires extensions/permissions, might fail if run by unprivileged user)
-- This part acts as a "try" block. If it fails, user must do it manually.
-- Note: Usually creating buckets via SQL requires pg_net or special functions. 
-- We will assume standard insert into storage.buckets if available.
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public read access to images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'offer-images' );

-- Policy for authenticated uploads
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'offer-images' );

-- Reload Schema
NOTIFY pgrst, 'reload schema';
