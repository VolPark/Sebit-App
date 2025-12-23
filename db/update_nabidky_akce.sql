-- Add akce_id column to nabidky table
ALTER TABLE nabidky 
ADD COLUMN akce_id BIGINT REFERENCES akce(id);

-- Optional: Update RLS policies if necessary (usually inherited or standard select applies)

-- Verify structure
SELECT * FROM nabidky LIMIT 1;
