SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'nabidky';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'nabidky';
