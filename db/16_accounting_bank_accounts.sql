-- Create table for storing local metadata for bank accounts (fetched from UOL)
create table if not exists accounting_bank_accounts (
    bank_account_id text primary key, -- Matches ID from UOL
    custom_name text,                 -- User defined name
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table accounting_bank_accounts enable row level security;

create policy "Users can view bank accounts"
    on accounting_bank_accounts for select
    to authenticated
    using (true);

create policy "Users can update bank accounts"
    on accounting_bank_accounts for all
    to authenticated
    using (true)
    with check (true);

-- Function to update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_accounting_bank_accounts_updated_at
    before update on accounting_bank_accounts
    for each row
    execute function update_updated_at_column();
