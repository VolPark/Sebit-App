
-- Create accounting_contacts table
CREATE TABLE IF NOT EXISTS public.accounting_contacts (
    id text NOT NULL PRIMARY KEY,
    name text,
    company_number text, -- ICO
    vatin text, -- DIC
    city text,
    street text,
    postal_code text,
    country text,
    account_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add contact_id to accounting_documents if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_documents' AND column_name = 'contact_id') THEN
        ALTER TABLE public.accounting_documents ADD COLUMN contact_id text REFERENCES public.accounting_contacts(id);
    END IF;
END $$;
