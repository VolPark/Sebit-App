-- Add accounting columns to finance table
ALTER TABLE public.finance ADD COLUMN IF NOT EXISTS variable_symbol text;
ALTER TABLE public.finance ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.finance ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.finance ADD COLUMN IF NOT EXISTS supplier_ico text;
ALTER TABLE public.finance ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE public.finance ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Bank';
ALTER TABLE public.finance ADD COLUMN IF NOT EXISTS category text;

-- Add invoicing details to klienti table (for Income automation)
ALTER TABLE public.klienti ADD COLUMN IF NOT EXISTS ico text;
ALTER TABLE public.klienti ADD COLUMN IF NOT EXISTS dic text;
ALTER TABLE public.klienti ADD COLUMN IF NOT EXISTS address text;

-- Comment on columns
COMMENT ON COLUMN public.finance.variable_symbol IS 'Variabilní symbol (VS)';
COMMENT ON COLUMN public.finance.invoice_number IS 'Číslo faktury / dokladu';
COMMENT ON COLUMN public.finance.supplier_ico IS 'IČO dodavatele (pro výdaje)';
