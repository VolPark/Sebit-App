SELECT column_name, data_type, is_generated 
FROM information_schema.columns 
WHERE table_name = 'polozky_nabidky';
