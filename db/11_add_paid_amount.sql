ALTER TABLE public.accounting_documents 
ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;
