-- Add division_id to fixed_costs table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'fixed_costs' and column_name = 'division_id') then
        alter table public.fixed_costs add column division_id bigint references public.divisions(id);
    end if;
end $$;
