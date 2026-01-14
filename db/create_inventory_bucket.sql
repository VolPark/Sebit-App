-- Create a new storage bucket for inventory images
insert into storage.buckets (id, name, public)
values ('inventory-images', 'inventory-images', true)
on conflict (id) do nothing;

-- Set up security policies for the inventory-images bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'inventory-images' );

create policy "Authenticated users can upload images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'inventory-images' );

create policy "Authenticated users can update images"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'inventory-images' );
