
-- Create table for storing custom account names (overrides)
CREATE TABLE IF NOT EXISTS accounting_account_overrides (
    code TEXT PRIMARY KEY,
    custom_name TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE accounting_account_overrides ENABLE ROW LEVEL SECURITY;

-- Allow everything for authenticated users for now (internal app)
CREATE POLICY "Allow full access to authenticated users" 
ON accounting_account_overrides FOR ALL 
USING (auth.role() = 'authenticated');
