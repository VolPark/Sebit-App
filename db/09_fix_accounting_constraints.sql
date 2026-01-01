-- Drop the too-strict constraint
ALTER TABLE public.accounting_documents 
DROP CONSTRAINT IF EXISTS accounting_documents_provider_id_external_id_key;

-- Add a new constraint that includes the 'type' column
ALTER TABLE public.accounting_documents 
ADD CONSTRAINT accounting_documents_provider_id_external_id_type_key 
UNIQUE (provider_id, external_id, type);
