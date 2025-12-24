-- 1. Ensure bucket is public (public read access)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'offer-images';

-- 2. Drop specific existing policies to avoid conflicts
-- (It's safer to drop by name if we know them, or we can just add a new permissive one)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
-- Drop potentially other named policies users might have created manually
DROP POLICY IF EXISTS "Give me access" ON storage.objects;


-- 3. Create a single PERMISSIVE policy for ALL operations (Select, Insert, Update, Delete)
-- This effectively "disables" RLS restrictions for this specific bucket.
-- It applies to both authenticated and anon users if you want, but usually 'authenticated' is safer.
-- If you want truly NO restrictions (even unauthenticated uploads), use 'public' instead of 'authenticated'.
-- For now, allowing 'authenticated' users full control is the standard "disable RLS" equivalent for app users.

CREATE POLICY "Allow All Authenticated Access offer-images"
ON storage.objects
FOR ALL
TO authenticated
USING ( bucket_id = 'offer-images' )
WITH CHECK ( bucket_id = 'offer-images' );

-- If you strictly need unauthenticated (anon) uploads as well, uncomment the following:
/*
CREATE POLICY "Allow All Public Access offer-images"
ON storage.objects
FOR ALL
TO public
USING ( bucket_id = 'offer-images' )
WITH CHECK ( bucket_id = 'offer-images' );
*/
