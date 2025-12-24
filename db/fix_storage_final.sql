-- !!! WARNING: This allows ANYONE (even not logged in) to view/upload/delete images in this bucket !!!
-- This is a debugging measure to fix the "RLS Policy" error.

-- 1. Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop granular policies to clear conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Authenticated Access offer-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Public Access offer-images" ON storage.objects;

-- 3. Create a single "ALLOW ALL TO PUBLIC" policy
CREATE POLICY "Allow All Public Access offer-images"
ON storage.objects
FOR ALL
TO public
USING ( bucket_id = 'offer-images' )
WITH CHECK ( bucket_id = 'offer-images' );
