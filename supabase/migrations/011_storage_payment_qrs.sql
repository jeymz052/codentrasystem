-- ============================================================
-- 011 — Storage bucket for store payment QR images
-- ============================================================
-- A public bucket so uploaded QR images are viewable in the POS
-- without auth. Uploads happen server-side via the service role
-- (bypasses RLS), so only a public bucket + read policy are required;
-- authenticated write policies are added for completeness.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-assets',
  'tenant-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = true, file_size_limit = 2097152;

drop policy if exists "Public read tenant assets" on storage.objects;
create policy "Public read tenant assets"
  on storage.objects for select
  using (bucket_id = 'tenant-assets');

drop policy if exists "Auth write tenant assets" on storage.objects;
create policy "Auth write tenant assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tenant-assets');

drop policy if exists "Auth update tenant assets" on storage.objects;
create policy "Auth update tenant assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'tenant-assets');

drop policy if exists "Auth delete tenant assets" on storage.objects;
create policy "Auth delete tenant assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tenant-assets');
