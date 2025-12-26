-- Add user_id column to pracovnici table to link with auth.users
ALTER TABLE public.pracovnici 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pracovnici_user_id ON public.pracovnici(user_id);
