ALTER TABLE public.accounting_documents 
ADD COLUMN IF NOT EXISTS supplier_dic text;
