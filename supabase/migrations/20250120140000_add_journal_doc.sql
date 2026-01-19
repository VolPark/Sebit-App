-- Add doc_number column to accounting_journal
ALTER TABLE accounting_journal
ADD COLUMN IF NOT EXISTS doc_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounting_journal_doc_number ON accounting_journal(doc_number);
