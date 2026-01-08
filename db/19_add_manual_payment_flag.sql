-- Add manually_paid column to accounting_documents
ALTER TABLE accounting_documents 
ADD COLUMN IF NOT EXISTS manually_paid BOOLEAN DEFAULT FALSE;

-- Update existing records to have default value (optional, as default handles new ones)
UPDATE accounting_documents SET manually_paid = FALSE WHERE manually_paid IS NULL;
