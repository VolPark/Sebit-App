-- check_schema.sql
-- Check if new columns exist in polozky_nabidky
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'polozky_nabidky';

-- Check RLS policies for polozky_nabidky
SELECT * FROM pg_policies WHERE tablename = 'polozky_nabidky';
