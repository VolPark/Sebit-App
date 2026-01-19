-- Ensure the bucket exists (in case the script wasn't run or failed)
insert into storage.buckets (id, name, public)
values ('offer-images', 'offer-images', true)
on conflict (id) do nothing;

-- Policy: Public can view images
create policy "Public Access offer-images"
  on storage.objects for select
  using ( bucket_id = 'offer-images' );

-- Policy: Authenticated users can upload images
create policy "Authenticated users can upload images offer-images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'offer-images' );

-- Policy: Authenticated users can update images
create policy "Authenticated users can update images offer-images"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'offer-images' );

-- Policy: Authenticated users can delete images
create policy "Authenticated users can delete images offer-images"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'offer-images' );

