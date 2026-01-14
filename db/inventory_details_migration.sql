-- Add new columns for Item Details
alter table public.inventory_items 
add column if not exists manufacturer text,
add column if not exists image_url text;

-- Add comment
comment on column public.inventory_items.manufacturer is 'Výrobce / Značka';
comment on column public.inventory_items.image_url is 'URL adresa obrázku produktu';
