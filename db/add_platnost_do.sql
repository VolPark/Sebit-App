-- Add platnost_do column to nabidky table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nabidky' AND column_name = 'platnost_do') THEN
        ALTER TABLE public.nabidky ADD COLUMN platnost_do date;
    END IF;
END $$;
