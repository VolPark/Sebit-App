-- Add caching columns to accounting_bank_accounts
alter table accounting_bank_accounts 
add column if not exists account_number text,
add column if not exists bank_code text,
add column if not exists currency text,
add column if not exists opening_balance numeric(15, 2) default 0,
add column if not exists name text, -- Original name from UOL
add column if not exists last_synced_at timestamp with time zone;

-- Create RPC to get movements sum efficiently
create or replace function get_bank_movements_sum(account_id text)
returns numeric
language sql
security definer
as $$
  select coalesce(sum(amount), 0)
  from accounting_bank_movements
  where bank_account_id = account_id;
$$;
