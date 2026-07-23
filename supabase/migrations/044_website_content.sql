-- ============================================================
-- 044 — Website content for the public landing page
-- ============================================================

create table if not exists public.website_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default 'landing',
  content jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.website_content (slug, content)
values (
  'landing',
  '{
    "brand": {
      "logoUrl": "/images/codentra-removebg-preview.png",
      "logoAlt": "Codentra ERP"
    },
    "hero": {
      "title": "Streamline Your Supply Chain with Flexible ERP Solutions. From inventory and POS to production and procurement.",
      "subtitle": "Achieve efficiency, gain real-time insights, and grow with Condentra.",
      "primaryCta": "Start 7-Day Free Trial",
      "secondaryCta": "Book a Demo",
      "imageUrl": "/images/codentra hero background image.png",
      "imageAlt": "ERP illustration"
    }
  }'::jsonb
)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'website-assets',
  'website-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set public = true, file_size_limit = 5242880;

drop policy if exists "Public read website assets" on storage.objects;
create policy "Public read website assets"
  on storage.objects for select
  using (bucket_id = 'website-assets');

drop policy if exists "Auth write website assets" on storage.objects;
create policy "Auth write website assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'website-assets');

drop policy if exists "Auth update website assets" on storage.objects;
create policy "Auth update website assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'website-assets');

drop policy if exists "Auth delete website assets" on storage.objects;
create policy "Auth delete website assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'website-assets');
